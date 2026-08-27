import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useInstitution } from "@/lib/institution";
import { useMembers } from "@/lib/permissions";
import { useCourses, useSessions } from "@/lib/queries";
import { classLabel, useAssignments, useClasses } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({
    meta: [
      { title: "Classes & teacher assignment — Edqorix" },
      {
        name: "description",
        content:
          "Create classes, assign class teachers and map subject teachers to the subjects they teach.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassesPage,
});

const NONE = "__none__";

function ClassesPage() {
  const { institutionId, canManage } = useInstitution();
  const queryClient = useQueryClient();

  const { data: classes = [] } = useClasses(institutionId);
  const { data: assignments = [] } = useAssignments(institutionId);
  const { data: members = [] } = useMembers(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: sessions = [] } = useSessions(institutionId);

  const teachers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members],
  );
  const nameOf = (userId: string | null) =>
    teachers.find((t) => t.user_id === userId)?.profile?.full_name ?? "Unassigned";

  const [form, setForm] = useState({ name: "", section: "A", sessionId: NONE, room: "" });
  const [assignClass, setAssignClass] = useState<string>("");
  const [assignTeacher, setAssignTeacher] = useState<string>("");
  const [assignSubjects, setAssignSubjects] = useState<string[]>([]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classes"] });
    queryClient.invalidateQueries({ queryKey: ["class-subject-teachers"] });
  };

  const createClass = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Class name is required");
      const { data, error } = await supabase
        .from("classes")
        .insert({
          institution_id: institutionId as string,
          name: form.name.trim(),
          section: form.section.trim() || "A",
          room: form.room.trim() || null,
          session_id: form.sessionId === NONE ? null : form.sessionId,
        })
        .select("id, name, section")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAudit({
        institutionId: institutionId as string,
        action: "class.create",
        entityType: "class",
        entityId: data.id,
        description: `Created class ${data.name}-${data.section}`,
        newValue: data,
      });
      setForm({ name: "", section: "A", sessionId: NONE, room: "" });
      invalidate();
      toast.success("Class created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setClassTeacher = useMutation({
    mutationFn: async ({ classId, teacherId }: { classId: string; teacherId: string | null }) => {
      const before = classes.find((c) => c.id === classId);
      const { error } = await supabase
        .from("classes")
        .update({ class_teacher_id: teacherId })
        .eq("id", classId);
      if (error) throw error;
      return { before, teacherId };
    },
    onSuccess: async ({ before, teacherId }) => {
      await logAudit({
        institutionId: institutionId as string,
        action: "class.class_teacher.change",
        entityType: "class",
        entityId: before?.id,
        description: `Class teacher for ${before ? classLabel(before) : "class"} set to ${nameOf(teacherId)}`,
        oldValue: { class_teacher_id: before?.class_teacher_id ?? null },
        newValue: { class_teacher_id: teacherId },
      });
      invalidate();
      toast.success("Class teacher updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignSubjectTeacher = useMutation({
    mutationFn: async () => {
      if (!assignClass || !assignTeacher || assignSubjects.length === 0)
        throw new Error("Pick a class, a teacher and at least one subject");
      const rows = assignSubjects.map((courseId) => ({
        institution_id: institutionId as string,
        class_id: assignClass,
        course_id: courseId,
        teacher_id: assignTeacher,
      }));
      const { error } = await supabase
        .from("class_subject_teachers")
        .upsert(rows, { onConflict: "class_id,course_id,teacher_id", ignoreDuplicates: true });
      if (error) throw error;
      return rows;
    },
    onSuccess: async (rows) => {
      const cls = classes.find((c) => c.id === assignClass);
      await logAudit({
        institutionId: institutionId as string,
        action: "assignment.subject_teacher.create",
        entityType: "class_subject_teacher",
        entityId: assignClass,
        description: `${nameOf(assignTeacher)} assigned to ${rows.length} subject(s) in ${cls ? classLabel(cls) : "class"}`,
        newValue: rows,
      });
      setAssignSubjects([]);
      invalidate();
      toast.success("Subject teacher assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_subject_teachers").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logAudit({
        institutionId: institutionId as string,
        action: "assignment.subject_teacher.remove",
        entityType: "class_subject_teacher",
        entityId: id,
        description: "Subject teacher assignment removed",
      });
      invalidate();
      toast.success("Assignment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManage) {
    return (
      <div className="space-y-8">
        <PageHeader title="Classes & teacher assignment" />
        <EmptyState
          title="Not available for your role"
          description="Only the principal and school management can create classes and change teacher assignments."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Classes & teacher assignment"
        description="Create classes, appoint class teachers and map subject teachers to the subjects they teach."
      />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Create a class</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Class</Label>
            <Input
              id="cls-name"
              placeholder="8"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-section">Section</Label>
            <Input
              id="cls-section"
              placeholder="A"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cls-room">Room</Label>
            <Input
              id="cls-room"
              placeholder="Optional"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Academic year</Label>
            <Select
              value={form.sessionId}
              onValueChange={(v) => setForm({ ...form, sessionId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.is_active ? " (active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => createClass.mutate()}
              disabled={createClass.isPending}
            >
              Add class
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold">Classes & class teachers</h2>
        </header>
        {classes.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState title="No classes yet" description="Add your first class above." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Subject teachers</th>
                  <th className="px-5 py-3">Class teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map((c) => {
                  const count = new Set(
                    assignments.filter((a) => a.class_id === c.id).map((a) => a.teacher_id),
                  ).size;
                  return (
                    <tr key={c.id}>
                      <td className="px-5 py-3 font-medium">{classLabel(c)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.room ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{count}</td>
                      <td className="px-5 py-3">
                        <Select
                          value={c.class_teacher_id ?? NONE}
                          onValueChange={(v) =>
                            setClassTeacher.mutate({
                              classId: c.id,
                              teacherId: v === NONE ? null : v,
                            })
                          }
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Unassigned</SelectItem>
                            {teachers.map((t) => (
                              <SelectItem key={t.user_id} value={t.user_id}>
                                {t.profile?.full_name ?? t.profile?.email ?? "Member"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Assign subject teachers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A subject teacher only gets access to the subjects and classes selected here.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={assignClass} onValueChange={setAssignClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {classLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Teacher</Label>
            <Select value={assignTeacher} onValueChange={setAssignTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.user_id} value={t.user_id}>
                    {t.profile?.full_name ?? t.profile?.email ?? "Member"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Subjects</Label>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add subjects under Departments & classes first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const checked = assignSubjects.includes(course.id);
                return (
                  <label
                    key={course.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setAssignSubjects((prev) =>
                          v ? [...prev, course.id] : prev.filter((id) => id !== course.id),
                        )
                      }
                    />
                    <span className="truncate">
                      {course.code} · {course.title}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <Button
          className="mt-4"
          onClick={() => assignSubjectTeacher.mutate()}
          disabled={assignSubjectTeacher.isPending}
        >
          Assign subjects
        </Button>

        <div className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current assignments
          </h3>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subject teachers assigned yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {assignments.map((a) => {
                const cls = classes.find((c) => c.id === a.class_id);
                const course = courses.find((c) => c.id === a.course_id);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <Badge variant="secondary">{cls ? classLabel(cls) : "Class"}</Badge>
                    <span className="font-medium">{course?.code ?? "Subject"}</span>
                    <span className="text-muted-foreground">{course?.title}</span>
                    <span className="ml-auto text-muted-foreground">{nameOf(a.teacher_id)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAssignment.mutate(a.id)}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
