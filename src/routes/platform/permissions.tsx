import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OwnerBadge, OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit, usePermissionRequests, usePlatformInstitutions } from "@/lib/platform";
import { PERMISSION_GROUP_ORDER, usePermissionCatalogue } from "@/lib/permissions";

export const Route = createFileRoute("/platform/permissions")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search["tab"] === "catalogue" ? ("catalogue" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Permission requests & overrides — Edqorix control plane" },
      {
        name: "description",
        content:
          "Approve or reject institution permission requests and override institution permissions platform-wide.",
      },
      { property: "og:title", content: "Permission requests — Edqorix" },
      { property: "og:description", content: "Platform-wide permission governance." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title={tab === "catalogue" ? "Roles & permission catalogue" : "Permission requests & overrides"}
        description="Institutions request extra capability from the platform owner. Decisions, expiries and overrides are all recorded in the global audit log."
        actions={
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => navigate({ to: "/platform/permissions", search: {} })}
              className={`rounded-md px-3 py-1 text-xs ${
                tab ? "text-slate-400" : "bg-cyan-500 text-slate-950"
              }`}
            >
              Requests
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/platform/permissions", search: { tab: "catalogue" } })}
              className={`rounded-md px-3 py-1 text-xs ${
                tab ? "bg-cyan-500 text-slate-950" : "text-slate-400"
              }`}
            >
              Catalogue
            </button>
          </div>
        }
      />
      {tab === "catalogue" ? <Catalogue /> : <Requests />}
    </div>
  );
}

function Requests() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = usePermissionRequests();
  const [decision, setDecision] = useState<{
    id: string;
    status: "approved" | "rejected" | "clarification";
    label: string;
  } | null>(null);
  const [note, setNote] = useState("");
  const [expires, setExpires] = useState("");

  async function decide() {
    if (!decision) return;
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      status: decision.status,
      decided_by: auth.user?.id ?? null,
      decided_at: new Date().toISOString(),
      decision_note: note || null,
      expires_at: expires ? new Date(expires).toISOString() : null,
    };
    const { error } = await supabase.from("permission_requests").update(payload).eq("id", decision.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: `permission_request.${decision.status}`,
      targetType: "permission_request",
      targetId: decision.id,
      targetLabel: decision.label,
      reason: note || null,
      newValue: payload,
    });
    await queryClient.invalidateQueries({ queryKey: ["permission-requests"] });
    setDecision(null);
    setNote("");
    setExpires("");
    toast.success(`Request ${decision.status}. The institution has been notified.`);
  }

  return (
    <>
      <OwnerCard>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No permission requests yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-4 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-slate-100">{r.title}</p>
                  <p className="text-xs text-slate-400">
                    {r.institutions?.name ?? "—"} ({r.institutions?.code ?? "—"})
                    {r.permission_key ? ` · ${r.permission_key}` : ""}
                  </p>
                  {r.reason ? <p className="text-xs text-slate-500">Reason: {r.reason}</p> : null}
                  {r.decision_note ? (
                    <p className="text-xs text-cyan-300/80">Note: {r.decision_note}</p>
                  ) : null}
                  {r.expires_at ? (
                    <p className="text-xs text-amber-300/80">
                      Expires {new Date(r.expires_at).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                <OwnerBadge value={r.status} />
                {r.status === "pending" || r.status === "clarification" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      onClick={() => setDecision({ id: r.id, status: "approved", label: r.title })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-white/5 text-slate-200"
                      onClick={() => setDecision({ id: r.id, status: "clarification", label: r.title })}
                    >
                      Ask clarification
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-400/30 bg-rose-400/10 text-rose-200"
                      onClick={() => setDecision({ id: r.id, status: "rejected", label: r.title })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>

      <Dialog open={Boolean(decision)} onOpenChange={(v) => !v && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{decision?.status} request</DialogTitle>
            <DialogDescription>
              Add a note for the institution and, for approvals, an optional expiry date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pr-note">Note</Label>
              <Textarea id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {decision?.status === "approved" ? (
              <div className="space-y-2">
                <Label htmlFor="pr-expiry">Permission expiry (optional)</Label>
                <Input id="pr-expiry" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button onClick={decide}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Catalogue() {
  const { data: permissions = [] } = usePermissionCatalogue();
  const { data: institutions = [] } = usePlatformInstitutions();
  const queryClient = useQueryClient();
  const [institutionId, setInstitutionId] = useState("");

  const { data: overrides = [] } = useQuery({
    queryKey: ["platform-user-permissions", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data } = await supabase
        .from("user_permissions")
        .select("id, user_id, permission_key, granted")
        .eq("institution_id", institutionId);
      return data ?? [];
    },
  });

  const groups = PERMISSION_GROUP_ORDER.filter((g) => permissions.some((p) => p.grp === g));

  async function revoke(id: string, key: string) {
    const { error } = await supabase.from("user_permissions").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "permission.override_removed",
      institutionId,
      targetType: "user_permission",
      targetId: id,
      targetLabel: key,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-user-permissions", institutionId] });
    toast.success("Override removed.");
  }

  return (
    <div className="space-y-4">
      <OwnerCard title="Permission catalogue">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">{g}</p>
              <ul className="space-y-1 text-sm text-slate-300">
                {permissions
                  .filter((p) => p.grp === g)
                  .map((p) => (
                    <li key={p.key} className="flex items-baseline justify-between gap-3">
                      <span>{p.label}</span>
                      <span className="font-mono text-[0.7rem] text-slate-500">{p.key}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </OwnerCard>

      <OwnerCard title="Institution permission overrides">
        <div className="mb-4 max-w-sm space-y-2">
          <Label className="text-slate-300">Institution</Label>
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="h-9 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100"
          >
            <option value="">Select an institution</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id} className="text-slate-900">
                {i.name}
              </option>
            ))}
          </select>
        </div>
        {!institutionId ? (
          <p className="text-sm text-slate-500">
            Choose an institution to review its per-user permission overrides.
          </p>
        ) : overrides.length === 0 ? (
          <p className="text-sm text-slate-500">No per-user overrides in this institution.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {overrides.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="font-mono text-xs text-slate-400">{o.user_id.slice(0, 8)}</span>
                <span className="text-slate-200">{o.permission_key}</span>
                <OwnerBadge value={o.granted ? "approved" : "rejected"} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-slate-400"
                  onClick={() => revoke(o.id, o.permission_key)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>
    </div>
  );
}
