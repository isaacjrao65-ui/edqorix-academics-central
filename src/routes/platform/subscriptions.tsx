import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit, usePlans, usePlatformInstitutions } from "@/lib/platform";

export const Route = createFileRoute("/platform/subscriptions")({
  validateSearch: (search: Record<string, unknown>): { create?: "1" } => ({
    create: search["create"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Subscriptions & plans — Edqorix control plane" },
      {
        name: "description",
        content: "Configurable Edqorix plans, limits and every institution's subscription status.",
      },
      { property: "og:title", content: "Subscriptions & plans — Edqorix" },
      { property: "og:description", content: "Plan and subscription management for the platform owner." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SubscriptionsPage,
});

type FormState = {
  id?: string;
  key: string;
  name: string;
  description: string;
  price_monthly: string;
  price_yearly: string;
  currency: string;
  user_limit: string;
  student_limit: string;
  teacher_limit: string;
  staff_limit: string;
  storage_limit_mb: string;
  trial_days: string;
};

const EMPTY: FormState = {
  key: "",
  name: "",
  description: "",
  price_monthly: "0",
  price_yearly: "0",
  currency: "INR",
  user_limit: "",
  student_limit: "",
  teacher_limit: "",
  staff_limit: "",
  storage_limit_mb: "",
  trial_days: "14",
};

function SubscriptionsPage() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plans = [] } = usePlans();
  const { data: institutions = [] } = usePlatformInstitutions();
  const [editing, setEditing] = useState<FormState | null>(create === "1" ? EMPTY : null);

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const payload = {
      key: editing.key.trim().toLowerCase().replace(/\s+/g, "_"),
      name: editing.name.trim(),
      description: editing.description || null,
      price_monthly: Number(editing.price_monthly || 0),
      price_yearly: Number(editing.price_yearly || 0),
      currency: editing.currency || "INR",
      user_limit: num(editing.user_limit),
      student_limit: num(editing.student_limit),
      teacher_limit: num(editing.teacher_limit),
      staff_limit: num(editing.staff_limit),
      storage_limit_mb: num(editing.storage_limit_mb),
      trial_days: Number(editing.trial_days || 14),
    };
    const { error } = editing.id
      ? await supabase.from("plans").update(payload).eq("id", editing.id)
      : await supabase.from("plans").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: editing.id ? "plan.updated" : "plan.created",
      targetType: "plan",
      targetId: editing.id ?? payload.key,
      targetLabel: payload.name,
      newValue: payload,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    setEditing(null);
    if (create) navigate({ to: "/platform/subscriptions", search: {} });
    toast.success("Plan saved.");
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Subscriptions"
        description="Plans, limits and trial durations are all configurable data — nothing is hardcoded."
        actions={
          <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => setEditing(EMPTY)}>
            Create plan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <OwnerCard key={p.id} title={p.name}>
            <p className="text-sm text-slate-400">{p.description}</p>
            <p className="mt-3 font-display text-2xl font-semibold text-white">
              {p.currency} {Number(p.price_monthly).toLocaleString()}
              <span className="text-sm font-normal text-slate-500"> / month</span>
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-400">
              <li>Users: {p.user_limit ?? "Unlimited"}</li>
              <li>Students: {p.student_limit ?? "Unlimited"}</li>
              <li>Teachers: {p.teacher_limit ?? "Unlimited"}</li>
              <li>Staff: {p.staff_limit ?? "Unlimited"}</li>
              <li>Storage: {p.storage_limit_mb ? `${p.storage_limit_mb} MB` : "Unlimited"}</li>
              <li>Trial: {p.trial_days} days</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-white/15 bg-white/5 text-slate-200"
              onClick={() =>
                setEditing({
                  id: p.id,
                  key: p.key,
                  name: p.name,
                  description: p.description ?? "",
                  price_monthly: String(p.price_monthly),
                  price_yearly: String(p.price_yearly),
                  currency: p.currency,
                  user_limit: p.user_limit?.toString() ?? "",
                  student_limit: p.student_limit?.toString() ?? "",
                  teacher_limit: p.teacher_limit?.toString() ?? "",
                  staff_limit: p.staff_limit?.toString() ?? "",
                  storage_limit_mb: p.storage_limit_mb?.toString() ?? "",
                  trial_days: String(p.trial_days),
                })
              }
            >
              Edit plan
            </Button>
          </OwnerCard>
        ))}
      </div>

      <OwnerCard title="Institution subscriptions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                {["Institution", "Plan", "Status", "Trial ends", "Renews", "Students", ""].map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {institutions.map((i) => (
                <tr key={i.id} className="text-slate-300">
                  <td className="py-2.5 pr-4 text-slate-100">{i.name}</td>
                  <td className="py-2.5 pr-4">{i.plan ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <OwnerBadge value={i.subStatus} />
                  </td>
                  <td className="py-2.5 pr-4 text-xs">
                    {i.trialEndsAt ? new Date(i.trialEndsAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs">
                    {i.renewsAt ? new Date(i.renewsAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2.5 pr-4">{i.students}</td>
                  <td className="py-2.5">
                    <Button asChild variant="ghost" size="sm" className="text-slate-400">
                      <Link
                        to="/platform/institutions/$institutionId"
                        params={{ institutionId: i.id }}
                        search={{ tab: "subscription" }}
                      >
                        Manage
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OwnerCard>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            if (create) navigate({ to: "/platform/subscriptions", search: {} });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit plan" : "Create plan"}</DialogTitle>
            <DialogDescription>Pricing and limits are stored as configurable data.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <form onSubmit={savePlan} className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Plan name"],
                  ["key", "Key"],
                  ["description", "Description"],
                  ["currency", "Currency"],
                  ["price_monthly", "Monthly price"],
                  ["price_yearly", "Yearly price"],
                  ["user_limit", "User limit"],
                  ["student_limit", "Student limit"],
                  ["teacher_limit", "Teacher limit"],
                  ["staff_limit", "Staff limit"],
                  ["storage_limit_mb", "Storage limit (MB)"],
                  ["trial_days", "Trial days"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`plan-${key}`}>{label}</Label>
                  <Input
                    id={`plan-${key}`}
                    value={editing[key] ?? ""}
                    onChange={(e) => setEditing((f) => (f ? { ...f, [key]: e.target.value } : f))}
                  />
                </div>
              ))}
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save plan</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
