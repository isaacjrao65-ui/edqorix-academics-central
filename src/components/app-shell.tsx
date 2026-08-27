import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  FileStack,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  LayoutDashboard,
  Menu,
  PenSquare,
  Plus,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  LogOut,
} from "lucide-react";

import { useEffect, useState, type ReactNode } from "react";

import { endViewAs, getViewAs, type ViewAsSession } from "@/lib/view-as";

import { edqorixMark } from "@/lib/brand";
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

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { to: "/users", label: "Users & access", icon: UsersRound, manageOnly: true },
      { to: "/roles", label: "Roles & permissions", icon: KeyRound, adminOnly: true },
      { to: "/students", label: "Students", icon: GraduationCap },
    ],
  },
  {
    label: "Academic",
    items: [
      { to: "/classes", label: "Classes & assignment", icon: LayoutGrid, manageOnly: true },
      { to: "/academics", label: "Departments & subjects", icon: BookOpen },
      { to: "/exams", label: "Examinations", icon: ClipboardList },
      { to: "/marks", label: "Marks & approvals", icon: PenSquare },
    ],
  },
  {
    label: "Records",
    items: [
      { to: "/documents", label: "Document vault", icon: FileStack },
      { to: "/reports", label: "Reports", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/audit", label: "Audit log", icon: ShieldCheck, manageOnly: true },
      { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canManage, isAdmin } = useInstitution();

  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter(
          (item) => (!item.manageOnly || canManage) && (!item.adminOnly || isAdmin),
        );
        if (items.length === 0) return null;
        return (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
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
          </div>
        );
      })}
    </nav>
  );
}

function QuickCreate() {
  const navigate = useNavigate();
  const { canManage } = useInstitution();
  if (!canManage) return null;
  const actions: { label: string; to: string }[] = [
    { label: "New examination", to: "/exams" },
    { label: "Add students", to: "/students" },
    { label: "New class", to: "/classes" },
    { label: "Invite a user", to: "/users" },
    { label: "Upload a document", to: "/documents" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" strokeWidth={2} />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Quick create</DropdownMenuLabel>
        {actions.map((action) => (
          <DropdownMenuItem key={action.to} onClick={() => navigate({ to: action.to })}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={edqorixMark.url} alt="Edqorix logo" className="size-8 rounded-full" />
      <span className="font-display text-lg font-semibold tracking-tight">Edqorix</span>
    </Link>
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
            {isPlatformAdmin
              ? "Platform owner · full access"
              : roles.map((r) => ROLE_LABEL[r]).join(" · ") || "No role"}
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

const MOBILE_TABS: { to: string; label: string; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/exams", label: "Exams", icon: ClipboardList },
  { to: "/marks", label: "Marks", icon: PenSquare },
];

function MobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-5">
        {MOBILE_TABS.map((tab) => {
          const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Menu className="size-5" strokeWidth={1.75} />
          More
        </button>
      </div>
    </nav>
  );
}

function ViewAsBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ViewAsSession | null>(null);

  useEffect(() => {
    setSession(getViewAs());
  }, []);

  if (!session) return null;

  async function exitViewAs() {
    await endViewAs();
    setSession(null);
    queryClient.clear();
    navigate({ to: "/platform/institutions/$institutionId", params: { institutionId: session!.institutionId }, search: {} });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 sm:px-8">
      <ShieldCheck className="size-4" strokeWidth={2} />
      <span>
        PLATFORM OWNER MODE — {session.userName ? `SIGNED INTO ${session.userName.toUpperCase()}'S VIEW · ` : ""}
        {session.roleLabel.toUpperCase()} · {session.institutionName}
      </span>

      <Button
        size="sm"
        variant="outline"
        className="ml-auto border-amber-900/30 bg-amber-950/10 text-amber-950 hover:bg-amber-950/20"
        onClick={exitViewAs}
      >
        Exit view-as mode
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <ViewAsBanner />
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
          <div className="flex items-center gap-2">
            <QuickCreate />
            <AccountMenu />
          </div>

        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-8 sm:py-10 lg:pb-10">
          <InstitutionGate>{children}</InstitutionGate>
        </main>
        <MobileTabBar onOpenMenu={() => setOpen(true)} />
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
