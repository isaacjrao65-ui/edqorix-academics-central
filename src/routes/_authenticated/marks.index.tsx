import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SHEET_STATUS_CLASS,
  SHEET_STATUS_LABEL,
  formatDateTime,
  type SheetStatus,
} from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useSheets } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/marks/")({
  validateSearch: (search: Record<string, unknown>): { exam?: string } =>
    typeof search["exam"] === "string" ? { exam: search["exam"] } : {},
  head: () => ({
    meta: [
      { title: "Marks & approvals — Edqorix" },
      {
        name: "description",
        content:
          "Mark sheets moving through entry, verification, approval and publication across your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarksList,
});

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "returned", label: "Returned" },
  { value: "submitted", label: "Awaiting verification" },
  { value: "verified", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

function MarksList() {
  const { exam } = Route.useSearch();
  const { institutionId } = useInstitution();
  const { data: sheets = [], isLoading } = useSheets(institutionId);
  const [status, setStatus] = useState("all");

  const rows = sheets
    .filter((sheet) => (exam ? sheet.exam_id === exam : true))
    .filter((sheet) => (status === "all" ? true : sheet.status === status));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marks & approvals"
        description="Faculty enter and submit, heads of department verify, the examination cell approves and publishes."
        actions={
          exam ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/marks">Clear exam filter</Link>
            </Button>
          ) : null
        }
      />

      <div className="w-52">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No mark sheets here"
          description="Mark sheets appear once an examination is created for a course that has sections."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/exams">Go to examinations</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Examination</th>
                <th className="px-5 py-3 font-medium">Section</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((sheet) => (
                <tr key={sheet.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{sheet.exams?.courses?.code ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {sheet.exams?.courses?.title ?? ""}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">{sheet.exams?.title}</td>
                  <td className="px-5 py-3.5">{sheet.sections?.name}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant="secondary"
                      className={cn(SHEET_STATUS_CLASS[sheet.status as SheetStatus])}
                    >
                      {SHEET_STATUS_LABEL[sheet.status as SheetStatus]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {formatDateTime(sheet.updated_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/marks/$sheetId" params={{ sheetId: sheet.id }}>
                        Open
                      </Link>
                    </Button>
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
