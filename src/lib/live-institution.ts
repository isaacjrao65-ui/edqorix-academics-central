import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

// Table -> react-query keys to refresh when that table changes.
const TABLE_KEYS: Record<string, string[]> = {
  audit_logs: ["audit-recent", "audit"],
  marks: ["sheets", "marks"],
  mark_sheets: ["sheets"],
  students: ["students"],
  exams: ["exams"],
  classes: ["classes"],
  courses: ["courses"],
  memberships: ["members"],
  documents: ["documents"],
  class_subject_teachers: ["class-assignments", "classes"],
  academic_sessions: ["sessions"],
};

/** Subscribes to every change in the institution and refreshes the dashboard live. */
export function useLiveInstitution(institutionId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase.channel(`inst-live-${institutionId}`);
    for (const [table, keys] of Object.entries(TABLE_KEYS)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `institution_id=eq.${institutionId}` },
        () => {
          for (const key of keys) qc.invalidateQueries({ queryKey: [key] });
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [institutionId, qc]);
}
