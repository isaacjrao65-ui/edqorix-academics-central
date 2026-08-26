import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Input } from "@/components/ui/input";
import { usePlatformAudit } from "@/lib/platform";

export const Route = createFileRoute("/platform/audit")({
  head: () => ({
    meta: [
      { title: "Global audit logs — Edqorix control plane" },
      {
        name: "description",
        content: "Platform-wide audit trail: who, what, when, previous value, new value and reason.",
      },
      { property: "og:title", content: "Global audit logs — Edqorix" },
      { property: "og:description", content: "Every platform-level action, permanently recorded." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data: rows = [], isLoading } = usePlatformAudit();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.action, r.target_label, r.institutions?.name, r.actor?.email, r.reason]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Global audit logs"
        description="Append-only record of every platform-level action. Institution-level trails stay inside each institution."
      />
      <Input
        placeholder="Search action, institution, actor or reason…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
      />
      <OwnerCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                {[
                  "Date & time",
                  "Actor",
                  "Action",
                  "Institution",
                  "Target",
                  "Previous",
                  "New",
                  "Reason",
                  "Device",
                ].map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    Loading audit trail…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    No matching audit entries.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="align-top text-slate-300">
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">{r.actor?.email ?? "owner"}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-100">{r.action}</td>
                    <td className="py-2.5 pr-4">{r.institutions?.name ?? "Platform"}</td>
                    <td className="py-2.5 pr-4 text-xs">
                      {r.target_label ?? r.target_type ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[14rem] truncate font-mono text-[0.7rem] text-slate-500">
                      {r.old_value ? JSON.stringify(r.old_value) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[14rem] truncate font-mono text-[0.7rem] text-slate-400">
                      {r.new_value ? JSON.stringify(r.new_value) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-amber-300/80">{r.reason ?? "—"}</td>
                    <td className="py-2.5 pr-4 max-w-[10rem] truncate text-[0.7rem] text-slate-600">
                      {r.user_agent ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OwnerCard>
    </div>
  );
}
