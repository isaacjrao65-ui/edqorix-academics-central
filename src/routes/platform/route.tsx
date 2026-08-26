import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { PlatformShell } from "@/components/platform-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/platform-admin" });
    const { data: owner } = await supabase.rpc("is_platform_admin");
    if (owner !== true) throw redirect({ to: "/platform-admin" });
    return { owner: data.user };
  },
  component: () => (
    <PlatformShell>
      <Outlet />
    </PlatformShell>
  ),
});
