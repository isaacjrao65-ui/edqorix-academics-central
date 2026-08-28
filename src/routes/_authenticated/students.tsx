import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { RecordDialog, type FieldDef, type RecordGetter } from "@/components/record-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useInstitution } from "@/lib/institution";
import { STUDENT_CSV_TEMPLATE, downloadCsv, parseStudentsCsv } from "@/lib/csv";
import { IMPORT_FILE_ACCEPT, readTabularFile } from "@/lib/import-file";
import { usePrograms, useStudents } from "@/lib/queries";
import { classLabel, useClasses } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students — Edqorix" },
      {
        name: "description",
        content: "Student records, roll numbers, programs and academic status for your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Students,
});

function Students() {
  const { institutionId, canManage } = useInstitution();
  const queryClient = useQueryClient();
  const { data: students = [], isLoading } = useStudents(institutionId);
  const { data: programs = [] } = usePrograms(institutionId);
  const [search, setSearch] = useState("");

  const programName = useMemo(
    () => new Map(programs.map((p) => [p.id, p.name])),
    [programs],
  );

  const filtered = students.filter((student) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      student.full_name.toLowerCase().includes(q) ||
      student.roll_number.toLowerCase().includes(q) ||
      (student.email ?? "").toLowerCase().includes(q)
    );
  });

  const fields: FieldDef[] = [
    { name: "roll_number", label: "Roll number", required: true },
    { name: "full_name", label: "Full name", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone" },
    {
      name: "program_id",
      label: "Program",
      type: "select",
      options: programs.map((p) => ({ value: p.id, label: p.name })),
    },
    { name: "batch_year", label: "Batch year", type: "number", placeholder: "2025" },
    { name: "current_semester", label: "Current semester", type: "number", defaultValue: "1" },
  ];

  async function addStudent(values: RecordGetter) {
    if (!institutionId) return;
    const { data, error } = await supabase
      .from("students")
      .insert({
        institution_id: institutionId,
        roll_number: values("roll_number"),
        full_name: values("full_name"),
        email: values("email") || null,
        phone: values("phone") || null,
        program_id: values("program_id") || null,
        batch_year: values("batch_year") ? Number(values("batch_year")) : null,
        current_semester: Number(values("current_semester") || 1),
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "students.created",
      entityType: "students",
      entityId: data.id,
      description: `Added student ${values("roll_number")}`,
    });
    await queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success("Student added");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Students"
        description="The academic register. Students never sign in — records are maintained by staff."
        actions={
          canManage ? (
            <>
              <BulkImport
                institutionId={institutionId}
                onDone={() => queryClient.invalidateQueries({ queryKey: ["students"] })}
              />
              <RecordDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" strokeWidth={2} />
                    Add student
                  </Button>
                }
                title="Add student"
                fields={fields}
                onSubmit={addStudent}
              />
            </>
          ) : null
        }
      />

      <div className="max-w-sm">
        <Input
          placeholder="Search by name, roll number or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={students.length === 0 ? "No students yet" : "No matches"}
          description={
            students.length === 0
              ? "Add students individually or paste a CSV to import a whole batch."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Roll number</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Program</th>
                <th className="px-5 py-3 font-medium">Semester</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td className="px-5 py-3.5 font-mono text-xs">{student.roll_number}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{student.full_name}</p>
                    {student.email ? (
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {student.program_id ? programName.get(student.program_id) ?? "—" : "—"}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums">{student.current_semester}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="secondary">{student.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BulkImport({
  institutionId,
  onDone,
}: {
  institutionId: string | null;
  onDone: () => void;
}) {
  const { data: classes = [] } = useClasses(institutionId);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (raw.trim() ? parseStudentsCsv(raw) : null), [raw]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      setRaw(await readTabularFile(file));
    } catch (err) {
      setRaw("");
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  function resolveClassId(name: string | null) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    const match = classes.find(
      (c) => classLabel(c).toLowerCase() === key || c.name.toLowerCase() === key,
    );
    return match?.id ?? null;
  }

  async function run() {
    if (!institutionId || !parsed || parsed.rows.length === 0) {
      toast.error("Nothing to import — add a header row with roll_number and full_name.");
      return;
    }

    const payload = parsed.rows.map((row) => ({
      institution_id: institutionId,
      roll_number: row.rollNumber,
      full_name: row.fullName,
      email: row.email,
      phone: row.phone,
      admission_number: row.admissionNumber,
      current_semester: row.currentSemester,
      batch_year: row.batchYear,
      class_id: resolveClassId(row.className),
    }));

    setBusy(true);
    const { error } = await supabase.from("students").upsert(payload, {
      onConflict: "institution_id,roll_number",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "students.imported",
      entityType: "students",
      description: `Imported ${payload.length} students from ${fileName || "pasted CSV"}`,
      details: { count: payload.length, file: fileName || null },
    });
    toast.success(`Imported ${payload.length} students`);
    setRaw("");
    setFileName("");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" strokeWidth={1.75} />
          Import students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>
            Upload an Excel workbook (.xlsx), Word table (.docx) or CSV — or paste rows. Columns: roll_number,
            full_name, email, phone, admission_number, current_semester, batch_year, class. Existing
            roll numbers are updated.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept={IMPORT_FILE_ACCEPT}
            onChange={onFile}
            className="max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => downloadCsv("edqorix-students-template.csv", STUDENT_CSV_TEMPLATE)}
          >
            Download template
          </Button>
        </div>

        <Textarea
          rows={8}
          className="font-mono text-xs"
          placeholder={"roll_number,full_name,email,current_semester,class\n21CS001,Aarav Sharma,aarav@example.edu,5,10-A"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        {parsed ? (
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              {parsed.rows.length} valid row{parsed.rows.length === 1 ? "" : "s"}
              {parsed.errors.length ? `, ${parsed.errors.length} skipped` : ""}
            </p>
            {parsed.errors.length ? (
              <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-muted/40 p-2">
                {parsed.errors.map((er) => (
                  <p key={er}>{er}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={run} disabled={busy || !parsed || parsed.rows.length === 0}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
