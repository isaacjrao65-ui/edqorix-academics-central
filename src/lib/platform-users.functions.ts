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

const bulkSchema = z.object({
  institutionId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        line: z.number(),
        fullName: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        role: roleEnum,
        designation: z.string().optional(),
        isClassTeacher: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(200),
});

/** Platform owners may provision anywhere; institution admins only inside their own institution. */
async function assertCanProvision(
  client: unknown,
  institutionId: string,
) {
  const { rpc } = client as {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const call = rpc.bind(client) as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown }>;
  const { data: isOwner } = await call("is_platform_admin");
  if (isOwner === true) return;
  const { data: isAdmin } = await call("is_admin", { _institution: institutionId });
  if (isAdmin === true) return;
  throw new Error("Only the platform owner or an institution administrator can manage accounts.");
}

export const createInstitutionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertCanProvision(context.supabase, data.institutionId);

    const { provisionInstitutionUser } = await import("./platform-users.server");
    return provisionInstitutionUser(data);
  });

export const bulkCreateInstitutionUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bulkSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertCanProvision(context.supabase, data.institutionId);

    const { provisionInstitutionUser, logPlatformAuditServer } = await import(
      "./platform-users.server"
    );

    const results: {
      line: number;
      email: string;
      fullName: string;
      role: string;
      status: "created" | "updated" | "failed";
      message?: string;
    }[] = [];

    for (const row of data.rows) {
      try {
        const res = await provisionInstitutionUser({
          institutionId: data.institutionId,
          email: row.email,
          password: row.password,
          fullName: row.fullName,
          designation: row.designation,
          role: row.role,
          isClassTeacher: row.isClassTeacher,
        });
        await logPlatformAuditServer({
          actorId: context.userId,
          action: res.reused ? "institution_user.bulk_updated" : "institution_user.bulk_created",
          institutionId: data.institutionId,
          targetType: "user",
          targetId: res.userId,
          targetLabel: `${row.fullName} (${res.email})`,
          reason: "CSV bulk import",
          newValue: { role: row.role, line: row.line, is_class_teacher: row.isClassTeacher ?? false },
        });
        results.push({
          line: row.line,
          email: res.email,
          fullName: row.fullName,
          role: row.role,
          status: res.reused ? "updated" : "created",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await logPlatformAuditServer({
          actorId: context.userId,
          action: "institution_user.bulk_failed",
          institutionId: data.institutionId,
          targetType: "user",
          targetLabel: `${row.fullName} (${row.email})`,
          reason: "CSV bulk import",
          newValue: { role: row.role, line: row.line, error: message },
        });
        results.push({
          line: row.line,
          email: row.email,
          fullName: row.fullName,
          role: row.role,
          status: "failed",
          message,
        });
      }
    }

    return { results };
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
