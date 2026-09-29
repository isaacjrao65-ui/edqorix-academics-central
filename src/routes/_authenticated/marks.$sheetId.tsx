import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Save, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import {
  SHEET_STATUS_CLASS,
  SHEET_STATUS_LABEL,
  formatDateTime,
  pct,
  resolveGrade,
  type SheetStatus,
} from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useGradeBands, useStudents } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/marks/$sheetId")({
  head: () => ({
    meta: [
      { title: "Mark sheet — Edqorix" },
      {
        name: "description",
        content: "Enter, verify and approve marks for a section with a complete audit trail.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarkSheetPage,
});

type MarkState = "present" | "absent" | "exempt" | "malpractice";
type Draft = { score: string; state: MarkState };

function MarkSheetPage() {
  const { sheetId } = Route.useParams();
  const queryClient = useQueryClient();
  const { institutionId, canManage, isHod, isExamCell, isAdmin } = useInstitution();
  const { data: bands = [] } = useGradeBands(institutionId);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const sheetQuery = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mark_sheets")
        .select(
          "id, status, remarks, institution_id, exam_id, section_id, submitted_at, verified_at, approved_at, published_at, exams(title, max_marks, pass_marks, exam_type, courses(code, title)), sections(name, faculty_id, academic_sessions(name))",
        )
        .eq("id", sheetId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const sheet = sheetQuery.data;
  const sectionId = sheet?.section_id ?? null;
  const maxMarks = Number(sheet?.exams?.max_marks ?? 100);
  const passMarks = Number(sheet?.exams?.pass_marks ?? 0);

  const rosterQuery = useQuery({
    queryKey: ["roster", sectionId, sheetId],
    enabled: Boolean(sectionId),
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from("enrollments")
        .select("student_id, students(id, roll_number, full_name)")
        .eq("section_id", sectionId as string);
      if (error) throw error;
      const { data: marks, error: markError } = await supabase
        .from("marks")
        .select("student_id, score, state")
        .eq("mark_sheet_id", sheetId);
      if (markError) throw markError;
      return { enrollments: enrollments ?? [], marks: marks ?? [] };
    },
  });

  const roster = useMemo(() => {
    const marks = new Map(
      (rosterQuery.data?.marks ?? []).map((m) => [
        m.student_id,
        { score: m.score === null ? "" : String(Number(m.score)), state: m.state as MarkState },
      ]),
    );
    return (rosterQuery.data?.enrollments ?? [])
      .map((row) => {
        const student = row.students as unknown as {
          id: string;
          roll_number: string;
          full_name: string;
        } | null;
        return student
          ? {
              student,
              saved: marks.get(student.id) ?? { score: "", state: "present" as MarkState },
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.student.roll_number.localeCompare(b.student.roll_number));
  }, [rosterQuery.data]);

  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const row of roster) next[row.student.id] = { ...row.saved };
    setDrafts(next);
  }, [roster]);

  const status = (sheet?.status ?? "draft") as SheetStatus;
  const isSectionFaculty = Boolean(sheet?.sections?.faculty_id && sheet.sections.faculty_id === userId);
  const canEdit = (status === "draft" || status === "returned") && (isSectionFaculty || canManage);
  const canVerify = status === "submitted" && (isHod || isExamCell || isAdmin);
  const canApprove = status === "verified" && (isExamCell || isAdmin);
  const canPublish = status === "approved" && (isExamCell || isAdmin);
  const canUnlock = (status === "published" || status === "approved") && isAdmin;

  const entered = roster.filter((row) => {
    const draft = drafts[row.student.id];
    return draft && (draft.score !== "" || draft.state !== "present");
  }).length;

  function setDraft(studentId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { score: "", state: "present", ...prev[studentId], ...patch },
    }));
  }

  async function saveMarks() {
    if (!institutionId || !sheet) return;
    const payload = roster.map((row) => {
      const draft = drafts[row.student.id] ?? { score: "", state: "present" as MarkState };
      const numeric = draft.state === "present" ? Number(draft.score) : null;
      return {
        institution_id: institutionId,
        mark_sheet_id: sheetId,
        student_id: row.student.id,
        score: draft.score === "" || Number.isNaN(numeric) ? null : numeric,
        state: draft.state,
        updated_by: userId,
      };
    });
    const invalid = payload.find(
      (row) => row.score !== null && (row.score < 0 || row.score > maxMarks),
    );
    if (invalid) {
      toast.error(`Scores must be between 0 and ${maxMarks}`);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("marks")
      .upsert(payload, { onConflict: "mark_sheet_id,student_id" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "marks.saved",
      entityType: "mark_sheets",
      entityId: sheetId,
      description: `Saved marks for ${sheet.exams?.courses?.code} ${sheet.exams?.title}`,
      details: { rows: payload.length },
    });
    await queryClient.invalidateQueries({ queryKey: ["roster"] });
    toast.success("Marks saved");
  }

  async function transition(
    next: SheetStatus,
    action: string,
    stamp?: Record<string, unknown>,
    remarks?: string | null,
  ) {
    if (!institutionId || !sheet) return;
    setBusy(true);
    const { error } = await supabase
      .from("mark_sheets")
      .update({ status: next, remarks: remarks ?? null, ...stamp })
      .eq("id", sheetId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action,
      entityType: "mark_sheets",
      entityId: sheetId,
      description: `${SHEET_STATUS_LABEL[next]} — ${sheet.exams?.courses?.code} ${sheet.exams?.title} (section ${sheet.sections?.name})`,
      details: remarks ? { remarks } : {},
    });
    await queryClient.invalidateQueries({ queryKey: ["sheet", sheetId] });
    await queryClient.invalidateQueries({ queryKey: ["sheets"] });
    setRemark("");
    toast.success("Status updated");
  }

  if (sheetQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }
  if (!sheet) {
    return (
      <EmptyState
        title="Mark sheet not found"
        description="It may have been removed, or you don't have access to it."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/marks">Back to marks</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Link
        to="/marks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        All mark sheets
      </Link>

      <PageHeader
        title={`${sheet.exams?.courses?.code ?? ""} · ${sheet.exams?.title ?? "Mark sheet"}`}
        description={`${sheet.exams?.courses?.title ?? ""} · Section ${sheet.sections?.name ?? ""} · ${
          sheet.sections?.academic_sessions?.name ?? ""
        } · Max ${maxMarks}, pass ${passMarks}`}
        actions={
          <Badge variant="secondary" className={cn(SHEET_STATUS_CLASS[status])}>
            {SHEET_STATUS_LABEL[status]}
          </Badge>
        }
      />

      {sheet.remarks ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Remarks: {sheet.remarks}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Button onClick={saveMarks} disabled={busy || roster.length === 0}>
            {busy ? "Saving..." : <><Save className="size-4" strokeWidth={1.75} /> Save marks</>}
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" disabled={busy || roster.length === 0} onClick={async () => {
              await saveMarks();
              await transition("submitted", "marks.submitted", {
                submitted_by: userId,
                submitted_at: new Date().toISOString(),
              });
            }}
          >
            {busy ? "Submitting..." : "Submit for verification"}
          </Button>
        ) : null}
        {canVerify ? (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                transition("verified", "marks.verified", {
                  verified_by: userId,
                  verified_at: new Date().toISOString(),
                })
              }
            >
              {busy ? "Verifying..." : "Verify"}
            </Button>
            <ReturnDialog
              busy={busy}
              value={remark}
              onChange={setRemark}
              onConfirm={() => transition("returned", "marks.returned", {}, remark)}
            />
          </>
        ) : null}
        {canApprove ? (
          <Button
            disabled={busy}
            onClick={() =>
              transition("approved", "marks.approved", {
                approved_by: userId,
                approved_at: new Date().toISOString(),
              })
            }
          >
            {busy ? "Approving..." : "Approve"}
          </Button>
        ) : null}
        {canPublish ? (
          <Button
            disabled={busy}
            onClick={() =>
              transition("published", "marks.published", {
                published_at: new Date().toISOString(),
              })
            }
          >
            {busy ? "Publishing..." : "Publish result"}
          </Button>
        ) : null}
        {canUnlock ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => transition("draft", "marks.unlocked", {})}
          >
            {busy ? "Unlocking..." : "Unlock for correction"}
          </Button>
        ) : null}
        {canManage && sectionId ? (
          <EnrollDialog
            institutionId={institutionId}
            sectionId={sectionId}
            enrolled={roster.map((row) => row.student.id)}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["roster"] })}
          />
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {entered} of {roster.length} entered
        {sheet.submitted_at ? ` · submitted ${formatDateTime(sheet.submitted_at)}` : ""}
        {sheet.verified_at ? ` · verified ${formatDateTime(sheet.verified_at)}` : ""}
        {sheet.approved_at ? ` · approved ${formatDateTime(sheet.approved_at)}` : ""}
        {sheet.published_at ? ` · published ${formatDateTime(sheet.published_at)}` : ""}
      </p>

      {roster.length === 0 ? (
        <EmptyState
          title="No students enrolled in this section"
          description={
            canManage
              ? "Enrol students into this section to begin marks entry."
              : "Ask the examination cell to enrol students into this section."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Roll number</th>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">%</th>
                <th className="px-5 py-3 font-medium">Grade</th>
                <th className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roster.map((row, index) => {
                const draft = drafts[row.student.id] ?? { score: "", state: "present" as MarkState };
                const numeric = draft.score === "" ? null : Number(draft.score);
                const percent = numeric === null ? null : pct(numeric, maxMarks);
                const band = percent === null ? null : resolveGrade(percent, bands);
                const passed = numeric === null ? null : numeric >= passMarks;
                return (
                  <tr key={row.student.id}>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.student.roll_number}</td>
                    <td className="px-5 py-2.5">{row.student.full_name}</td>
                    <td className="px-5 py-2.5">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={maxMarks}
                        step="0.5"
                        className="h-9 w-24"
                        data-row={index}
                        disabled={!canEdit || draft.state !== "present"}
                        value={draft.score}
                        onChange={(e) => setDraft(row.student.id, { score: e.target.value })}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          const next = document.querySelector<HTMLInputElement>(
                            `input[data-row="${index + 1}"]`,
                          );
                          next?.focus();
                          next?.select();
                        }}
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <Select
                        value={draft.state}
                        disabled={!canEdit}
                        onValueChange={(value) =>
                          setDraft(row.student.id, {
                            state: value as MarkState,
                            score: value === "present" ? draft.score : "",
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="exempt">Exempt</SelectItem>
                          <SelectItem value="malpractice">Malpractice</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-2.5 tabular-nums text-muted-foreground">
                      {percent === null ? "—" : `${percent}%`}
                    </td>
                    <td className="px-5 py-2.5">{band?.grade ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      {draft.state !== "present" ? (
                        <span className="text-xs text-muted-foreground capitalize">
                          {draft.state}
                        </span>
                      ) : passed === null ? (
                        "—"
                      ) : (
                        <span className={passed ? "text-success" : "text-destructive"}>
                          {passed ? "Pass" : "Fail"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReturnDialog({
  busy,
  value,
  onChange,
  onConfirm,
}: {
  busy: boolean;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={busy}>
          Return for correction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return for correction</DialogTitle>
          <DialogDescription>
            The faculty member will see your remarks and can edit the sheet again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="remark">Remarks</Label>
          <Textarea
            id="remark"
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Roll 21CS014 total does not match the answer sheet."
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={busy || value.trim().length === 0}
          >
            Return sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollDialog({
  institutionId,
  sectionId,
  enrolled,
  onDone,
}: {
  institutionId: string | null;
  sectionId: string;
  enrolled: string[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: students = [] } = useStudents(institutionId);

  const available = students.filter((student) => !enrolled.includes(student.id));

  async function run() {
    if (!institutionId || selected.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("enrollments").insert(
      selected.map((studentId) => ({
        institution_id: institutionId,
        section_id: sectionId,
        student_id: studentId,
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "enrollments.created",
      entityType: "sections",
      entityId: sectionId,
      description: `Enrolled ${selected.length} students`,
    });
    toast.success(`Enrolled ${selected.length} students`);
    setSelected([]);
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="size-4" strokeWidth={1.75} />
          Enrol students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enrol students into this section</DialogTitle>
          <DialogDescription>Only students not already enrolled are listed.</DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every student on record is already enrolled in this section.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {available.map((student) => (
              <label
                key={student.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={selected.includes(student.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) =>
                      checked ? [...prev, student.id] : prev.filter((id) => id !== student.id),
                    )
                  }
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {student.roll_number}
                </span>
                <span className="truncate">{student.full_name}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button onClick={run} disabled={busy || selected.length === 0}>
            Enrol {selected.length > 0 ? selected.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
