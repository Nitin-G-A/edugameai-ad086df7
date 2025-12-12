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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"] | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          class_id: string
          created_at: string
          deadline: string
          file_url: string | null
          id: string
          instructions: string
          max_points: number | null
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          deadline: string
          file_url?: string | null
          id?: string
          instructions: string
          max_points?: number | null
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          deadline?: string
          file_url?: string | null
          id?: string
          instructions?: string
          max_points?: number | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          join_code: string
          name: string
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          join_code: string
          name: string
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          join_code?: string
          name?: string
          subject?: Database["public"]["Enums"]["subject_type"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      doubts: {
        Row: {
          ai_response: string | null
          class_id: string | null
          created_at: string
          id: string
          is_resolved: boolean | null
          question: string
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
        }
        Insert: {
          ai_response?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          question: string
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
        }
        Update: {
          ai_response?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          question?: string
          student_id?: string
          subject?: Database["public"]["Enums"]["subject_type"]
        }
        Relationships: [
          {
            foreignKeyName: "doubts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          activities: Json | null
          class_flow: string | null
          class_level: string
          common_mistakes: Json | null
          created_at: string
          id: string
          objectives: Json | null
          quiz_questions: Json | null
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          unit_name: string
        }
        Insert: {
          activities?: Json | null
          class_flow?: string | null
          class_level: string
          common_mistakes?: Json | null
          created_at?: string
          id?: string
          objectives?: Json | null
          quiz_questions?: Json | null
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          unit_name: string
        }
        Update: {
          activities?: Json | null
          class_flow?: string | null
          class_level?: string
          common_mistakes?: Json | null
          created_at?: string
          id?: string
          objectives?: Json | null
          quiz_questions?: Json | null
          subject?: Database["public"]["Enums"]["subject_type"]
          teacher_id?: string
          unit_name?: string
        }
        Relationships: []
      }
      mistake_reviews: {
        Row: {
          correct_solution: string | null
          created_at: string
          file_url: string | null
          id: string
          mistake_analysis: string | null
          original_answer: string
          practice_questions: Json | null
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
        }
        Insert: {
          correct_solution?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          mistake_analysis?: string | null
          original_answer: string
          practice_questions?: Json | null
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"]
        }
        Update: {
          correct_solution?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          mistake_analysis?: string | null
          original_answer?: string
          practice_questions?: Json | null
          student_id?: string
          subject?: Database["public"]["Enums"]["subject_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          last_activity_date: string | null
          level: number | null
          streak_days: number | null
          updated_at: string
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          updated_at?: string
          xp?: number | null
        }
        Relationships: []
      }
      quiz_submissions: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          quiz_id: string
          score: number | null
          student_id: string
          xp_earned: number | null
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          quiz_id: string
          score?: number | null
          student_id: string
          xp_earned?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          quiz_id?: string
          score?: number | null
          student_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          class_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          id: string
          questions: Json
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          time_limit_minutes: number | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          id?: string
          questions?: Json
          subject: Database["public"]["Enums"]["subject_type"]
          teacher_id: string
          time_limit_minutes?: number | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          id?: string
          questions?: Json
          subject?: Database["public"]["Enums"]["subject_type"]
          teacher_id?: string
          time_limit_minutes?: number | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          is_completed: boolean | null
          scheduled_date: string
          scheduled_time: string | null
          student_id: string
          subject: Database["public"]["Enums"]["subject_type"] | null
          title: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          scheduled_date: string
          scheduled_time?: string | null
          student_id: string
          subject?: Database["public"]["Enums"]["subject_type"] | null
          title: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean | null
          scheduled_date?: string
          scheduled_time?: string | null
          student_id?: string
          subject?: Database["public"]["Enums"]["subject_type"] | null
          title?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          created_at: string
          flashcards: Json | null
          id: string
          key_points: Json | null
          original_content: string | null
          quiz_questions: Json | null
          student_id: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          flashcards?: Json | null
          id?: string
          key_points?: Json | null
          original_content?: string | null
          quiz_questions?: Json | null
          student_id: string
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          flashcards?: Json | null
          id?: string
          key_points?: Json | null
          original_content?: string | null
          quiz_questions?: Json | null
          student_id?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_join_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          display_name: string
          level: number
          user_id: string
          xp: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher"
      assignment_status: "pending" | "submitted" | "graded"
      quiz_difficulty: "easy" | "medium" | "hard"
      subject_type: "computer_science" | "stem" | "humanities"
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
      app_role: ["student", "teacher"],
      assignment_status: ["pending", "submitted", "graded"],
      quiz_difficulty: ["easy", "medium", "hard"],
      subject_type: ["computer_science", "stem", "humanities"],
    },
  },
} as const
