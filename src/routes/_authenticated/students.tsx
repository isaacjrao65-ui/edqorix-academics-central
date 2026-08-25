import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { RecordDialog, type FieldDef } from "@/components/record-dialog";
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
import { usePrograms, useStudents } from "@/lib/queries";

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

  async function addStudent(values: Record<string, string>) {
    if (!institutionId) return;
    const { data, error } = await supabase
      .from("students")
      .insert({
        institution_id: institutionId,
        roll_number: values.roll_number,
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        program_id: values.program_id || null,
        batch_year: values.batch_year ? Number(values.batch_year) : null,
        current_semester: Number(values.current_semester || 1),
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
      description: `Added student ${values.roll_number}`,
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
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!institutionId) return;
    const rows = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(",").map((cell) => cell.trim()))
      .filter((cells) => cells[0]?.toLowerCase() !== "roll_number");

    const payload = rows
      .filter((cells) => cells[0] && cells[1])
      .map((cells) => ({
        institution_id: institutionId,
        roll_number: cells[0],
        full_name: cells[1],
        email: cells[2] || null,
        current_semester: cells[3] ? Number(cells[3]) : 1,
      }));

    if (payload.length === 0) {
      toast.error("Nothing to import — expected roll_number,full_name per line");
      return;
    }

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
      description: `Imported ${payload.length} students`,
      details: { count: payload.length },
    });
    toast.success(`Imported ${payload.length} students`);
    setRaw("");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" strokeWidth={1.75} />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>
            One student per line: roll_number, full_name, email, semester. Existing roll numbers are
            updated.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          className="font-mono text-xs"
          placeholder={"21CS001, Aarav Sharma, aarav@example.edu, 5\n21CS002, Diya Menon, diya@example.edu, 5"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <DialogFooter>
          <Button onClick={run} disabled={busy}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
