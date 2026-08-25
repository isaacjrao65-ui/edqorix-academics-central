import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldAlert, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, useInstitution, type AppRole } from "@/lib/institution";
import { useMembers, useRoles, type MemberRow } from "@/lib/permissions";
import { useDepartments } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Users & access — Edqorix" },
      {
        name: "description",
        content:
          "Create, suspend and reassign staff accounts, set designations and control who owns each class.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

type MemberStatus = "active" | "suspended" | "deactivated";
type MembershipPatch = {
  designation?: string | null;
  is_class_teacher?: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  suspended: "secondary",
  deactivated: "destructive",
};

function UsersPage() {
  const { institutionId, isAdmin, canManage } = useInstitution();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useMembers(institutionId);
  const { data: roles = [] } = useRoles(institutionId);
  const { data: departments = [] } = useDepartments(institutionId);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, setPending] = useState<
    | { member: MemberRow; kind: "status"; next: MemberStatus }
    | { member: MemberRow; kind: "role"; nextRole: AppRole; nextRoleId: string | null }
    | null
  >(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      if (!term) return true;
      return [member.profile?.full_name, member.profile?.email, member.designation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [members, query, statusFilter]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["members"] });
  }

  async function applyStatus(member: MemberRow, next: MemberStatus, reason: string) {
    if (!institutionId) return;
    const { error } = await supabase
      .from("memberships")
      .update({ status: next, is_active: next === "active" })
      .eq("id", member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "users.status_changed",
      entityType: "memberships",
      entityId: member.id,
      description: `${member.profile?.email ?? member.user_id} set to ${next}`,
      reason,
      oldValue: { status: member.status },
      newValue: { status: next },
    });
    await refresh();
    toast.success("Account status updated");
  }

  async function applyRole(
    member: MemberRow,
    nextRole: AppRole,
    nextRoleId: string | null,
    reason: string,
  ) {
    if (!institutionId) return;
    const { error } = await supabase
      .from("memberships")
      .update({ role: nextRole, role_id: nextRoleId })
      .eq("id", member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "users.role_changed",
      entityType: "memberships",
      entityId: member.id,
      description: `${member.profile?.email ?? member.user_id} reassigned to ${ROLE_LABEL[nextRole]}`,
      reason,
      oldValue: { role: member.role, role_id: member.role_id },
      newValue: { role: nextRole, role_id: nextRoleId },
    });
    await refresh();
    toast.success("Role reassigned");
  }

  async function quickUpdate(
    member: MemberRow,
    patch: MembershipPatch,
    action: string,
    description: string,
  ) {
    if (!institutionId) return;
    const { error } = await supabase.from("memberships").update(patch).eq("id", member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action,
      entityType: "memberships",
      entityId: member.id,
      description,
      newValue: patch,
    });
    await refresh();
  }

  if (!canManage) {
    return (
      <EmptyState
        title="Restricted area"
        description="Only administrators and the examination cell can manage user accounts."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users & access"
        description="Every staff account in this institution — assign roles, designations, class ownership and account status. Students never receive logins."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or designation"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching users"
          description="Invite staff from the staff & roles page — they gain access on sign-up."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Designation</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Class teacher</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium">{member.profile?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.profile?.email || member.user_id}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <Select
                        value={member.role_id ?? ""}
                        onValueChange={(roleId) => {
                          const role = roles.find((r) => r.id === roleId);
                          const mapped: AppRole =
                            role?.key === "super_admin"
                              ? "admin"
                              : role?.key === "principal" || role?.key === "staff"
                                ? "exam_cell"
                                : role?.key === "class_teacher"
                                  ? "hod"
                                  : "faculty";
                          setPending({
                            member,
                            kind: "role",
                            nextRole: mapped,
                            nextRoleId: roleId,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 w-44">
                          <SelectValue placeholder={ROLE_LABEL[member.role as AppRole]} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{ROLE_LABEL[member.role as AppRole]}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Input
                      defaultValue={member.designation ?? ""}
                      disabled={!isAdmin}
                      className="h-9 w-40"
                      placeholder="e.g. Vice Principal"
                      onBlur={(e) => {
                        const next = e.target.value.trim() || null;
                        if (next === (member.designation ?? null)) return;
                        void quickUpdate(
                          member,
                          { designation: next },
                          "users.designation_changed",
                          `Designation for ${member.profile?.email ?? member.user_id} set to ${next ?? "none"}`,
                        );
                      }}
                    />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {departments.find((d) => d.id === member.department_id)?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Switch
                      checked={member.is_class_teacher}
                      disabled={!isAdmin}
                      onCheckedChange={(checked) =>
                        void quickUpdate(
                          member,
                          { is_class_teacher: checked },
                          "users.class_teacher_changed",
                          `${checked ? "Marked" : "Cleared"} class teacher for ${
                            member.profile?.email ?? member.user_id
                          }`,
                        )
                      }
                    />
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <Select
                        value={member.status}
                        onValueChange={(next) =>
                          setPending({ member, kind: "status", next: next as MemberStatus })
                        }
                      >
                        <SelectTrigger className="h-9 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="deactivated">Deactivated</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"}>
                        {member.status}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatDate(member.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="size-4" strokeWidth={1.75} />
        Role changes, suspensions and deactivations are permanently recorded with your reason in the
        audit log.
      </p>

      <ReasonDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.kind === "status" ? "Change account status" : "Reassign role"}
        description={
          pending?.kind === "status"
            ? `Set ${pending.member.profile?.email ?? "this user"} to ${pending.next}. Suspended users keep their data but cannot sign in.`
            : "The user immediately gains the permissions of the new role."
        }
        confirmLabel={pending?.kind === "status" ? "Update status" : "Reassign"}
        destructive={pending?.kind === "status" && pending.next !== "active"}
        onConfirm={async (reason) => {
          if (!pending) return;
          if (pending.kind === "status") {
            await applyStatus(pending.member, pending.next, reason);
          } else {
            await applyRole(pending.member, pending.nextRole, pending.nextRoleId, reason);
          }
          setPending(null);
        }}
      >
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <UserCog className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <Label className="font-normal">
            {pending?.member.profile?.full_name || pending?.member.profile?.email || "User"}
          </Label>
        </div>
      </ReasonDialog>
    </div>
  );
}
