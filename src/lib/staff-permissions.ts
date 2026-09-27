// Shared (browser + server) definitions for principal-controlled staff accounts.

export const STAFF_TYPES = [
  { value: "subject_teacher", label: "Subject Teacher" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "class_subject_teacher", label: "Class Teacher + Subject Teacher" },
  { value: "admin_staff", label: "Administrative Staff" },
  { value: "other_staff", label: "Other Staff" },
] as const;

export type StaffType = (typeof STAFF_TYPES)[number]["value"];

export const STAFF_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  STAFF_TYPES.map((t) => [t.value, t.label]),
);

export const DEFAULT_SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "Hindi",
  "Social Science",
  "Computer",
  "Commerce",
];

export const DEFAULT_CLASS_NUMBERS = ["6", "7", "8", "9", "10", "11", "12"];
export const DEFAULT_SECTIONS = ["A", "B", "C", "D"];

export type StaffPermission = { key: string; label: string };
export type StaffPermissionGroup = { group: string; items: StaffPermission[] };

export const STAFF_PERMISSION_GROUPS: StaffPermissionGroup[] = [
  {
    group: "Student Access",
    items: [
      { key: "sp.students.view", label: "View Student Profiles" },
      { key: "sp.students.edit", label: "Edit Student Profiles" },
      { key: "sp.students.add", label: "Add Students" },
      { key: "sp.students.remove", label: "Remove Students" },
      { key: "sp.students.documents", label: "View Student Documents" },
    ],
  },
  {
    group: "Attendance",
    items: [
      { key: "sp.attendance.view", label: "View Attendance" },
      { key: "sp.attendance.mark", label: "Mark Attendance" },
      { key: "sp.attendance.edit", label: "Edit Attendance" },
      { key: "sp.attendance.reports", label: "View Attendance Reports" },
    ],
  },
  {
    group: "Examination & Marks",
    items: [
      { key: "sp.marks.view", label: "View Marks" },
      { key: "sp.marks.enter", label: "Enter Examination Marks" },
      { key: "sp.marks.edit", label: "Edit Examination Marks" },
      { key: "sp.marks.internal", label: "Enter Internal Assessment Marks" },
      { key: "sp.marks.external", label: "Enter External Marks" },
      { key: "sp.marks.assignment", label: "Enter Assignment Marks" },
      { key: "sp.marks.reports", label: "View Examination Reports" },
      { key: "sp.marks.verify", label: "Verify Marks" },
    ],
  },
  {
    group: "Study Materials",
    items: [
      { key: "sp.materials.view", label: "View Study Materials" },
      { key: "sp.materials.upload", label: "Upload Study Materials" },
      { key: "sp.materials.edit", label: "Edit Study Materials" },
      { key: "sp.materials.delete", label: "Delete Study Materials" },
    ],
  },
  {
    group: "Assignments",
    items: [
      { key: "sp.assignments.view", label: "View Assignments" },
      { key: "sp.assignments.create", label: "Create Assignments" },
      { key: "sp.assignments.edit", label: "Edit Assignments" },
      { key: "sp.assignments.delete", label: "Delete Assignments" },
      { key: "sp.assignments.review", label: "Review/Check Assignments" },
    ],
  },
  {
    group: "Communication",
    items: [
      { key: "sp.comm.view", label: "View Announcements" },
      { key: "sp.comm.create", label: "Create Announcements" },
      { key: "sp.comm.notify", label: "Send Class Notifications" },
      { key: "sp.comm.message", label: "Send Student Messages" },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "sp.reports.students", label: "View Student Reports" },
      { key: "sp.reports.class", label: "Generate Class Reports" },
      { key: "sp.reports.export", label: "Export Reports" },
    ],
  },
];

export const ALL_STAFF_PERMISSION_KEYS = STAFF_PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

export const STAFF_PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  STAFF_PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);

/** Things no staff account can ever do — only the principal can. */
export const ALWAYS_RESTRICTED = [
  "Manage staff",
  "Create accounts",
  "Change own permissions",
  "Principal settings",
];

/** Suggested starting permissions for each account type; the principal can change every one. */
export function defaultPermissionsFor(type: StaffType): string[] {
  const subject = [
    "sp.students.view",
    "sp.attendance.view",
    "sp.marks.view",
    "sp.marks.enter",
    "sp.marks.assignment",
    "sp.materials.view",
    "sp.materials.upload",
    "sp.assignments.view",
    "sp.assignments.create",
    "sp.assignments.review",
    "sp.comm.view",
    "sp.reports.students",
  ];
  const klass = [
    "sp.students.view",
    "sp.students.documents",
    "sp.attendance.view",
    "sp.attendance.mark",
    "sp.attendance.reports",
    "sp.marks.view",
    "sp.marks.reports",
    "sp.marks.verify",
    "sp.assignments.view",
    "sp.comm.view",
    "sp.comm.create",
    "sp.comm.notify",
    "sp.reports.students",
    "sp.reports.class",
  ];
  switch (type) {
    case "subject_teacher":
      return subject;
    case "class_teacher":
      return klass;
    case "class_subject_teacher":
      return [...new Set([...subject, ...klass])];
    case "admin_staff":
      return ["sp.students.view", "sp.attendance.view", "sp.marks.view", "sp.reports.students", "sp.reports.export", "sp.comm.view"];
    default:
      return ["sp.comm.view"];
  }
}

export function needsSubjects(type: StaffType) {
  return type === "subject_teacher" || type === "class_subject_teacher";
}
export function needsClassTeacher(type: StaffType) {
  return type === "class_teacher" || type === "class_subject_teacher";
}
