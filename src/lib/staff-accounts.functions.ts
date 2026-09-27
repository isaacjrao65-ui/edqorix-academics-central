import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { ALL_STAFF_PERMISSION_KEYS, STAFF_TYPES, needsClassTeacher, needsSubjects } from "./staff-permissions";

const classRef = z.object({
  classId: z.string().uuid().optional(),
  number: z.string().trim().max(10).optional(),
  section: z.string().trim().max(5).optional(),
});
const staffType = z.enum(STAFF_TYPES.map((t) => t.value) as [string, ...string[]]);
const permKeys = z.array(z.string().refine((k) => ALL_STAFF_PERMISSION_KEYS.includes(k))).max(100);
const subjects = z.array(z.string().trim().min(1).max(60)).max(20);

/** Only the principal (institution admin) or platform owner controls staff access. */
async function assertPrincipal(client: unknown, institutionId: string) {
  const c = client as { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> };
  const { data } = await c.rpc.call(client, "is_admin", { _institution: institutionId });
  if (data !== true) throw new Error("Only the principal can manage staff accounts and permissions.");
}

async function staffName(institutionId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: member } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) throw new Error("This staff member does not belong to your institution.");
  const { data } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name || data?.email || "Staff member";
}

const createSchema = z.object({
  institutionId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(100),
  staffId: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).optional(),
  designation: z.string().trim().max(80).optional(),
  password: z.string().min(8).max(72).optional(),
  photo: z
    .object({ dataUrl: z.string().max(2_000_000), ext: z.enum(["png", "jpg", "jpeg", "webp"]) })
    .optional(),
  staffType,
  subjects,
  classes: z.array(classRef).max(40),
  classTeacher: classRef.nullable(),
  sessionId: z.string().uuid().nullable().optional(),
  permissions: permKeys,
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPrincipal(context.supabase, data.institutionId);
    const type = data.staffType as (typeof STAFF_TYPES)[number]["value"];
    if (needsSubjects(type) && (data.subjects.length === 0 || data.classes.length === 0))
      throw new Error("Choose at least one subject and one class for a subject teacher.");
    if (needsClassTeacher(type) && !data.classTeacher)
      throw new Error("Choose the class this class teacher is responsible for.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { provisionInstitutionUser } = await import("./platform-users.server");
    const s = await import("./staff-accounts.server");

    const password = data.password || s.generatePassword();
    const staffId = data.staffId || (await s.generateStaffId(data.institutionId));
    const role = type === "admin_staff" ? "exam_cell" : "faculty";

    const res = await provisionInstitutionUser({
      institutionId: data.institutionId,
      email: data.email,
      password,
      fullName: data.fullName,
      designation: data.designation,
      role,
      isClassTeacher: needsClassTeacher(type),
    });
    if (res.userId === context.userId) throw new Error("You cannot create an account for yourself.");

    let avatarPath: string | null = null;
    if (data.photo) {
      const base64 = data.photo.dataUrl.split(",")[1] ?? "";
      const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
      avatarPath = `staff-photos/${data.institutionId}/${res.userId}.${data.photo.ext}`;
      await supabaseAdmin.storage
        .from("records")
        .upload(avatarPath, bytes, { upsert: true, contentType: `image/${data.photo.ext === "jpg" ? "jpeg" : data.photo.ext}` });
    }
    await supabaseAdmin
      .from("profiles")
      .update({ phone: data.phone || null, ...(avatarPath ? { avatar_path: avatarPath } : {}) })
      .eq("id", res.userId);

    const { error: mErr } = await supabaseAdmin
      .from("memberships")
      .update({ staff_id: staffId, staff_type: type, created_by: context.userId })
      .eq("institution_id", data.institutionId)
      .eq("user_id", res.userId);
    if (mErr) throw new Error(mErr.message.includes("staff_id") ? "That Staff ID is already used." : mErr.message);

    const assigned = await s.writeAssignments({
      institutionId: data.institutionId,
      userId: res.userId,
      actorId: context.userId,
      subjects: needsSubjects(type) ? data.subjects : [],
      classes: needsSubjects(type) ? data.classes : [],
      classTeacher: needsClassTeacher(type) ? data.classTeacher : null,
      sessionId: data.sessionId ?? null,
    });
    await s.writePermissions({
      institutionId: data.institutionId,
      userId: res.userId,
      actorId: context.userId,
      staffName: data.fullName,
      keys: data.permissions,
      initial: true,
    });
    await s.audit({
      institutionId: data.institutionId,
      actorId: context.userId,
      action: "staff.account_created",
      entityId: res.userId,
      description: `Created staff account for ${data.fullName} (${staffId})`,
      newValue: { staff_id: staffId, email: res.email, type, ...assigned, permissions: data.permissions },
    });

    return { userId: res.userId, email: res.email, password, staffId, reused: res.reused, ...assigned };
  });

export const updateStaffPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ institutionId: z.string().uuid(), userId: z.string().uuid(), permissions: permKeys }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPrincipal(context.supabase, data.institutionId);
    if (data.userId === context.userId) throw new Error("You cannot change your own permissions.");
    const name = await staffName(data.institutionId, data.userId);
    const s = await import("./staff-accounts.server");
    return s.writePermissions({
      institutionId: data.institutionId,
      userId: data.userId,
      actorId: context.userId,
      staffName: name,
      keys: data.permissions,
    });
  });

export const updateStaffAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        userId: z.string().uuid(),
        staffType,
        subjects,
        classes: z.array(classRef).max(40),
        classTeacher: classRef.nullable(),
        sessionId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPrincipal(context.supabase, data.institutionId);
    if (data.userId === context.userId) throw new Error("You cannot change your own assignment.");
    const name = await staffName(data.institutionId, data.userId);
    const type = data.staffType as (typeof STAFF_TYPES)[number]["value"];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await import("./staff-accounts.server");
    const { data: before } = await supabaseAdmin
      .from("memberships")
      .select("staff_type")
      .eq("institution_id", data.institutionId)
      .eq("user_id", data.userId)
      .maybeSingle();
    await supabaseAdmin
      .from("memberships")
      .update({
        staff_type: type,
        is_class_teacher: needsClassTeacher(type),
        role: type === "admin_staff" ? "exam_cell" : "faculty",
      })
      .eq("institution_id", data.institutionId)
      .eq("user_id", data.userId);
    const assigned = await s.writeAssignments({
      institutionId: data.institutionId,
      userId: data.userId,
      actorId: context.userId,
      subjects: needsSubjects(type) ? data.subjects : [],
      classes: needsSubjects(type) ? data.classes : [],
      classTeacher: needsClassTeacher(type) ? data.classTeacher : null,
      sessionId: data.sessionId ?? null,
    });
    await s.audit({
      institutionId: data.institutionId,
      actorId: context.userId,
      action: "staff.assignment_changed",
      entityId: data.userId,
      description: `Changed ${name}'s assignment`,
      oldValue: { type: before?.staff_type ?? null },
      newValue: { type, ...assigned },
    });
    return assigned;
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        institutionId: z.string().uuid(),
        userId: z.string().uuid(),
        status: z.enum(["active", "suspended", "deactivated"]),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPrincipal(context.supabase, data.institutionId);
    if (data.userId === context.userId) throw new Error("You cannot change your own status.");
    const name = await staffName(data.institutionId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await import("./staff-accounts.server");
    const { data: before } = await supabaseAdmin
      .from("memberships")
      .select("status")
      .eq("institution_id", data.institutionId)
      .eq("user_id", data.userId)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("memberships")
      .update({ status: data.status, is_active: data.status === "active" })
      .eq("institution_id", data.institutionId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await s.audit({
      institutionId: data.institutionId,
      actorId: context.userId,
      action: "staff.status_changed",
      entityId: data.userId,
      description: `Changed ${name}'s status from ${before?.status ?? "unknown"} to ${data.status}`,
      reason: data.reason ?? null,
      oldValue: { status: before?.status ?? null },
      newValue: { status: data.status },
    });
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ institutionId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPrincipal(context.supabase, data.institutionId);
    if (data.userId === context.userId) throw new Error("Use account settings to change your own password.");
    const name = await staffName(data.institutionId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = await import("./staff-accounts.server");
    const password = s.generatePassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password });
    if (error) throw new Error(error.message);
    await s.audit({
      institutionId: data.institutionId,
      actorId: context.userId,
      action: "staff.password_reset",
      entityId: data.userId,
      description: `Reset ${name}'s password`,
    });
    return { password };
  });

export const getStaffPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ institutionId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.rpc("is_member", { _institution: data.institutionId });
    if (member !== true) throw new Error("Not allowed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("avatar_path").eq("id", data.userId).maybeSingle();
    if (!p?.avatar_path || !p.avatar_path.startsWith(`staff-photos/${data.institutionId}/`)) return { url: null };
    const { data: signed } = await supabaseAdmin.storage.from("records").createSignedUrl(p.avatar_path, 600);
    return { url: signed?.signedUrl ?? null };
  });
