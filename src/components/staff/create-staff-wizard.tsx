import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInstitution } from "@/lib/institution";
import { useCourses, useSessions } from "@/lib/queries";
import { useClasses } from "@/lib/school";
import { createStaffAccount } from "@/lib/staff-accounts.functions";
import {
  ALWAYS_RESTRICTED,
  STAFF_PERMISSION_GROUPS,
  STAFF_TYPE_LABEL,
  defaultPermissionsFor,
  needsClassTeacher,
  needsSubjects,
  type StaffType,
} from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";

import {
  ClassTeacherFields,
  PermissionGrid,
  RolePicker,
  SearchableMulti,
  buildClassOptions,
  subjectOptions,
  type ClassTeacherValue,
} from "./staff-fields";

const STEPS = ["Personal information", "Role & assignment", "Permissions", "Review"];

type Created = { email: string; password: string; staffId: string; reused: boolean };

export function CreateStaffAccountButton({ size = "default" }: { size?: "default" | "lg" | "sm" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Create Staff Account
      </Button>
      {open && <CreateStaffWizard open={open} onOpenChange={setOpen} />}
    </>
  );
}

function CreateStaffWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { institutionId } = useInstitution();
  const qc = useQueryClient();
  const create = useServerFn(createStaffAccount);
  const { data: classes = [] } = useClasses(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: sessions = [] } = useSessions(institutionId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: "", staffId: "", email: "", phone: "", designation: "", password: "" });
  const [photo, setPhoto] = useState<{ dataUrl: string; ext: "png" | "jpg" | "jpeg" | "webp" } | null>(null);
  const [type, setType] = useState<StaffType | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classSel, setClassSel] = useState<string[]>([]);
  const [ct, setCt] = useState<ClassTeacherValue>({
    sessionId: sessions.find((s) => (s as { is_active?: boolean }).is_active)?.id ?? null,
    number: "",
    section: "",
  });
  const [perms, setPerms] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const classOptions = useMemo(() => buildClassOptions(classes), [classes]);
  const subjOpts = useMemo(() => subjectOptions(courses.map((c) => c.title)), [courses]);
  const classLabelOf = (v: string) => classOptions.find((o) => o.value === v)?.label ?? v;

  function chooseType(t: StaffType) {
    setType(t);
    setPerms(defaultPermissionsFor(t));
  }

  function stepError(): string | null {
    if (step === 0) {
      if (form.fullName.trim().length < 2) return "Enter the full name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
      if (form.password && form.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (step === 1) {
      if (!type) return "Select an account type.";
      if (needsSubjects(type) && subjects.length === 0) return "Select at least one subject.";
      if (needsSubjects(type) && classSel.length === 0) return "Select the classes this teacher teaches.";
      if (needsClassTeacher(type) && (!ct.number || !ct.section)) return "Choose the class and section for the class teacher.";
    }
    return null;
  }

  function next() {
    const err = stepError();
    if (err) return toast.error(err);
    setStep((s) => s + 1);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return setPhoto(null);
    if (file.size > 1_400_000) return toast.error("Photo must be under 1.4 MB.");
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) return toast.error("Use a PNG, JPG or WEBP image.");
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    setPhoto({ dataUrl, ext: ext as "png" });
  }

  async function submit() {
    if (!institutionId || !type) return;
    setBusy(true);
    try {
      const res = await create({
        data: {
          institutionId,
          fullName: form.fullName,
          staffId: form.staffId || undefined,
          email: form.email,
          phone: form.phone || undefined,
          designation: form.designation || undefined,
          password: form.password || undefined,
          photo: photo ?? undefined,
          staffType: type,
          subjects,
          classes: classSel.map((v) => classOptions.find((o) => o.value === v)?.ref ?? {}),
          classTeacher: needsClassTeacher(type) ? { number: ct.number, section: ct.section } : null,
          sessionId: ct.sessionId,
          permissions: perms,
        },
      });
      setCreated(res);
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ["staff-directory"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Staff account created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the account");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  const permSet = new Set(perms);
  const granted = STAFF_PERMISSION_GROUPS.flatMap((g) => g.items).filter((i) => permSet.has(i.key));
  const restricted = STAFF_PERMISSION_GROUPS.flatMap((g) => g.items).filter((i) => !permSet.has(i.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>{created ? "Account created" : "Create Staff Account"}</DialogTitle>
          <DialogDescription>
            {created ? "Share these sign-in details with the staff member." : "Only the access you choose here is granted."}
          </DialogDescription>
          {!created && (
            <ol className="mt-3 flex gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1">
                  <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
                  <p className={cn("mt-1 hidden text-xs sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{s}</p>
                </li>
              ))}
            </ol>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {created ? (
            <Credentials c={created} name={form.fullName} />
          ) : step === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
              <Field label="Employee / Staff ID" placeholder="Auto-generated if blank" value={form.staffId} onChange={(v) => setForm({ ...form, staffId: v })} />
              <Field label="Email address *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Mobile number" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Designation" placeholder="e.g. TGT Mathematics" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
              <Field label="Temporary password" type="text" placeholder="Auto-generated if blank" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staff-photo">Profile photo</Label>
                <div className="flex items-center gap-3">
                  {photo && <img src={photo.dataUrl} alt="Preview" className="size-12 rounded-full object-cover" />}
                  <Input id="staff-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </div>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Account type</h3>
                <RolePicker value={type} onChange={chooseType} />
              </section>
              {type && needsClassTeacher(type) && (
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">Class teacher assignment</h3>
                  <ClassTeacherFields value={ct} onChange={setCt} sessions={sessions} classes={classes} />
                  <p className="text-xs text-muted-foreground">
                    A class teacher sees their class's students and results but cannot change marks for subjects they don't teach.
                  </p>
                </section>
              )}
              {type && needsSubjects(type) && (
                <section className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <h3 className="text-sm font-semibold sm:col-span-2">Subject teacher assignment</h3>
                  <SearchableMulti label="Subjects" options={subjOpts} selected={subjects} onChange={setSubjects} allowCustom placeholder="Search or add subject" />
                  <SearchableMulti label="Classes taught" options={classOptions} selected={classSel} onChange={setClassSel} placeholder="Search class, e.g. 9-A" />
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    The teacher gets access only to these subjects in these classes — nothing else.
                  </p>
                </section>
              )}
            </div>
          ) : step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Suggested permissions for a {type ? STAFF_TYPE_LABEL[type] : "staff member"} are pre-selected. Tick or untick anything.
              </p>
              <PermissionGrid selected={perms} onChange={setPerms} />
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <h3 className="font-display text-base font-semibold tracking-wide">ACCOUNT SUMMARY</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row k="Name" v={form.fullName} />
                <Row k="Email" v={form.email} />
                <Row k="Staff ID" v={form.staffId || "Auto-generated"} />
                <Row k="Role" v={type ? STAFF_TYPE_LABEL[type] : "—"} />
                {type && needsClassTeacher(type) && <Row k="Class teacher of" v={`Class ${ct.number}-${ct.section}`} />}
                {type && needsSubjects(type) && <Row k="Subjects" v={subjects.join(", ")} />}
                {type && needsSubjects(type) && <Row k="Classes" v={classSel.map(classLabelOf).join(", ")} />}
              </dl>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-2 font-semibold">Permissions</p>
                  <ul className="max-h-60 space-y-1 overflow-y-auto">
                    {granted.length === 0 && <li className="text-muted-foreground">None</li>}
                    {granted.map((g) => (
                      <li key={g.key} className="flex items-center gap-2"><Check className="size-3.5 text-emerald-600" />{g.label}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-2 font-semibold">Restricted</p>
                  <ul className="max-h-60 space-y-1 overflow-y-auto">
                    {[...restricted.map((r) => r.label), ...ALWAYS_RESTRICTED].map((l) => (
                      <li key={l} className="flex items-center gap-2 text-muted-foreground"><X className="size-3.5 text-destructive" />{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-border p-4">
          {created ? (
            <Button className="ml-auto" onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < 3 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={() => setConfirm(true)}>Create Staff Account</Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create this account with the selected role, classes, subjects and permissions?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {busy ? "Creating…" : "Confirm & Create Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  const id = props.label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{props.label}</Label>
      <Input id={id} type={props.type ?? "text"} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}

export function Credentials({ c, name }: { c: { email: string; password: string; staffId?: string; reused?: boolean }; name: string }) {
  const text = `Edqorix sign-in for ${name}\nLogin ID: ${c.email}\nTemporary password: ${c.password}${c.staffId ? `\nStaff ID: ${c.staffId}` : ""}\nSign in at: ${typeof window !== "undefined" ? window.location.origin : ""}/auth`;
  return (
    <div className="space-y-4">
      {c.reused && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          This email already had an Edqorix account. It has been linked to your school and its password was replaced.
        </p>
      )}
      <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm">{text}</pre>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            toast.success("Copied");
          }}
        >
          <Copy className="size-4" /> Copy details
        </Button>
        <Button asChild variant="outline">
          <a href={`mailto:${c.email}?subject=${encodeURIComponent("Your Edqorix account")}&body=${encodeURIComponent(text)}`}>
            Send by email
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">The password is shown only now. You can reset it later from Staff Management.</p>
    </div>
  );
}
