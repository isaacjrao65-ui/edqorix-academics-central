import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { InstitutionProvider } from "@/lib/institution";
import { getViewAs } from "@/lib/view-as";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Platform owners belong in the control plane unless they are in a view-as session.
    const { data: owner } = await supabase.rpc("is_platform_admin");
    if (owner === true && !getViewAs()) throw redirect({ to: "/platform" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});


function AuthenticatedLayout() {
  return (
    <InstitutionProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </InstitutionProvider>
  );
}
