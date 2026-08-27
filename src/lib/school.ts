import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type ClassRow = {
  id: string;
  institution_id: string;
  session_id: string | null;
  name: string;
  section: string;
  room: string | null;
  class_teacher_id: string | null;
  created_at: string;
};

export type AssignmentRow = {
  id: string;
  class_id: string;
  course_id: string;
  teacher_id: string;
  created_at: string;
};

export type ClassStudent = {
  id: string;
  full_name: string;
  roll_number: string;
  admission_number: string | null;
  status: string;
  class_id: string | null;
  current_semester: number;
};

export type MarkRow = {
  id: string;
  student_id: string;
  score: number | null;
  assessment_marks: number | null;
  internal_marks: number | null;
  external_marks: number | null;
  copy_correction_marks: number | null;
  state: string;
  updated_at: string;
  updated_by: string | null;
  mark_sheet_id: string;
};

export function classLabel(c: Pick<ClassRow, "name" | "section">) {
  return c.section ? `${c.name}-${c.section}` : c.name;
}

export function useClasses(institutionId: string | null) {
  return useQuery({
    queryKey: ["classes", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<ClassRow[]> => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, institution_id, session_id, name, section, room, class_teacher_id, created_at")
        .eq("institution_id", institutionId as string)
        .order("name")
        .order("section");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssignments(institutionId: string | null) {
  return useQuery({
    queryKey: ["class-subject-teachers", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data, error } = await supabase
        .from("class_subject_teachers")
        .select("id, class_id, course_id, teacher_id, created_at")
        .eq("institution_id", institutionId as string);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCurrentUserId() {
  return useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Students of one class (RLS still enforces what the caller may read). */
export function useClassStudents(institutionId: string | null, classId: string | null) {
  return useQuery({
    queryKey: ["class-students", institutionId, classId],
    enabled: Boolean(institutionId && classId),
    queryFn: async (): Promise<ClassStudent[]> => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, roll_number, admission_number, status, class_id, current_semester")
        .eq("institution_id", institutionId as string)
        .eq("class_id", classId as string)
        .order("roll_number");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type SchoolRole = "principal" | "staff" | "class_teacher" | "subject_teacher" | "none";

/**
 * Which dashboard a signed-in member gets. Authority order:
 * principal (admin) > staff/management > class teacher > subject teacher.
 * Frontend hint only — the database enforces the same rules.
 */
export function useSchoolScope(params: {
  institutionId: string | null;
  isAdmin: boolean;
  canManage: boolean;
}) {
  const { institutionId, isAdmin, canManage } = params;
  const { data: userId = null } = useCurrentUserId();
  const { data: classes = [], isLoading: loadingClasses } = useClasses(institutionId);
  const { data: assignments = [], isLoading: loadingAssignments } = useAssignments(institutionId);

  const myClasses = userId ? classes.filter((c) => c.class_teacher_id === userId) : [];
  const myAssignments = userId ? assignments.filter((a) => a.teacher_id === userId) : [];
  const myAssignedClassIds = Array.from(new Set(myAssignments.map((a) => a.class_id)));
  const mySubjectIds = Array.from(new Set(myAssignments.map((a) => a.course_id)));

  const role: SchoolRole = isAdmin
    ? "principal"
    : canManage
      ? "staff"
      : myClasses.length > 0
        ? "class_teacher"
        : myAssignments.length > 0
          ? "subject_teacher"
          : "none";

  return {
    userId,
    role,
    classes,
    assignments,
    myClasses,
    myAssignments,
    myAssignedClassIds,
    mySubjectIds,
    isLoading: loadingClasses || loadingAssignments,
  };
}
