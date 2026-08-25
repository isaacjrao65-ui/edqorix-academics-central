import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { InstitutionProvider } from "@/lib/institution";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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
