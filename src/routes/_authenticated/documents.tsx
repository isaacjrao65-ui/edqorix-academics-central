import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileStack, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
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
import { formatDateTime } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useExams } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document vault — Edqorix" },
      {
        name: "description",
        content:
          "Private storage for scanned answer sheets, signed mark registers and revaluation forms.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Documents,
});

const CATEGORIES = [
  { value: "answer_sheet", label: "Answer sheet" },
  { value: "mark_register", label: "Signed mark register" },
  { value: "revaluation", label: "Revaluation form" },
  { value: "circular", label: "Circular / notice" },
  { value: "other", label: "Other" },
];

function Documents() {
  const { institutionId, canManage } = useInstitution();
  const queryClient = useQueryClient();
  const { data: exams = [] } = useExams(institutionId);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, category, storage_path, file_size, mime_type, created_at, exam_id")
        .eq("institution_id", institutionId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("records").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Could not create download link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(id: string, path: string) {
    if (!institutionId) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("records").remove([path]);
    await logAudit({
      institutionId,
      action: "documents.deleted",
      entityType: "documents",
      entityId: id,
      description: "Deleted a document",
    });
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    toast.success("Document deleted");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Document vault"
        description="Files are stored privately and served through short-lived links — only staff of this institution can open them."
        actions={
          <UploadDialog
            institutionId={institutionId}
            exams={exams.map((exam) => ({
              value: exam.id,
              label: `${exam.courses?.code ?? ""} — ${exam.title}`,
            }))}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}
          />
        }
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload scanned answer sheets or signed registers to keep the paper trail with the record."
        />
      ) : (
        <ul className="grid gap-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-4"
            >
              <FileStack className="size-5 text-primary" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(doc.created_at)}
                  {doc.file_size ? ` · ${Math.round(Number(doc.file_size) / 1024)} KB` : ""}
                </p>
              </div>
              <Badge variant="secondary">
                {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => download(doc.storage_path)}>
                <Download className="size-4" strokeWidth={1.75} />
                Open
              </Button>
              {canManage ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete document"
                  onClick={() => remove(doc.id, doc.storage_path)}
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadDialog({
  institutionId,
  exams,
  onDone,
}: {
  institutionId: string | null;
  exams: { value: string; label: string }[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("answer_sheet");
  const [examId, setExamId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!institutionId || !file) return;
    setBusy(true);
    const path = `${institutionId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("records").upload(path, file);
    if (uploadError) {
      setBusy(false);
      toast.error(uploadError.message);
      return;
    }
    const { data, error } = await supabase
      .from("documents")
      .insert({
        institution_id: institutionId,
        title: title || file.name,
        category,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        exam_id: examId || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "documents.uploaded",
      entityType: "documents",
      entityId: data.id,
      description: `Uploaded ${title || file.name}`,
    });
    toast.success("Document uploaded");
    setTitle("");
    setFile(null);
    setExamId("");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="size-4" strokeWidth={1.75} />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>Stored privately against this institution.</DialogDescription>
        </DialogHeader>
        <form onSubmit={run} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              placeholder="CS3401 IA1 answer sheets"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-cat">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="doc-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {exams.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="doc-exam">Link to examination (optional)</Label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger id="doc-exam">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.value} value={exam.value}>
                      {exam.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !file}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
