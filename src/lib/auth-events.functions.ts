import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const input = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  success: z.boolean(),
  reason: z.string().max(300).optional(),
});

/**
 * Records every sign-in attempt (success or failure) with IP and user agent.
 * Public: callers are not yet authenticated on failures. Server resolves the
 * user + institution itself, so the client cannot spoof them.
 */
export const recordAuthAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const req = getRequest();
    const h = req?.headers;
    const ip =
      h?.get("cf-connecting-ip") ||
      h?.get("x-real-ip") ||
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const ua = h?.get("user-agent")?.slice(0, 500) ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    const userId = profile?.id ?? null;
    let institutionIds: (string | null)[] = [null];
    if (userId) {
      const { data: ms } = await supabaseAdmin
        .from("memberships")
        .select("institution_id")
        .eq("user_id", userId);
      if (ms && ms.length) institutionIds = [...new Set(ms.map((m) => m.institution_id))];
    }

    const detail = data.success
      ? "Signed in with login ID and password"
      : `Failed: ${data.reason ?? "unknown reason"}${userId ? "" : " (unknown login ID)"}`;

    await supabaseAdmin.from("security_events").insert(
      institutionIds.map((institution_id) => ({
        event_type: data.success ? "sign_in" : "sign_in_failed",
        severity: data.success ? "info" : "warning",
        email: data.email,
        user_id: userId,
        institution_id,
        detail,
        ip,
        user_agent: ua,
      })),
    );
    return { ok: true };
  });
