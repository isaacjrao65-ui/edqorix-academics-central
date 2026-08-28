import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

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
import {
  USER_CSV_TEMPLATE,
  USER_ROLE_LABEL,
  downloadCsv,
  parseUsersCsv,
  type UserCsvRow,
} from "@/lib/csv";
import { IMPORT_FILE_ACCEPT, readTabularFile } from "@/lib/import-file";
import { bulkCreateInstitutionUsers } from "@/lib/platform-users.functions";

type BulkResult = {
  line: number;
  email: string;
  fullName: string;
  role: string;
  status: "created" | "updated" | "failed";
  message?: string;
};

/**
 * CSV / Excel-export import of principals, staff, HODs and teachers for one
 * institution. Every row is provisioned and audited individually server-side.
 */
export function BulkImportUsers({
  institutionId,
  institutionName,
}: {
  institutionId: string | null;
  institutionName?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<UserCsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setRows([]);
    setErrors([]);
    setResults(null);
    setFileName("");
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    try {
      const parsed = parseUsersCsv(await readTabularFile(file));
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch (err) {
      setRows([]);
      setErrors([err instanceof Error ? err.message : "Could not read that file."]);
    }
  }

  async function importRows() {
    if (!institutionId || rows.length === 0) return;
    setBusy(true);
    try {
      const res = await bulkCreateInstitutionUsers({ data: { institutionId, rows } });
      setResults(res.results);
      const created = res.results.filter((r) => r.status === "created").length;
      const updated = res.results.filter((r) => r.status === "updated").length;
      const failed = res.results.filter((r) => r.status === "failed").length;
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      if (failed === 0) toast.success(`${created} created, ${updated} updated.`);
      else toast.warning(`${created} created, ${updated} updated, ${failed} failed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="size-4" strokeWidth={1.75} />
          Bulk import staff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import staff accounts</DialogTitle>
          <DialogDescription>
            Upload an Excel workbook (.xlsx), Word table (.docx) or CSV of principals, staff, HODs and teachers for{" "}
            {institutionName || "this institution"}. Each row is created and audited individually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept={IMPORT_FILE_ACCEPT}
              onChange={onFile}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv("edqorix-staff-template.csv", USER_CSV_TEMPLATE)}
            >
              Download template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Columns: full_name, email, password, role (principal / staff / hod / teacher),
            designation, class_teacher.
          </p>

          {fileName ? (
            <p className="text-sm">
              {fileName} — {rows.length} valid row{rows.length === 1 ? "" : "s"}
              {errors.length ? `, ${errors.length} skipped` : ""}
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
              {errors.map((er) => (
                <p key={er}>{er}</p>
              ))}
            </div>
          ) : null}

          {rows.length > 0 && !results ? (
            <div className="max-h-56 overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Line</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={`${r.line}-${r.email}`}>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.line}</td>
                      <td className="px-3 py-1.5">{r.fullName}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">
                        {USER_ROLE_LABEL[r.role]}
                        {r.isClassTeacher ? " · class teacher" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {results ? (
            <div className="max-h-56 overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Line</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r) => (
                    <tr key={`${r.line}-${r.email}`}>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.line}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={
                            r.status === "failed"
                              ? "text-destructive"
                              : r.status === "updated"
                                ? "text-muted-foreground"
                                : "text-primary"
                          }
                        >
                          {r.status}
                        </span>
                        {r.message ? (
                          <span className="ml-2 text-xs text-muted-foreground">{r.message}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={importRows} disabled={busy || rows.length === 0 || Boolean(results)}>
            {busy ? "Importing…" : `Import ${rows.length || ""} account${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
