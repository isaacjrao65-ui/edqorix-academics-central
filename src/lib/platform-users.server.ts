import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ProvisionInput = {
  institutionId: string;
  email: string;
  password: string;
  fullName: string;
  designation?: string | undefined;
  role: "admin" | "exam_cell" | "hod" | "faculty";
  isClassTeacher?: boolean | undefined;
};

export async function provisionInstitutionUser(input: ProvisionInput) {
  const email = input.email.trim().toLowerCase();

  let userId: string | null = null;
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (created.error) {
    // Account may already exist — reuse it and update the password.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!existing) throw new Error(created.error.message);
    userId = existing.id;
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: input.password });
  } else {
    userId = created.data.user?.id ?? null;
  }

  if (!userId) throw new Error("Could not create the account.");

  await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: userId, full_name: input.fullName, email, designation: input.designation ?? null },
      { onConflict: "id" },
    );

  const { data: existingMember } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("institution_id", input.institutionId)
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    institution_id: input.institutionId,
    user_id: userId,
    role: input.role,
    status: "active" as const,
    is_active: true,
    is_class_teacher: input.isClassTeacher ?? false,
    designation: input.designation ?? null,
  };

  if (existingMember) {
    const { error } = await supabaseAdmin
      .from("memberships")
      .update(payload)
      .eq("id", existingMember.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("memberships").insert(payload);
    if (error) throw new Error(error.message);
  }

  return { userId, email, reused: Boolean(created.error) };
}

export async function logPlatformAuditServer(entry: {
  actorId: string;
  action: string;
  institutionId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  newValue?: Record<string, unknown> | null;
}) {
  await supabaseAdmin.from("platform_audit_logs").insert({
    actor_id: entry.actorId,
    action: entry.action,
    institution_id: entry.institutionId ?? null,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    target_label: entry.targetLabel ?? null,
    reason: entry.reason ?? null,
    new_value: (entry.newValue ?? null) as never,
  });
}
