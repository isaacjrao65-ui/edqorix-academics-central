import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { pct, resolveGrade } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useExams, useGradeBands } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & exports — Edqorix" },
      {
        name: "description",
        content:
          "Grade distribution, pass percentage and CSV exports for any examination in your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { institutionId } = useInstitution();
  const { data: exams = [] } = useExams(institutionId);
  const { data: bands = [] } = useGradeBands(institutionId);
  const [examId, setExamId] = useState("");

  const exam = exams.find((e) => e.id === examId) ?? null;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report", examId],
    enabled: Boolean(examId),
    queryFn: async () => {
      const { data: sheets, error } = await supabase
        .from("mark_sheets")
        .select("id, status, sections(name)")
        .eq("exam_id", examId);
      if (error) throw error;
      const ids = (sheets ?? []).map((s) => s.id);
      if (ids.length === 0) return [];
      const { data: marks, error: markError } = await supabase
        .from("marks")
        .select("score, state, mark_sheet_id, students(roll_number, full_name)")
        .in("mark_sheet_id", ids);
      if (markError) throw markError;
      const sectionById = new Map(
        (sheets ?? []).map((s) => [s.id, s.sections?.name ?? "—"] as const),
      );
      return (marks ?? []).map((mark) => ({
        roll: mark.students?.roll_number ?? "",
        name: mark.students?.full_name ?? "",
        section: sectionById.get(mark.mark_sheet_id) ?? "—",
        score: mark.score === null ? null : Number(mark.score),
        state: mark.state as string,
      }));
    },
  });

  const stats = useMemo(() => {
    const max = Number(exam?.max_marks ?? 100);
    const pass = Number(exam?.pass_marks ?? 0);
    const scored = rows.filter((r) => r.state === "present" && r.score !== null);
    const total = scored.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const passed = scored.filter((r) => (r.score ?? 0) >= pass).length;
    const distribution = new Map<string, number>();
    for (const row of scored) {
      const band = resolveGrade(pct(row.score ?? 0, max), bands);
      const grade = band?.grade ?? "—";
      distribution.set(grade, (distribution.get(grade) ?? 0) + 1);
    }
    return {
      max,
      pass,
      entered: scored.length,
      absent: rows.filter((r) => r.state !== "present").length,
      average: scored.length ? Math.round((total / scored.length) * 10) / 10 : 0,
      highest: scored.length ? Math.max(...scored.map((r) => r.score ?? 0)) : 0,
      passRate: scored.length ? Math.round((passed / scored.length) * 1000) / 10 : 0,
      distribution: [...distribution.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows, exam, bands]);

  function exportCsv() {
    if (rows.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const header = ["roll_number", "student", "section", "score", "percentage", "grade", "state"];
    const lines = rows.map((row) => {
      const percent = row.score === null ? "" : pct(row.score, stats.max);
      const grade = row.score === null ? "" : (resolveGrade(Number(percent), bands)?.grade ?? "");
      return [
        row.roll,
        `"${row.name.replace(/"/g, '""')}"`,
        row.section,
        row.score ?? "",
        percent,
        grade,
        row.state,
      ].join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exam?.courses?.code ?? "exam"}-${exam?.title ?? "report"}.csv`.replace(
      /\s+/g,
      "-",
    );
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & exports"
        description="Pick an examination to see performance across every section, then export the consolidated sheet."
        actions={
          examId ? (
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-4" strokeWidth={1.75} />
              Export CSV
            </Button>
          ) : null
        }
      />

      <div className="max-w-md">
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an examination" />
          </SelectTrigger>
          <SelectContent>
            {exams.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.courses?.code} — {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!examId ? (
        <EmptyState
          title="No examination selected"
          description="Choose an examination above to generate its report."
        />
      ) : isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No marks recorded yet"
          description="Once faculty enter marks for this examination, the report appears here."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Marks entered", value: stats.entered },
              { label: "Average", value: `${stats.average} / ${stats.max}` },
              { label: "Highest", value: `${stats.highest} / ${stats.max}` },
              { label: "Pass rate", value: `${stats.passRate}%` },
              { label: "Absent / exempt", value: stats.absent },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-card px-5 py-4">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium">Grade distribution</h2>
            <ul className="mt-4 space-y-2.5">
              {stats.distribution.map(([grade, count]) => (
                <li key={grade} className="flex items-center gap-3 text-sm">
                  <span className="w-10 font-medium">{grade}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(count / Math.max(stats.entered, 1)) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Roll number</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Section</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                  <th className="px-5 py-3 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => {
                  const percent = row.score === null ? null : pct(row.score, stats.max);
                  return (
                    <tr key={`${row.roll}-${index}`}>
                      <td className="px-5 py-2.5 font-mono text-xs">{row.roll}</td>
                      <td className="px-5 py-2.5">{row.name}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{row.section}</td>
                      <td className="px-5 py-2.5 tabular-nums">
                        {row.state !== "present"
                          ? row.state
                          : row.score === null
                            ? "—"
                            : `${row.score} (${percent}%)`}
                      </td>
                      <td className="px-5 py-2.5">
                        {percent === null ? "—" : (resolveGrade(percent, bands)?.grade ?? "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {institutionId ? <SignInAttempts institutionId={institutionId} /> : null}
    </div>
  );
}

function SignInAttempts({ institutionId }: { institutionId: string }) {
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["inst-auth-events", institutionId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("id, event_type, email, detail, ip, user_agent, created_at")
        .eq("institution_id", institutionId)
        .in("event_type", ["sign_in", "sign_in_failed"])
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  const shown = events.filter((e) =>
    filter === "all" ? true : filter === "success" ? e.event_type === "sign_in" : e.event_type !== "sign_in",
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sign-in attempts</h2>
          <p className="text-sm text-muted-foreground">
            Every staff login attempt with result, reason, IP address and device. Visible to administrators only.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attempts</SelectItem>
            <SelectItem value="success">Successful</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : shown.length === 0 ? (
        <EmptyState title="No sign-in attempts" description="Login attempts by your staff will appear here." />
      ) : (
        <div className="max-h-[480px] overflow-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Login ID</th>
                <th className="px-4 py-2">Result</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{e.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={e.event_type === "sign_in" ? "text-emerald-600" : "text-destructive"}>
                      {e.event_type === "sign_in" ? "Success" : e.detail ?? "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.ip ?? "—"}</td>
                  <td className="max-w-[260px] truncate px-4 py-2 text-xs text-muted-foreground" title={e.user_agent ?? ""}>
                    {e.user_agent ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
