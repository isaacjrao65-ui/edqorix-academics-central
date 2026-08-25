import { supabase } from "@/integrations/supabase/client";

type AuditInput = {
  institutionId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  details?: Record<string, unknown>;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

/**
 * Append-only audit trail. Failures are logged but never block the user action.
 * Records Who → What → When → Previous value → New value → Reason.
 */
export async function logAudit(input: AuditInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { error } = await supabase.from("audit_logs").insert({
    institution_id: input.institutionId,
    actor_id: auth.user.id,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    description: input.description ?? null,
    details: (input.details ?? {}) as never,
    reason: input.reason ?? null,
    old_value: (input.oldValue ?? null) as never,
    new_value: (input.newValue ?? null) as never,
  });
  if (error) console.error("audit log failed", error);
}
