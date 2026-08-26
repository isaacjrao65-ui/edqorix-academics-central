import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  INST_STATUSES,
  formatBytes,
  logPlatformAudit,
  usePlans,
  usePlatformInstitutions,
  type InstStatus,
} from "@/lib/platform";

export const Route = createFileRoute("/platform/institutions/")({
  validateSearch: (search: Record<string, unknown>): { status?: string | undefined; create?: "1" | undefined } => ({
    status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
    create: search["create"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All institutions — Edqorix control plane" },
      {
        name: "description",
        content: "Every institution using Edqorix with plan, status, usage and lifecycle actions.",
      },
      { property: "og:title", content: "All institutions — Edqorix" },
      { property: "og:description", content: "Platform-wide institution management." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InstitutionsPage,
});

function InstitutionsPage() {
  const { status, create } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: institutions = [], isLoading } = usePlatformInstitutions();
  const { data: plans = [] } = usePlans();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(create === "1");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return institutions.filter((i) => {
      if (status && i.status !== status) return false;
      if (!needle) return true;
      return [i.name, i.code, i.city, i.adminEmail, i.type]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [institutions, status, q]);

  async function setStatus(id: string, name: string, next: InstStatus, previous: InstStatus) {
    const { error } = await supabase.from("institutions").update({ status: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: `institution.${next}`,
      institutionId: id,
      targetType: "institution",
      targetId: id,
      targetLabel: name,
      oldValue: { status: previous },
      newValue: { status: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-institutions"] });
    toast.success(`${name} is now ${next}.`);
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="All institutions"
        description="Every institution on Edqorix. Institution data stays isolated — only the platform owner sees this list."
        actions={
          <Button
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
            onClick={() => setCreating(true)}
          >
            Create institution
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, ID, city or admin…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={status ? "ghost" : "secondary"}
            className={status ? "text-slate-400" : ""}
            onClick={() => navigate({ to: "/platform/institutions", search: {} })}
          >
            All
          </Button>
          {INST_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "secondary" : "ghost"}
              className={status === s ? "capitalize" : "capitalize text-slate-400"}
              onClick={() => navigate({ to: "/platform/institutions", search: { status: s } })}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <OwnerCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                <th className="py-2 pr-4 font-medium">Institution</th>
                <th className="py-2 pr-4 font-medium">ID</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 pr-4 font-medium">Students</th>
                <th className="py-2 pr-4 font-medium">Teachers</th>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 pr-4 font-medium">Storage</th>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-slate-500">
                    Loading institutions…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-slate-500">
                    No institutions match this view.
                  </td>
                </tr>
              ) : (
                rows.map((i) => (
                  <tr key={i.id} className="text-slate-300">
                    <td className="py-2.5 pr-4">
                      <Link
                        to="/platform/institutions/$institutionId"
                        params={{ institutionId: i.id }}
                        className="font-medium text-slate-100 hover:text-cyan-300"
                      >
                        {i.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">{i.code}</td>
                    <td className="py-2.5 pr-4 capitalize">{i.type}</td>
                    <td className="py-2.5 pr-4">
                      {[i.city, i.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">{i.adminEmail ?? "—"}</td>
                    <td className="py-2.5 pr-4">{i.students}</td>
                    <td className="py-2.5 pr-4">{i.teachers}</td>
                    <td className="py-2.5 pr-4">{i.staff}</td>
                    <td className="py-2.5 pr-4">{formatBytes(i.storageBytes)}</td>
                    <td className="py-2.5 pr-4">{i.plan ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <OwnerBadge value={i.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {new Date(i.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${i.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({
                                to: "/platform/institutions/$institutionId",
                                params: { institutionId: i.id },
                              })
                            }
                          >
                            View & manage
                          </DropdownMenuItem>
                          {i.status !== "active" ? (
                            <DropdownMenuItem
                              onClick={() => setStatus(i.id, i.name, "active", i.status)}
                            >
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                          {i.status !== "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => setStatus(i.id, i.name, "suspended", i.status)}
                            >
                              Suspend
                            </DropdownMenuItem>
                          ) : null}
                          {i.status !== "archived" ? (
                            <DropdownMenuItem
                              onClick={() => setStatus(i.id, i.name, "archived", i.status)}
                            >
                              Archive
                            </DropdownMenuItem>
                          ) : null}
                          {i.contact_email || i.adminEmail ? (
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${i.contact_email ?? i.adminEmail}`}>Contact</a>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({
                                to: "/platform/institutions/$institutionId",
                                params: { institutionId: i.id },
                                search: { tab: "activity" },
                              })
                            }
                          >
                            View activity
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OwnerCard>

      <CreateInstitutionDialog
        open={creating}
        onOpenChange={(v) => {
          setCreating(v);
          if (!v && create) navigate({ to: "/platform/institutions", search: {} });
        }}
        plans={plans}
      />
    </div>
  );
}

type PlanRow = {
  id: string;
  key: string;
  name: string;
  student_limit: number | null;
  teacher_limit: number | null;
  staff_limit: number | null;
  user_limit: number | null;
  storage_limit_mb: number | null;
  trial_days: number;
};

function CreateInstitutionDialog({
  open,
  onOpenChange,
  plans,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: PlanRow[];
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "school",
    address: "",
    city: "",
    state: "",
    country: "India",
    contact_email: "",
    contact_phone: "",
    adminEmail: "",
    planKey: "starter",
    student_limit: "",
    teacher_limit: "",
    staff_limit: "",
    storage_limit_mb: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      return;
    }
    const { data: inst, error } = await supabase
      .from("institutions")
      .insert({
        name: form.name,
        type: form.type as "school" | "college" | "institute" | "university",
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        status: "pending",
        created_by: auth.user.id,
      })
      .select("id, name, code")
      .single();
    if (error || !inst) {
      setBusy(false);
      toast.error(error?.message ?? "Could not create institution");
      return;
    }

    const plan = plans.find((p) => p.key === form.planKey);
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    await supabase.from("subscriptions").upsert(
      {
        institution_id: inst.id,
        plan_id: plan?.id ?? null,
        status: "trial",
        trial_ends_at: new Date(
          Date.now() + (plan?.trial_days ?? 14) * 86400000,
        ).toISOString(),
        student_limit: num(form.student_limit),
        teacher_limit: num(form.teacher_limit),
        staff_limit: num(form.staff_limit),
        storage_limit_mb: num(form.storage_limit_mb),
      },
      { onConflict: "institution_id" },
    );

    if (form.adminEmail.trim()) {
      await supabase.from("invitations").insert({
        institution_id: inst.id,
        email: form.adminEmail.trim().toLowerCase(),
        role: "admin",
        invited_by: auth.user.id,
        expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      });
    }

    await logPlatformAudit({
      action: "institution.created",
      institutionId: inst.id,
      targetType: "institution",
      targetId: inst.id,
      targetLabel: inst.name,
      newValue: { code: inst.code, plan: form.planKey, admin: form.adminEmail },
    });

    setBusy(false);
    await queryClient.invalidateQueries({ queryKey: ["platform-institutions"] });
    toast.success(`${inst.name} created as ${inst.code}. Primary admin invited.`);
    onOpenChange(false);
    navigate({
      to: "/platform/institutions/$institutionId",
      params: { institutionId: inst.id },
      search: {},
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create institution</DialogTitle>
          <DialogDescription>
            Institution → primary administrator invite → plan → limits → ready.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ci-name">Institution name</Label>
              <Input id="ci-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-type">Type</Label>
              <select
                id="ci-type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="institute">Institute</option>
                <option value="university">University</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ci-address">Address</Label>
              <Textarea id="ci-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-city">City</Label>
              <Input id="ci-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-state">State</Label>
              <Input id="ci-state" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-email">Contact email</Label>
              <Input
                id="ci-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-phone">Contact phone</Label>
              <Input id="ci-phone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-admin">Primary administrator email</Label>
              <Input
                id="ci-admin"
                type="email"
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-plan">Subscription plan</Label>
              <select
                id="ci-plan"
                value={form.planKey}
                onChange={(e) => set("planKey", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-students">Student limit override</Label>
              <Input id="ci-students" inputMode="numeric" value={form.student_limit} onChange={(e) => set("student_limit", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-teachers">Teacher limit override</Label>
              <Input id="ci-teachers" inputMode="numeric" value={form.teacher_limit} onChange={(e) => set("teacher_limit", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-staff">Staff limit override</Label>
              <Input id="ci-staff" inputMode="numeric" value={form.staff_limit} onChange={(e) => set("staff_limit", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-storage">Storage limit (MB)</Label>
              <Input id="ci-storage" inputMode="numeric" value={form.storage_limit_mb} onChange={(e) => set("storage_limit_mb", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create institution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
