import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "exam_cell", "hod", "faculty"]);

const createSchema = z.object({
  institutionId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  designation: z.string().optional(),
  role: roleEnum,
  isClassTeacher: z.boolean().optional(),
});

const passwordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8),
});

export const createInstitutionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isOwner, error: ownerError } = await context.supabase.rpc("is_platform_admin");
    if (ownerError || !isOwner) throw new Error("Only the platform owner can create accounts.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    let userId: string | null = null;
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
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
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
    } else {
      userId = created.data.user?.id ?? null;
    }

    if (!userId) throw new Error("Could not create the account.");

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, full_name: data.fullName, email, designation: data.designation ?? null },
        { onConflict: "id" },
      );

    const { data: existingMember } = await supabaseAdmin
      .from("memberships")
      .select("id")
      .eq("institution_id", data.institutionId)
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      institution_id: data.institutionId,
      user_id: userId,
      role: data.role,
      status: "active" as const,
      is_active: true,
      is_class_teacher: data.isClassTeacher ?? false,
      designation: data.designation ?? null,
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
  });

export const setInstitutionUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isOwner, error: ownerError } = await context.supabase.rpc("is_platform_admin");
    if (ownerError || !isOwner) throw new Error("Only the platform owner can reset passwords.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
