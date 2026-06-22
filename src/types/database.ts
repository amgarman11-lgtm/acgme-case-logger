// Generated from the live Supabase schema (supabase MCP / `npm run gen-types`).
// Do not edit the generated section by hand; re-generate after each migration.
// App-facing aliases live in ./models.ts so re-generation never clobbers them.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          academic_year: number
          attending_name: string
          case_name: string
          case_number: string | null
          case_ref: string | null
          case_seq: number
          cpt_code: string | null
          cpt_description: string | null
          created_at: string
          id: string
          logged_to_acgme: boolean
          pgy_year: number | null
          resident_role: Database["public"]["Enums"]["resident_role"]
          rotation: string | null
          surgery_date: string
          user_id: string
        }
        Insert: {
          academic_year: number
          attending_name: string
          case_name: string
          case_number?: string | null
          case_ref?: string | null
          case_seq?: number
          cpt_code?: string | null
          cpt_description?: string | null
          created_at?: string
          id?: string
          logged_to_acgme?: boolean
          pgy_year?: number | null
          resident_role: Database["public"]["Enums"]["resident_role"]
          rotation?: string | null
          surgery_date?: string
          user_id?: string
        }
        Update: {
          academic_year?: number
          attending_name?: string
          case_name?: string
          case_number?: string | null
          case_ref?: string | null
          case_seq?: number
          cpt_code?: string | null
          cpt_description?: string | null
          created_at?: string
          id?: string
          logged_to_acgme?: boolean
          pgy_year?: number | null
          resident_role?: Database["public"]["Enums"]["resident_role"]
          rotation?: string | null
          surgery_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          attendings: Json
          ay_start_day: number
          ay_start_month: number
          cpt_map: Json | null
          rotations: Json
          sheet_webhook: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendings?: Json
          ay_start_day?: number
          ay_start_month?: number
          cpt_map?: Json | null
          rotations?: Json
          sheet_webhook?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attendings?: Json
          ay_start_day?: number
          ay_start_month?: number
          cpt_map?: Json | null
          rotations?: Json
          sheet_webhook?: string | null
          updated_at?: string
          user_id?: string
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
      resident_role: "Surgeon-Chief" | "Surgeon-Junior" | "First Assistant" | "Teaching Assistant"
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

export const Constants = {
  public: {
    Enums: {
      resident_role: ["Surgeon-Chief", "Surgeon-Junior", "First Assistant", "Teaching Assistant"],
    },
  },
} as const
