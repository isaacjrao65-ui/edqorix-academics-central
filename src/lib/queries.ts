import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

function scoped<T>(
  key: string,
  institutionId: string | null,
  run: (institutionId: string) => Promise<T>,
  extraKey: unknown[] = [],
) {
  return {
    queryKey: [key, institutionId, ...extraKey],
    enabled: Boolean(institutionId),
    queryFn: () => run(institutionId as string),
  };
}

export type Dept = { id: string; name: string; code: string };
export type Program = {
  id: string;
  name: string;
  code: string;
  level: string;
  duration_semesters: number;
  department_id: string | null;
};
export type Session = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};
export type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  department_id: string | null;
  program_id: string | null;
};
export type Section = {
  id: string;
  name: string;
  room: string | null;
  course_id: string;
  session_id: string;
  faculty_id: string | null;
  courses: { code: string; title: string } | null;
  academic_sessions: { name: string } | null;
};
export type Student = {
  id: string;
  roll_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  batch_year: number | null;
  current_semester: number;
  status: string;
  program_id: string | null;
};
export type Exam = {
  id: string;
  title: string;
  exam_type: string;
  max_marks: number;
  pass_marks: number;
  weightage: number;
  exam_date: string | null;
  course_id: string;
  session_id: string;
  courses: { code: string; title: string } | null;
  academic_sessions: { name: string } | null;
};
export type SheetRow = {
  id: string;
  status: string;
  remarks: string | null;
  updated_at: string;
  exam_id: string;
  section_id: string;
  exams: { title: string; max_marks: number; exam_type: string; courses: { code: string; title: string } | null } | null;
  sections: { name: string; faculty_id: string | null } | null;
};

export function useDepartments(institutionId: string | null) {
  return useQuery(
    scoped<Dept[]>("departments", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .eq("institution_id", id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    }),
  );
}

export function usePrograms(institutionId: string | null) {
  return useQuery(
    scoped<Program[]>("programs", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, code, level, duration_semesters, department_id")
        .eq("institution_id", id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    }),
  );
}

export function useSessions(institutionId: string | null) {
  return useQuery(
    scoped<Session[]>("sessions", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("academic_sessions")
        .select("id, name, start_date, end_date, is_active")
        .eq("institution_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }),
  );
}

export function useCourses(institutionId: string | null) {
  return useQuery(
    scoped<Course[]>("courses", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, credits, semester, department_id, program_id")
        .eq("institution_id", id)
        .order("code");
      if (error) throw error;
      return data ?? [];
    }),
  );
}

export function useSections(institutionId: string | null) {
  return useQuery(
    scoped<Section[]>("sections", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("sections")
        .select(
          "id, name, room, course_id, session_id, faculty_id, courses(code, title), academic_sessions(name)",
        )
        .eq("institution_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Section[];
    }),
  );
}

export function useStudents(institutionId: string | null) {
  return useQuery(
    scoped<Student[]>("students", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("students")
        .select(
          "id, roll_number, full_name, email, phone, batch_year, current_semester, status, program_id",
        )
        .eq("institution_id", id)
        .order("roll_number");
      if (error) throw error;
      return data ?? [];
    }),
  );
}

export function useExams(institutionId: string | null) {
  return useQuery(
    scoped<Exam[]>("exams", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("exams")
        .select(
          "id, title, exam_type, max_marks, pass_marks, weightage, exam_date, course_id, session_id, courses(code, title), academic_sessions(name)",
        )
        .eq("institution_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Exam[];
    }),
  );
}

export function useSheets(institutionId: string | null) {
  return useQuery(
    scoped<SheetRow[]>("sheets", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("mark_sheets")
        .select(
          "id, status, remarks, updated_at, exam_id, section_id, exams(title, max_marks, exam_type, courses(code, title)), sections(name, faculty_id)",
        )
        .eq("institution_id", id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SheetRow[];
    }),
  );
}

export type GradeBandRow = { grade: string; min_percent: number; grade_points: number };

export function useGradeBands(institutionId: string | null) {
  return useQuery(
    scoped<GradeBandRow[]>("grade_bands", institutionId, async (id) => {
      const { data, error } = await supabase
        .from("grade_bands")
        .select("grade, min_percent, grade_points")
        .eq("institution_id", id)
        .order("min_percent", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => ({
        grade: b.grade,
        min_percent: Number(b.min_percent),
        grade_points: Number(b.grade_points),
      }));
    }),
  );
}
