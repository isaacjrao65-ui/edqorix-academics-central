import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  ChevronRight,
  Flag,
  Gauge,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";

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
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon?: typeof Gauge; search?: Record<string, string> };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  { label: "", items: [{ to: "/platform", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Institutions",
    items: [
      { to: "/platform/institutions", label: "All institutions", icon: Building2 },
      { to: "/platform/institutions", label: "Active", search: { status: "active" } },
      { to: "/platform/institutions", label: "Trial", search: { status: "trial" } },
      { to: "/platform/institutions", label: "Pending", search: { status: "pending" } },
      { to: "/platform/institutions", label: "Suspended", search: { status: "suspended" } },
      { to: "/platform/institutions", label: "Archived", search: { status: "archived" } },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/platform/people", label: "All users", icon: Users },
      { to: "/platform/people", label: "Admins", search: { role: "admin" } },
      { to: "/platform/people", label: "Staff", search: { role: "exam_cell" } },
      { to: "/platform/people", label: "Teachers", search: { role: "faculty" } },
    ],
  },
  {
    label: "Permissions",
    items: [
      { to: "/platform/permissions", label: "Requests & overrides", icon: KeyRound },
      { to: "/platform/permissions", label: "Roles & catalogue", search: { tab: "catalogue" } },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/platform/analytics", label: "Analytics", icon: Gauge },
      { to: "/platform/features", label: "Feature management", icon: Flag },
      { to: "/platform/storage", label: "Storage", icon: HardDrive },
      { to: "/platform/subscriptions", label: "Subscriptions", icon: ScrollText },
    ],
  },
  { label: "Support", items: [{ to: "/platform/support", label: "Tickets & requests", icon: LifeBuoy }] },
  {
    label: "Security",
    items: [
      { to: "/platform/security", label: "Security center", icon: ShieldAlert },
      { to: "/platform/audit", label: "Global audit logs", icon: Activity },
    ],
  },
  { label: "Settings", items: [{ to: "/platform/settings", label: "Platform settings", icon: Settings }] },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as Record<string, string>;

  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group, gi) => (
        <div key={group.label || gi} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const matches =
              pathname === item.to &&
              (item.search
                ? Object.entries(item.search).every(([k, v]) => search?.[k] === v)
                : !search?.["status"] && !search?.["role"] && !search?.["tab"]);
            return (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                search={item.search ?? {}}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  matches
                    ? "bg-white/10 font-medium text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                  !item.icon && "pl-9 text-[0.8rem]",
                )}
              >
                {item.icon ? <item.icon className="size-4 shrink-0" strokeWidth={1.75} /> : null}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function OwnerBrand() {
  return (
    <Link to="/platform" className="flex items-center gap-2.5">
      <img src={edqorixMark.url} alt="Edqorix" className="size-8 rounded-full" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-base font-semibold text-white">Edqorix</span>
        <span className="text-[0.65rem] uppercase tracking-[0.16em] text-cyan-300">
          Control plane
        </span>
      </span>
    </Link>
  );
}

function QuickCreate() {
  const navigate = useNavigate();
  const actions: { label: string; to: string; search?: Record<string, string> }[] = [
    { label: "Create institution", to: "/platform/institutions", search: { create: "1" } },
    { label: "Manage institution admins", to: "/platform/people" },
    { label: "Review permission requests", to: "/platform/permissions" },
    { label: "Create subscription plan", to: "/platform/subscriptions", search: { create: "1" } },
    { label: "Create feature flag", to: "/platform/features", search: { create: "1" } },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-cyan-500 text-slate-950 hover:bg-cyan-400">
          <Plus className="size-4" strokeWidth={2} />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Quick actions</DropdownMenuLabel>
        {actions.map((a) => (
          <DropdownMenuItem key={a.label} onClick={() => navigate({ to: a.to, search: a.search ?? {} })}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/platform-admin", replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-slate-950 px-4 py-6 lg:flex">
        <OwnerBrand />
        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <NavList />
        </div>
        <p className="px-3 text-[0.7rem] text-slate-500">Platform owner access only</p>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-200 lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" strokeWidth={1.75} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex h-full w-72 flex-col overflow-hidden border-white/10 bg-slate-950 px-4 py-6"
              >
                <SheetTitle className="sr-only">Platform navigation</SheetTitle>
                <OwnerBrand />
                <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
                  <NavList onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="hidden items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-cyan-300 sm:flex">
              Platform owner
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              onClick={() => navigate({ to: "/platform/search" })}
            >
              <Search className="size-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Search everything</span>
            </Button>
            <QuickCreate />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-200" aria-label="Owner menu">
                  <Users className="size-4" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Edqorix platform owner
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  Go to institution app
                  <ChevronRight className="ml-auto size-4" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" strokeWidth={1.75} />
                  Secure sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function OwnerPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function OwnerCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        className,
      )}
    >
      {title || actions ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? (
            <div>
              <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
              {description ? (
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "cyan" | "violet" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/0 text-cyan-300",
    violet: "from-violet-500/20 to-violet-500/0 text-violet-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-300",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className={cn("absolute inset-x-0 top-0 h-16 bg-gradient-to-b", tones[tone])} aria-hidden />
      <div className="relative">
        <p className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

export function OwnerBadge({ value }: { value: string | null | undefined }) {
  const v = (value ?? "unknown").toLowerCase();
  const map: Record<string, string> = {
    active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    trial: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    waiting: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    in_progress: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    clarification: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    suspended: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    rejected: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    critical: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    expired: "border-slate-400/30 bg-slate-400/10 text-slate-300",
    archived: "border-slate-400/30 bg-slate-400/10 text-slate-400",
    approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    closed: "border-slate-400/30 bg-slate-400/10 text-slate-400",
    open: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium capitalize",
        map[v] ?? "border-white/15 bg-white/5 text-slate-300",
      )}
    >
      {v.replace(/_/g, " ")}
    </span>
  );
}
