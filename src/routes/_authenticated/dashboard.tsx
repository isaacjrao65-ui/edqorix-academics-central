import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  PenSquare,
  ShieldCheck,
} from "lucide-react";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SHEET_STATUS_CLASS, SHEET_STATUS_LABEL, formatDateTime, type SheetStatus } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useExams, useSheets, useStudents } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Edqorix" },
      {
        name: "description",
        content: "Pending verifications, approvals and examination activity across your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { institutionId, institutionName, isHod, isExamCell, isAdmin, canManage } = useInstitution();
  const { data: sheets = [] } = useSheets(institutionId);
  const { data: students = [] } = useStudents(institutionId);
  const { data: exams = [] } = useExams(institutionId);

  const { data: recentAudit = [] } = useQuery({
    queryKey: ["audit-recent", institutionId],
    enabled: Boolean(institutionId) && canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, description, created_at")
        .eq("institution_id", institutionId as string)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    submitted: sheets.filter((s) => s.status === "submitted").length,
    verified: sheets.filter((s) => s.status === "verified").length,
    drafts: sheets.filter((s) => s.status === "draft" || s.status === "returned").length,
    published: sheets.filter((s) => s.status === "published").length,
  };

  const actionable = sheets
    .filter((sheet) => {
      if (isExamCell || isAdmin) return sheet.status === "verified" || sheet.status === "submitted";
      if (isHod) return sheet.status === "submitted";
      return sheet.status === "draft" || sheet.status === "returned";
    })
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        title={institutionName || "Dashboard"}
        description="Where examination records stand right now."
        actions={
          <Button asChild>
            <Link to="/marks">Open marks & approvals</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={PenSquare} label="In entry or returned" value={counts.drafts} />
        <Stat icon={ClipboardList} label="Awaiting verification" value={counts.submitted} />
        <Stat icon={ClipboardCheck} label="Awaiting approval" value={counts.verified} />
        <Stat icon={GraduationCap} label="Students on record" value={students.length} />
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-semibold">Needs your attention</h2>
            <Link to="/marks" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </header>
          {actionable.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                title="Nothing waiting on you"
                description={
                  exams.length === 0
                    ? "Create an examination to start marks entry."
                    : "All mark sheets in your queue are up to date."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {actionable.map((sheet) => (
                <li key={sheet.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sheet.exams?.courses?.code} · {sheet.exams?.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Section {sheet.sections?.name} · updated {formatDateTime(sheet.updated_at)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0", SHEET_STATUS_CLASS[sheet.status as SheetStatus])}
                  >
                    {SHEET_STATUS_LABEL[sheet.status as SheetStatus]}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/marks/$sheetId" params={{ sheetId: sheet.id }}>
                      Open
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <header className="flex items-center gap-2 border-b border-border px-5 py-4">
            <ShieldCheck className="size-4 text-primary" strokeWidth={1.75} />
            <h2 className="font-display text-sm font-semibold">Recent activity</h2>
          </header>
          {!canManage ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              The audit trail is visible to administrators and the examination cell.
            </p>
          ) : recentAudit.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="px-5 py-3.5">
                  <p className="text-sm">{entry.description ?? entry.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PenSquare;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="size-4 text-primary" strokeWidth={1.75} />
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
