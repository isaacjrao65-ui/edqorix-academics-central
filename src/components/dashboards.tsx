import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  PenSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

import { CollapsibleSection, DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  SHEET_STATUS_CLASS,
  SHEET_STATUS_LABEL,
  formatDateTime,
  type SheetStatus,
} from "@/lib/format";
import { useDashboardPrefs } from "@/lib/dashboard-prefs";
import { useInstitution } from "@/lib/institution";
import { useLiveInstitution } from "@/lib/live-institution";
import { useMembers } from "@/lib/permissions";
import { useCourses, useExams, useSessions, useSheets, useStudents } from "@/lib/queries";
import {
  classLabel,
  useAssignments,
  useClasses,
  useCurrentUserId,
  type ClassRow,
} from "@/lib/school";
import { cn } from "@/lib/utils";

export function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="size-4 text-primary" strokeWidth={1.75} />
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-[0.7rem] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

function StatusBar({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {entries.map(([key, n]) => (
          <div
            key={key}
            className={cn("h-full", SHEET_STATUS_CLASS[key as SheetStatus]?.split(" ")[0] ?? "bg-muted")}
            style={{ width: `${(n / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {entries.map(([key, n]) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                SHEET_STATUS_CLASS[key as SheetStatus]?.split(" ")[0] ?? "bg-muted",
              )}
            />
            {SHEET_STATUS_LABEL[key as SheetStatus] ?? key}
            <span className="font-medium text-foreground tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SheetList({
  title,
  sheets,
  empty,
}: {
  title: string;
  sheets: { id: string; status: string; updated_at: string; exams: { title: string; courses: { code: string } | null } | null; sections: { name: string } | null }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <h2 className="min-w-0 truncate font-display text-sm font-semibold">{title}</h2>
        <Link to="/marks" className="shrink-0 text-xs text-primary hover:underline">
          View all
        </Link>
      </header>
      {sheets.length === 0 ? (
        <div className="px-4 py-10 sm:px-5">
          <EmptyState title="Nothing here yet" description={empty} />
        </div>
      ) : (
        <ul className="max-h-[26rem] space-y-3 overflow-y-auto scroll-smooth overscroll-contain p-3 sm:max-h-80 sm:space-y-0 sm:divide-y sm:divide-border sm:p-0 [-webkit-overflow-scrolling:touch]">
          {sheets.map((sheet) => (
            <li
              key={sheet.id}
              className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {sheet.exams?.courses?.code} · {sheet.exams?.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Section {sheet.sections?.name} · updated {formatDateTime(sheet.updated_at)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:contents">
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", SHEET_STATUS_CLASS[sheet.status as SheetStatus])}
                >
                  {SHEET_STATUS_LABEL[sheet.status as SheetStatus]}
                </Badge>
                <Button asChild size="sm" variant="outline">
                  <Link to="/marks/$sheetId" params={{ sheetId: sheet.id }}>
                    Open
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function useRecentAudit(institutionId: string | null, enabled: boolean, limit = 8) {
  return useQuery({
    queryKey: ["audit-recent", institutionId, limit],
    enabled: Boolean(institutionId) && enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, description, created_at, actor_id, entity_type")
        .eq("institution_id", institutionId as string)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.actor_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as { id: string; full_name: string; email: string }[] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
      return rows.map((r) => ({ ...r, actor: byId.get(r.actor_id) ?? "Someone" }));
    },
  });
}

function statusCounts(sheets: { status: string }[]) {
  const keys: SheetStatus[] = ["draft", "submitted", "verified", "approved", "published", "returned"];
  const counts: Record<string, number> = {};
  for (const key of keys) {
    const n = sheets.filter((s) => s.status === key).length;
    if (n > 0) counts[key] = n;
  }
  return counts;
}

function AuditPanel({
  institutionId,
  enabled,
  live = false,
}: {
  institutionId: string | null;
  enabled: boolean;
  live?: boolean;
}) {
  const { data: entries = [] } = useRecentAudit(institutionId, enabled, live ? 40 : 8);
  return (
    <div className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4 sm:px-5">
        <ShieldCheck className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
        <h2 className="font-display text-sm font-semibold">
          {live ? "Live activity — everyone" : "Recent activity"}
        </h2>
        {live && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
        )}
      </header>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No activity recorded yet.</p>
      ) : (
        <ul className="max-h-[26rem] space-y-3 overflow-y-auto scroll-smooth overscroll-contain p-3 sm:max-h-96 sm:space-y-0 sm:divide-y sm:divide-border sm:p-0 [-webkit-overflow-scrolling:touch]">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border bg-background p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-3.5"
            >
              <p className="text-sm">
                <span className="font-medium">{entry.actor}</span>{" "}
                <span className="text-muted-foreground">·</span> {entry.description ?? entry.action}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.entity_type} · {formatDateTime(entry.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Principal ------------------------------- */

export function PrincipalDashboard() {
  const { containerRef, isCollapsed, toggleSection } = useDashboardPrefs("principal");
  const { institutionId, institutionName } = useInstitution();
  useLiveInstitution(institutionId);
  const { data: sheets = [] } = useSheets(institutionId);
  const { data: students = [] } = useStudents(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: classes = [] } = useClasses(institutionId);
  const { data: members = [] } = useMembers(institutionId);
  const { data: sessions = [] } = useSessions(institutionId);
  const { data: exams = [] } = useExams(institutionId);

  const teachers = members.filter((m) => m.role === "faculty" || m.role === "hod");
  const staff = members.filter((m) => m.role === "exam_cell" || m.role === "admin");
  const activeSession = sessions.find((s) => s.is_active);
  const pendingApproval = sheets.filter((s) => s.status === "verified");
  const awaitingVerification = sheets.filter((s) => s.status === "submitted");
  const completion = sheets.length
    ? Math.round(
        (sheets.filter((s) => ["approved", "published", "verified"].includes(s.status)).length /
          sheets.length) *
          100,
      )
    : 0;

  return (
    <div ref={containerRef} className="space-y-8">
      <PageHeader
        title={institutionName || "Principal dashboard"}
        description="Complete academic oversight — people, examinations, marks and approvals."
        actions={<DashboardQuickActions />}
      />

      <CollapsibleSection
        title="Overview"
        collapsed={isCollapsed("overview")}
        onToggle={() => toggleSection("overview")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={GraduationCap} label="Students" value={students.length} />
          <Stat icon={UsersRound} label="Teachers" value={teachers.length} />
          <Stat icon={UsersRound} label="Staff & management" value={staff.length} />
          <Stat icon={LayoutGrid} label="Classes" value={classes.length} />
          <Stat icon={BookOpen} label="Subjects" value={courses.length} />
          <Stat icon={ClipboardList} label="Examinations" value={exams.length} />
          <Stat
            icon={ClipboardCheck}
            label="Pending approvals"
            value={pendingApproval.length}
            hint={`${awaitingVerification.length} awaiting verification`}
          />
          <Stat
            icon={PenSquare}
            label="Marks completion"
            value={`${completion}%`}
            hint={activeSession ? `Academic year ${activeSession.name}` : "No active academic year"}
          />
        </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Examination & marks status</h2>
        <div className="mt-4">
          {sheets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mark sheets created yet.</p>
          ) : (
            <StatusBar counts={statusCounts(sheets)} />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SheetList
            title="Waiting for your approval"
            sheets={[...pendingApproval, ...awaitingVerification].slice(0, 6)}
            empty="Every mark sheet has been approved."
          />
        </div>
        <AuditPanel institutionId={institutionId} enabled live />
      </section>
    </div>
  );
}

/* --------------------------------- Staff --------------------------------- */

export function StaffDashboard() {
  const { containerRef, isCollapsed, toggleSection } = useDashboardPrefs("staff");
  const { institutionId, institutionName } = useInstitution();
  const { data: sheets = [] } = useSheets(institutionId);
  const { data: students = [] } = useStudents(institutionId);
  const { data: classes = [] } = useClasses(institutionId);
  const { data: assignments = [] } = useAssignments(institutionId);
  const { data: members = [] } = useMembers(institutionId);

  const teachers = members.filter((m) => m.role === "faculty" || m.role === "hod");
  const classTeachers = classes.filter((c) => c.class_teacher_id).length;
  const subjectTeachers = new Set(assignments.map((a) => a.teacher_id)).size;
  const pending = sheets.filter((s) => s.status === "draft").length;
  const submitted = sheets.filter((s) => s.status === "submitted").length;
  const verified = sheets.filter((s) => s.status === "verified").length;
  const correction = sheets.filter((s) => s.status === "returned").length;

  return (
    <div ref={containerRef} className="space-y-8">
      <PageHeader
        title={`${institutionName || "School"} — management`}
        description="Run the academic structure: students, teachers, classes, subjects and marks progress."
        actions={<DashboardQuickActions />}
      />

      <CollapsibleSection
        title="Overview"
        collapsed={isCollapsed("overview")}
        onToggle={() => toggleSection("overview")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={GraduationCap} label="Students" value={students.length} />
          <Stat icon={UsersRound} label="Teachers" value={teachers.length} />
          <Stat icon={LayoutGrid} label="Classes" value={classes.length} hint={`${classTeachers} with a class teacher`} />
          <Stat icon={BookOpen} label="Subject teachers" value={subjectTeachers} />
          <Stat icon={PenSquare} label="Marks pending entry" value={pending} />
          <Stat icon={ClipboardList} label="Marks submitted" value={submitted} />
          <Stat icon={ClipboardCheck} label="Marks verified" value={verified} />
          <Stat icon={ShieldCheck} label="Correction required" value={correction} />
        </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Examination progress</h2>
        <div className="mt-4">
          {sheets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mark sheets created yet.</p>
          ) : (
            <StatusBar counts={statusCounts(sheets)} />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SheetList
            title="Needs monitoring"
            sheets={sheets
              .filter((s) => s.status === "submitted" || s.status === "returned")
              .slice(0, 6)}
            empty="Nothing pending across the school right now."
          />
        </div>
        <AuditPanel institutionId={institutionId} enabled />
      </section>
    </div>
  );
}

/* ----------------------------- Class teacher ----------------------------- */

export function ClassTeacherDashboard({ myClasses }: { myClasses: ClassRow[] }) {
  const { containerRef, isCollapsed, toggleSection } = useDashboardPrefs("class_teacher");
  const { institutionId } = useInstitution();
  const { data: sheets = [] } = useSheets(institutionId);
  const { data: assignments = [] } = useAssignments(institutionId);
  const { data: exams = [] } = useExams(institutionId);
  const primary = myClasses[0];

  const { data: students = [] } = useQuery({
    queryKey: ["class-students", institutionId, primary?.id],
    enabled: Boolean(institutionId && primary?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, roll_number, admission_number, status, current_semester")
        .eq("institution_id", institutionId as string)
        .eq("class_id", primary!.id)
        .order("roll_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const classAssignments = assignments.filter((a) => a.class_id === primary?.id);
  const classCourseIds = new Set(classAssignments.map((a) => a.course_id));
  const classExamIds = new Set(
    exams.filter((e) => classCourseIds.has(e.course_id)).map((e) => e.id),
  );
  const classSheets = sheets.filter((s) => classExamIds.has(s.exam_id));

  if (!primary) {
    return (
      <div ref={containerRef} className="space-y-8">
        <PageHeader title="Class teacher" />
        <EmptyState
          title="No class assigned yet"
          description="School management has not assigned a class to you. Once assigned, your class appears here automatically."
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-8">
      <PageHeader
        title={`Class ${classLabel(primary)}`}
        description="Everything happening in your class — students, subjects and marks from every subject teacher."
        actions={<DashboardQuickActions />}
      />

      <CollapsibleSection
        title="Overview"
        collapsed={isCollapsed("overview")}
        onToggle={() => toggleSection("overview")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={GraduationCap} label="Students" value={students.length} />
          <Stat icon={BookOpen} label="Subjects" value={classCourseIds.size} />
          <Stat
            icon={UsersRound}
            label="Teachers on this class"
            value={new Set(classAssignments.map((a) => a.teacher_id)).size}
          />
          <Stat
            icon={ClipboardCheck}
            label="Marks awaiting review"
            value={classSheets.filter((s) => s.status === "submitted").length}
          />
        </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-display text-sm font-semibold">Class list</h2>
        </header>
        {students.length === 0 ? (
          <div className="px-4 py-10 sm:px-5">
            <EmptyState
              title="No students in this class"
              description="Management adds students and places them into classes."
            />
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto scroll-smooth overscroll-contain p-3 sm:hidden [-webkit-overflow-scrolling:touch]">
              {students.map((s) => (
                <li key={s.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.full_name}</p>
                    <Badge variant="secondary" className="shrink-0">
                      {s.status}
                    </Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <dt className="uppercase tracking-wide">Roll no.</dt>
                      <dd className="mt-0.5 tabular-nums text-foreground">{s.roll_number}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="uppercase tracking-wide">Admission no.</dt>
                      <dd className="mt-0.5 truncate text-foreground">
                        {s.admission_number ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            {/* Tablet and up: table */}
            <div className="hidden max-h-80 overflow-auto scroll-smooth overscroll-contain sm:block">
              <table className="w-full min-w-[38rem] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Roll no.</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Admission no.</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 tabular-nums">{s.roll_number}</td>
                      <td className="px-5 py-3 font-medium">{s.full_name}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {s.admission_number ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="secondary">{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>


      <SheetList
        title="Subject marks for review"
        sheets={sheets.filter((s) => s.status === "submitted" || s.status === "verified").slice(0, 8)}
        empty="No subject teacher has submitted marks yet."
      />
    </div>
  );
}

/* ---------------------------- Subject teacher ---------------------------- */

export function SubjectTeacherDashboard() {
  const { containerRef, isCollapsed, toggleSection } = useDashboardPrefs("subject_teacher");
  const { institutionId } = useInstitution();
  const { data: userId } = useCurrentUserId();
  const { data: assignments = [] } = useAssignments(institutionId);
  const { data: classes = [] } = useClasses(institutionId);
  const { data: courses = [] } = useCourses(institutionId);
  const { data: sheets = [] } = useSheets(institutionId);
  const { data: exams = [] } = useExams(institutionId);

  const mine = assignments.filter((a) => a.teacher_id === userId);
  const myCourseIds = new Set(mine.map((a) => a.course_id));
  const myClassIds = new Set(mine.map((a) => a.class_id));
  const myExamIds = new Set(exams.filter((e) => myCourseIds.has(e.course_id)).map((e) => e.id));
  const mySheets = sheets.filter((s) => myExamIds.has(s.exam_id));

  const { data: studentCount = 0 } = useQuery({
    queryKey: ["subject-teacher-students", institutionId, [...myClassIds].sort().join(",")],
    enabled: Boolean(institutionId) && myClassIds.size > 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId as string)
        .in("class_id", [...myClassIds]);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (mine.length === 0) {
    return (
      <div ref={containerRef} className="space-y-8">
        <PageHeader title="Subject teacher" />
        <EmptyState
          title="No subjects assigned yet"
          description="School management assigns the subjects and classes you teach. They will appear here immediately."
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-8">
      <PageHeader
        title="My subjects"
        description="Enter and submit marks for the subjects and classes assigned to you."
        actions={<DashboardQuickActions />}
      />

      <CollapsibleSection
        title="Overview"
        collapsed={isCollapsed("overview")}
        onToggle={() => toggleSection("overview")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={BookOpen} label="Assigned subjects" value={myCourseIds.size} />
          <Stat icon={LayoutGrid} label="Assigned classes" value={myClassIds.size} />
          <Stat icon={GraduationCap} label="Students" value={studentCount} />
          <Stat
            icon={PenSquare}
            label="Marks pending entry"
            value={mySheets.filter((s) => s.status === "draft" || s.status === "returned").length}
          />
        </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="font-display text-sm font-semibold">My assignments</h2>
        </header>
        <ul className="max-h-[26rem] space-y-3 overflow-y-auto scroll-smooth overscroll-contain p-3 sm:max-h-80 sm:space-y-0 sm:divide-y sm:divide-border sm:p-0 [-webkit-overflow-scrolling:touch]">
          {mine.map((a) => {
            const cls = classes.find((c) => c.id === a.class_id);
            const course = courses.find((c) => c.id === a.course_id);
            return (
              <li
                key={a.id}
                className="grid gap-1.5 rounded-lg border border-border bg-background p-4 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-3.5"
              >
                <Badge variant="secondary" className="w-fit">
                  {cls ? classLabel(cls) : "Class"}
                </Badge>
                <span className="font-medium">{course?.code}</span>
                <span className="text-muted-foreground">{course?.title}</span>
              </li>
            );
          })}
        </ul>

      </section>

      <SheetList
        title="My mark sheets"
        sheets={mySheets.slice(0, 8)}
        empty="No examination has been created for your subjects yet."
      />
    </div>
  );
}
