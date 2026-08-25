import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useInstitution } from "@/lib/institution";
import {
  PERMISSION_GROUP_ORDER,
  useMembers,
  usePermissionCatalogue,
  useRolePermissions,
  useRoles,
  useUserPermissions,
} from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/roles")({
  head: () => ({
    meta: [
      { title: "Roles & permissions — Edqorix" },
      {
        name: "description",
        content:
          "Define custom roles, grant or revoke module permissions and override access for individual staff members.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const { institutionId, isAdmin } = useInstitution();

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrators only"
        description="Roles and permissions can only be changed by an institution administrator."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Roles & permissions"
        description="Roles bundle module permissions. Per-user overrides sit on top of the assigned role, and every change is written to the audit trail."
      />
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
          <TabsTrigger value="overrides">User overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolesTab institutionId={institutionId} />
        </TabsContent>
        <TabsContent value="matrix">
          <MatrixTab institutionId={institutionId} />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesTab institutionId={institutionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RolesTab({ institutionId }: { institutionId: string | null }) {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading } = useRoles(institutionId);
  const { data: rolePerms = [] } = useRolePermissions(institutionId);
  const { data: members = [] } = useMembers(institutionId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const permCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rolePerms) map.set(row.role_id, (map.get(row.role_id) ?? 0) + 1);
    return map;
  }, [rolePerms]);

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    if (!institutionId) return;
    const { data, error } = await supabase
      .from("roles")
      .insert({ institution_id: institutionId, name: name.trim(), description: description.trim() || null })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "roles.created",
      entityType: "roles",
      entityId: data.id,
      description: `Created role ${name}`,
      newValue: { name, description },
    });
    setName("");
    setDescription("");
    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["roles"] });
    toast.success("Role created");
  }

  async function removeRole(id: string, reason: string) {
    if (!institutionId) return;
    const role = roles.find((r) => r.id === id);
    const { error } = await supabase.from("roles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "roles.deleted",
      entityType: "roles",
      entityId: id,
      description: `Deleted role ${role?.name ?? id}`,
      reason,
      oldValue: role ?? null,
    });
    await queryClient.invalidateQueries({ queryKey: ["roles"] });
    toast.success("Role deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" strokeWidth={2} />
              New role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create a custom role</DialogTitle>
              <DialogDescription>
                Grant its permissions from the permission matrix once created.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createRole} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role name</Label>
                <Input
                  id="role-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Exam Coordinator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this role is responsible for"
                />
              </div>
              <DialogFooter>
                <Button type="submit">Create role</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => {
            const assigned = members.filter((m) => m.role_id === role.id).length;
            return (
              <li key={role.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-medium">
                      {role.name}
                      {role.is_system ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="size-3" strokeWidth={2} />
                          System
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{role.description ?? "—"}</p>
                  </div>
                  {role.is_system ? null : (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${role.name}`}
                      onClick={() => setDeleting(role.id)}
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {permCount.get(role.id) ?? 0} permissions · {assigned} user
                  {assigned === 1 ? "" : "s"} assigned
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <ReasonDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        title="Delete role"
        description="Users assigned to this role lose its permissions immediately."
        confirmLabel="Delete role"
        destructive
        onConfirm={async (reason) => {
          if (deleting) await removeRole(deleting, reason);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function MatrixTab({ institutionId }: { institutionId: string | null }) {
  const queryClient = useQueryClient();
  const { data: roles = [] } = useRoles(institutionId);
  const { data: permissions = [] } = usePermissionCatalogue();
  const { data: rolePerms = [] } = useRolePermissions(institutionId);
  const [roleId, setRoleId] = useState<string>("");

  const active = roleId || roles[0]?.id || "";
  const granted = useMemo(
    () => new Set(rolePerms.filter((r) => r.role_id === active).map((r) => r.permission_key)),
    [rolePerms, active],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof permissions>();
    for (const perm of permissions) {
      map.set(perm.grp, [...(map.get(perm.grp) ?? []), perm]);
    }
    return [...map.entries()].sort(
      (a, b) => PERMISSION_GROUP_ORDER.indexOf(a[0]) - PERMISSION_GROUP_ORDER.indexOf(b[0]),
    );
  }, [permissions]);

  async function toggle(permissionKey: string, next: boolean) {
    if (!institutionId || !active) return;
    if (next) {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ institution_id: institutionId, role_id: active, permission_key: permissionKey });
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", active)
        .eq("permission_key", permissionKey);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logAudit({
      institutionId,
      action: next ? "role_permissions.granted" : "role_permissions.revoked",
      entityType: "role_permissions",
      entityId: active,
      description: `${next ? "Granted" : "Revoked"} ${permissionKey} for ${
        roles.find((r) => r.id === active)?.name ?? active
      }`,
      oldValue: { granted: !next },
      newValue: { granted: next },
    });
    await queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    await queryClient.invalidateQueries({ queryKey: ["effective-permissions"] });
  }

  if (roles.length === 0) {
    return <EmptyState title="No roles yet" description="Create a role first." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Role</Label>
        <Select value={active} onValueChange={setRoleId}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{granted.size} permissions granted</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map(([group, perms]) => (
          <section key={group} className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium">{group}</h3>
            <ul className="mt-3 space-y-2.5">
              {perms.map((perm) => (
                <li key={perm.key} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    id={`perm-${perm.key}`}
                    checked={granted.has(perm.key)}
                    onCheckedChange={(checked) => void toggle(perm.key, checked === true)}
                  />
                  <Label htmlFor={`perm-${perm.key}`} className="font-normal">
                    {perm.label}
                  </Label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function OverridesTab({ institutionId }: { institutionId: string | null }) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useMembers(institutionId);
  const { data: permissions = [] } = usePermissionCatalogue();
  const { data: overrides = [] } = useUserPermissions(institutionId);
  const [userId, setUserId] = useState("");

  const active = userId || members[0]?.user_id || "";
  const mine = useMemo(
    () => new Map(overrides.filter((o) => o.user_id === active).map((o) => [o.permission_key, o])),
    [overrides, active],
  );

  async function setOverride(permissionKey: string, value: "inherit" | "allow" | "deny") {
    if (!institutionId || !active) return;
    const existing = mine.get(permissionKey);
    if (value === "inherit") {
      if (!existing) return;
      const { error } = await supabase.from("user_permissions").delete().eq("id", existing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const granted = value === "allow";
      const { error } = existing
        ? await supabase.from("user_permissions").update({ granted }).eq("id", existing.id)
        : await supabase.from("user_permissions").insert({
            institution_id: institutionId,
            user_id: active,
            permission_key: permissionKey,
            granted,
          });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await logAudit({
      institutionId,
      action: "user_permissions.changed",
      entityType: "user_permissions",
      entityId: active,
      description: `Override ${permissionKey} set to ${value} for ${
        members.find((m) => m.user_id === active)?.profile?.email ?? active
      }`,
      oldValue: existing ? { granted: existing.granted } : { granted: "inherit" },
      newValue: { granted: value },
    });
    await queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
    await queryClient.invalidateQueries({ queryKey: ["effective-permissions"] });
  }

  if (members.length === 0) {
    return <EmptyState title="No staff yet" description="Invite staff to manage their access." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm">Staff member</Label>
        <Select value={active} onValueChange={setUserId}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.profile?.full_name || member.profile?.email || member.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Permission</th>
              <th className="px-5 py-3 font-medium">Module</th>
              <th className="px-5 py-3 font-medium">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {permissions.map((perm) => {
              const existing = mine.get(perm.key);
              const value = existing ? (existing.granted ? "allow" : "deny") : "inherit";
              return (
                <tr key={perm.key}>
                  <td className="px-5 py-2.5">{perm.label}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{perm.grp}</td>
                  <td className="px-5 py-2.5">
                    <Select
                      value={value}
                      onValueChange={(next) =>
                        void setOverride(perm.key, next as "inherit" | "allow" | "deny")
                      }
                    >
                      <SelectTrigger className="h-9 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit from role</SelectItem>
                        <SelectItem value="allow">Always allow</SelectItem>
                        <SelectItem value="deny">Always deny</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
