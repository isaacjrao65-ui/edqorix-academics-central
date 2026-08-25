export type SheetStatus = "draft" | "submitted" | "verified" | "approved" | "published" | "returned";

export const SHEET_STATUS_LABEL: Record<SheetStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting verification",
  verified: "Awaiting approval",
  approved: "Approved",
  published: "Published",
  returned: "Returned for correction",
};

export const SHEET_STATUS_CLASS: Record<SheetStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/10 text-info",
  verified: "bg-warning/15 text-warning-foreground",
  approved: "bg-success/12 text-success",
  published: "bg-primary/10 text-primary",
  returned: "bg-destructive/10 text-destructive",
};

export const EXAM_TYPE_LABEL: Record<string, string> = {
  internal: "Internal",
  midterm: "Mid-term",
  final: "Final",
  practical: "Practical",
  assignment: "Assignment",
  project: "Project",
};

export function pct(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 1000) / 10;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type GradeBand = { grade: string; min_percent: number; grade_points: number };

export function resolveGrade(percent: number, bands: GradeBand[]) {
  const sorted = [...bands].sort((a, b) => b.min_percent - a.min_percent);
  return sorted.find((b) => percent >= Number(b.min_percent)) ?? null;
}
