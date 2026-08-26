import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { OwnerCard } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit } from "@/lib/platform";

type OwnerEmail = {
  email: string;
  note: string | null;
  created_at: string;
};

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  note: z.string().trim().max(200).optional(),
});

export function useOwnerEmails() {
  return useQuery({
    queryKey: ["platform-owner-emails"],
    queryFn: async (): Promise<OwnerEmail[]> => {
      const { data, error } = await supabase
        .from("platform_owner_emails")
        .select("email, note, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function PlatformOwnerEmailsCard() {
  const queryClient = useQueryClient();
  const { data: emails = [], isLoading } = useOwnerEmails();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["platform-owner-emails"] });
    await queryClient.invalidateQueries({ queryKey: ["is-platform-owner"] });
  }

  async function add() {
    const parsed = schema.safeParse({ email, note });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("platform_owner_emails").insert({
      email: parsed.data.email,
      note: parsed.data.note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "platform_owner_email.added",
      targetType: "platform_owner_emails",
      targetId: parsed.data.email,
      targetLabel: parsed.data.email,
      newValue: { email: parsed.data.email, note: parsed.data.note || null },
    });
    setEmail("");
    setNote("");
    await refresh();
    toast.success(`${parsed.data.email} can now access the owner panel.`);
  }

  async function remove(row: OwnerEmail) {
    const { error } = await supabase
      .from("platform_owner_emails")
      .delete()
      .eq("email", row.email);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("platform_admins").delete().eq("email", row.email);
    await logPlatformAudit({
      action: "platform_owner_email.removed",
      targetType: "platform_owner_emails",
      targetId: row.email,
      targetLabel: row.email,
      oldValue: row,
    });
    await refresh();
    toast.success(`${row.email} no longer has owner access.`);
  }

  return (
    <OwnerCard
      title="Platform owner emails"
      description="Any account with a verified email on this list signs in straight into the master admin panel."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="owner-email" className="text-sm text-slate-300">
              Email address
            </Label>
            <Input
              id="owner-email"
              type="email"
              autoComplete="off"
              placeholder="owner@edqorix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-white/15 bg-white/5 text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-note" className="text-sm text-slate-300">
              Note (optional)
            </Label>
            <Input
              id="owner-note"
              placeholder="Co-founder, on-call owner…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-white/15 bg-white/5 text-slate-100"
            />
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={add}
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Approve owner
          </Button>
        </div>

        <div className="divide-y divide-white/10 rounded-lg border border-white/10">
          {isLoading ? (
            <p className="p-4 text-sm text-slate-400">Loading approved owners…</p>
          ) : emails.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No owner emails configured yet.</p>
          ) : (
            emails.map((row) => (
              <div key={row.email} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{row.email}</p>
                  <p className="truncate text-xs text-slate-400">
                    {row.note ?? "Platform owner"} · added{" "}
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${row.email}`}
                  onClick={() => remove(row)}
                  className="text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-slate-500">
          Removing an email revokes owner access immediately. Emails must be verified before access
          is granted.
        </p>
      </div>
    </OwnerCard>
  );
}
