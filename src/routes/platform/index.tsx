import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { OwnerBadge, OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import {
  formatBytes,
  growthSeries,
  useGlobalUsage,
  usePlatformAudit,
  usePlatformInstitutions,
  usePlatformUsers,
  useRecentLogins,
} from "@/lib/platform";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [
      { title: "Edqorix Platform Overview — Control plane" },
      {
        name: "description",
        content:
          "Global Edqorix platform overview: institutions, users, usage, subscriptions and security signals.",
      },
      { property: "og:title", content: "Edqorix Platform Overview" },
      { property: "og:description", content: "Global Edqorix SaaS control plane." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformDashboard,
});

const GRAINS = ["day", "week", "month", "year"] as const;

function PlatformDashboard() {
  const { data: institutions = [], isLoading } = usePlatformInstitutions();
  const { data: users = [] } = usePlatformUsers();
  const { data: usage } = useGlobalUsage();
  const { data: audit = [] } = usePlatformAudit();
  const { data: logins = [] } = useRecentLogins();
  const [grain, setGrain] = useState<(typeof GRAINS)[number]>("month");

  const totals = useMemo(() => {
    const sum = (fn: (i: (typeof institutions)[number]) => number) =>
      institutions.reduce((acc, i) => acc + fn(i), 0);
    return {
      institutions: institutions.length,
      active: institutions.filter((i) => i.status === "active").length,
      trial: institutions.filter((i) => i.status === "trial").length,
      suspended: institutions.filter((i) => i.status === "suspended").length,
      students: sum((i) => i.students),
      teachers: sum((i) => i.teachers),
      staff: sum((i) => i.staff),
      storage: sum((i) => i.storageBytes),
      documents: sum((i) => i.documents),
      exams: sum((i) => i.exams),
    };
  }, [institutions]);

  const instGrowth = useMemo(
    () => growthSeries(institutions.map((i) => i.created_at), grain),
    [institutions, grain],
  );
  const userGrowth = useMemo(
    () => growthSeries(users.map((u) => u.created_at), grain),
    [users, grain],
  );

  const usageBars = [
    { label: "Marks", value: usage?.marks ?? 0 },
    { label: "Exams", value: usage?.exams ?? 0 },
    { label: "Documents", value: usage?.documents ?? 0 },
    { label: "Submitted", value: usage?.submitted ?? 0 },
    { label: "Verified", value: usage?.verified ?? 0 },
    { label: "Published", value: usage?.published ?? 0 },
  ];

  const attention = institutions.filter(
    (i) => i.status === "suspended" || i.status === "pending" || i.subStatus === "expired",
  );

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        title="Edqorix Platform Overview"
        description="Every institution using Edqorix, platform-wide usage, subscription health and security signals in one control center."
        actions={
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-slate-200">
            <Link to="/platform/institutions">All institutions</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total institutions" value={totals.institutions} tone="cyan" />
        <StatTile label="Active" value={totals.active} tone="emerald" />
        <StatTile label="Trial" value={totals.trial} tone="violet" />
        <StatTile label="Suspended" value={totals.suspended} tone="rose" />
        <StatTile label="Total users" value={users.length} tone="cyan" />
        <StatTile label="Students" value={totals.students} tone="violet" />
        <StatTile label="Teachers" value={totals.teachers} tone="emerald" />
        <StatTile label="Staff" value={totals.staff} tone="amber" />
        <StatTile label="Examinations" value={totals.exams} tone="cyan" />
        <StatTile label="Documents" value={totals.documents} tone="violet" />
        <StatTile label="Storage used" value={formatBytes(totals.storage)} tone="emerald" />
        <StatTile
          label="Pending requests"
          value={usage?.pendingRequests ?? 0}
          hint={`${usage?.openTickets ?? 0} open support tickets`}
          tone="amber"
        />
      </div>

      <OwnerCard
        title="Growth"
        actions={
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {GRAINS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrain(g)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors ${
                  grain === g ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">
              Institution growth
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={instGrowth}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#22d3ee"
                    fill="rgba(34,211,238,0.18)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">User growth</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#a78bfa"
                    fill="rgba(167,139,250,0.18)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </OwnerCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <OwnerCard title="Platform usage" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageBars}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </OwnerCard>

        <OwnerCard title="Needs attention">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : attention.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing needs attention — every institution is healthy.
            </p>
          ) : (
            <ul className="space-y-3">
              {attention.slice(0, 8).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <Link
                    to="/platform/institutions/$institutionId"
                    params={{ institutionId: i.id }}
                    className="truncate text-sm text-slate-200 hover:text-cyan-300"
                  >
                    {i.name}
                  </Link>
                  <OwnerBadge value={i.status} />
                </li>
              ))}
            </ul>
          )}
        </OwnerCard>
      </div>

      <OwnerCard
        title="Recent logins"
        actions={
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-slate-200">
            <Link to="/platform/security">Security log</Link>
          </Button>
        }
      >
        {logins.length === 0 ? (
          <p className="text-sm text-slate-500">No sign-ins recorded yet.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
            {logins.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-200">{row.fullName ?? "Unknown user"}</span>
                <span className="text-slate-400">{row.email ?? "—"}</span>
                {row.event_type === "sign_up" ? (
                  <OwnerBadge value="new account" />
                ) : null}
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>

      <OwnerCard title="Recent platform activity">
        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">No platform-level actions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {audit.slice(0, 10).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="font-medium text-slate-200">{row.action}</span>
                <span className="text-slate-500">
                  {row.institutions?.name ?? "Platform"} · {row.actor?.email ?? "owner"}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>
    </div>
  );
}
