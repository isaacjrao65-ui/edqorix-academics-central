import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Global search — Edqorix control plane" },
      {
        name: "description",
        content: "Search every institution, user, student, examination and document across the platform.",
      },
      { property: "og:title", content: "Global search — Edqorix" },
      { property: "og:description", content: "Platform-wide search for the Edqorix owner." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [term, setTerm] = useState(q ?? "");
  const needle = term.trim();

  const { data, isFetching } = useQuery({
    queryKey: ["platform-search", needle],
    enabled: needle.length >= 2,
    queryFn: async () => {
      const like = `%${needle}%`;
      const [insts, profiles, students, exams, docs] = await Promise.all([
        supabase
          .from("institutions")
          .select("id, name, code, status")
          .or(`name.ilike.${like},code.ilike.${like}`)
          .limit(20),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .or(`full_name.ilike.${like},email.ilike.${like}`)
          .limit(20),
        supabase
          .from("students")
          .select("id, full_name, roll_number, institution_id")
          .or(`full_name.ilike.${like},roll_number.ilike.${like}`)
          .limit(20),
        supabase.from("exams").select("id, title, institution_id").ilike("title", like).limit(20),
        supabase
          .from("documents")
          .select("id, title, category, institution_id")
          .ilike("title", like)
          .limit(20),
      ]);
      const { data: names } = await supabase.from("institutions").select("id, name");
      const byId = new Map((names ?? []).map((r) => [r.id, r.name]));
      return {
        institutions: insts.data ?? [],
        users: profiles.data ?? [],
        students: (students.data ?? []).map((s) => ({ ...s, inst: byId.get(s.institution_id) })),
        exams: (exams.data ?? []).map((s) => ({ ...s, inst: byId.get(s.institution_id) })),
        documents: (docs.data ?? []).map((s) => ({ ...s, inst: byId.get(s.institution_id) })),
      };
    },
  });

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Global search"
        description="Search across every institution. Results always show which institution the record belongs to."
      />
      <Input
        autoFocus
        placeholder="Institution, user, student, examination or document…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="max-w-xl border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
      />

      {needle.length < 2 ? (
        <p className="text-sm text-slate-500">Type at least two characters to search.</p>
      ) : isFetching ? (
        <p className="text-sm text-slate-500">Searching the platform…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OwnerCard title="Institutions">
            {data?.institutions.length ? (
              <ul className="space-y-2 text-sm">
                {data.institutions.map((i) => (
                  <li key={i.id}>
                    <Link
                      to="/platform/institutions/$institutionId"
                      params={{ institutionId: i.id }}
                      search={{}}
                      className="text-slate-100 hover:text-cyan-300"
                    >
                      {i.name}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">
                      {i.code} · {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No matches.</p>
            )}
          </OwnerCard>

          <OwnerCard title="Users">
            {data?.users.length ? (
              <ul className="space-y-2 text-sm">
                {data.users.map((u) => (
                  <li key={u.id} className="text-slate-200">
                    {u.full_name}
                    <span className="ml-2 text-xs text-slate-500">{u.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No matches.</p>
            )}
          </OwnerCard>

          <OwnerCard title="Students">
            {data?.students.length ? (
              <ul className="space-y-2 text-sm">
                {data.students.map((s) => (
                  <li key={s.id} className="text-slate-200">
                    {s.full_name}
                    <span className="ml-2 text-xs text-slate-500">
                      {s.roll_number} · {s.inst}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No matches.</p>
            )}
          </OwnerCard>

          <OwnerCard title="Examinations">
            {data?.exams.length ? (
              <ul className="space-y-2 text-sm">
                {data.exams.map((e) => (
                  <li key={e.id} className="text-slate-200">
                    {e.title}
                    <span className="ml-2 text-xs text-slate-500">{e.inst}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No matches.</p>
            )}
          </OwnerCard>

          <OwnerCard title="Documents">
            {data?.documents.length ? (
              <ul className="space-y-2 text-sm">
                {data.documents.map((d) => (
                  <li key={d.id} className="text-slate-200">
                    {d.title}
                    <span className="ml-2 text-xs text-slate-500">
                      {d.category} · {d.inst}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No matches.</p>
            )}
          </OwnerCard>
        </div>
      )}
    </div>
  );
}
