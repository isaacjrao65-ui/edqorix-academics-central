import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { RecordDialog, type FieldDef } from "@/components/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { EXAM_TYPE_LABEL, formatDate } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useCourses, useExams, useSections, useSessions, useSheets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({
    meta: [
      { title: "Examinations — Edqorix" },
      {
        name: "description",
        content:
          "Create and manage internals, mid-terms, finals and practicals with max marks, pass marks and weightage.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Exams,
});

function Exams() {
  const { institutionId, canManage } = useInstitution();
  const queryClient = useQueryClient();
  const { data: exams = [], isLoading } = useExams(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: sessions = [] } = useSessions(institutionId);
  const { data: sections = [] } = useSections(institutionId);
  const { data: sheets = [] } = useSheets(institutionId);

  const fields: FieldDef[] = [
    { name: "title", label: "Title", required: true, placeholder: "Internal Assessment 1" },
    {
      name: "exam_type",
      label: "Type",
      type: "select",
      defaultValue: "internal",
      options: Object.entries(EXAM_TYPE_LABEL).map(([value, label]) => ({ value, label })),
    },
    {
      name: "course_id",
      label: "Course",
      type: "select",
      required: true,
      options: courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` })),
    },
    {
      name: "session_id",
      label: "Session",
      type: "select",
      required: true,
      options: sessions.map((s) => ({ value: s.id, label: s.name })),
    },
    { name: "max_marks", label: "Max marks", type: "number", defaultValue: "100", required: true },
    { name: "pass_marks", label: "Pass marks", type: "number", defaultValue: "40", required: true },
    {
      name: "weightage",
      label: "Weightage (%)",
      type: "number",
      defaultValue: "100",
      hint: "How much this exam contributes to the final course result.",
    },
    { name: "exam_date", label: "Exam date", type: "date" },
  ];

  async function createExam(values: Record<string, string>) {
    if (!institutionId) return;
    if (!values.course_id || !values.session_id) {
      toast.error("Course and session are required");
      return;
    }
    const { data: exam, error } = await supabase
      .from("exams")
      .insert({
        institution_id: institutionId,
        title: values.title,
        exam_type: values.exam_type as "internal",
        course_id: values.course_id,
        session_id: values.session_id,
        max_marks: Number(values.max_marks || 100),
        pass_marks: Number(values.pass_marks || 40),
        weightage: Number(values.weightage || 100),
        exam_date: values.exam_date || null,
      })
      .select("id, title")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }

    // Open a mark sheet for every section of this course in this session.
    const matching = sections.filter(
      (s) => s.course_id === values.course_id && s.session_id === values.session_id,
    );
    if (matching.length > 0) {
      const { error: sheetError } = await supabase.from("mark_sheets").insert(
        matching.map((section) => ({
          institution_id: institutionId,
          exam_id: exam.id,
          section_id: section.id,
        })),
      );
      if (sheetError) toast.error(`Exam created, but mark sheets failed: ${sheetError.message}`);
    }

    await logAudit({
      institutionId,
      action: "exams.created",
      entityType: "exams",
      entityId: exam.id,
      description: `Created exam ${exam.title}`,
      details: { sheets: matching.length },
    });
    await queryClient.invalidateQueries({ queryKey: ["exams"] });
    await queryClient.invalidateQueries({ queryKey: ["sheets"] });
    toast.success(
      matching.length > 0
        ? `Exam created with ${matching.length} mark sheet${matching.length > 1 ? "s" : ""}`
        : "Exam created — add sections to open mark sheets",
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Examinations"
        description="Each examination opens a mark sheet per section, ready for faculty entry."
        actions={
          canManage ? (
            <RecordDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" strokeWidth={2} />
                  New examination
                </Button>
              }
              title="New examination"
              description="Mark sheets are created automatically for every section of the course in this session."
              fields={fields}
              submitLabel="Create examination"
              onSubmit={createExam}
            />
          ) : null
        }
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : exams.length === 0 ? (
        <EmptyState
          title="No examinations yet"
          description={
            canManage
              ? "Create courses, sessions and sections first, then add an examination."
              : "The examination cell will publish examinations here."
          }
          action={
            canManage ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/academics">Set up academics</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map((exam) => {
            const examSheets = sheets.filter((s) => s.exam_id === exam.id);
            return (
              <article key={exam.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold">{exam.title}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {exam.courses?.code} — {exam.courses?.title}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {EXAM_TYPE_LABEL[exam.exam_type] ?? exam.exam_type}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
                  <Meta label="Max" value={String(exam.max_marks)} />
                  <Meta label="Pass" value={String(exam.pass_marks)} />
                  <Meta label="Weightage" value={`${exam.weightage}%`} />
                  <Meta label="Date" value={formatDate(exam.exam_date)} />
                </dl>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    {exam.academic_sessions?.name} · {examSheets.length} mark sheet
                    {examSheets.length === 1 ? "" : "s"}
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/marks" search={{ exam: exam.id }}>
                      View sheets
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
