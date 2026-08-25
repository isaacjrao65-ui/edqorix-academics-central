import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  FileStack,
  GraduationCap,
  LayoutDashboard,
  Menu,
  PenSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useInstitution } from "@/lib/institution";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  manageOnly?: boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exams", label: "Examinations", icon: ClipboardList },
  { to: "/marks", label: "Marks & approvals", icon: PenSquare },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/academics", label: "Academics", icon: BookOpen },
  { to: "/documents", label: "Document vault", icon: FileStack },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/team", label: "Staff & roles", icon: UsersRound, manageOnly: true },
  { to: "/audit", label: "Audit log", icon: ShieldCheck, manageOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canManage, isAdmin } = useInstitution();

  const items = NAV.filter(
    (item) => (!item.manageOnly || canManage) && (!item.adminOnly || isAdmin),
  );

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="font-display text-sm font-bold">E</span>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Edqorix</span>
    </div>
  );
}

function AccountMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { memberships, institutionId, institutionName, roles, isPlatformAdmin, setInstitutionId } =
    useInstitution();


  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const others = memberships.filter((m) => m.institution_id !== institutionId);
  const uniqueOthers = Array.from(new Map(others.map((m) => [m.institution_id, m])).values());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[16rem] justify-start gap-2">
          <Users className="size-4" strokeWidth={1.75} />
          <span className="truncate">{institutionName || "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate text-sm font-medium">{institutionName}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            {roles.map((r) => ROLE_LABEL[r]).join(" · ") || "No role"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {uniqueOthers.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch institution
            </DropdownMenuLabel>
            {uniqueOthers.map((m) => (
              <DropdownMenuItem
                key={m.institution_id}
                onClick={() => setInstitutionId(m.institution_id)}
              >
                <span className="truncate">{m.institutions?.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
          Add an institution
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4" strokeWidth={1.75} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Brand />
        <div className="mt-8 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <p className="px-3 text-xs text-muted-foreground">Staff access only</p>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" strokeWidth={1.75} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar px-4 py-6">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <div className="mt-8">
                  <NavList onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-display text-base font-semibold lg:hidden">Edqorix</span>
          </div>
          <AccountMenu />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
          <InstitutionGate>{children}</InstitutionGate>
        </main>

      </div>
    </div>
  );
}

function InstitutionGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { institutionId, isLoading } = useInstitution();

  if (pathname === "/onboarding") return <>{children}</>;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!institutionId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <h2 className="font-display text-lg font-semibold">No institution yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Create your institution to set up departments, courses and examinations — or ask an
          administrator to add you to an existing one.
        </p>
        <Button asChild className="mt-6">
          <Link to="/onboarding">Create an institution</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
