import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  institutionId: z.string().uuid(),
  examId: z.string().uuid(),
  teacherContext: z.string().trim().max(1000).optional(),
});

type NumericMark = {
  score: number | null;
  state: string;
  assessment_marks: number | null;
  internal_marks: number | null;
  external_marks: number | null;
  copy_correction_marks: number | null;
  mark_sheet_id: string;
};

export const analyzeLearningGaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const [{ data: membership }, { data: isAdmin }, { data: exam, error: examError }] =
      await Promise.all([
        context.supabase
          .from("memberships")
          .select("role, is_class_teacher")
          .eq("institution_id", data.institutionId)
          .eq("user_id", context.userId)
          .eq("is_active", true)
          .eq("status", "active")
          .maybeSingle(),
        context.supabase.rpc("is_admin", { _institution: data.institutionId }),
        context.supabase
          .from("exams")
          .select("id, title, max_marks, pass_marks, course_id, courses(code, title)")
          .eq("id", data.examId)
          .eq("institution_id", data.institutionId)
          .maybeSingle(),
      ]);

    if (!membership && isAdmin !== true) throw new Error("You do not have access to this institution.");
    if (examError || !exam) throw new Error("This assessment is not available.");

    const elevated = isAdmin === true;
    const [{ data: assignments }, { data: teacherClasses }, { data: sheets, error: sheetError }] =
      await Promise.all([
        elevated
          ? Promise.resolve({ data: [] as { class_id: string; course_id: string }[] })
          : context.supabase
              .from("class_subject_teachers")
              .select("class_id, course_id")
              .eq("institution_id", data.institutionId)
              .eq("teacher_id", context.userId),
        elevated
          ? Promise.resolve({ data: [] as { id: string }[] })
          : context.supabase
              .from("classes")
              .select("id")
              .eq("institution_id", data.institutionId)
              .eq("class_teacher_id", context.userId),
        context.supabase
          .from("mark_sheets")
          .select("id, class_id, status, classes(name, section)")
          .eq("institution_id", data.institutionId)
          .eq("exam_id", data.examId),
      ]);
    if (sheetError) throw new Error(sheetError.message);

    const classTeacherIds = new Set((teacherClasses ?? []).map((row) => row.id));
    const subjectTeacherIds = new Set(
      (assignments ?? [])
        .filter((row) => row.course_id === exam.course_id)
        .map((row) => row.class_id),
    );
    const scopedSheets = (sheets ?? []).filter(
      (sheet) =>
        elevated ||
        (sheet.class_id !== null &&
          (classTeacherIds.has(sheet.class_id) || subjectTeacherIds.has(sheet.class_id))),
    );
    if (scopedSheets.length === 0) {
      throw new Error("No class results are available within your teaching assignment.");
    }

    const sheetIds = scopedSheets.map((sheet) => sheet.id);
    const { data: marks, error: markError } = await context.supabase
      .from("marks")
      .select(
        "score, state, assessment_marks, internal_marks, external_marks, copy_correction_marks, mark_sheet_id",
      )
      .eq("institution_id", data.institutionId)
      .in("mark_sheet_id", sheetIds);
    if (markError) throw new Error(markError.message);

    const numericMarks = (marks ?? []) as NumericMark[];
    const maxMarks = Number(exam.max_marks);
    const passMarks = Number(exam.pass_marks);
    const average = (values: Array<number | null>) => {
      const usable = values.filter((value): value is number => value !== null);
      return usable.length ? Math.round((usable.reduce((sum, value) => sum + value, 0) / usable.length) * 10) / 10 : null;
    };
    const groups = scopedSheets.map((sheet) => {
      const all = numericMarks.filter((mark) => mark.mark_sheet_id === sheet.id);
      const present = all.filter((mark) => mark.state === "present" && mark.score !== null);
      const percentages = present.map((mark) => (Number(mark.score) / maxMarks) * 100);
      const passed = present.filter((mark) => Number(mark.score) >= passMarks).length;
      const classRow = sheet.classes as unknown as { name: string; section: string } | null;
      return {
        className: classRow ? `${classRow.name}${classRow.section ? `-${classRow.section}` : ""}` : "Class",
        sheetStatus: sheet.status,
        present: present.length,
        absent: all.length - present.length,
        averagePercent: percentages.length
          ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 10) / 10
          : 0,
        passRate: present.length ? Math.round((passed / present.length) * 1000) / 10 : 0,
        belowPass: present.length - passed,
        scoreBands: {
          below40: percentages.filter((value) => value < 40).length,
          from40To59: percentages.filter((value) => value >= 40 && value < 60).length,
          from60To79: percentages.filter((value) => value >= 60 && value < 80).length,
          from80: percentages.filter((value) => value >= 80).length,
        },
        componentAverages: {
          assessment: average(present.map((mark) => mark.assessment_marks)),
          internal: average(present.map((mark) => mark.internal_marks)),
          external: average(present.map((mark) => mark.external_marks)),
          assignment: average(present.map((mark) => mark.copy_correction_marks)),
        },
      };
    });

    if (groups.reduce((sum, group) => sum + group.present, 0) < 3) {
      throw new Error("Enter at least three student results before running learning-gap analysis.");
    }

    const { generateLearningGapAnalysis } = await import("./learning-gaps.server");
    const analysisInput = {
      exam: {
        title: exam.title,
        subject: exam.courses?.title ?? exam.courses?.code ?? "Subject",
        maxMarks,
        passMarks,
      },
      groups,
      ...(data.teacherContext ? { teacherContext: data.teacherContext } : {}),
    };
    const generated = await generateLearningGapAnalysis(analysisInput);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      institution_id: data.institutionId,
      actor_id: context.userId,
      action: "learning_gaps.analyzed",
      entity_type: "exam",
      entity_id: data.examId,
      description: `Generated AI learning-gap analysis for ${exam.title}`,
      details: { sheet_count: scopedSheets.length, result_count: numericMarks.length },
    });

    return { ...generated.analysis, generatedAt: new Date().toISOString() };
  });