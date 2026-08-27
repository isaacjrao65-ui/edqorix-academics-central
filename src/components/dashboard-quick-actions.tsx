import { Link } from "@tanstack/react-router";
import { ChevronDown, ClipboardCheck, ClipboardList, Download, PenSquare } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useInstitution } from "@/lib/institution";
import { cn } from "@/lib/utils";

/**
 * Quick actions bar shown in every role dashboard header. Actions the current
 * role may not perform are hidden — the database enforces the same rules.
 */
export function DashboardQuickActions() {
  const { canManage, isAdmin } = useInstitution();

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {canManage ? (
        <Button asChild size="sm" className="flex-1 sm:flex-none">
          <Link to="/exams">
            <ClipboardList className="size-4" strokeWidth={1.75} />
            Create exam
          </Link>
        </Button>
      ) : null}
      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
        <Link to="/marks">
          <PenSquare className="size-4" strokeWidth={1.75} />
          Add marks
        </Link>
      </Button>
      {canManage || isAdmin ? (
        <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
          <Link to="/marks">
            <ClipboardCheck className="size-4" strokeWidth={1.75} />
            Approve records
          </Link>
        </Button>
      ) : null}
      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
        <Link to="/reports">
          <Download className="size-4" strokeWidth={1.75} />
          Download reports
        </Link>
      </Button>
    </div>
  );
}

/** Section whose collapsed state is remembered per role. */
export function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  children,
  className,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")}
          strokeWidth={1.75}
        />
      </button>
      {collapsed ? null : (
        <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      )}
    </section>
  );
}
