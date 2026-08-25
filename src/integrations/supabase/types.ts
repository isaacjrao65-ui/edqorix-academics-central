export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      academic_sessions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          description: string | null
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          institution_id: string
        }
        Insert: {
          action: string
          actor_id?: string
          created_at?: string
          description?: string | null
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          institution_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          description?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          institution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credits: number
          department_id: string | null
          id: string
          institution_id: string
          program_id: string | null
          semester: number
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          department_id?: string | null
          id?: string
          institution_id: string
          program_id?: string | null
          semester?: number
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          department_id?: string | null
          id?: string
          institution_id?: string
          program_id?: string | null
          semester?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          contact_name: string
          created_at: string
          designation: string | null
          email: string
          handled: boolean
          id: string
          institution_name: string
          institution_type: string
          message: string | null
          phone: string | null
          student_count: number | null
        }
        Insert: {
          contact_name: string
          created_at?: string
          designation?: string | null
          email: string
          handled?: boolean
          id?: string
          institution_name: string
          institution_type: string
          message?: string | null
          phone?: string | null
          student_count?: number | null
        }
        Update: {
          contact_name?: string
          created_at?: string
          designation?: string | null
          email?: string
          handled?: boolean
          id?: string
          institution_name?: string
          institution_type?: string
          message?: string | null
          phone?: string | null
          student_count?: number | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          institution_id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          institution_id: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          exam_id: string | null
          file_size: number | null
          id: string
          institution_id: string
          mime_type: string | null
          section_id: string | null
          storage_path: string
          student_id: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          exam_id?: string | null
          file_size?: number | null
          id?: string
          institution_id: string
          mime_type?: string | null
          section_id?: string | null
          storage_path: string
          student_id?: string | null
          title: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          exam_id?: string | null
          file_size?: number | null
          id?: string
          institution_id?: string
          mime_type?: string | null
          section_id?: string | null
          storage_path?: string
          student_id?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          section_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          section_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          section_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          exam_date: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          institution_id: string
          max_marks: number
          pass_marks: number
          session_id: string
          title: string
          updated_at: string
          weightage: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string
          exam_date?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          institution_id: string
          max_marks?: number
          pass_marks?: number
          session_id: string
          title: string
          updated_at?: string
          weightage?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          exam_date?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          institution_id?: string
          max_marks?: number
          pass_marks?: number
          session_id?: string
          title?: string
          updated_at?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_bands: {
        Row: {
          created_at: string
          grade: string
          grade_points: number
          id: string
          institution_id: string
          min_percent: number
          scale_id: string
        }
        Insert: {
          created_at?: string
          grade: string
          grade_points?: number
          id?: string
          institution_id: string
          min_percent: number
          scale_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          grade_points?: number
          id?: string
          institution_id?: string
          min_percent?: number
          scale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_bands_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_bands_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "grade_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_scales: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_default: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_default?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_scales_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          short_name: string | null
          type: Database["public"]["Enums"]["institution_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          short_name?: string | null
          type?: Database["public"]["Enums"]["institution_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          short_name?: string | null
          type?: Database["public"]["Enums"]["institution_type"]
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          id: string
          institution_id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          expires_at?: string
          id?: string
          institution_id: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          institution_id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mark_sheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          exam_id: string
          id: string
          institution_id: string
          published_at: string | null
          remarks: string | null
          section_id: string
          status: Database["public"]["Enums"]["sheet_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          exam_id: string
          id?: string
          institution_id: string
          published_at?: string | null
          remarks?: string | null
          section_id: string
          status?: Database["public"]["Enums"]["sheet_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          institution_id?: string
          published_at?: string | null
          remarks?: string | null
          section_id?: string
          status?: Database["public"]["Enums"]["sheet_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mark_sheets_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mark_sheets_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mark_sheets_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          id: string
          institution_id: string
          mark_sheet_id: string
          score: number | null
          state: Database["public"]["Enums"]["mark_state"]
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          institution_id: string
          mark_sheet_id: string
          score?: number | null
          state?: Database["public"]["Enums"]["mark_state"]
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          institution_id?: string
          mark_sheet_id?: string
          score?: number | null
          state?: Database["public"]["Enums"]["mark_state"]
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_mark_sheet_id_fkey"
            columns: ["mark_sheet_id"]
            isOneToOne: false
            referencedRelation: "mark_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          institution_id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          duration_semesters: number
          id: string
          institution_id: string
          level: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          duration_semesters?: number
          id?: string
          institution_id: string
          level?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          duration_semesters?: number
          id?: string
          institution_id?: string
          level?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          faculty_id: string | null
          id: string
          institution_id: string
          name: string
          room: string | null
          session_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          institution_id: string
          name?: string
          room?: string | null
          session_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          institution_id?: string
          name?: string
          room?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          batch_year: number | null
          created_at: string
          current_semester: number
          email: string | null
          full_name: string
          id: string
          institution_id: string
          phone: string | null
          program_id: string | null
          roll_number: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          batch_year?: number | null
          created_at?: string
          current_semester?: number
          email?: string | null
          full_name: string
          id?: string
          institution_id: string
          phone?: string | null
          program_id?: string | null
          roll_number: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          batch_year?: number | null
          created_at?: string
          current_semester?: number
          email?: string | null
          full_name?: string
          id?: string
          institution_id?: string
          phone?: string | null
          program_id?: string | null
          roll_number?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_marks: { Args: { _sheet: string }; Returns: boolean }
      can_manage: { Args: { _institution: string }; Returns: boolean }
      has_inst_role: {
        Args: {
          _institution: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_member: { Args: { _institution: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_section_faculty: { Args: { _section: string }; Returns: boolean }
      my_departments: { Args: { _institution: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "exam_cell" | "hod" | "faculty"
      exam_type:
        | "internal"
        | "midterm"
        | "final"
        | "practical"
        | "assignment"
        | "project"
      institution_type: "school" | "college" | "institute" | "university"
      invite_status: "pending" | "accepted" | "revoked"
      mark_state: "present" | "absent" | "exempt" | "malpractice"
      sheet_status:
        | "draft"
        | "submitted"
        | "verified"
        | "approved"
        | "published"
        | "returned"
      student_status: "active" | "graduated" | "withdrawn" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "exam_cell", "hod", "faculty"],
      exam_type: [
        "internal",
        "midterm",
        "final",
        "practical",
        "assignment",
        "project",
      ],
      institution_type: ["school", "college", "institute", "university"],
      invite_status: ["pending", "accepted", "revoked"],
      mark_state: ["present", "absent", "exempt", "malpractice"],
      sheet_status: [
        "draft",
        "submitted",
        "verified",
        "approved",
        "published",
        "returned",
      ],
      student_status: ["active", "graduated", "withdrawn", "suspended"],
    },
  },
} as const
