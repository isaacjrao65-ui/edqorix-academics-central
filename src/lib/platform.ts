import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type InstStatus = "active" | "trial" | "pending" | "suspended" | "expired" | "archived";
export type SubStatus = "trial" | "active" | "past_due" | "suspended" | "expired" | "cancelled";

export const INST_STATUSES: InstStatus[] = [
  "active",
  "trial",
  "pending",
  "suspended",
  "expired",
  "archived",
];

export const VIEW_AS_ROLES = [
  { key: "admin", label: "Institution Super Admin" },
  { key: "principal", label: "Principal" },
  { key: "staff", label: "Staff" },
  { key: "class_teacher", label: "Class Teacher" },
  { key: "subject_teacher", label: "Subject Teacher" },
];

/** Global platform audit trail: who → what → when → old → new → reason. */
export async function logPlatformAudit(input: {
  action: string;
  institutionId?: string | null;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { error } = await supabase.from("platform_audit_logs").insert({
    actor_id: auth.user.id,
    action: input.action,
    institution_id: input.institutionId ?? null,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    target_label: input.targetLabel ?? null,
    reason: input.reason ?? null,
    old_value: (input.oldValue ?? null) as never,
    new_value: (input.newValue ?? null) as never,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
  });
  if (error) console.error("platform audit failed", error);
}

export async function logSecurityEvent(input: {
  eventType: string;
  severity?: "info" | "warning" | "critical";
  email?: string | null;
  detail?: string | null;
  institutionId?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("security_events").insert({
    event_type: input.eventType,
    severity: input.severity ?? "info",
    email: input.email ?? null,
    detail: input.detail ?? null,
    institution_id: input.institutionId ?? null,
    user_id: auth.user?.id ?? null,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
  });
}

export function useIsPlatformOwner() {
  return useQuery({
    queryKey: ["is-platform-owner"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase.rpc("is_platform_admin");
      return data === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type PlatformInstitution = {
  id: string;
  code: string | null;
  name: string;
  short_name: string | null;
  type: string;
  status: InstStatus;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  last_activity_at: string | null;
  students: number;
  teachers: number;
  staff: number;
  admins: number;
  users: number;
  storageBytes: number;
  documents: number;
  exams: number;
  plan: string | null;
  planId: string | null;
  subStatus: SubStatus | null;
  renewsAt: string | null;
  trialEndsAt: string | null;
  adminEmail: string | null;
};

export function usePlatformInstitutions() {
  return useQuery({
    queryKey: ["platform-institutions"],
    queryFn: async (): Promise<PlatformInstitution[]> => {
      const [insts, subs, members, students, docs, exams, profiles] = await Promise.all([
        supabase
          .from("institutions")
          .select(
            "id, code, name, short_name, type, status, city, state, country, contact_email, contact_phone, created_at, last_activity_at",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("institution_id, status, renews_at, trial_ends_at, plan_id, plans(name)"),
        supabase.from("memberships").select("institution_id, role, user_id, is_class_teacher"),
        supabase.from("students").select("institution_id"),
        supabase.from("documents").select("institution_id, file_size"),
        supabase.from("exams").select("institution_id"),
        supabase.from("profiles").select("id, email"),
      ]);
      if (insts.error) throw insts.error;

      const emailById = new Map((profiles.data ?? []).map((p) => [p.id, p.email]));
      const subByInst = new Map((subs.data ?? []).map((s) => [s.institution_id, s]));

      return (insts.data ?? []).map((inst) => {
        const m = (members.data ?? []).filter((r) => r.institution_id === inst.id);
        const d = (docs.data ?? []).filter((r) => r.institution_id === inst.id);
        const sub = subByInst.get(inst.id) as
          | {
              status: SubStatus;
              renews_at: string | null;
              trial_ends_at: string | null;
              plan_id: string | null;
              plans: { name: string } | null;
            }
          | undefined;
        const admin = m.find((r) => r.role === "admin");
        return {
          ...inst,
          status: (inst.status ?? "trial") as InstStatus,
          students: (students.data ?? []).filter((r) => r.institution_id === inst.id).length,
          teachers: m.filter((r) => r.role === "faculty" || r.role === "hod").length,
          staff: m.filter((r) => r.role === "exam_cell").length,
          admins: m.filter((r) => r.role === "admin").length,
          users: new Set(m.map((r) => r.user_id)).size,
          documents: d.length,
          storageBytes: d.reduce((sum, r) => sum + (r.file_size ?? 0), 0),
          exams: (exams.data ?? []).filter((r) => r.institution_id === inst.id).length,
          plan: sub?.plans?.name ?? null,
          planId: sub?.plan_id ?? null,
          subStatus: sub?.status ?? null,
          renewsAt: sub?.renews_at ?? null,
          trialEndsAt: sub?.trial_ends_at ?? null,
          adminEmail: admin ? (emailById.get(admin.user_id) ?? null) : null,
        } as PlatformInstitution;
      });
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["platform-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInstitutionFeatures() {
  return useQuery({
    queryKey: ["institution-features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institution_features").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePermissionRequests() {
  return useQuery({
    queryKey: ["permission-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_requests")
        .select("*, institutions(name, code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, institutions(name, code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSecurityEvents() {
  return useQuery({
    queryKey: ["security-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("*, institutions(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type LoginEvent = {
  id: string;
  created_at: string;
  email: string | null;
  event_type: string;
  user_id: string | null;
  fullName: string | null;
};

/** Every sign-in on the website, newest first — name, email and time. */
export function useRecentLogins(limit = 100) {
  return useQuery({
    queryKey: ["recent-logins", limit],
    refetchInterval: 60_000,
    queryFn: async (): Promise<LoginEvent[]> => {
      const { data, error } = await supabase
        .from("security_events")
        .select("id, created_at, email, event_type, user_id")
        .in("event_type", ["sign_in", "sign_up"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        fullName: (r.user_id ? byId.get(r.user_id)?.full_name : null) ?? null,
        email: r.email ?? (r.user_id ? byId.get(r.user_id)?.email ?? null : null),
      }));
    },
  });
}



export function usePlatformAudit() {
  return useQuery({
    queryKey: ["platform-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_audit_logs")
        .select("*, institutions(name, code)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = data ?? [];
      const actorIds = [...new Set(rows.map((r) => r.actor_id))];
      const { data: profiles } = actorIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, actor: byId.get(r.actor_id) ?? null }));
    },
  });
}

export function useImpersonationSessions() {
  return useQuery({
    queryKey: ["impersonation-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impersonation_sessions")
        .select("*, institutions(name, code)")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PlatformUser = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  is_class_teacher: boolean;
  institution_id: string;
  institution: string;
  created_at: string;
  membership_id: string;
  last_login_at: string | null;
};

export function usePlatformUsers() {
  return useQuery({
    queryKey: ["platform-users"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<PlatformUser[]> => {
      const [{ data: members, error }, { data: profiles }, { data: insts }, { data: logins }] =
        await Promise.all([
          supabase
            .from("memberships")
            .select(
              "id, user_id, role, status, is_active, is_class_teacher, institution_id, created_at",
            )
            .order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, full_name, email, created_at"),
          supabase.from("institutions").select("id, name"),
          supabase
            .from("security_events")
            .select("user_id, created_at")
            .in("event_type", ["sign_in", "sign_up"])
            .order("created_at", { ascending: false })
            .limit(1000),
        ]);
      if (error) throw error;
      const p = new Map((profiles ?? []).map((r) => [r.id, r]));
      const i = new Map((insts ?? []).map((r) => [r.id, r.name]));
      const lastLogin = new Map<string, string>();
      for (const l of logins ?? []) {
        if (l.user_id && !lastLogin.has(l.user_id)) lastLogin.set(l.user_id, l.created_at);
      }

      const rows: PlatformUser[] = (members ?? []).map((m) => ({
        membership_id: m.id,
        user_id: m.user_id,
        full_name: p.get(m.user_id)?.full_name ?? "Unknown",
        email: p.get(m.user_id)?.email ?? "",
        role: m.role,
        status: m.status,
        is_active: m.is_active,
        is_class_teacher: m.is_class_teacher,
        institution_id: m.institution_id,
        institution: i.get(m.institution_id) ?? "—",
        created_at: m.created_at,
        last_login_at: lastLogin.get(m.user_id) ?? null,
      }));

      // Anyone who has signed in but has no institution membership yet still shows up here,
      // so the owner can place them straight away.
      const placed = new Set(rows.map((r) => r.user_id));
      for (const prof of profiles ?? []) {
        if (placed.has(prof.id)) continue;
        rows.push({
          membership_id: `profile:${prof.id}`,
          user_id: prof.id,
          full_name: prof.full_name || "Unknown",
          email: prof.email ?? "",
          role: "unassigned",
          status: "unassigned",
          is_active: false,
          is_class_teacher: false,
          institution_id: "",
          institution: "No institution",
          created_at: prof.created_at,
          last_login_at: lastLogin.get(prof.id) ?? null,
        });
      }
      return rows;
    },
  });
}


export function useGlobalUsage() {
  return useQuery({
    queryKey: ["platform-usage"],
    queryFn: async () => {
      const [marks, exams, docs, sheets, reqs, tickets] = await Promise.all([
        supabase.from("marks").select("id", { count: "exact", head: true }),
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("mark_sheets").select("status"),
        supabase
          .from("permission_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_progress", "waiting"]),
      ]);
      const statuses = sheets.data ?? [];
      return {
        marks: marks.count ?? 0,
        exams: exams.count ?? 0,
        documents: docs.count ?? 0,
        submitted: statuses.filter((s) => s.status !== "draft").length,
        verified: statuses.filter((s) =>
          ["verified", "approved", "published"].includes(s.status as string),
        ).length,
        published: statuses.filter((s) => s.status === "published").length,
        pendingRequests: reqs.count ?? 0,
        openTickets: tickets.count ?? 0,
      };
    },
  });
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/** Buckets a list of ISO timestamps into a simple day/week/month/year growth series. */
export function growthSeries(dates: string[], grain: "day" | "week" | "month" | "year") {
  const fmt = (d: Date) => {
    if (grain === "year") return String(d.getUTCFullYear());
    if (grain === "month") return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (grain === "week") {
      const start = new Date(d);
      start.setUTCDate(d.getUTCDate() - d.getUTCDay());
      return start.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };
  const counts = new Map<string, number>();
  for (const iso of dates) {
    const key = fmt(new Date(iso));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const keys = [...counts.keys()].sort();
  let running = 0;
  return keys.map((k) => {
    running += counts.get(k) ?? 0;
    return { period: k, added: counts.get(k) ?? 0, total: running };
  });
}
