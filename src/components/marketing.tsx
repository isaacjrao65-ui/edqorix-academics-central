import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  ChevronDown,
  GraduationCap,
  Lock,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------------------------- brand --------------------------------- */

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-md transition-transform duration-300 hover:scale-110 hover:rotate-6">
        <GraduationCap className="size-5" aria-hidden />
        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-brand-4 ring-2 ring-background" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Edqorix</span>

    </span>
  );
}

/* -------------------------------- animation ------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-[2px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="text-gradient-brand text-xs font-semibold tracking-[0.18em] uppercase">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- header -------------------------------- */

const NAV: { label: string; href: string }[] = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Schools", href: "/#schools" },
  { label: "For Colleges", href: "/#colleges" },
  { label: "For Universities", href: "/#universities" },
  { label: "Security", href: "/#security" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/70 bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Edqorix home" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="grid size-10 place-items-center rounded-md border border-border/70 text-foreground xl:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/70 bg-background/95 backdrop-blur-xl xl:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link to="/auth">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ---------------------------------- footer -------------------------------- */

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <Wordmark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Digital Academic Management, Simplified. Edqorix is a secure examination marks and
            academic records platform for authorized institutional staff.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden /> Students do not have access to this platform
          </p>
        </div>
        <FooterColumn
          title="Product"
          links={[
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how-it-works" },
            { label: "Reports", href: "/#reports" },
            { label: "Security", href: "/#security" },
          ]}
        />
        <FooterColumn
          title="Institution"
          links={[
            { label: "For schools", href: "/#schools" },
            { label: "For colleges", href: "/#colleges" },
            { label: "For universities", href: "/#universities" },
            { label: "FAQ", href: "/#faq" },
          ]}
        />
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Edqorix. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="size-3.5" aria-hidden /> Institution data isolated at the
            database layer
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- dashboard preview -------------------------- */

const PREVIEW_STATS = [
  { label: "Total students", value: "2,480" },
  { label: "Total teachers", value: "146" },
  { label: "Active examinations", value: "7" },
  { label: "Marks completion", value: "86%" },
];

const PREVIEW_ACTIVITY = [
  { who: "Ms. Sharma", what: "submitted Class 9-A Mathematics marks", when: "2m ago" },
  { who: "Mr. Raj", what: "changed Student A Mathematics 42 → 45", when: "18m ago" },
  { who: "Class teacher", what: "verified Class 10-B Science marks", when: "1h ago" },
  { who: "Principal", what: "approved Unit Test 1", when: "3h ago" },
  { who: "Exam office", what: "locked Half-Yearly Examination", when: "Yesterday" },
];

const PREVIEW_BARS = [
  { label: "Class 8", value: 92 },
  { label: "Class 9", value: 78 },
  { label: "Class 10", value: 64 },
  { label: "Class 11", value: 88 },
  { label: "Class 12", value: 71 },
];

export function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-[0_28px_80px_-40px_oklch(0.25_0.03_200/0.45)] sm:p-4">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
        </div>
        <span className="truncate rounded-md bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
          edqorix.app / dashboard
        </span>
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <Activity className="size-3.5" aria-hidden /> Live
        </span>
      </div>

      <div className="rounded-xl border border-border/70 bg-background p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PREVIEW_STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-lg border border-border/60 p-3 transition-transform duration-300 hover:-translate-y-0.5",
                [
                  "bg-brand-1/10 border-brand-1/25",
                  "bg-brand-2/10 border-brand-2/25",
                  "bg-brand-3/10 border-brand-3/25",
                  "bg-brand-5/10 border-brand-5/25",
                ][index % 4],
              )}
            >
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="mt-1.5 font-display text-xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-lg border border-border/60 bg-card/60 p-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Performance overview</p>
              <BarChart3 className="size-4 text-brand-2" aria-hidden />
            </div>
            <div className="mt-5 flex h-32 items-end gap-3">
              {PREVIEW_BARS.map((bar, index) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-28 w-full items-end rounded-md bg-muted/70">
                    <div
                      className={cn(
                        "w-full rounded-md transition-all duration-700",
                        [
                          "bg-brand-1",
                          "bg-brand-2",
                          "bg-brand-3",
                          "bg-brand-4",
                          "bg-brand-5",
                          "bg-brand-6",
                        ][index % 6],
                      )}
                      style={{ height: `${bar.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{bar.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md bg-success/10 px-3 py-2 text-success">
                Marks completed · 1,842
              </div>
              <div className="rounded-md bg-warning/15 px-3 py-2 text-foreground">
                Pending verification · 9 sheets
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/60 p-4 lg:col-span-2">
            <p className="text-sm font-medium">Recent activity</p>
            <ul className="mt-3 space-y-3">
              {PREVIEW_ACTIVITY.map((item, index) => (
                <li key={item.who + item.what} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      ["bg-brand-1", "bg-brand-2", "bg-brand-3", "bg-brand-5"][index % 4],
                    )}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-xs">
                      <span className="font-medium">{item.who}</span>{" "}
                      <span className="text-muted-foreground">{item.what}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- FAQ ---------------------------------- */

export const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Edqorix?",
    a: "Edqorix is a digital examination marks and academic records management platform. It replaces correction registers and spreadsheets with a single secure system for marks entry, verification, approval, document storage and reporting.",
  },
  {
    q: "Who can use Edqorix?",
    a: "Authorized institutional staff only — principals and super admins, administrative staff, class teachers and subject teachers.",
  },
  {
    q: "Can students log in?",
    a: "No. Edqorix is an internal staff platform. There is no student login and students are never given access to the system.",
  },
  {
    q: "Can teachers modify marks?",
    a: "Subject teachers can enter and edit marks freely until they submit them. After submission, marks move into the verification workflow and become read-only for teachers.",
  },
  {
    q: "What happens after marks are locked?",
    a: "Locked examinations are final. Ordinary staff cannot change anything. An authorized administrator can unlock with a mandatory reason, and the previous value, new value, user and timestamp are written to the audit log.",
  },
  {
    q: "Can we store question papers?",
    a: "Yes. The document vault stores question papers, answer keys, scanned answer sheets, result documents and administrative records in private storage with permission-based access.",
  },
  {
    q: "Can multiple classes use Edqorix?",
    a: "Yes. Classes, sections, subjects and academic years are modelled first-class, so any number of classes and sections can run simultaneously.",
  },
  {
    q: "Can we export reports?",
    a: "Yes. Every report can be viewed, printed and exported to CSV/Excel or PDF.",
  },
  {
    q: "Is institution data isolated?",
    a: "Yes. Every sensitive row is scoped to an institution and enforced by database-level row-level security, so one institution can never read another's students, marks, documents or audit logs.",
  },
  {
    q: "Can permissions be customized?",
    a: "Yes. Staff permissions are assigned by the principal or super admin. Staff never receive full system access automatically.",
  },
  {
    q: "Can universities use Edqorix?",
    a: "Yes. Departments, programs, courses, sections and credit-weighted assessments are supported for colleges and universities, alongside simpler school structures.",
  },
  {
    q: "Can we migrate existing records?",
    a: "Yes. Students, teachers and historical marks can be bulk imported from CSV, and documents can be uploaded into the vault.",
  },
  {
    q: "How secure is Edqorix?",
    a: "Authentication, role-based authorization, protected routes, backend permission checks, database security policies, session management and a complete audit trail. Security is enforced in the backend, never by hiding UI.",
  },
];

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50"
            >
              <span className="text-sm font-medium">{item.q}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- pricing -------------------------------- */

export const PRICING_TIERS: {
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}[] = [
  {
    name: "Starter",
    audience: "For small schools getting off paper.",
    price: "Contact us",
    priceNote: "Fixed plan, limited capacity",
    features: [
      "Up to 25 staff users",
      "Up to 500 students",
      "5 GB document storage",
      "Unlimited unit tests & term exams",
      "Standard reports & CSV export",
      "Marks entry, submission & verification",
    ],
    cta: "Get started",
  },
  {
    name: "Professional",
    audience: "For growing institutions and colleges.",
    price: "Contact us",
    priceNote: "Most institutions choose this",
    highlight: true,
    features: [
      "Up to 200 staff users",
      "Up to 5,000 students",
      "100 GB document storage",
      "Advanced reports & performance analysis",
      "Full audit log with search & filters",
      "Advanced role permissions",
      "Bulk import & migration support",
    ],
    cta: "Request a demo",
  },
  {
    name: "Enterprise",
    audience: "For large institutions and universities.",
    price: "Custom",
    priceNote: "Contract based",
    features: [
      "Unlimited users per contract",
      "Multiple campuses & departments",
      "Custom storage allocation",
      "Custom permission matrix",
      "Priority support & SLA",
      "Custom integrations & SSO",
    ],
    cta: "Talk to us",
  },
];
