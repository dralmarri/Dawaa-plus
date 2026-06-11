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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          doctor_name: string | null
          id: string
          location: string | null
          notes: string | null
          reminder_before: string | null
          specialty: string
          time: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          doctor_name?: string | null
          id: string
          location?: string | null
          notes?: string | null
          reminder_before?: string | null
          specialty?: string
          time: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          doctor_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          reminder_before?: string | null
          specialty?: string
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_pressure_readings: {
        Row: {
          created_at: string
          date: string
          diastolic: number
          heart_rate: number
          id: string
          notes: string | null
          period: string
          systolic: number
          time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          diastolic: number
          heart_rate?: number
          id: string
          notes?: string | null
          period?: string
          systolic: number
          time: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          diastolic?: number
          heart_rate?: number
          id?: string
          notes?: string | null
          period?: string
          systolic?: number
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      dose_records: {
        Row: {
          created_at: string
          date: string
          id: string
          medication_id: string
          medication_name: string
          scheduled_time: string
          status: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id: string
          medication_id: string
          medication_name: string
          scheduled_time: string
          status?: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          medication_id?: string
          medication_name?: string
          scheduled_time?: string
          status?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_tests: {
        Row: {
          created_at: string
          date: string
          file_url: string | null
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          file_url?: string | null
          id: string
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          concentration: string | null
          created_at: string
          dosage: number
          duration_days: number | null
          form: string
          frequency: string
          id: string
          image_url: string | null
          initial_stock: number | null
          is_chronic: boolean
          meal_relation: string
          name: string
          notes: string | null
          start_date: string | null
          stock: number
          times: Json
          user_id: string
        }
        Insert: {
          concentration?: string | null
          created_at?: string
          dosage?: number
          duration_days?: number | null
          form: string
          frequency?: string
          id: string
          image_url?: string | null
          initial_stock?: number | null
          is_chronic?: boolean
          meal_relation?: string
          name: string
          notes?: string | null
          start_date?: string | null
          stock?: number
          times?: Json
          user_id: string
        }
        Update: {
          concentration?: string | null
          created_at?: string
          dosage?: number
          duration_days?: number | null
          form?: string
          frequency?: string
          id?: string
          image_url?: string | null
          initial_stock?: number | null
          is_chronic?: boolean
          meal_relation?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          stock?: number
          times?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          daily_summary: boolean
          daily_summary_time: string
          emergency_contact: Json | null
          escalation_on_missed: boolean
          id: string
          language: string
          notifications: boolean
          reminder_before: string
          updated_at: string
          user_id: string
          user_name: string | null
          voice_notifications: boolean
        }
        Insert: {
          created_at?: string
          daily_summary?: boolean
          daily_summary_time?: string
          emergency_contact?: Json | null
          escalation_on_missed?: boolean
          id?: string
          language?: string
          notifications?: boolean
          reminder_before?: string
          updated_at?: string
          user_id: string
          user_name?: string | null
          voice_notifications?: boolean
        }
        Update: {
          created_at?: string
          daily_summary?: boolean
          daily_summary_time?: string
          emergency_contact?: Json | null
          escalation_on_missed?: boolean
          id?: string
          language?: string
          notifications?: boolean
          reminder_before?: string
          updated_at?: string
          user_id?: string
          user_name?: string | null
          voice_notifications?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
