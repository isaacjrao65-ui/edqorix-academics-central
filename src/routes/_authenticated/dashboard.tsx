import { createFileRoute } from "@tanstack/react-router";

import {
  ClassTeacherDashboard,
  PrincipalDashboard,
  StaffDashboard,
  SubjectTeacherDashboard,
} from "@/components/dashboards";
import { EmptyState, PageHeader } from "@/components/page-header";
import { useInstitution } from "@/lib/institution";
import { useSchoolScope } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Edqorix" },
      {
        name: "description",
        content:
          "Role-based academic dashboard: examinations, marks entry, verification and approvals.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { institutionId, isAdmin, canManage } = useInstitution();
  const scope = useSchoolScope({ institutionId, isAdmin, canManage });

  if (scope.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (scope.role === "principal") return <PrincipalDashboard />;
  if (scope.role === "staff") return <StaffDashboard />;
  if (scope.role === "class_teacher") return <ClassTeacherDashboard myClasses={scope.myClasses} />;
  if (scope.role === "subject_teacher") return <SubjectTeacherDashboard />;

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" />
      <EmptyState
        title="No class or subject assigned"
        description="School management has not assigned you a class or subjects yet. Your dashboard appears as soon as they do."
      />
    </div>
  );
}
