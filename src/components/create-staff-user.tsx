import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { logAudit } from "@/lib/audit";
import { createInstitutionUser } from "@/lib/platform-users.functions";

const ROLES = [
  { key: "admin", label: "Principal / Super admin" },
  { key: "exam_cell", label: "Staff / Management" },
  { key: "hod", label: "Head of department" },
  { key: "faculty", label: "Subject teacher" },
] as const;

type RoleKey = (typeof ROLES)[number]["key"];

export function CreateStaffUser({ institutionId }: { institutionId: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    designation: "",
    role: "faculty" as RoleKey,
    isClassTeacher: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!institutionId) return;
    setBusy(true);
    try {
      const res = await createInstitutionUser({
        data: {
          institutionId,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          fullName: form.fullName.trim(),
          designation: form.designation.trim() || undefined,
          role: form.role,
          isClassTeacher: form.isClassTeacher,
        },
      });
      await logAudit({
        institutionId,
        action: res.reused ? "users.account_updated" : "users.account_created",
        entityType: "memberships",
        entityId: res.userId,
        description: `${form.fullName} (${res.email}) set up as ${
          ROLES.find((r) => r.key === form.role)?.label ?? form.role
        }`,
        newValue: { role: form.role, is_class_teacher: form.isClassTeacher },
      });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(
        res.reused
          ? "Existing account linked to this institution with the new password."
          : "Login ID created — share the email and password with them.",
      );
      setForm({
        fullName: "",
        email: "",
        password: "",
        designation: "",
        role: "faculty",
        isClassTeacher: false,
      });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create that account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5" disabled={!institutionId}>
          <UserPlus className="size-4" strokeWidth={1.75} />
          Create login ID
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a staff login ID</DialogTitle>
          <DialogDescription>
            Accounts are created here only — staff cannot sign themselves up. They sign in with the
            email and password you set below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csu-name">Full name</Label>
            <Input
              id="csu-name"
              required
              minLength={2}
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csu-email">Login email</Label>
            <Input
              id="csu-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csu-password">Temporary password</Label>
            <Input
              id="csu-password"
              type="text"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm((f) => ({ ...f, role: role as RoleKey }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csu-designation">Designation</Label>
              <Input
                id="csu-designation"
                placeholder="e.g. Maths teacher"
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isClassTeacher}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isClassTeacher: checked === true }))
              }
            />
            Also a class teacher
          </label>
          <DialogFooter>
            <Button type="submit" disabled={busy || !institutionId}>
              {busy ? "Creating…" : "Create login ID"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
