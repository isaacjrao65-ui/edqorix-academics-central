import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useInstitution } from "@/lib/institution";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — Edqorix" },
      {
        name: "description",
        content:
          "Append-only record of every marks entry, verification, approval and access change in your institution.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Audit,
});

function Audit() {
  const { institutionId } = useInstitution();
  const [query, setQuery] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, description, created_at, actor_id")
        .eq("institution_id", institutionId as string)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((row) => row.actor_id))];
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((row) => ({ ...row, actor: byId.get(row.actor_id) ?? null }));
    },
  });

  const filtered = logs.filter((log) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [log.action, log.description, log.actor?.full_name, log.actor?.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit log"
        description="Every action is recorded permanently — entries cannot be edited or deleted by anyone, including administrators."
      />

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by action, description or staff member"
        className="max-w-md"
      />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Activity appears here as staff create records and move mark sheets through the workflow."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((log) => (
            <li key={log.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
              <Badge variant="secondary" className="font-mono text-[11px]">
                {log.action}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{log.description ?? log.entity_type}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {log.actor?.full_name || log.actor?.email || "Unknown user"} ·{" "}
                  {formatDateTime(log.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
