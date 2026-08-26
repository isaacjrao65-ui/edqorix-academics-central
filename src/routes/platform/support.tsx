import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OwnerBadge, OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit, usePermissionRequests, useSupportTickets } from "@/lib/platform";

const STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"] as const;

export const Route = createFileRoute("/platform/support")({
  head: () => ({
    meta: [
      { title: "Support center — Edqorix control plane" },
      {
        name: "description",
        content: "Institution support tickets, technical issues, feature requests and permission requests.",
      },
      { property: "og:title", content: "Support center — Edqorix" },
      { property: "og:description", content: "Respond to institution administrators directly." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const queryClient = useQueryClient();
  const { data: tickets = [], isLoading } = useSupportTickets();
  const { data: requests = [] } = usePermissionRequests();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", openId],
    enabled: Boolean(openId),
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", openId as string)
        .order("created_at");
      return data ?? [];
    },
  });

  async function setStatus(id: string, subject: string, next: (typeof STATUSES)[number], prev: string) {
    const { error } = await supabase.from("support_tickets").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: `ticket.${next}`,
      targetType: "support_ticket",
      targetId: id,
      targetLabel: subject,
      oldValue: { status: prev },
      newValue: { status: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  }

  async function send(ticketId: string) {
    if (!reply.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      author_id: auth.user!.id,
      from_platform: true,
      body: reply.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setReply("");
    await queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
    toast.success("Reply sent to the institution administrator.");
  }

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, tickets.filter((t) => t.status === s).length]),
  ) as Record<string, number>;

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Support center"
        description="Everything institutions have raised: support, technical issues, feature requests and permission requests."
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => (
          <StatTile
            key={s}
            label={s.replace(/_/g, " ")}
            value={counts[s] ?? 0}
            tone={s === "open" ? "violet" : s === "resolved" ? "emerald" : "cyan"}
          />
        ))}
        <StatTile
          label="Permission requests"
          value={requests.filter((r) => r.status === "pending").length}
          tone="amber"
        />
      </div>

      <OwnerCard title="Tickets">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets raised yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {tickets.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-slate-100 hover:text-cyan-300"
                    onClick={() => setOpenId(openId === t.id ? null : t.id)}
                  >
                    {t.subject}
                  </button>
                  <span className="text-xs text-slate-500">
                    {t.institutions?.name ?? "Platform"} · {t.category} · {t.priority}
                  </span>
                  <OwnerBadge value={t.status} />
                  <div className="ml-auto flex gap-1">
                    {STATUSES.filter((s) => s !== t.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-slate-400"
                        onClick={() => setStatus(t.id, t.subject, s, t.status)}
                      >
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>
                {t.body ? <p className="mt-2 text-sm text-slate-400">{t.body}</p> : null}
                {openId === t.id ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    {messages.length === 0 ? (
                      <p className="text-xs text-slate-500">No replies yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {messages.map((m) => (
                          <li key={m.id} className="text-sm">
                            <span
                              className={
                                m.from_platform ? "text-cyan-300" : "text-slate-400"
                              }
                            >
                              {m.from_platform ? "Platform owner" : "Institution"}
                            </span>
                            <span className="ml-2 text-slate-200">{m.body}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply to the institution administrator…"
                      className="border-white/15 bg-white/5 text-slate-100"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => send(t.id)}>
                        Send reply
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </OwnerCard>
    </div>
  );
}
