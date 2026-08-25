import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  FileStack,
  Layers,
  Lock,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Edqorix — Digital Examination Marks & Records for Institutions" },
      {
        name: "description",
        content:
          "Edqorix replaces correction registers and spreadsheets with a secure, auditable marks entry, verification and approval workflow for schools, colleges and universities.",
      },
      {
        property: "og:title",
        content: "Edqorix — Digital Examination Marks & Records for Institutions",
      },
      {
        property: "og:description",
        content:
          "Role-based marks entry, verification, approval and reporting with a complete audit trail. Built for schools, colleges and universities.",
      },
    ],
  }),
  component: Landing,
});

const WORKFLOW = [
  { role: "Faculty", detail: "Enter marks in a fast keyboard-driven grid and submit per section." },
  { role: "Head of Department", detail: "Verify submitted sheets or return them with remarks." },
  { role: "Examination Cell", detail: "Approve, lock and publish verified results." },
  { role: "Administrator", detail: "Manage staff, roles, academic structure and settings." },
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Examination management",
    body: "Internals, mid-terms, finals and practicals with max marks, weightage and pass marks per exam.",
  },
  {
    icon: Workflow,
    title: "Verification workflow",
    body: "Draft, submitted, verified, approved, published — with locked records and a return path at each stage.",
  },
  {
    icon: FileStack,
    title: "Document vault",
    body: "Private storage for scanned answer sheets, signed registers and revaluation forms.",
  },
  {
    icon: ScrollText,
    title: "Reports & records",
    body: "Consolidated mark registers, pass percentages and per-student academic records you can export.",
  },
  {
    icon: ShieldCheck,
    title: "Audit trail",
    body: "Every entry, verification, approval and unlock is written to an append-only log.",
  },
  {
    icon: Layers,
    title: "Built to scale",
    body: "One department or an entire university — multi-institution, multi-session, multi-program.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-display text-sm font-bold">E</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Edqorix</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Staff sign in</Link>
        </Button>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Lock className="size-3.5" strokeWidth={1.75} />
          Internal staff platform — no student logins
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.08] font-semibold text-balance-tight sm:text-6xl">
          Examination marks, verified and approved without a single paper register.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Edqorix is a centralised academic records system for schools, colleges, institutions and
          universities. Faculty enter marks, heads of department verify, the examination cell
          approves and publishes — and every action is auditable.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Sign in to your institution</Link>
          </Button>
        </div>
        <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
          {["Role-based access control", "Append-only audit log", "Private document storage"].map(
            (item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" strokeWidth={1.75} />
                {item}
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold sm:text-3xl">One controlled path from entry to result</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((step, index) => (
              <div key={step.role} className="rounded-xl border border-border bg-background p-6">
                <span className="font-display text-xs text-muted-foreground">
                  Step {index + 1}
                </span>
                <p className="mt-2 font-display text-base font-semibold">{step.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">Everything an examination cell needs</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-border bg-card p-6">
              <feature.icon className="size-5 text-primary" strokeWidth={1.75} />
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Edqorix — academic records infrastructure for institutions.</span>
          <Link to="/auth" className="text-foreground hover:underline">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
