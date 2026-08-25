import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileStack,
  FolderTree,
  GraduationCap,
  KeyRound,
  Landmark,
  Lock,
  Notebook,
  Search,
  ScrollText,
  ShieldCheck,
  Timer,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";

import {
  DashboardPreview,
  FAQS,
  FaqList,
  PRICING_TIERS,
  Reveal,
  SectionHeading,
  SiteFooter,
  SiteHeader,
} from "@/components/marketing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Edqorix — Digital Examination Marks & Academic Records Platform" },
      {
        name: "description",
        content:
          "Edqorix replaces paper marks registers and spreadsheets with secure digital marks entry, verification, approval, document storage and reporting for schools, colleges and universities.",
      },
      {
        property: "og:title",
        content: "Edqorix — Digital Academic Management, Simplified",
      },
      {
        property: "og:description",
        content:
          "Secure examination marks entry, verification workflow, audit trail, document vault and reports — built for institutional staff only.",
      },
    ],
  }),
  component: Landing,
});

const INSTITUTION_TYPES = ["Schools", "Colleges", "Institutions", "Universities"];

const PROBLEMS = [
  {
    icon: Notebook,
    title: "Physical registers",
    body: "Correction marks are written manually in registers that live in one cupboard.",
  },
  {
    icon: FileSpreadsheet,
    title: "Manual data entry",
    body: "Teachers and staff re-enter the same information into multiple sheets.",
  },
  {
    icon: Calculator,
    title: "Calculation errors",
    body: "Manual totals, averages and grades quietly introduce mistakes.",
  },
  {
    icon: FileStack,
    title: "Lost records",
    body: "Paper can be damaged, misplaced or impossible to retrieve years later.",
  },
  {
    icon: BadgeCheck,
    title: "Difficult verification",
    body: "Nobody knows for certain which teacher has submitted which subject.",
  },
  {
    icon: ScrollText,
    title: "No audit trail",
    body: "There is no record of who changed a mark, when, or why.",
  },
  {
    icon: FolderTree,
    title: "Scattered documents",
    body: "Question papers, answer keys and reports sit across drives and inboxes.",
  },
  {
    icon: Timer,
    title: "Slow result preparation",
    body: "Compiling results manually takes days of avoidable staff time.",
  },
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Digital marks entry",
    body: "Subject teachers enter marks directly into a fast, keyboard-driven grid with live validation.",
  },
  {
    icon: Building2,
    title: "Examination management",
    body: "Create examinations with academic year, classes, sections, subjects, maximum and passing marks.",
  },
  {
    icon: Workflow,
    title: "Verification workflow",
    body: "Marks are submitted, verified, approved and locked — with a return path and remarks at each stage.",
  },
  {
    icon: FileStack,
    title: "Secure document storage",
    body: "Question papers, answer keys, result and administrative documents in private, permissioned storage.",
  },
  {
    icon: UserCog,
    title: "Role-based access",
    body: "Principals, staff, class teachers and subject teachers see only what they are authorized to see.",
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    body: "Every entry, edit, verification and approval is recorded with old value, new value, user and reason.",
  },
  {
    icon: BarChart3,
    title: "Automated reports",
    body: "Class, subject, student and examination reports with grade distribution and pass/fail analysis.",
  },
  {
    icon: Lock,
    title: "Examination lock",
    body: "Finalized examinations are locked so results cannot be altered without an audited override.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create examination",
    body: "Admin sets up the examination, academic year, classes, sections, subjects, maximum marks and passing marks.",
  },
  {
    step: "02",
    title: "Assign teachers",
    body: "Subject teachers are assigned to specific classes and subjects; class teachers are assigned to sections.",
  },
  {
    step: "03",
    title: "Enter marks",
    body: "Subject teachers enter marks in a fast grid with auto-saved drafts and completion tracking.",
  },
  {
    step: "04",
    title: "Verify & approve",
    body: "Authorized class teachers or staff verify submitted marks; the principal or admin approves.",
  },
  {
    step: "05",
    title: "Lock & report",
    body: "Approved examinations are locked and results, reports and exports are generated instantly.",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    name: "Principal / Super Admin",
    summary: "Full institution authority.",
    points: [
      "Manage institution, academic years, classes and sections",
      "Manage students, teachers and staff",
      "Create examinations and assign teachers",
      "Verify marks, approve and lock examinations",
      "Manage documents, permissions and settings",
      "View all marks, reports and audit logs",
    ],
  },
  {
    icon: UserCog,
    name: "Staff / Administrator",
    summary: "Access strictly limited to permissions granted by the principal.",
    points: [
      "Manage students, teachers and classes (if permitted)",
      "Manage examinations (if permitted)",
      "View and verify marks (if permitted)",
      "Manage documents and generate reports",
      "No full system access is ever granted automatically",
    ],
  },
  {
    icon: Users,
    name: "Class Teacher",
    summary: "Access only to assigned classes.",
    points: [
      "View students and class marks",
      "Monitor marks completion per subject",
      "See pending submissions at a glance",
      "Verify marks where authorized",
      "View class reports",
    ],
  },
  {
    icon: ClipboardList,
    name: "Subject Teacher",
    summary: "Access only to assigned classes and subjects.",
    points: [
      "View assigned students",
      "Enter and edit marks before submission",
      "Submit marks for verification",
      "View their own subject records",
      "Upload relevant documents",
    ],
  },
];

const SECURITY = [
  { icon: KeyRound, title: "Secure authentication", body: "Hashed passwords, managed sessions, password reset and account activation controls." },
  { icon: ShieldCheck, title: "Backend authorization", body: "Every sensitive action is checked on the server, never by hiding a button in the UI." },
  { icon: Database, title: "Database security policies", body: "Row-level security scopes every record to its institution and the caller's role." },
  { icon: Lock, title: "Multi-tenant isolation", body: "Institution A can never read Institution B's students, marks, documents or logs." },
  { icon: ScrollText, title: "Complete audit trail", body: "User, role, action, previous value, new value, reason, date and time on every change." },
  { icon: FileStack, title: "Secure document access", body: "Private storage with short-lived signed links, granted per role and institution." },
];

const SEGMENTS = [
  {
    id: "schools",
    icon: GraduationCap,
    label: "For Schools",
    title: "Unit tests to annual examinations, without the register",
    body: "Model classes, sections and subjects, assign class teachers, and let subject teachers submit marks from any device. Class teachers see completion at a glance; the principal approves and locks results.",
    points: [
      "Classes, sections and subject-teacher assignments",
      "Unit tests, half-yearly, pre-board and annual exams",
      "Class-wise completion and pending submission tracking",
      "Report cards, grade distribution and pass/fail analysis",
    ],
  },
  {
    id: "colleges",
    icon: Landmark,
    label: "For Colleges",
    title: "Internals, practicals and finals with proper weightage",
    body: "Departments, programs and courses with credit-weighted assessments. Exam cell staff verify and approve, while faculty focus on entry alone.",
    points: [
      "Departments, programs, courses and course sections",
      "Internal assessment, practical and final components",
      "Weightage-aware aggregation and grade scales",
      "Exam-cell verification queue with return-for-correction",
    ],
  },
  {
    id: "universities",
    icon: Building2,
    label: "For Universities",
    title: "Multi-campus scale with strict examination governance",
    body: "Run many faculties, departments and sessions simultaneously with delegated administration and a defensible audit trail for every result published.",
    points: [
      "Multiple campuses, faculties and academic sessions",
      "Delegated administration and custom permission matrices",
      "Bulk import of large cohorts and historical records",
      "Result publication controls with locked, audited overrides",
    ],
  },
];

const REPORTS = [
  "Student mark report",
  "Class result",
  "Subject result",
  "Examination result",
  "Teacher submission report",
  "Pending marks report",
  "Performance analysis",
  "Grade distribution",
  "Pass / fail analysis",
];

const ACCENTS = [
  "bg-brand-violet/15 text-brand-violet",
  "bg-brand-cyan/15 text-brand-cyan",
  "bg-brand-pink/15 text-brand-pink",
  "bg-brand-amber/20 text-brand-amber",
  "bg-brand-emerald/15 text-brand-emerald",
  "bg-primary/15 text-primary",
];

function Landing() {
  return (
    <div className="min-h-screen scroll-smooth bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -left-24 size-[26rem] rounded-full bg-brand-violet/25 blur-3xl animate-drift" />
          <div className="absolute -top-24 right-0 size-[22rem] rounded-full bg-brand-cyan/25 blur-3xl animate-drift [animation-delay:-6s]" />
          <div className="absolute top-40 left-1/3 size-[20rem] rounded-full bg-brand-pink/20 blur-3xl animate-drift [animation-delay:-12s]" />
          <div className="absolute top-72 right-1/4 size-[18rem] rounded-full bg-brand-amber/20 blur-3xl animate-float-slow" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-brand opacity-70"
        />
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24 lg:px-8">
          <Reveal className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-violet/30 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-emerald" />
              Digital Academic Management, Simplified
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance-tight sm:text-5xl lg:text-6xl">
              Replace paper-based marks management with a{" "}
              <span className="text-gradient-brand">smarter digital system</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Edqorix helps educational institutions enter, verify, manage, secure and analyze
              examination marks from one centralized platform.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full border-0 bg-gradient-brand text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-[1.03] sm:w-auto"
              >
                <Link to="/auth">
                  Get Started <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-brand-violet/30 transition-transform duration-300 hover:scale-[1.03] hover:bg-brand-violet/10 sm:w-auto"
              >
                <Link to="/contact">Request a Demo</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs tracking-wide text-muted-foreground">
              Built for Schools • Colleges • Institutions • Universities
            </p>
          </Reveal>

          <Reveal delay={120} className="mx-auto mt-14 max-w-5xl animate-float-slow">
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      {/* Trusted by / institution types */}
      <section className="relative overflow-hidden border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col items-center gap-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              One platform, every kind of institution
            </p>
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
              {INSTITUTION_TYPES.map((type, index) => (
                <div
                  key={type}
                  className={`rounded-xl border border-border/60 bg-background px-4 py-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    ["hover:border-brand-violet/50", "hover:border-brand-cyan/50", "hover:border-brand-pink/50", "hover:border-brand-amber/60"][index % 4]
                  }`}
                >
                  <p className="font-display text-base font-semibold">{type}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>


      {/* Problem */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="The problem"
            title="Still managing marks on paper or spreadsheets?"
            subtitle="These are the failure points every examination cycle repeats — until the process moves into one system."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((item, index) => (
            <Reveal key={item.title} delay={index * 60}>
              <div className="card-glow card-glow-hover h-full rounded-xl border border-border/70 bg-card p-5">
                <span className={`grid size-9 place-items-center rounded-lg ${ACCENTS[index % ACCENTS.length]}`}>
                  <item.icon className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={100}>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-brand-violet/25 bg-gradient-to-r from-brand-violet/10 via-brand-pink/10 to-brand-amber/10 px-6 py-8 text-center">
            <AlertTriangle className="size-5 text-brand-pink" aria-hidden />
            <p className="font-display text-lg font-semibold sm:text-xl">
              Edqorix brings everything into one secure digital platform.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Solution / features */}
      <section id="features" className="scroll-mt-20 border-t border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="The platform"
              title="One platform for your institution's academic records"
              subtitle="Everything an examination cycle needs — entry, verification, approval, documents, audit and reporting."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((item, index) => (
              <Reveal key={item.title} delay={index * 60}>
                <div className="group card-glow card-glow-hover h-full rounded-xl border border-border/70 bg-background p-6">
                  <span className={`grid size-10 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${ACCENTS[index % ACCENTS.length]}`}>
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="How Edqorix works"
              title="From examination setup to locked results in five steps"
            />
          </Reveal>
          <div className="relative mt-14">
            <div
              aria-hidden
              className="absolute top-0 bottom-0 left-[19px] w-px bg-gradient-to-b from-brand-violet/60 via-brand-cyan/50 to-transparent lg:hidden"
            />
            <div className="grid gap-6 lg:grid-cols-5">
              {STEPS.map((item, index) => (
                <Reveal key={item.step} delay={index * 90}>
                  <div className="relative flex gap-4 lg:block">
                    <span className={`z-10 grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold transition-transform duration-300 hover:scale-110 ${ACCENTS[index % ACCENTS.length]}`}>
                      {item.step}
                    </span>
                    <div className="lg:mt-5">
                      <h3 className="font-display text-base font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={120}>
            <div className="mt-14 grid gap-3 rounded-2xl border border-border/70 bg-card p-6 sm:grid-cols-3 lg:grid-cols-7">
              {["Draft", "In progress", "Submitted", "Under verification", "Verified", "Approved", "Locked"].map(
                (status, index) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-xs"
                  >
                    <span
                      className={
                        index >= 5
                          ? "size-2 rounded-full bg-success"
                          : index >= 2
                            ? "size-2 rounded-full bg-warning"
                            : "size-2 rounded-full bg-muted-foreground/50"
                      }
                    />
                    {status}
                  </div>
                ),
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="scroll-mt-20 border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Role-based access"
              title="The right access for the right person"
              subtitle="Users never choose a role at login. Edqorix detects the role and permissions and opens the correct dashboard."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {ROLES.map((role, index) => (
              <Reveal key={role.name} delay={index * 80}>
                <div className="card-glow card-glow-hover h-full rounded-2xl border border-border/70 bg-background p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 hover:scale-110 ${ACCENTS[index % ACCENTS.length]}`}>
                      <role.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{role.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{role.summary}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {role.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Marks entry highlight */}
      <section id="marks" className="scroll-mt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Marks entry
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance-tight sm:text-4xl">
              Built for a teacher with 100 students and 20 minutes
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Examination → class → section → subject → students. Type a score, press Enter, move to
              the next student. Drafts save automatically, totals validate as you type, and
              completion is always visible.
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {[
                "Fast keyboard-only entry",
                "Auto-saved drafts",
                "Maximum-mark validation",
                "No negative marks",
                "Optional decimal marks",
                "Search & filter students",
                "Bulk entry helpers",
                "Absent, exempt & malpractice states",
              ].map((point) => (
                <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">Unit Test 1 · Class 9-A · Mathematics</p>
                  <p className="text-xs text-muted-foreground">Maximum 50 · Passing 17</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  42 / 45 students entered
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Roll</th>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Marks</th>
                    <th className="px-4 py-2.5 font-medium">Grade</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {[
                    ["09A01", "Aarav Menon", "46", "O", "Saved"],
                    ["09A02", "Diya Krishnan", "38", "A", "Saved"],
                    ["09A03", "Farhan Ali", "—", "—", "Absent"],
                    ["09A04", "Ishita Rao", "44", "A+", "Saved"],
                    ["09A05", "Kabir Nair", "29", "B", "Typing…"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <td className="px-4 py-2.5 text-muted-foreground">{row[0]}</td>
                      <td className="px-4 py-2.5">{row[1]}</td>
                      <td className="px-4 py-2.5 font-medium tabular-nums">{row[2]}</td>
                      <td className="px-4 py-2.5">{row[3]}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            row[4] === "Absent"
                              ? "rounded-full bg-warning/15 px-2 py-0.5 text-xs"
                              : row[4] === "Typing…"
                                ? "rounded-full bg-info/15 px-2 py-0.5 text-xs text-info"
                                : "rounded-full bg-success/12 px-2 py-0.5 text-xs text-success"
                          }
                        >
                          {row[4]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-4">
                <p className="text-xs text-muted-foreground">Draft saved a moment ago</p>
                <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Submit marks
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-20 border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Security"
              title="Security is a feature, not a checkbox"
              subtitle="Sensitive permissions are enforced at the backend and database layer — never by hiding a menu item."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <div className="card-glow card-glow-hover h-full rounded-xl border border-border/70 bg-background p-6">
                  <span className={`grid size-10 place-items-center rounded-lg ${ACCENTS[index % ACCENTS.length]}`}>
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <div className="mt-8 rounded-xl border border-border/70 bg-background px-6 py-5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Students have no access.</span> Edqorix
              is an internal institutional platform for principals, super admins, staff, class
              teachers and subject teachers only.
            </div>
          </Reveal>
        </div>
      </section>

      {/* Segments */}
      {SEGMENTS.map((segment, segmentIndex) => (
        <section
          key={segment.id}
          id={segment.id}
          className={
            segmentIndex % 2 === 1
              ? "scroll-mt-20 border-y border-border/70 bg-card/40"
              : "scroll-mt-20"
          }
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-18 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <Reveal className={segmentIndex % 2 === 1 ? "lg:order-2" : undefined}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-violet/30 bg-gradient-to-r from-brand-violet/10 to-brand-cyan/10 px-3 py-1.5 text-xs font-medium text-foreground">
                <segment.icon className="size-3.5" aria-hidden /> {segment.label}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance-tight sm:text-3xl">
                {segment.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{segment.body}</p>
            </Reveal>
            <Reveal
              delay={110}
              className={segmentIndex % 2 === 1 ? "lg:order-1" : undefined}
            >
              <ul className="grid gap-3 rounded-2xl border border-border/70 bg-background p-6">
                {segment.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      ))}

      {/* Reports */}
      <section id="reports" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Reports"
              title="Every report your examination cell asks for"
              subtitle="Filter by academic year, class, section, subject, examination or date range — then view, print or export."
            />
          </Reveal>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((report, index) => (
              <Reveal key={report} delay={index * 50}>
                <div className={`card-glow card-glow-hover flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-5 py-4 ${["hover:border-brand-violet/50","hover:border-brand-cyan/50","hover:border-brand-pink/50","hover:border-brand-amber/60","hover:border-brand-emerald/50","hover:border-primary/50"][index % 6]}`}>
                  <span className="text-sm font-medium">{report}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Search className="size-3.5" aria-hidden /> CSV · PDF
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-y border-border/70 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Pricing"
              title="Plans that scale from one school to a university"
              subtitle="Transparent capacity tiers. Final pricing is agreed with your institution."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PRICING_TIERS.map((tier, index) => (
              <Reveal key={tier.name} delay={index * 80}>
                <div
                  className={
                    tier.highlight
                      ? "card-glow card-glow-hover relative h-full rounded-2xl border-2 border-brand-violet bg-gradient-to-b from-brand-violet/10 to-background p-7 shadow-xl"
                      : "card-glow card-glow-hover h-full rounded-2xl border border-border/70 bg-background p-7"
                  }
                >
                  {tier.highlight ? (
                    <span className="absolute -top-3 left-7 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-md">
                      Recommended
                    </span>
                  ) : null}
                  <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{tier.audience}</p>
                  <p className="mt-6 font-display text-3xl font-semibold">{tier.price}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.priceNote}</p>
                  <Button
                    asChild
                    className={
                      tier.highlight
                        ? "mt-6 w-full border-0 bg-gradient-brand text-primary-foreground"
                        : "mt-6 w-full"
                    }
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    <Link to="/contact">{tier.cta}</Link>
                  </Button>
                  <ul className="mt-6 space-y-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100}>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Need a detailed comparison?{" "}
              <Link to="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
                See the full pricing page
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Questions institutions ask us first" />
          </Reveal>
          <Reveal delay={80}>
            <FaqList items={FAQS} />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="scroll-mt-20 border-t border-border/70">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-brand-violet/25 bg-gradient-to-br from-brand-violet/12 via-brand-pink/10 to-brand-cyan/12 px-6 py-14 text-center sm:px-12">
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 left-10 size-72 rounded-full bg-brand-violet/25 blur-3xl animate-drift" />
                <div className="absolute -bottom-28 right-6 size-72 rounded-full bg-brand-cyan/25 blur-3xl animate-drift [animation-delay:-9s]" />
              </div>
              <h2 className="relative font-display text-3xl font-semibold tracking-tight text-balance-tight sm:text-4xl">
                Ready to replace your correction register?
              </h2>
              <p className="relative mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Bring your institution's examination marks and academic records into one secure
                digital platform with Edqorix.
              </p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="w-full border-0 bg-gradient-brand text-primary-foreground shadow-lg transition-transform duration-300 hover:scale-[1.03] sm:w-auto"
                >
                  <Link to="/contact">
                    Request a Demo <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
