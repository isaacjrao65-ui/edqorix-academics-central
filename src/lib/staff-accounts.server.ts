import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { STAFF_PERMISSION_LABEL } from "./staff-permissions";

export type ClassRef = { classId?: string | undefined; number?: string | undefined; section?: string | undefined };

export async function audit(entry: {
  institutionId: string;
  actorId: string;
  action: string;
  entityId?: string | null;
  description: string;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("audit_logs").insert({
    institution_id: entry.institutionId,
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: "staff",
    entity_id: entry.entityId ?? null,
    description: entry.description,
    reason: entry.reason ?? null,
    details: (entry.details ?? {}) as never,
    old_value: (entry.oldValue ?? null) as never,
    new_value: (entry.newValue ?? null) as never,
  });
}

export async function resolveCourses(institutionId: string, subjects: string[]) {
  const ids: string[] = [];
  for (const raw of subjects) {
    const title = raw.trim();
    if (!title) continue;
    const { data: found } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("institution_id", institutionId)
      .ilike("title", title)
      .limit(1)
      .maybeSingle();
    if (found) {
      ids.push(found.id);
      continue;
    }
    const code = `${title.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SUB"}-${Math.floor(100 + Math.random() * 900)}`;
    const { data: created, error } = await supabaseAdmin
      .from("courses")
      .insert({ institution_id: institutionId, title, code })
      .select("id")
      .single();
    if (error) throw new Error(`Could not add subject ${title}: ${error.message}`);
    ids.push(created.id);
  }
  return [...new Set(ids)];
}

export async function resolveClass(institutionId: string, ref: ClassRef, sessionId?: string | null) {
  if (ref.classId) {
    const { data } = await supabaseAdmin
      .from("classes")
      .select("id, name, section")
      .eq("id", ref.classId)
      .eq("institution_id", institutionId)
      .maybeSingle();
    if (!data) throw new Error("Selected class does not belong to this institution.");
    return data;
  }
  const num = (ref.number ?? "").trim();
  const section = (ref.section ?? "").trim().toUpperCase();
  if (!num) throw new Error("Class number is required.");
  const names = [num, `Class ${num}`];
  const { data: found } = await supabaseAdmin
    .from("classes")
    .select("id, name, section")
    .eq("institution_id", institutionId)
    .in("name", names)
    .eq("section", section)
    .limit(1)
    .maybeSingle();
  if (found) return found;
  const { data: created, error } = await supabaseAdmin
    .from("classes")
    .insert({ institution_id: institutionId, name: `Class ${num}`, section, session_id: sessionId ?? null })
    .select("id, name, section")
    .single();
  if (error) throw new Error(`Could not add class ${num}-${section}: ${error.message}`);
  return created;
}

export function label(c: { name: string; section: string }) {
  return c.section ? `${c.name}-${c.section}` : c.name;
}

/** Replace a user's explicit staff permissions, auditing each change individually. */
export async function writePermissions(opts: {
  institutionId: string;
  userId: string;
  actorId: string;
  staffName: string;
  keys: string[];
  initial?: boolean;
}) {
  const { data: existing } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key, granted")
    .eq("institution_id", opts.institutionId)
    .eq("user_id", opts.userId)
    .like("permission_key", "sp.%");
  const before = new Set((existing ?? []).filter((r) => r.granted).map((r) => r.permission_key));
  const after = new Set(opts.keys);

  await supabaseAdmin
    .from("user_permissions")
    .delete()
    .eq("institution_id", opts.institutionId)
    .eq("user_id", opts.userId)
    .like("permission_key", "sp.%");
  if (after.size) {
    const { error } = await supabaseAdmin.from("user_permissions").insert(
      [...after].map((k) => ({
        institution_id: opts.institutionId,
        user_id: opts.userId,
        permission_key: k,
        granted: true,
        created_by: opts.actorId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (opts.initial) return { changed: after.size };
  let changed = 0;
  for (const key of new Set([...before, ...after])) {
    const was = before.has(key);
    const now = after.has(key);
    if (was === now) continue;
    changed++;
    await audit({
      institutionId: opts.institutionId,
      actorId: opts.actorId,
      action: "staff.permission_changed",
      entityId: opts.userId,
      description: `Changed ${opts.staffName}'s permission "${STAFF_PERMISSION_LABEL[key] ?? key}" from ${was ? "Enabled" : "Disabled"} to ${now ? "Enabled" : "Disabled"}`,
      oldValue: { permission: key, enabled: was },
      newValue: { permission: key, enabled: now },
      details: { staff: opts.staffName },
    });
  }
  return { changed };
}

/** Replace subject/class assignments and class-teacher assignment for a staff member. */
export async function writeAssignments(opts: {
  institutionId: string;
  userId: string;
  actorId: string;
  subjects: string[];
  classes: ClassRef[];
  classTeacher: ClassRef | null;
  sessionId?: string | null;
}) {
  const courseIds = await resolveCourses(opts.institutionId, opts.subjects);
  const classRows = [];
  for (const c of opts.classes) classRows.push(await resolveClass(opts.institutionId, c, opts.sessionId));

  await supabaseAdmin
    .from("class_subject_teachers")
    .delete()
    .eq("institution_id", opts.institutionId)
    .eq("teacher_id", opts.userId);
  const pairs = courseIds.flatMap((course_id) =>
    classRows.map((c) => ({
      institution_id: opts.institutionId,
      class_id: c.id,
      course_id,
      teacher_id: opts.userId,
      created_by: opts.actorId,
    })),
  );
  if (pairs.length) {
    const { error } = await supabaseAdmin.from("class_subject_teachers").insert(pairs);
    if (error) throw new Error(error.message);
  }

  // Only one class per class teacher: release any previous class first.
  await supabaseAdmin
    .from("classes")
    .update({ class_teacher_id: null })
    .eq("institution_id", opts.institutionId)
    .eq("class_teacher_id", opts.userId);
  let ctClass: { id: string; name: string; section: string } | null = null;
  if (opts.classTeacher) {
    ctClass = await resolveClass(opts.institutionId, opts.classTeacher, opts.sessionId);
    const { error } = await supabaseAdmin
      .from("classes")
      .update({ class_teacher_id: opts.userId, ...(opts.sessionId ? { session_id: opts.sessionId } : {}) })
      .eq("id", ctClass.id);
    if (error) throw new Error(error.message);
  }

  const { data: courses } = courseIds.length
    ? await supabaseAdmin.from("courses").select("title").in("id", courseIds)
    : { data: [] as { title: string }[] };
  return {
    subjects: (courses ?? []).map((c) => c.title),
    classes: classRows.map(label),
    classTeacherOf: ctClass ? label(ctClass) : null,
  };
}

export function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `${Array.from(bytes, (b) => chars[b % chars.length]).join("")}@${Math.floor(10 + Math.random() * 89)}`;
}

export async function generateStaffId(institutionId: string) {
  for (let i = 0; i < 10; i++) {
    const id = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("staff_id", id)
      .maybeSingle();
    if (!data) return id;
  }
  return `STF-${Date.now().toString().slice(-6)}`;
}
