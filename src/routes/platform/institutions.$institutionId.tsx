import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OwnerBadge, OwnerCard, OwnerPageHeader, StatTile } from "@/components/platform-shell";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  VIEW_AS_ROLES,
  formatBytes,
  logPlatformAudit,
  useFeatureFlags,
  usePlans,
} from "@/lib/platform";
import {
  createInstitutionUser,
  setInstitutionUserPassword,
} from "@/lib/platform-users.functions";
import { startViewAs } from "@/lib/view-as";

const TABS = [
  "overview",
  "users",
  "students",
  "teachers",
  "staff",
  "classes",
  "subjects",
  "examinations",
  "marks",
  "documents",
  "reports",
  "permissions",
  "subscription",
  "audit",
  "activity",
] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/platform/institutions/$institutionId")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab | undefined } => ({
    tab: TABS.includes(search["tab"] as Tab) ? (search["tab"] as Tab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Institution overview — Edqorix control plane" },
      {
        name: "description",
        content: "Full institution overview: users, academics, examinations, storage and subscription.",
      },
      { property: "og:title", content: "Institution overview — Edqorix" },
      { property: "og:description", content: "Platform owner institution overview." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InstitutionDetail,
});

function useInstitutionBundle(institutionId: string) {
  return useQuery({
    queryKey: ["platform-institution", institutionId],
    queryFn: async () => {
      const [
        inst,
        members,
        profiles,
        students,
        depts,
        courses,
        sections,
        exams,
        sheets,
        docs,
        audit,
        sub,
        features,
        roles,
      ] = await Promise.all([
        supabase.from("institutions").select("*").eq("id", institutionId).single(),
        supabase.from("memberships").select("*").eq("institution_id", institutionId),
        supabase.from("profiles").select("id, full_name, email, phone, designation"),
        supabase.from("students").select("*").eq("institution_id", institutionId),
        supabase.from("departments").select("*").eq("institution_id", institutionId),
        supabase.from("courses").select("*").eq("institution_id", institutionId),
        supabase.from("sections").select("*").eq("institution_id", institutionId),
        supabase.from("exams").select("*").eq("institution_id", institutionId),
        supabase.from("mark_sheets").select("*").eq("institution_id", institutionId),
        supabase.from("documents").select("*").eq("institution_id", institutionId),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("institution_id", institutionId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("subscriptions")
          .select("*, plans(name, key)")
          .eq("institution_id", institutionId)
          .maybeSingle(),
        supabase.from("institution_features").select("*").eq("institution_id", institutionId),
        supabase.from("roles").select("*").eq("institution_id", institutionId),
      ]);
      if (inst.error) throw inst.error;
      const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      return {
        institution: inst.data,
        members: (members.data ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null })),
        students: students.data ?? [],
        departments: depts.data ?? [],
        courses: courses.data ?? [],
        sections: sections.data ?? [],
        exams: exams.data ?? [],
        sheets: sheets.data ?? [],
        documents: docs.data ?? [],
        audit: audit.data ?? [],
        subscription: sub.data,
        features: features.data ?? [],
        roles: roles.data ?? [],
      };
    },
  });
}

function InstitutionDetail() {
  const { institutionId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const active: Tab = tab ?? "overview";
  const { data, isLoading } = useInstitutionBundle(institutionId);
  const [viewAsOpen, setViewAsOpen] = useState(false);

  if (isLoading || !data) {
    return <p className="text-sm text-slate-500">Loading institution…</p>;
  }

  const inst = data.institution;
  const storage = data.documents.reduce((s, d) => s + (d.file_size ?? 0), 0);
  const teachers = data.members.filter((m) => m.role === "faculty" || m.role === "hod");
  const staff = data.members.filter((m) => m.role === "exam_cell");
  const admins = data.members.filter((m) => m.role === "admin");

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title={inst.name}
        description={`Institution ID ${inst.code ?? "—"} · ${inst.type} · ${
          [inst.city, inst.state, inst.country].filter(Boolean).join(", ") || "location not set"
        }`}
        actions={
          <>
            <OwnerBadge value={inst.status} />
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-slate-200"
              onClick={() => setViewAsOpen(true)}
            >
              View as…
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() =>
              navigate({
                to: "/platform/institutions/$institutionId",
                params: { institutionId },
                search: { tab: t },
              })
            }
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
              active === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {t === "permissions" ? "Roles & permissions" : t}
          </button>
        ))}
      </div>

      {active === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Students" value={data.students.length} />
            <StatTile label="Teachers" value={teachers.length} tone="violet" />
            <StatTile label="Staff" value={staff.length} tone="amber" />
            <StatTile label="Administrators" value={admins.length} tone="emerald" />
            <StatTile label="Classes / sections" value={data.sections.length} />
            <StatTile label="Subjects" value={data.courses.length} tone="violet" />
            <StatTile label="Active examinations" value={data.exams.length} tone="emerald" />
            <StatTile label="Storage used" value={formatBytes(storage)} tone="amber" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <OwnerCard title="Institution profile">
              <dl className="space-y-2 text-sm">
                {[
                  ["Institution ID", inst.code],
                  ["Type", inst.type],
                  ["Address", inst.address],
                  ["Contact email", inst.contact_email],
                  ["Contact phone", inst.contact_phone],
                  ["Created", new Date(inst.created_at).toLocaleString()],
                  [
                    "Last activity",
                    inst.last_activity_at ? new Date(inst.last_activity_at).toLocaleString() : "—",
                  ],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right text-slate-200">{(v as string) || "—"}</dd>
                  </div>
                ))}
              </dl>
            </OwnerCard>
            <OwnerCard title="Recent activity">
              <ActivityList rows={data.audit.slice(0, 8)} />
            </OwnerCard>
          </div>
        </div>
      ) : null}

      {active === "users" ? (
        <MembersManager
          institutionId={institutionId}
          institutionName={inst.name}
          members={data.members}
        />
      ) : null}


      {active === "students" ? (
        <SimpleTable
          columns={["Roll number", "Name", "Email", "Semester", "Status"]}
          rows={data.students.map((s) => [
            s.roll_number,
            s.full_name,
            s.email ?? "—",
            String(s.current_semester),
            s.status,
          ])}
        />
      ) : null}

      {active === "teachers" ? (
        <SimpleTable
          columns={["Name", "Email", "Role", "Designation", "Status"]}
          rows={teachers.map((m) => [
            m.profile?.full_name ?? "Unknown",
            m.profile?.email ?? "—",
            m.role,
            m.designation ?? "—",
            m.status,
          ])}
        />
      ) : null}

      {active === "staff" ? (
        <SimpleTable
          columns={["Name", "Email", "Designation", "Status"]}
          rows={staff.map((m) => [
            m.profile?.full_name ?? "Unknown",
            m.profile?.email ?? "—",
            m.designation ?? "—",
            m.status,
          ])}
        />
      ) : null}

      {active === "classes" ? (
        <SimpleTable
          columns={["Section", "Room", "Created"]}
          rows={data.sections.map((s) => [
            s.name,
            s.room ?? "—",
            new Date(s.created_at).toLocaleDateString(),
          ])}
        />
      ) : null}

      {active === "subjects" ? (
        <SimpleTable
          columns={["Code", "Title", "Credits", "Semester"]}
          rows={data.courses.map((c) => [c.code, c.title, String(c.credits), String(c.semester)])}
        />
      ) : null}

      {active === "examinations" ? (
        <SimpleTable
          columns={["Title", "Type", "Max marks", "Pass marks", "Date"]}
          rows={data.exams.map((e) => [
            e.title,
            e.exam_type,
            String(e.max_marks),
            String(e.pass_marks),
            e.exam_date ?? "—",
          ])}
        />
      ) : null}

      {active === "marks" ? (
        <SimpleTable
          columns={["Mark sheet", "Status", "Submitted", "Verified", "Published"]}
          rows={data.sheets.map((s) => [
            s.id.slice(0, 8),
            s.status,
            s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—",
            s.verified_at ? new Date(s.verified_at).toLocaleDateString() : "—",
            s.published_at ? new Date(s.published_at).toLocaleDateString() : "—",
          ])}
        />
      ) : null}

      {active === "documents" ? (
        <SimpleTable
          columns={["Title", "Category", "Size", "Uploaded"]}
          rows={data.documents.map((d) => [
            d.title,
            d.category,
            formatBytes(d.file_size ?? 0),
            new Date(d.created_at).toLocaleDateString(),
          ])}
        />
      ) : null}

      {active === "reports" ? (
        <OwnerCard title="Reporting activity">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Published sheets" value={data.sheets.filter((s) => s.status === "published").length} />
            <StatTile
              label="Awaiting verification"
              value={data.sheets.filter((s) => s.status === "submitted").length}
              tone="amber"
            />
            <StatTile
              label="Returned for correction"
              value={data.sheets.filter((s) => s.status === "returned").length}
              tone="rose"
            />
          </div>
        </OwnerCard>
      ) : null}

      {active === "permissions" ? (
        <InstitutionPermissions institutionId={institutionId} institutionName={inst.name} roleCount={data.roles.length} />
      ) : null}

      {active === "subscription" ? (
        <InstitutionSubscription
          institutionId={institutionId}
          institutionName={inst.name}
          subscription={data.subscription}
        />
      ) : null}

      {active === "audit" ? <ActivityList rows={data.audit} /> : null}

      {active === "activity" ? (
        <OwnerCard title="Login & platform activity">
          <ActivityList rows={data.audit.filter((r) => r.action.includes("login") || true).slice(0, 50)} />
        </OwnerCard>
      ) : null}

      <ViewAsDialog
        open={viewAsOpen}
        onOpenChange={setViewAsOpen}
        institutionId={institutionId}
        institutionName={inst.name}
      />
    </div>
  );
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <OwnerCard>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
              {columns.map((c) => (
                <th key={c} className="py-2 pr-4 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-slate-500">
                  Nothing recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="text-slate-300">
                  {r.map((cell, j) => (
                    <td key={j} className="py-2.5 pr-4 capitalize">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </OwnerCard>
  );
}

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  description: string | null;
  reason: string | null;
  created_at: string;
};

function ActivityList({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  return (
    <ul className="divide-y divide-white/5">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="font-medium text-slate-200">{r.action}</span>
          <span className="text-slate-500">{r.description ?? r.entity_type}</span>
          {r.reason ? <span className="text-xs text-amber-300/80">reason: {r.reason}</span> : null}
          <span className="ml-auto text-xs text-slate-500">
            {new Date(r.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function InstitutionPermissions({
  institutionId,
  institutionName,
  roleCount,
}: {
  institutionId: string;
  institutionName: string;
  roleCount: number;
}) {
  const queryClient = useQueryClient();
  const { data: flags = [] } = useFeatureFlags();
  const { data: overrides = [] } = useQuery({
    queryKey: ["institution-features", institutionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("institution_features")
        .select("*")
        .eq("institution_id", institutionId);
      return data ?? [];
    },
  });

  async function toggle(featureKey: string, enabled: boolean, expiresAt: string | null) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("institution_features").upsert(
      {
        institution_id: institutionId,
        feature_key: featureKey,
        enabled,
        expires_at: expiresAt,
        created_by: auth.user?.id ?? null,
      },
      { onConflict: "institution_id,feature_key" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: enabled ? "permission.granted" : "permission.revoked",
      institutionId,
      targetType: "feature",
      targetId: featureKey,
      targetLabel: institutionName,
      newValue: { enabled, expiresAt },
    });
    await queryClient.invalidateQueries({ queryKey: ["institution-features", institutionId] });
    toast.success(`${featureKey} ${enabled ? "granted" : "revoked"} for ${institutionName}.`);
  }

  return (
    <div className="space-y-4">
      <OwnerCard title={`Institution roles (${roleCount})`}>
        <p className="text-sm text-slate-400">
          Roles and granular permissions are configured inside the institution by its Super Admin.
          The platform owner grants or revokes capability access below; every override is written to
          the global audit log.
        </p>
      </OwnerCard>
      <OwnerCard title="Capability overrides">
        <ul className="divide-y divide-white/5">
          {flags.map((f) => {
            const override = overrides.find((o) => o.feature_key === f.key);
            const enabled = override ? override.enabled : f.enabled_globally;
            return (
              <li key={f.key} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.description}</p>
                  {override?.expires_at ? (
                    <p className="text-xs text-amber-300/80">
                      Expires {new Date(override.expires_at).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
                <Input
                  type="date"
                  aria-label={`${f.name} expiry`}
                  defaultValue={override?.expires_at?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    toggle(f.key, enabled, e.target.value ? new Date(e.target.value).toISOString() : null)
                  }
                  className="w-40 border-white/15 bg-white/5 text-xs text-slate-200"
                />
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggle(f.key, v, override?.expires_at ?? null)}
                  aria-label={`Toggle ${f.name}`}
                />
              </li>
            );
          })}
        </ul>
      </OwnerCard>
    </div>
  );
}

type SubRow = {
  id: string;
  plan_id: string | null;
  status: string;
  started_at: string;
  renews_at: string | null;
  trial_ends_at: string | null;
  student_limit: number | null;
  teacher_limit: number | null;
  staff_limit: number | null;
  user_limit: number | null;
  storage_limit_mb: number | null;
  notes: string | null;
  plans: { name: string; key: string } | null;
} | null;

function InstitutionSubscription({
  institutionId,
  institutionName,
  subscription,
}: {
  institutionId: string;
  institutionName: string;
  subscription: SubRow;
}) {
  const queryClient = useQueryClient();
  const { data: plans = [] } = usePlans();
  const [form, setForm] = useState({
    plan_id: subscription?.plan_id ?? "",
    status: subscription?.status ?? "trial",
    renews_at: subscription?.renews_at?.slice(0, 10) ?? "",
    trial_ends_at: subscription?.trial_ends_at?.slice(0, 10) ?? "",
    student_limit: subscription?.student_limit?.toString() ?? "",
    teacher_limit: subscription?.teacher_limit?.toString() ?? "",
    staff_limit: subscription?.staff_limit?.toString() ?? "",
    user_limit: subscription?.user_limit?.toString() ?? "",
    storage_limit_mb: subscription?.storage_limit_mb?.toString() ?? "",
    notes: subscription?.notes ?? "",
  });

  async function save() {
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const payload = {
      institution_id: institutionId,
      plan_id: form.plan_id || null,
      status: form.status as "trial" | "active" | "past_due" | "suspended" | "expired" | "cancelled",
      renews_at: form.renews_at ? new Date(form.renews_at).toISOString() : null,
      trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null,
      student_limit: num(form.student_limit),
      teacher_limit: num(form.teacher_limit),
      staff_limit: num(form.staff_limit),
      user_limit: num(form.user_limit),
      storage_limit_mb: num(form.storage_limit_mb),
      notes: form.notes || null,
    };
    const { error } = await supabase
      .from("subscriptions")
      .upsert(payload, { onConflict: "institution_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "subscription.changed",
      institutionId,
      targetType: "subscription",
      targetId: subscription?.id ?? institutionId,
      targetLabel: institutionName,
      oldValue: subscription,
      newValue: payload,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-institution", institutionId] });
    await queryClient.invalidateQueries({ queryKey: ["platform-institutions"] });
    toast.success("Subscription updated.");
  }

  return (
    <OwnerCard title="Subscription">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-slate-300">Plan</Label>
          <select
            value={form.plan_id}
            onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
            className="h-9 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100"
          >
            <option value="">No plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id} className="text-slate-900">
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Status</Label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="h-9 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100"
          >
            {["trial", "active", "past_due", "suspended", "expired", "cancelled"].map((s) => (
              <option key={s} value={s} className="text-slate-900">
                {s}
              </option>
            ))}
          </select>
        </div>
        {(
          [
            ["renews_at", "Renewal date", "date"],
            ["trial_ends_at", "Trial ends", "date"],
            ["user_limit", "User limit", "text"],
            ["student_limit", "Student limit", "text"],
            ["teacher_limit", "Teacher limit", "text"],
            ["staff_limit", "Staff limit", "text"],
            ["storage_limit_mb", "Storage limit (MB)", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key} className="space-y-2">
            <Label className="text-slate-300">{label}</Label>
            <Input
              type={type}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="border-white/15 bg-white/5 text-slate-100"
            />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label className="text-slate-300">Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="border-white/15 bg-white/5 text-slate-100"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          className="border-white/15 bg-white/5 text-slate-200"
          onClick={() =>
            setForm((f) => ({
              ...f,
              trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              status: "trial",
            }))
          }
        >
          Extend trial 14 days
        </Button>
        <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={save}>
          Save subscription
        </Button>
      </div>
    </OwnerCard>
  );
}

function ViewAsDialog({
  open,
  onOpenChange,
  institutionId,
  institutionName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  institutionName: string;
}) {
  const navigate = useNavigate();
  const [role, setRole] = useState(VIEW_AS_ROLES[0]!.key);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (reason.trim().length < 5) {
      toast.error("A reason is required for every view-as session.");
      return;
    }
    setBusy(true);
    try {
      await startViewAs({
        institutionId,
        institutionName,
        role,
        roleLabel: VIEW_AS_ROLES.find((r) => r.key === role)?.label ?? role,
        reason: reason.trim(),
      });
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View as a role in {institutionName}</DialogTitle>
          <DialogDescription>
            This creates an audited platform-owner session — it does not sign you in as any user. A
            persistent banner stays visible until you exit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="va-role">Role</Label>
            <select
              id="va-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {VIEW_AS_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="va-reason">Reason</Label>
            <Textarea id="va-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start view-as session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MEMBER_ROLES = [
  { key: "admin", label: "Principal / Super Admin" },
  { key: "exam_cell", label: "Staff / Management" },
  { key: "hod", label: "Head of Department" },
  { key: "faculty", label: "Teacher" },
] as const;

const MEMBER_STATUSES = ["active", "suspended", "deactivated"] as const;

type MembershipPatch = {
  role?: (typeof MEMBER_ROLES)[number]["key"];
  status?: (typeof MEMBER_STATUSES)[number];
  is_active?: boolean;
  is_class_teacher?: boolean;
};

type MemberRecord = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  is_class_teacher: boolean;
  designation: string | null;
  created_at: string;
  profile: { id: string; full_name: string; email: string } | null;
};

function viewAsKeyFor(member: MemberRecord) {
  if (member.role === "admin") return "admin";
  if (member.role === "exam_cell") return "staff";
  if (member.role === "hod") return "principal";
  return member.is_class_teacher ? "class_teacher" : "subject_teacher";
}

function MembersManager({
  institutionId,
  institutionName,
  members,
}: {
  institutionId: string;
  institutionName: string;
  members: MemberRecord[];
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [target, setTarget] = useState<MemberRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<MemberRecord | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function patch(member: MemberRecord, patchValue: MembershipPatch, label: string) {
    const { error } = await supabase.from("memberships").update(patchValue).eq("id", member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "institution_user.updated",
      institutionId,
      targetType: "membership",
      targetId: member.id,
      targetLabel: member.profile?.full_name ?? member.user_id,
      oldValue: { role: member.role, status: member.status, is_class_teacher: member.is_class_teacher },
      newValue: patchValue,
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-institution", institutionId] });
    toast.success(label);
  }

  async function openAsUser() {
    if (!target) return;
    if (reason.trim().length < 5) {
      toast.error("A reason is required before entering a user's account view.");
      return;
    }
    setBusy(true);
    try {
      const roleKey = viewAsKeyFor(target);
      await startViewAs({
        institutionId,
        institutionName,
        role: roleKey,
        roleLabel: VIEW_AS_ROLES.find((r) => r.key === roleKey)?.label ?? roleKey,
        reason: reason.trim(),
        userId: target.user_id,
        userName: target.profile?.full_name ?? target.profile?.email ?? "Institution user",
      });
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open that account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OwnerCard
      title={`Institution users (${members.length})`}
      description="Assign principals, staff, class teachers and subject teachers, change account status, or open the institution through any user's account."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Create login IDs directly — the account can sign in immediately with the password you set.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Create new user ID
        </Button>
      </div>
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        institutionId={institutionId}
        institutionName={institutionName}
      />
      <ResetPasswordDialog
        member={resetTarget}
        institutionId={institutionId}
        onClose={() => setResetTarget(null)}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
              {["User", "Role", "Class teacher", "Status", "Joined", ""].map((c) => (
                <th key={c} className="py-2 pr-4 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No users in this institution yet.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="text-slate-300">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate-100">{m.profile?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-500">{m.profile?.email ?? "—"}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <select
                      aria-label={`Role for ${m.profile?.full_name ?? "user"}`}
                      value={m.role}
                      onChange={(e) =>
                        patch(
                          m,
                          { role: e.target.value as (typeof MEMBER_ROLES)[number]["key"] },
                          "Role updated for this institution.",
                        )
                      }
                      className="h-9 rounded-md border border-white/15 bg-slate-900 px-2 text-sm text-slate-100"
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Switch
                      checked={m.is_class_teacher}
                      onCheckedChange={(v) =>
                        patch(
                          m,
                          { is_class_teacher: v },
                          v ? "Marked as class teacher." : "Class teacher flag removed.",
                        )
                      }
                      aria-label={`Class teacher for ${m.profile?.full_name ?? "user"}`}
                    />
                  </td>
                  <td className="py-2.5 pr-4">
                    <select
                      aria-label={`Status for ${m.profile?.full_name ?? "user"}`}
                      value={m.status}
                      onChange={(e) =>
                        patch(
                          m,
                          {
                            status: e.target.value as (typeof MEMBER_STATUSES)[number],
                            is_active: e.target.value === "active",
                          },
                          "Account status updated.",
                        )
                      }
                      className="h-9 rounded-md border border-white/15 bg-slate-900 px-2 text-sm capitalize text-slate-100"
                    >
                      {MEMBER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-white/5 text-slate-200"
                      onClick={() => {
                        setTarget(m);
                        setReason("");
                      }}
                    >
                      Open their account
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 text-slate-300"
                      onClick={() => setResetTarget(m)}
                    >
                      Set password
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(target)} onOpenChange={(v) => (v ? null : setTarget(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open {target?.profile?.full_name ?? "this user"}'s account</DialogTitle>
            <DialogDescription>
              You enter {institutionName} with this user's role and screens. The session is audited and
              a banner stays visible until you exit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="open-reason">Reason</Label>
            <Textarea
              id="open-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Support request #1234 — verifying marks entry access"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={openAsUser} disabled={busy}>
              {busy ? "Opening…" : "Open account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerCard>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  institutionId,
  institutionName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  institutionName: string;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    designation: "",
    role: "faculty" as (typeof MEMBER_ROLES)[number]["key"],
    isClassTeacher: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createInstitutionUser({
        data: {
          institutionId,
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          designation: form.designation.trim() || undefined,
          role: form.role,
          isClassTeacher: form.isClassTeacher,
        },
      });
      await logPlatformAudit({
        action: "institution_user.created",
        institutionId,
        targetType: "user",
        targetId: res.userId,
        targetLabel: `${form.fullName} (${form.email})`,
        newValue: { role: form.role, institution: institutionName, reused: res.reused },
      });
      await queryClient.invalidateQueries({ queryKey: ["platform-institution", institutionId] });
      toast.success(
        res.reused
          ? "Existing account linked to this institution with the new password."
          : "Account created and ready to sign in.",
      );
      setForm({ fullName: "", email: "", password: "", designation: "", role: "faculty", isClassTeacher: false });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create that account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user ID</DialogTitle>
          <DialogDescription>
            Creates a confirmed login for {institutionName} as principal, staff, HOD or teacher.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cu-name">Full name</Label>
              <Input id="cu-name" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-email">Email (login ID)</Label>
              <Input id="cu-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-pass">Temporary password</Label>
              <Input id="cu-pass" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-role">Role</Label>
              <select
                id="cu-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof f.role }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {MEMBER_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-desig">Designation (optional)</Label>
              <Input id="cu-desig" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                id="cu-ct"
                checked={form.isClassTeacher}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isClassTeacher: v }))}
              />
              <Label htmlFor="cu-ct">Also a class teacher</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  member,
  institutionId,
  onClose,
}: {
  member: MemberRecord | null;
  institutionId: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!member) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await setInstitutionUserPassword({ data: { userId: member.user_id, password } });
      await logPlatformAudit({
        action: "institution_user.password_reset",
        institutionId,
        targetType: "user",
        targetId: member.user_id,
        targetLabel: member.profile?.full_name ?? member.user_id,
      });
      toast.success("Password updated.");
      setPassword("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(member)} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            Sets a new sign-in password for {member?.profile?.full_name ?? "this user"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rp-pass">New password</Label>
          <Input id="rp-pass" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BulkRow = {
  line: number;
  fullName: string;
  email: string;
  password: string;
  role: (typeof MEMBER_ROLES)[number]["key"];
  designation?: string;
  isClassTeacher?: boolean;
};

type BulkResult = {
  line: number;
  email: string;
  fullName: string;
  role: string;
  status: "created" | "updated" | "failed";
  message?: string;
};

const ROLE_ALIASES: Record<string, (typeof MEMBER_ROLES)[number]["key"]> = {
  admin: "admin",
  principal: "admin",
  "super admin": "admin",
  super_admin: "admin",
  staff: "exam_cell",
  management: "exam_cell",
  exam_cell: "exam_cell",
  "exam cell": "exam_cell",
  hod: "hod",
  "head of department": "hod",
  teacher: "faculty",
  faculty: "faculty",
  "class teacher": "faculty",
  "subject teacher": "faculty",
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function parseUsersCsv(text: string): { rows: BulkRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) return { rows: [], errors: ["The file needs a header row and at least one user."] };
  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string, ...alts: string[]) =>
    [name, ...alts].map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
  const iName = idx("full_name", "name");
  const iEmail = idx("email");
  const iPass = idx("password", "temporary_password");
  const iRole = idx("role");
  const iDesig = idx("designation");
  const iClass = idx("class_teacher", "is_class_teacher");

  if (iName < 0 || iEmail < 0 || iPass < 0 || iRole < 0) {
    return {
      rows: [],
      errors: ["Header must include full_name, email, password and role columns."],
    };
  }

  const rows: BulkRow[] = [];
  lines.slice(1).forEach((line, i) => {
    const lineNo = i + 2;
    const cells = splitCsvLine(line);
    const fullName = cells[iName] ?? "";
    const email = (cells[iEmail] ?? "").toLowerCase();
    const password = cells[iPass] ?? "";
    const roleRaw = (cells[iRole] ?? "").toLowerCase();
    const role = ROLE_ALIASES[roleRaw];
    const classFlag = (cells[iClass] ?? "").toLowerCase();

    if (fullName.length < 2) errors.push(`Line ${lineNo}: full name is missing.`);
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`Line ${lineNo}: invalid email.`);
    else if (password.length < 8) errors.push(`Line ${lineNo}: password must be 8+ characters.`);
    else if (!role) errors.push(`Line ${lineNo}: unknown role "${cells[iRole] ?? ""}".`);
    else
      rows.push({
        line: lineNo,
        fullName,
        email,
        password,
        role,
        designation: iDesig >= 0 ? cells[iDesig] || undefined : undefined,
        isClassTeacher:
          roleRaw === "class teacher" || ["yes", "true", "1", "y"].includes(classFlag),
      });
  });

  return { rows, errors };
}

const CSV_TEMPLATE =
  "full_name,email,password,role,designation,class_teacher\n" +
  "Anita Sharma,anita@school.edu,Passw0rd!23,principal,Principal,no\n" +
  "Ravi Kumar,ravi@school.edu,Passw0rd!23,staff,Exam cell,no\n" +
  "Meera Nair,meera@school.edu,Passw0rd!23,hod,Head of Science,no\n" +
  "Sunil Das,sunil@school.edu,Passw0rd!23,teacher,Mathematics,yes\n";

function BulkImportUsersDialog({
  open,
  onOpenChange,
  institutionId,
  institutionName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  institutionId: string;
  institutionName: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setRows([]);
    setErrors([]);
    setResults(null);
    setFileName("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const text = await file.text();
    const parsed = parseUsersCsv(text);
    setRows(parsed.rows);
    setErrors(parsed.errors);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "edqorix-users-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importRows() {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const res = await bulkCreateInstitutionUsers({ data: { institutionId, rows } });
      setResults(res.results);
      const created = res.results.filter((r) => r.status === "created").length;
      const updated = res.results.filter((r) => r.status === "updated").length;
      const failed = res.results.filter((r) => r.status === "failed").length;
      await queryClient.invalidateQueries({ queryKey: ["platform-institution", institutionId] });
      if (failed === 0) toast.success(`${created} created, ${updated} updated in ${institutionName}.`);
      else toast.warning(`${created} created, ${updated} updated, ${failed} failed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import users</DialogTitle>
          <DialogDescription>
            Upload a CSV of principals, staff, HODs and teachers. Every row is provisioned and audited
            individually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept=".csv,text/csv" onChange={onFile} className="max-w-xs" />
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              Download template
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Columns: full_name, email, password, role (principal / staff / hod / teacher), designation,
            class_teacher.
          </p>

          {fileName ? (
            <p className="text-sm text-slate-300">
              {fileName} — {rows.length} valid row{rows.length === 1 ? "" : "s"}
              {errors.length ? `, ${errors.length} skipped` : ""}
            </p>
          ) : null}

          {errors.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
              {errors.map((er) => (
                <p key={er}>{er}</p>
              ))}
            </div>
          ) : null}

          {rows.length > 0 && !results ? (
            <div className="max-h-56 overflow-auto rounded-md border border-white/10">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    {["Line", "Name", "Email", "Role"].map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {rows.map((r) => (
                    <tr key={`${r.line}-${r.email}`}>
                      <td className="px-3 py-1.5 text-slate-500">{r.line}</td>
                      <td className="px-3 py-1.5">{r.fullName}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">
                        {MEMBER_ROLES.find((m) => m.key === r.role)?.label ?? r.role}
                        {r.isClassTeacher ? " · class teacher" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {results ? (
            <div className="max-h-56 overflow-auto rounded-md border border-white/10">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    {["Line", "Email", "Result"].map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {results.map((r) => (
                    <tr key={`${r.line}-${r.email}`}>
                      <td className="px-3 py-1.5 text-slate-500">{r.line}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={
                            r.status === "failed"
                              ? "text-rose-300"
                              : r.status === "updated"
                                ? "text-amber-300"
                                : "text-emerald-300"
                          }
                        >
                          {r.status}
                        </span>
                        {r.message ? <span className="ml-2 text-xs text-slate-500">{r.message}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={importRows} disabled={busy || rows.length === 0 || Boolean(results)}>
            {busy ? "Importing…" : `Import ${rows.length || ""} user${rows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
