import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page-header";
import { CreateStaffAccountButton, Credentials } from "@/components/staff/create-staff-wizard";
import {
  ClassTeacherFields,
  PermissionGrid,
  RolePicker,
  SearchableMulti,
  buildClassOptions,
  subjectOptions,
  type ClassTeacherValue,
} from "@/components/staff/staff-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useInstitution } from "@/lib/institution";
import { useLiveInstitution } from "@/lib/live-institution";
import { useCourses, useSessions } from "@/lib/queries";
import { classLabel, useClasses } from "@/lib/school";
import {
  getStaffPhotoUrl,
  resetStaffPassword,
  setStaffStatus,
  updateStaffAssignments,
  updateStaffPermissions,
} from "@/lib/staff-accounts.functions";
import {
  STAFF_PERMISSION_LABEL,
  STAFF_TYPE_LABEL,
  needsClassTeacher,
  needsSubjects,
  type StaffType,
} from "@/lib/staff-permissions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff Management — Edqorix" },
      { name: "description", content: "Create staff accounts, assign classes and subjects, and control every permission." },
      { property: "og:title", content: "Staff Management — Edqorix" },
      { property: "og:description", content: "Principal-controlled staff accounts and permissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

type StaffRow = {
  userId: string;
  staffId: string | null;
  staffType: string | null;
  role: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  createdAt: string;
  createdBy: string | null;
  subjects: string[];
  classes: { id: string; label: string }[];
  classTeacherOf: { id: string; label: string; section: string; name: string; sessionId: string | null } | null;
  permissions: string[];
};

function useStaffDirectory(institutionId: string | null) {
  return useQuery({
    queryKey: ["staff-directory", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<StaffRow[]> => {
      const inst = institutionId as string;
      const [m, a, c, p] = await Promise.all([
        supabase
          .from("memberships")
          .select("user_id, staff_id, staff_type, role, status, designation, created_at, created_by")
          .eq("institution_id", inst)
          .order("created_at", { ascending: false }),
        supabase
          .from("class_subject_teachers")
          .select("teacher_id, class_id, courses(title), classes(name, section)")
          .eq("institution_id", inst),
        supabase.from("classes").select("id, name, section, class_teacher_id, session_id").eq("institution_id", inst),
        supabase.from("user_permissions").select("user_id, permission_key, granted").eq("institution_id", inst).like("permission_key", "sp.%"),
      ]);
      if (m.error) throw m.error;
      const ids = [...new Set((m.data ?? []).map((r) => r.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, phone").in("id", ids)
        : { data: [] };
      const prof = new Map((profiles ?? []).map((x) => [x.id, x]));
      return (m.data ?? []).map((r) => {
        const mine = (a.data ?? []).filter((x) => x.teacher_id === r.user_id) as unknown as {
          class_id: string;
          courses: { title: string } | null;
          classes: { name: string; section: string } | null;
        }[];
        const ct = (c.data ?? []).find((x) => x.class_teacher_id === r.user_id);
        const classMap = new Map<string, string>();
        for (const x of mine) if (x.classes) classMap.set(x.class_id, classLabel(x.classes));
        return {
          userId: r.user_id,
          staffId: r.staff_id,
          staffType: r.staff_type,
          role: r.role,
          status: r.status,
          name: prof.get(r.user_id)?.full_name || prof.get(r.user_id)?.email || "—",
          email: prof.get(r.user_id)?.email ?? "",
          phone: prof.get(r.user_id)?.phone ?? null,
          designation: r.designation,
          createdAt: r.created_at,
          createdBy: r.created_by,
          subjects: [...new Set(mine.map((x) => x.courses?.title).filter((t): t is string => Boolean(t)))],
          classes: [...classMap].map(([id, label]) => ({ id, label })),
          classTeacherOf: ct ? { id: ct.id, label: classLabel(ct), name: ct.name, section: ct.section, sessionId: ct.session_id } : null,
          permissions: (p.data ?? []).filter((x) => x.user_id === r.user_id && x.granted).map((x) => x.permission_key),
        };
      });
    },
  });
}

const ROLE_FALLBACK: Record<string, string> = { admin: "Principal", exam_cell: "Staff", hod: "HOD", faculty: "Teacher" };

function StaffPage() {
  const { institutionId, isAdmin } = useInstitution();
  useLiveInstitution(institutionId);
  const { data: rows = [], isLoading } = useStaffDirectory(institutionId);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ kind: "view" | "perms" | "assign" | "status" | "password"; row: StaffRow; status?: string } | null>(null);

  const filtered = rows.filter((r) =>
    [r.name, r.email, r.staffId ?? "", ...r.subjects, ...r.classes.map((c) => c.label)].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  if (!isAdmin) {
    return <EmptyState title="Principal only" description="Only the principal can manage staff accounts and permissions." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Create staff accounts and decide exactly which classes, subjects and actions each person can access."
        actions={<CreateStaffAccountButton />}
      />
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search name, staff ID, subject, class" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No staff yet" description="Use “Create Staff Account” to add your first teacher." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Staff ID", "Name", "Role", "Subjects", "Classes", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.userId} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs">{r.staffId ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">{r.staffType ? STAFF_TYPE_LABEL[r.staffType] : ROLE_FALLBACK[r.role]}</td>
                    <td className="px-4 py-3">{r.subjects.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      {r.classes.map((c) => c.label).join(", ") || "—"}
                      {r.classTeacherOf && <p className="text-xs text-primary">Class teacher: {r.classTeacherOf.label}</p>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right"><Actions row={r} onPick={setDialog} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <div key={r.userId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.staffId ?? "—"} · {r.staffType ? STAFF_TYPE_LABEL[r.staffType] : ROLE_FALLBACK[r.role]}</p>
                  </div>
                  <Actions row={r} onPick={setDialog} />
                </div>
                <p className="mt-2 text-sm">Subjects: {r.subjects.join(", ") || "—"}</p>
                <p className="text-sm">Classes: {r.classes.map((c) => c.label).join(", ") || "—"}</p>
                <div className="mt-2"><StatusBadge status={r.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}

      {dialog?.kind === "view" && <ViewDialog row={dialog.row} rows={rows} onClose={() => setDialog(null)} />}
      {dialog?.kind === "perms" && <PermsDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === "assign" && <AssignDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === "status" && <StatusDialog row={dialog.row} status={dialog.status as "active"} onClose={() => setDialog(null)} />}
      {dialog?.kind === "password" && <PasswordDialog row={dialog.row} onClose={() => setDialog(null)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "active" ? "bg-emerald-100 text-emerald-800" : status === "suspended" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";
  return <Badge className={`${cls} capitalize hover:${cls}`}>{status}</Badge>;
}

function Actions({ row, onPick }: { row: StaffRow; onPick: (d: { kind: "view" | "perms" | "assign" | "status" | "password"; row: StaffRow; status?: string }) => void }) {
  const isPrincipal = row.role === "admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.name}`}><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPick({ kind: "view", row })}>View</DropdownMenuItem>
        {!isPrincipal && (
          <>
            <DropdownMenuItem onClick={() => onPick({ kind: "perms", row })}>Edit permissions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPick({ kind: "assign", row })}>Change assignment</DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status !== "active" && <DropdownMenuItem onClick={() => onPick({ kind: "status", row, status: "active" })}>Reactivate</DropdownMenuItem>}
            {row.status !== "suspended" && <DropdownMenuItem onClick={() => onPick({ kind: "status", row, status: "suspended" })}>Suspend</DropdownMenuItem>}
            {row.status !== "deactivated" && <DropdownMenuItem onClick={() => onPick({ kind: "status", row, status: "deactivated" })}>Deactivate</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onPick({ kind: "password", row })}>Reset password</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewDialog({ row, rows, onClose }: { row: StaffRow; rows: StaffRow[]; onClose: () => void }) {
  const { institutionId } = useInstitution();
  const photo = useServerFn(getStaffPhotoUrl);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (institutionId) photo({ data: { institutionId, userId: row.userId } }).then((r) => setUrl(r.url)).catch(() => {});
  }, [institutionId, row.userId, photo]);
  const creator = rows.find((r) => r.userId === row.createdBy)?.name;
  const { data: history = [] } = useQuery({
    queryKey: ["audit", "staff", row.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, description, created_at")
        .eq("institution_id", institutionId as string)
        .eq("entity_id", row.userId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {url ? <img src={url} alt="" className="size-12 rounded-full object-cover" /> : (
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{row.name.slice(0, 1)}</div>
            )}
            <div>
              <DialogTitle>{row.name}</DialogTitle>
              <DialogDescription>{row.email}{row.phone ? ` · ${row.phone}` : ""}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Info k="Staff ID" v={row.staffId ?? "—"} />
          <Info k="Role" v={row.staffType ? STAFF_TYPE_LABEL[row.staffType] ?? "" : ROLE_FALLBACK[row.role] ?? row.role} />
          <Info k="Designation" v={row.designation ?? "—"} />
          <Info k="Status" v={row.status} />
          <Info k="Subjects" v={row.subjects.join(", ") || "—"} />
          <Info k="Classes" v={row.classes.map((c) => c.label).join(", ") || "—"} />
          <Info k="Class teacher of" v={row.classTeacherOf?.label ?? "—"} />
          <Info k="Created" v={`${formatDateTime(row.createdAt)}${creator ? ` by ${creator}` : ""}`} />
        </dl>
        <div>
          <p className="mb-2 text-sm font-semibold">Permissions ({row.permissions.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {row.permissions.length === 0 && <span className="text-sm text-muted-foreground">None granted</span>}
            {row.permissions.map((k) => <Badge key={k} variant="secondary">{STAFF_PERMISSION_LABEL[k] ?? k}</Badge>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Access history</p>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
            {history.length === 0 && <li className="p-3 text-muted-foreground">No changes recorded.</li>}
            {history.map((h) => (
              <li key={h.id} className="p-3">
                <p>{h.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium capitalize-first">{v}</dd>
    </div>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["staff-directory"] });
    qc.invalidateQueries({ queryKey: ["classes"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };
}

function PermsDialog({ row, onClose }: { row: StaffRow; onClose: () => void }) {
  const { institutionId } = useInstitution();
  const save = useServerFn(updateStaffPermissions);
  const refresh = useRefresh();
  const [perms, setPerms] = useState(row.permissions);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Edit permissions — {row.name}</DialogTitle>
          <DialogDescription>Every change is recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto"><PermissionGrid selected={perms} onChange={setPerms} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await save({ data: { institutionId: institutionId as string, userId: row.userId, permissions: perms } });
                toast.success(`${r.changed} permission${r.changed === 1 ? "" : "s"} updated`);
                refresh();
                onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ row, onClose }: { row: StaffRow; onClose: () => void }) {
  const { institutionId } = useInstitution();
  const save = useServerFn(updateStaffAssignments);
  const refresh = useRefresh();
  const { data: classes = [] } = useClasses(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: sessions = [] } = useSessions(institutionId);
  const classOptions = useMemo(() => buildClassOptions(classes), [classes]);
  const [type, setType] = useState<StaffType>((row.staffType as StaffType) ?? (row.role === "exam_cell" ? "admin_staff" : "subject_teacher"));
  const [subjects, setSubjects] = useState(row.subjects);
  const [classSel, setClassSel] = useState(row.classes.map((c) => `id:${c.id}`));
  const [ct, setCt] = useState<ClassTeacherValue>({
    sessionId: row.classTeacherOf?.sessionId ?? null,
    number: row.classTeacherOf?.name.replace(/^Class /, "") ?? "",
    section: row.classTeacherOf?.section.toUpperCase() ?? "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Change assignment — {row.name}</DialogTitle>
          <DialogDescription>Access is limited to exactly what you choose here.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto">
          <RolePicker value={type} onChange={setType} />
          {needsClassTeacher(type) && <ClassTeacherFields value={ct} onChange={setCt} sessions={sessions} classes={classes} />}
          {needsSubjects(type) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchableMulti label="Subjects" options={subjectOptions(courses.map((c) => c.title))} selected={subjects} onChange={setSubjects} allowCustom />
              <SearchableMulti label="Classes taught" options={classOptions} selected={classSel} onChange={setClassSel} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (needsSubjects(type) && (!subjects.length || !classSel.length)) { toast.error("Choose subjects and classes."); return; }
              if (needsClassTeacher(type) && (!ct.number || !ct.section)) { toast.error("Choose the class teacher's class."); return; }
              setBusy(true);
              try {
                await save({
                  data: {
                    institutionId: institutionId as string,
                    userId: row.userId,
                    staffType: type,
                    subjects,
                    classes: classSel.map((v) => classOptions.find((o) => o.value === v)?.ref ?? {}),
                    classTeacher: needsClassTeacher(type) ? { number: ct.number, section: ct.section } : null,
                    sessionId: ct.sessionId,
                  },
                });
                toast.success("Assignment updated");
                refresh();
                onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ row, status, onClose }: { row: StaffRow; status: "active" | "suspended" | "deactivated"; onClose: () => void }) {
  const { institutionId } = useInstitution();
  const save = useServerFn(setStaffStatus);
  const refresh = useRefresh();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const verb = status === "active" ? "Reactivate" : status === "suspended" ? "Suspend" : "Deactivate";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{verb} {row.name}?</DialogTitle>
          <DialogDescription>
            {status === "active" ? "They will be able to sign in again." : "They will lose access immediately."}
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Reason (recorded in audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={status === "active" ? "default" : "destructive"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await save({ data: { institutionId: institutionId as string, userId: row.userId, status, reason: reason || undefined } });
                toast.success(`${row.name}: ${status}`);
                refresh();
                onClose();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not update");
              } finally {
                setBusy(false);
              }
            }}
          >
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ row, onClose }: { row: StaffRow; onClose: () => void }) {
  const { institutionId } = useInstitution();
  const reset = useServerFn(resetStaffPassword);
  const [pw, setPw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {row.name}</DialogTitle>
          <DialogDescription>A new temporary password will be generated. Their old password stops working.</DialogDescription>
        </DialogHeader>
        {pw && <Credentials c={{ email: row.email, password: pw, staffId: row.staffId ?? undefined }} name={row.name} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{pw ? "Done" : "Cancel"}</Button>
          {!pw && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await reset({ data: { institutionId: institutionId as string, userId: row.userId } });
                  setPw(r.password);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not reset");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Generate new password
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
