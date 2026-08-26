import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, usePlatformInstitutions } from "@/lib/platform";

export const Route = createFileRoute("/platform/storage")({
  head: () => ({
    meta: [
      { title: "Storage monitor — Edqorix control plane" },
      {
        name: "description",
        content: "Platform-wide storage usage, per-institution consumption, limits and recent uploads.",
      },
      { property: "og:title", content: "Storage monitor — Edqorix" },
      { property: "og:description", content: "Storage usage across all Edqorix institutions." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StoragePage,
});

function StoragePage() {
  const { data: institutions = [] } = usePlatformInstitutions();
  const { data: limits = [] } = useQuery({
    queryKey: ["storage-limits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("institution_id, storage_limit_mb, plans(storage_limit_mb)");
      return data ?? [];
    },
  });
  const { data: recent = [] } = useQuery({
    queryKey: ["recent-uploads"],
    queryFn: async () => {
      const [{ data: docs }, { data: insts }] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title, category, file_size, created_at, institution_id")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase.from("institutions").select("id, name"),
      ]);
      const byId = new Map((insts ?? []).map((i) => [i.id, i.name]));
      return (docs ?? []).map((d) => ({ ...d, institution: byId.get(d.institution_id) ?? "—" }));
    },
  });

  const total = institutions.reduce((s, i) => s + i.storageBytes, 0);
  const totalDocs = institutions.reduce((s, i) => s + i.documents, 0);
  const limitFor = (id: string) => {
    const row = limits.find((l) => l.institution_id === id) as
      | { storage_limit_mb: number | null; plans: { storage_limit_mb: number | null } | null }
      | undefined;
    return row?.storage_limit_mb ?? row?.plans?.storage_limit_mb ?? null;
  };
  const ranked = [...institutions].sort((a, b) => b.storageBytes - a.storageBytes);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Storage monitor"
        description="Platform storage consumption by institution. Document contents stay private to their institution — only metadata is shown here."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total platform storage" value={formatBytes(total)} />
        <StatTile label="Documents stored" value={totalDocs} tone="violet" />
        <StatTile label="Institutions with data" value={ranked.filter((i) => i.storageBytes > 0).length} tone="emerald" />
      </div>

      <OwnerCard title="Largest institutions by storage">
        <ul className="space-y-4">
          {ranked.slice(0, 12).map((i) => {
            const limitMb = limitFor(i.id);
            const usedMb = i.storageBytes / (1024 * 1024);
            const pct = limitMb ? Math.min(100, Math.round((usedMb / limitMb) * 100)) : 0;
            return (
              <li key={i.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    to="/platform/institutions/$institutionId"
                    params={{ institutionId: i.id }}
                    search={{}}
                    className="text-slate-200 hover:text-cyan-300"
                  >
                    {i.name}
                  </Link>
                  <span className="text-slate-400">
                    {formatBytes(i.storageBytes)}
                    {limitMb ? ` / ${limitMb} MB (${pct}%)` : " · no limit set"}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5 bg-white/10" />
              </li>
            );
          })}
        </ul>
      </OwnerCard>

      <OwnerCard title="Recent uploads">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                {["Document", "Institution", "Category", "Size", "Uploaded"].map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No uploads yet.
                  </td>
                </tr>
              ) : (
                recent.map((d) => (
                  <tr key={d.id} className="text-slate-300">
                    <td className="py-2.5 pr-4 text-slate-100">{d.title}</td>
                    <td className="py-2.5 pr-4">{d.institution}</td>
                    <td className="py-2.5 pr-4 capitalize">{d.category}</td>
                    <td className="py-2.5 pr-4">{formatBytes(d.file_size ?? 0)}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {new Date(d.created_at).toLocaleString()}
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
