import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, useInstitution, type AppRole } from "@/lib/institution";
import { useDepartments } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Staff & roles — Edqorix" },
      {
        name: "description",
        content:
          "Invite faculty, heads of department and examination cell staff, and manage their access.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Team,
});

const ROLES: AppRole[] = ["admin", "exam_cell", "hod", "faculty"];

function Team() {
  const { institutionId, isAdmin } = useInstitution();
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments(institutionId);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, user_id, role, is_active, department_id, created_at")
        .eq("institution_id", institutionId as string)
        .order("created_at");
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, designation")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
    },
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, role, status, expires_at, created_at")
        .eq("institution_id", institutionId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function updateMember(id: string, patch: { role?: AppRole; is_active?: boolean }, description: string) {
    if (!institutionId) return;
    const { error } = await supabase.from("memberships").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "memberships.updated",
      entityType: "memberships",
      entityId: id,
      description,
      details: patch,
    });
    await queryClient.invalidateQueries({ queryKey: ["members"] });
    toast.success("Access updated");
  }

  async function revoke(id: string, email: string) {
    if (!institutionId) return;
    const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "invitations.revoked",
      entityType: "invitations",
      entityId: id,
      description: `Revoked invitation for ${email}`,
    });
    await queryClient.invalidateQueries({ queryKey: ["invitations"] });
    toast.success("Invitation revoked");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff & roles"
        description="Only invited staff can reach institutional data. Students never have access to this system."
        actions={
          <InviteDialog
            institutionId={institutionId}
            departments={departments.map((d) => ({ value: d.id, label: d.name }))}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["invitations"] })}
          />
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Members</h2>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-2.5">
                      {member.profile?.full_name || "—"}
                      {member.profile?.designation ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {member.profile.designation}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {member.profile?.email || "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      {isAdmin ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            updateMember(
                              member.id,
                              { role: value },
                              `Changed role of ${member.profile?.email ?? member.user_id} to ${
                                ROLE_LABEL[value as AppRole]
                              }`,
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABEL[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{ROLE_LABEL[member.role as AppRole]}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {departments.find((d) => d.id === member.department_id)?.name ?? "—"}
                    </td>
                    <td className="px-5 py-2.5">
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant={member.is_active ? "ghost" : "outline"}
                          onClick={() =>
                            updateMember(
                              member.id,
                              { is_active: !member.is_active },
                              `${member.is_active ? "Deactivated" : "Reactivated"} ${
                                member.profile?.email ?? member.user_id
                              }`,
                            )
                          }
                        >
                          {member.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      ) : (
                        <Badge variant="secondary">{member.is_active ? "Active" : "Inactive"}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Invitations</h2>
        {invitations.length === 0 ? (
          <EmptyState
            title="No invitations yet"
            description="Invite staff by email — they get access as soon as they sign up with that address."
          />
        ) : (
          <ul className="grid gap-2">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 text-sm"
              >
                <Mail className="size-4 text-muted-foreground" strokeWidth={1.75} />
                <span className="flex-1 truncate">{invite.email}</span>
                <Badge variant="secondary">{ROLE_LABEL[invite.role as AppRole]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {invite.status} · expires {formatDate(invite.expires_at)}
                </span>
                {isAdmin && invite.status === "pending" ? (
                  <Button size="sm" variant="ghost" onClick={() => revoke(invite.id, invite.email)}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InviteDialog({
  institutionId,
  departments,
  onDone,
}: {
  institutionId: string | null;
  departments: { value: string; label: string }[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("faculty");
  const [departmentId, setDepartmentId] = useState("");

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!institutionId) return;
    setBusy(true);
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        institution_id: institutionId,
        email: email.trim().toLowerCase(),
        role,
        department_id: departmentId || null,
        expires_at: expires,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      institutionId,
      action: "invitations.created",
      entityType: "invitations",
      entityId: data.id,
      description: `Invited ${email} as ${ROLE_LABEL[role]}`,
    });
    toast.success("Invitation recorded");
    setEmail("");
    setDepartmentId("");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" strokeWidth={1.75} />
          Invite staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>
            They join with the assigned role once they sign up with this email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={run} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Work email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@institution.edu"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {departments.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="invite-dept">Department (optional)</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="invite-dept">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
