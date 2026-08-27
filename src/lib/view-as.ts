import { supabase } from "@/integrations/supabase/client";

import { logPlatformAudit } from "./platform";

const KEY = "edqorix.view-as";
const INSTITUTION_KEY = "edqorix.institution";

export type ViewAsSession = {
  sessionId: string;
  institutionId: string;
  institutionName: string;
  role: string;
  roleLabel: string;
  reason: string;
  startedAt: string;
  userId?: string;
  userName?: string;
};

export function getViewAs(): ViewAsSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ViewAsSession;
  } catch {
    return null;
  }
}

export async function startViewAs(input: {
  institutionId: string;
  institutionName: string;
  role: string;
  roleLabel: string;
  reason: string;
  userId?: string;
  userName?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("impersonation_sessions")
    .insert({
      platform_user_id: auth.user.id,
      institution_id: input.institutionId,
      viewed_role: input.role,
      reason: input.reason,
      actions: input.userId ? { target_user_id: input.userId, target_user: input.userName } : {},
    })
    .select("id, started_at")
    .single();
  if (error) throw error;


  const session: ViewAsSession = {
    sessionId: data.id,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    role: input.role,
    roleLabel: input.roleLabel,
    reason: input.reason,
    startedAt: data.started_at,
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.localStorage.setItem(INSTITUTION_KEY, input.institutionId);

  await logPlatformAudit({
    action: "impersonation.started",
    institutionId: input.institutionId,
    targetType: "institution",
    targetId: input.institutionId,
    targetLabel: input.institutionName,
    reason: input.reason,
    newValue: { role: input.role },
  });
  return session;
}

export async function endViewAs() {
  const session = getViewAs();
  window.localStorage.removeItem(KEY);
  if (!session) return;
  await supabase
    .from("impersonation_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", session.sessionId);
  await logPlatformAudit({
    action: "impersonation.ended",
    institutionId: session.institutionId,
    targetType: "institution",
    targetId: session.institutionId,
    targetLabel: session.institutionName,
    reason: session.reason,
    oldValue: { role: session.role, startedAt: session.startedAt },
  });
}
