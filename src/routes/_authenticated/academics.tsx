import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { RecordDialog, type FieldDef, type RecordValues } from "@/components/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useCourses, useDepartments, usePrograms, useSections, useSessions } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/academics")({
  head: () => ({
    meta: [
      { title: "Academic structure — Edqorix" },
      {
        name: "description",
        content:
          "Manage departments, programs, academic sessions, courses and sections for your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Academics,
});

function Academics() {
  const { institutionId, canManage } = useInstitution();
  const queryClient = useQueryClient();

  const departments = useDepartments(institutionId);
  const programs = usePrograms(institutionId);
  const sessions = useSessions(institutionId);
  const courses = useCourses(institutionId);
  const sections = useSections(institutionId);

  async function create(
    table: "departments" | "programs" | "academic_sessions" | "courses" | "sections",
    values: Record<string, unknown>,
    label: string,
    invalidate: string[],
  ) {
    if (!institutionId) return;
    const { data, error } = await supabase
      .from(table)
      .insert({ ...values, institution_id: institutionId } as never)
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: `${table}.created`,
      entityType: table,
      entityId: data.id,
      description: `Added ${label}`,
    });
    for (const key of invalidate) await queryClient.invalidateQueries({ queryKey: [key] });
    toast.success(`${label} added`);
  }

  const deptOptions = (departments.data ?? []).map((d) => ({ value: d.id, label: d.name }));
  const programOptions = (programs.data ?? []).map((p) => ({ value: p.id, label: p.name }));
  const sessionOptions = (sessions.data ?? []).map((s) => ({ value: s.id, label: s.name }));
  const courseOptions = (courses.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.title}`,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Academic structure"
        description="Departments, programs, sessions, courses and the sections marks are entered against."
      />

      <Tabs defaultValue="departments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          <Panel
            title="Departments"
            canManage={canManage}
            dialog={
              <RecordDialog
                trigger={<AddButton label="Add department" />}
                title="Add department"
                fields={[
                  { name: "name", label: "Name", required: true },
                  { name: "code", label: "Code", required: true, placeholder: "CSE" },
                ]}
                onSubmit={(v) =>
                  create("departments", { name: v.name, code: v.code }, v.name, ["departments"])
                }
              />
            }
            columns={["Name", "Code"]}
            rows={(departments.data ?? []).map((d) => ({ key: d.id, cells: [d.name, d.code] }))}
            emptyTitle="No departments yet"
          />
        </TabsContent>

        <TabsContent value="programs" className="mt-6">
          <Panel
            title="Programs"
            canManage={canManage}
            dialog={
              <RecordDialog
                trigger={<AddButton label="Add program" />}
                title="Add program"
                fields={
                  [
                    { name: "name", label: "Name", required: true, placeholder: "B.E. Computer Science" },
                    { name: "code", label: "Code", required: true, placeholder: "BECSE" },
                    {
                      name: "level",
                      label: "Level",
                      type: "select",
                      defaultValue: "undergraduate",
                      options: [
                        { value: "school", label: "School" },
                        { value: "diploma", label: "Diploma" },
                        { value: "undergraduate", label: "Undergraduate" },
                        { value: "postgraduate", label: "Postgraduate" },
                        { value: "doctoral", label: "Doctoral" },
                      ],
                    },
                    {
                      name: "duration_semesters",
                      label: "Duration (semesters)",
                      type: "number",
                      defaultValue: "8",
                      required: true,
                    },
                    {
                      name: "department_id",
                      label: "Department",
                      type: "select",
                      options: deptOptions,
                    },
                  ] satisfies FieldDef[]
                }
                onSubmit={(v) =>
                  create(
                    "programs",
                    {
                      name: v.name,
                      code: v.code,
                      level: v.level || "undergraduate",
                      duration_semesters: Number(v.duration_semesters || 8),
                      department_id: v.department_id || null,
                    },
                    v.name,
                    ["programs"],
                  )
                }
              />
            }
            columns={["Name", "Code", "Level", "Semesters"]}
            rows={(programs.data ?? []).map((p) => ({
              key: p.id,
              cells: [p.name, p.code, p.level, String(p.duration_semesters)],
            }))}
            emptyTitle="No programs yet"
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <Panel
            title="Academic sessions"
            canManage={canManage}
            dialog={
              <RecordDialog
                trigger={<AddButton label="Add session" />}
                title="Add academic session"
                fields={[
                  { name: "name", label: "Name", required: true, placeholder: "2025–26 Odd" },
                  { name: "start_date", label: "Start date", type: "date" },
                  { name: "end_date", label: "End date", type: "date" },
                ]}
                onSubmit={(v) =>
                  create(
                    "academic_sessions",
                    {
                      name: v.name,
                      start_date: v.start_date || null,
                      end_date: v.end_date || null,
                    },
                    v.name,
                    ["sessions"],
                  )
                }
              />
            }
            columns={["Name", "Start", "End", "Status"]}
            rows={(sessions.data ?? []).map((s) => ({
              key: s.id,
              cells: [
                s.name,
                formatDate(s.start_date),
                formatDate(s.end_date),
                <Badge key="b" variant="secondary">
                  {s.is_active ? "Active" : "Closed"}
                </Badge>,
              ],
            }))}
            emptyTitle="No sessions yet"
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <Panel
            title="Courses"
            canManage={canManage}
            dialog={
              <RecordDialog
                trigger={<AddButton label="Add course" />}
                title="Add course"
                fields={
                  [
                    { name: "code", label: "Course code", required: true, placeholder: "CS3401" },
                    { name: "title", label: "Title", required: true },
                    { name: "credits", label: "Credits", type: "number", step: "0.5", defaultValue: "3" },
                    { name: "semester", label: "Semester", type: "number", defaultValue: "1" },
                    { name: "department_id", label: "Department", type: "select", options: deptOptions },
                    { name: "program_id", label: "Program", type: "select", options: programOptions },
                  ] satisfies FieldDef[]
                }
                onSubmit={(v) =>
                  create(
                    "courses",
                    {
                      code: v.code,
                      title: v.title,
                      credits: Number(v.credits || 3),
                      semester: Number(v.semester || 1),
                      department_id: v.department_id || null,
                      program_id: v.program_id || null,
                    },
                    `${v.code} ${v.title}`,
                    ["courses"],
                  )
                }
              />
            }
            columns={["Code", "Title", "Credits", "Semester"]}
            rows={(courses.data ?? []).map((c) => ({
              key: c.id,
              cells: [c.code, c.title, String(c.credits), String(c.semester)],
            }))}
            emptyTitle="No courses yet"
          />
        </TabsContent>

        <TabsContent value="sections" className="mt-6">
          <Panel
            title="Sections"
            canManage={canManage}
            dialog={
              <RecordDialog
                trigger={<AddButton label="Add section" />}
                title="Add section"
                description="A section pairs a course with a session. Marks are entered per section."
                fields={
                  [
                    { name: "course_id", label: "Course", type: "select", options: courseOptions, required: true },
                    { name: "session_id", label: "Session", type: "select", options: sessionOptions, required: true },
                    { name: "name", label: "Section name", defaultValue: "A", required: true },
                    { name: "room", label: "Room" },
                  ] satisfies FieldDef[]
                }
                onSubmit={async (v: RecordValues) => {
                  if (!v.course_id || !v.session_id) {
                    toast.error("Course and session are required");
                    return;
                  }
                  await create(
                    "sections",
                    {
                      course_id: v.course_id,
                      session_id: v.session_id,
                      name: v.name || "A",
                      room: v.room || null,
                    },
                    `Section ${v.name || "A"}`,
                    ["sections"],
                  );
                }}
              />
            }
            columns={["Course", "Session", "Section", "Room"]}
            rows={(sections.data ?? []).map((s) => ({
              key: s.id,
              cells: [
                `${s.courses?.code ?? "—"} — ${s.courses?.title ?? ""}`,
                s.academic_sessions?.name ?? "—",
                s.name,
                s.room ?? "—",
              ],
            }))}
            emptyTitle="No sections yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <Button size="sm">
      <Plus className="size-4" strokeWidth={2} />
      {label}
    </Button>
  );
}

function Panel({
  title,
  columns,
  rows,
  dialog,
  canManage,
  emptyTitle,
}: {
  title: string;
  columns: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
  dialog: React.ReactNode;
  canManage: boolean;
  emptyTitle: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {canManage ? dialog : null}
      </header>
      {rows.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            title={emptyTitle}
            description={
              canManage
                ? "Add your first record to build out the structure."
                : "An administrator or the examination cell manages this list."
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {columns.map((column) => (
                  <th key={column} className="px-5 py-3 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td key={index} className="px-5 py-3.5 align-middle">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
