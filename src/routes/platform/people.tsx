import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { OwnerBadge, OwnerCard, OwnerPageHeader } from "@/components/platform-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { logPlatformAudit, usePlatformUsers } from "@/lib/platform";

const ROLE_LABELS: Record<string, string> = {
  admin: "Principal / Super Admin",
  exam_cell: "Staff / Management",
  hod: "HOD",
  faculty: "Subject Teacher",
  unassigned: "No institution yet",
};

const ROLE_FILTERS = [
  { key: "admin", label: "Admins" },
  { key: "exam_cell", label: "Staff" },
  { key: "hod", label: "Principals / HOD" },
  { key: "faculty", label: "Teachers" },
];

export const Route = createFileRoute("/platform/people")({
  validateSearch: (search: Record<string, unknown>): { role?: string | undefined } => ({
    role: typeof search["role"] === "string" ? (search["role"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All platform users — Edqorix control plane" },
      {
        name: "description",
        content: "Every Edqorix user across all institutions with role, status and lifecycle actions.",
      },
      { property: "og:title", content: "All platform users — Edqorix" },
      { property: "og:description", content: "Cross-institution user directory for the platform owner." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { role } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = usePlatformUsers();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (role && u.role !== role) return false;
      if (!needle) return true;
      return [u.full_name, u.email, u.institution].some((v) => v.toLowerCase().includes(needle));
    });
  }, [users, role, q]);

  async function setStatus(
    membershipId: string,
    user: string,
    institutionId: string,
    next: "active" | "suspended" | "deactivated",
    previous: string,
  ) {
    const { error } = await supabase
      .from("memberships")
      .update({ status: next, is_active: next === "active" })
      .eq("id", membershipId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: `user.${next}`,
      institutionId,
      targetType: "membership",
      targetId: membershipId,
      targetLabel: user,
      oldValue: { status: previous },
      newValue: { status: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    toast.success(`${user} is now ${next}.`);
  }

  async function setRole(
    u: { membership_id: string; full_name: string; institution_id: string; role: string },
    next: "admin" | "exam_cell" | "hod" | "faculty",
  ) {
    const { error } = await supabase
      .from("memberships")
      .update({ role: next })
      .eq("id", u.membership_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "user.role_changed",
      institutionId: u.institution_id,
      targetType: "membership",
      targetId: u.membership_id,
      targetLabel: u.full_name,
      oldValue: { role: u.role },
      newValue: { role: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    toast.success(`${u.full_name} is now ${ROLE_LABELS[next]}.`);
  }

  async function toggleClassTeacher(u: {
    membership_id: string;
    full_name: string;
    institution_id: string;
    is_class_teacher: boolean;
  }) {
    const next = !u.is_class_teacher;
    const { error } = await supabase
      .from("memberships")
      .update({ is_class_teacher: next })
      .eq("id", u.membership_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: next ? "user.class_teacher_assigned" : "user.class_teacher_removed",
      institutionId: u.institution_id,
      targetType: "membership",
      targetId: u.membership_id,
      targetLabel: u.full_name,
      oldValue: { is_class_teacher: u.is_class_teacher },
      newValue: { is_class_teacher: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    toast.success(next ? `${u.full_name} is now a class teacher.` : `Class teacher role removed.`);
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logPlatformAudit({
      action: "user.password_reset_sent",
      targetType: "user",
      targetLabel: email,
    });
    toast.success(`Password reset email sent to ${email}.`);
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="All platform users"
        description="Every user across every institution. Institution users remain strictly isolated to their own tenant — only the platform owner sees this combined view."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, email or institution…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
        />
        <Button
          size="sm"
          variant={role ? "ghost" : "secondary"}
          className={role ? "text-slate-400" : ""}
          onClick={() => navigate({ to: "/platform/people", search: {} })}
        >
          All
        </Button>
        {ROLE_FILTERS.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={role === r.key ? "secondary" : "ghost"}
            className={role === r.key ? "" : "text-slate-400"}
            onClick={() => navigate({ to: "/platform/people", search: { role: r.key } })}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <OwnerCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                {["Name", "Email", "Institution", "Role", "Status", "Last login", ""].map((c) => (
                  <th key={c} className="py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Loading users…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No users match this view.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.membership_id} className="text-slate-300">
                    <td className="py-2.5 pr-4 font-medium text-slate-100">{u.full_name}</td>
                    <td className="py-2.5 pr-4 text-xs">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <Link
                        to="/platform/institutions/$institutionId"
                        params={{ institutionId: u.institution_id }}
                        search={{}}
                        className="hover:text-cyan-300"
                      >
                        {u.institution}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {ROLE_LABELS[u.role] ?? u.role.replace(/_/g, " ")}
                      {u.is_class_teacher ? (
                        <span className="ml-2 text-xs text-cyan-300">· class teacher</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4">
                      <OwnerBadge value={u.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                    </td>
                    <td className="py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${u.full_name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {u.institution_id ? (
                            <>
                              <DropdownMenuLabel className="text-xs text-slate-500">
                                Assign role
                              </DropdownMenuLabel>
                              {(["admin", "exam_cell", "hod", "faculty"] as const).map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  disabled={u.role === r}
                                  onClick={() => setRole(u, r)}
                                >
                                  {ROLE_LABELS[r]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem onClick={() => toggleClassTeacher(u)}>
                                {u.is_class_teacher ? "Remove class teacher" : "Make class teacher"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          ) : null}
                          {u.institution_id && u.status !== "active" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatus(u.membership_id, u.full_name, u.institution_id, "active", u.status)
                              }
                            >
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                          {u.institution_id && u.status !== "suspended" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatus(u.membership_id, u.full_name, u.institution_id, "suspended", u.status)
                              }
                            >
                              Suspend
                            </DropdownMenuItem>
                          ) : null}
                          {u.institution_id && u.status !== "deactivated" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatus(u.membership_id, u.full_name, u.institution_id, "deactivated", u.status)
                              }
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : null}
                          {u.email ? (
                            <DropdownMenuItem onClick={() => resetPassword(u.email)}>
                              Send password reset
                            </DropdownMenuItem>
                          ) : null}
                          {u.institution_id ? (
                          <DropdownMenuItem
                            onClick={() =>
                              navigate({
                                to: "/platform/institutions/$institutionId",
                                params: { institutionId: u.institution_id },
                                search: { tab: "permissions" },
                              })
                            }
                          >
                            View permissions
                          </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => navigate({ to: "/platform/institutions" })}>
                              Add to an institution
                            </DropdownMenuItem>
                          )}
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
    </div>
  );
}
