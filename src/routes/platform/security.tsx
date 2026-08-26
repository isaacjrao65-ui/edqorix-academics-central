import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { OwnerBadge, OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  logPlatformAudit,
  useImpersonationSessions,
  usePlatformUsers,
  useSecurityEvents,
} from "@/lib/platform";
import { endViewAs } from "@/lib/view-as";

export const Route = createFileRoute("/platform/security")({
  head: () => ({
    meta: [
      { title: "Security center — Edqorix control plane" },
      {
        name: "description",
        content: "Failed logins, suspicious activity, owner sessions, impersonation history and lockouts.",
      },
      { property: "og:title", content: "Security center — Edqorix" },
      { property: "og:description", content: "Platform security monitoring and session control." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const queryClient = useQueryClient();
  const { data: events = [] } = useSecurityEvents();
  const { data: sessions = [] } = useImpersonationSessions();
  const { data: users = [] } = usePlatformUsers();

  const failed = events.filter((e) => e.event_type.includes("failed")).length;
  const suspicious = events.filter((e) => e.severity === "critical").length;
  const suspended = users.filter((u) => u.status === "suspended").length;
  const activeSessions = sessions.filter((s) => !s.ended_at);

  async function endSession(id: string, label: string) {
    const { error } = await supabase
      .from("impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "impersonation.revoked",
      targetType: "impersonation_session",
      targetId: id,
      targetLabel: label,
    });
    await endViewAs().catch(() => undefined);
    await queryClient.invalidateQueries({ queryKey: ["impersonation-sessions"] });
    toast.success("Session revoked.");
  }

  async function suspend(membershipId: string, name: string, institutionId: string) {
    const { error } = await supabase
      .from("memberships")
      .update({ status: "suspended", is_active: false })
      .eq("id", membershipId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "security.account_suspended",
      institutionId,
      targetType: "membership",
      targetId: membershipId,
      targetLabel: name,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    toast.success(`${name} suspended.`);
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Security center"
        description="Login failures, unauthorised control-plane attempts, impersonation sessions and account lockouts."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Failed logins" value={failed} tone="rose" />
        <StatTile label="Critical events" value={suspicious} tone="rose" />
        <StatTile label="Active view-as sessions" value={activeSessions.length} tone="amber" />
        <StatTile label="Suspended accounts" value={suspended} tone="violet" />
      </div>

      <OwnerCard title="Security events">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No security events recorded.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {events.slice(0, 60).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <OwnerBadge value={e.severity} />
                <span className="font-medium text-slate-200">{e.event_type}</span>
                <span className="text-xs text-slate-500">
                  {e.email ?? "—"} {e.institutions?.name ? `· ${e.institutions.name}` : ""}
                </span>
                {e.detail ? <span className="text-xs text-slate-500">{e.detail}</span> : null}
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>

      <OwnerCard title="Platform owner view-as sessions">
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No impersonation sessions yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="text-slate-200">{s.institutions?.name ?? "—"}</span>
                <span className="text-xs capitalize text-slate-400">
                  {s.viewed_role.replace(/_/g, " ")}
                </span>
                {s.reason ? <span className="text-xs text-slate-500">{s.reason}</span> : null}
                <span className="text-xs text-slate-500">
                  {new Date(s.started_at).toLocaleString()} →{" "}
                  {s.ended_at ? new Date(s.ended_at).toLocaleString() : "active"}
                </span>
                {!s.ended_at ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto border-rose-400/30 bg-rose-400/10 text-rose-200"
                    onClick={() => endSession(s.id, s.institutions?.name ?? s.id)}
                  >
                    Revoke session
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>

      <OwnerCard title="Accounts to review">
        <ul className="divide-y divide-white/5">
          {users
            .filter((u) => u.status !== "active")
            .slice(0, 20)
            .map((u) => (
              <li key={u.membership_id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="text-slate-200">{u.full_name}</span>
                <span className="text-xs text-slate-500">
                  {u.email} · {u.institution}
                </span>
                <OwnerBadge value={u.status} />
                {u.status !== "suspended" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-rose-300"
                    onClick={() => suspend(u.membership_id, u.full_name, u.institution_id)}
                  >
                    Suspend account
                  </Button>
                ) : null}
              </li>
            ))}
          {users.every((u) => u.status === "active") ? (
            <li className="py-2.5 text-sm text-slate-500">Every account is active and healthy.</li>
          ) : null}
        </ul>
      </OwnerCard>
    </div>
  );
}
