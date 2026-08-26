import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
import {
  formatBytes,
  growthSeries,
  useGlobalUsage,
  usePlatformInstitutions,
  usePlatformUsers,
} from "@/lib/platform";

export const Route = createFileRoute("/platform/analytics")({
  head: () => ({
    meta: [
      { title: "Platform analytics — Edqorix control plane" },
      {
        name: "description",
        content: "Institution growth, churn, trial conversion, active users, academic usage and storage growth.",
      },
      { property: "og:title", content: "Platform analytics — Edqorix" },
      { property: "og:description", content: "Edqorix platform-wide analytics." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

const GRAINS = ["day", "week", "month", "year"] as const;

function AnalyticsPage() {
  const { data: institutions = [] } = usePlatformInstitutions();
  const { data: users = [] } = usePlatformUsers();
  const { data: usage } = useGlobalUsage();
  const [grain, setGrain] = useState<(typeof GRAINS)[number]>("month");

  const active = institutions.filter((i) => i.status === "active").length;
  const trial = institutions.filter((i) => i.status === "trial").length;
  const suspended = institutions.filter((i) => i.status === "suspended").length;
  const churned = institutions.filter((i) => i.status === "expired" || i.status === "archived").length;
  const conversion = institutions.length ? Math.round((active / institutions.length) * 100) : 0;

  const instSeries = useMemo(
    () => growthSeries(institutions.map((i) => i.created_at), grain),
    [institutions, grain],
  );
  const userSeries = useMemo(
    () => growthSeries(users.map((u) => u.created_at), grain),
    [users, grain],
  );
  const storageByInstitution = useMemo(
    () =>
      [...institutions]
        .sort((a, b) => b.storageBytes - a.storageBytes)
        .slice(0, 10)
        .map((i) => ({ name: i.short_name ?? i.name, mb: Math.round(i.storageBytes / (1024 * 1024)) })),
    [institutions],
  );
  const totalStorage = institutions.reduce((s, i) => s + i.storageBytes, 0);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Platform analytics"
        description="Growth, retention, academic usage and storage across every institution on Edqorix."
        actions={
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {GRAINS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrain(g)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                  grain === g ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="New institutions" value={institutions.length} />
        <StatTile label="Active institutions" value={active} tone="emerald" />
        <StatTile label="Trial institutions" value={trial} tone="violet" />
        <StatTile label="Churn (expired/archived)" value={churned} tone="rose" />
        <StatTile label="Trial conversion" value={`${conversion}%`} tone="emerald" />
        <StatTile label="Suspended" value={suspended} tone="rose" />
        <StatTile label="Total users" value={users.length} />
        <StatTile label="Total storage" value={formatBytes(totalStorage)} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerCard title="Institution growth">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={instSeries}>
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
                <Line type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="added" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </OwnerCard>
        <OwnerCard title="User growth">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userSeries}>
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
                <Line type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </OwnerCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OwnerCard title="Academic usage">
          <ul className="divide-y divide-white/5 text-sm">
            {[
              ["Marks entered", usage?.marks ?? 0],
              ["Examinations created", usage?.exams ?? 0],
              ["Marks submitted", usage?.submitted ?? 0],
              ["Marks verified", usage?.verified ?? 0],
              ["Results published", usage?.published ?? 0],
              ["Documents uploaded", usage?.documents ?? 0],
            ].map(([label, value]) => (
              <li key={label as string} className="flex justify-between py-2.5">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium text-slate-100">{value as number}</span>
              </li>
            ))}
          </ul>
        </OwnerCard>
        <OwnerCard title="Storage by institution (MB)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storageByInstitution}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="mb" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </OwnerCard>
      </div>
    </div>
  );
}
