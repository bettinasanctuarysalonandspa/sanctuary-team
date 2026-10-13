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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bootcamp_lesson_edits: {
        Row: {
          content: Json
          lesson_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          lesson_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          lesson_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bootcamp_practice: {
        Row: {
          application_time: string | null
          assigned_service: string
          costylist_id: string
          created_at: string
          educator_id: string
          feedback: string | null
          finishing_time: string | null
          id: number
          next_assignment: string | null
          processing_time: string | null
          result: string | null
          stylist_instructions: string | null
        }
        Insert: {
          application_time?: string | null
          assigned_service: string
          costylist_id: string
          created_at?: string
          educator_id: string
          feedback?: string | null
          finishing_time?: string | null
          id?: never
          next_assignment?: string | null
          processing_time?: string | null
          result?: string | null
          stylist_instructions?: string | null
        }
        Update: {
          application_time?: string | null
          assigned_service?: string
          costylist_id?: string
          created_at?: string
          educator_id?: string
          feedback?: string | null
          finishing_time?: string | null
          id?: never
          next_assignment?: string | null
          processing_time?: string | null
          result?: string | null
          stylist_instructions?: string | null
        }
        Relationships: []
      }
      bootcamp_progress: {
        Row: {
          assessment_date: string | null
          costylist_id: string
          educator_id: string | null
          id: number
          notes: string | null
          practice_assignment: string | null
          signed_off_at: string | null
          skill: string
          status: string
          timing_observed: string | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string | null
          costylist_id: string
          educator_id?: string | null
          id?: never
          notes?: string | null
          practice_assignment?: string | null
          signed_off_at?: string | null
          skill: string
          status?: string
          timing_observed?: string | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string | null
          costylist_id?: string
          educator_id?: string | null
          id?: never
          notes?: string | null
          practice_assignment?: string | null
          signed_off_at?: string | null
          skill?: string
          status?: string
          timing_observed?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bootcamp_reflections: {
        Row: {
          created_at: string
          educator_reply: string | null
          id: number
          learned: string
          question: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          educator_reply?: string | null
          id?: never
          learned: string
          question?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          educator_reply?: string | null
          id?: never
          learned?: string
          question?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calc_aliases: {
        Row: {
          id: number
          meaning: string
          phrase: string
        }
        Insert: {
          id?: never
          meaning: string
          phrase: string
        }
        Update: {
          id?: never
          meaning?: string
          phrase?: string
        }
        Relationships: []
      }
      calc_audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: number
          new_row: Json | null
          old_row: Json | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      calc_extension_costs: {
        Row: {
          cost_per_section: number
          full_weft_cost: number
          hair_id: number
        }
        Insert: {
          cost_per_section: number
          full_weft_cost: number
          hair_id: number
        }
        Update: {
          cost_per_section?: number
          full_weft_cost?: number
          hair_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "calc_extension_costs_hair_id_fkey"
            columns: ["hair_id"]
            isOneToOne: true
            referencedRelation: "calc_extension_hair"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_extension_hair: {
        Row: {
          active: boolean
          id: number
          length_in: number
          name: string
          price_per_section: number
        }
        Insert: {
          active?: boolean
          id?: never
          length_in: number
          name: string
          price_per_section: number
        }
        Update: {
          active?: boolean
          id?: never
          length_in?: number
          name?: string
          price_per_section?: number
        }
        Relationships: []
      }
      calc_product_costs: {
        Row: {
          product_id: number
          updated_at: string
          wholesale_cost: number
        }
        Insert: {
          product_id: number
          updated_at?: string
          wholesale_cost: number
        }
        Update: {
          product_id?: number
          updated_at?: string
          wholesale_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "calc_product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "calc_products"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_products: {
        Row: {
          active: boolean
          brand: string
          id: number
          line: string | null
          name: string
          notes: string | null
          retail_price: number | null
          size: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand: string
          id?: never
          line?: string | null
          name: string
          notes?: string | null
          retail_price?: number | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand?: string
          id?: never
          line?: string | null
          name?: string
          notes?: string | null
          retail_price?: number | null
          size?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      calc_service_level_prices: {
        Row: {
          effective_date: string
          level: string
          price: number
          service_id: number
        }
        Insert: {
          effective_date?: string
          level: string
          price: number
          service_id: number
        }
        Update: {
          effective_date?: string
          level?: string
          price?: number
          service_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "calc_service_level_prices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "calc_services"
            referencedColumns: ["id"]
          },
        ]
      }
      calc_services: {
        Row: {
          active: boolean
          flat_price: number | null
          id: number
          kind: string
          name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          flat_price?: number | null
          id?: never
          kind: string
          name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          flat_price?: number | null
          id?: never
          kind?: string
          name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calc_stylists: {
        Row: {
          active: boolean
          id: number
          level: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          id?: never
          level: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          id?: never
          level?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      consultation_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      content_studio_gateway_state: {
        Row: {
          id: number
          paused: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_studio_knowledge: {
        Row: {
          approved: boolean
          content: string
          id: string
          source: string
          source_date: string
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          id?: string
          source: string
          source_date: string
          title: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          id?: string
          source?: string
          source_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_studio_messages: {
        Row: {
          created_at: string
          id: number
          message: Json
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          message: Json
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          message?: Json
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_access_revocations: {
        Row: {
          revoked_at: string
          revoked_by: string
          user_id: string
        }
        Insert: {
          revoked_at?: string
          revoked_by: string
          user_id: string
        }
        Update: {
          revoked_at?: string
          revoked_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_access_revocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          invited_by: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string
          email: string
          id?: string
          invited_by: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          invited_by?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      growth_checkins: {
        Row: {
          created_at: string
          id: number
          metrics: Json
          source: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: never
          metrics?: Json
          source?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: never
          metrics?: Json
          source?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      growth_gateway_state: {
        Row: {
          id: number
          paused: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      growth_items: {
        Row: {
          completed_at: string | null
          content: string
          created_at: string
          done: boolean
          follow_up_date: string | null
          id: number
          kind: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content: string
          created_at?: string
          done?: boolean
          follow_up_date?: string | null
          id?: never
          kind: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content?: string
          created_at?: string
          done?: boolean
          follow_up_date?: string | null
          id?: never
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      growth_knowledge: {
        Row: {
          approved: boolean
          content: string
          id: string
          source: string
          source_date: string
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          id?: string
          source: string
          source_date: string
          title: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          id?: string
          source?: string
          source_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      growth_level_targets: {
        Row: {
          green_min: number | null
          id: number
          level: string
          metric: string
          next_level_requirement: string | null
          updated_at: string
          yellow_min: number | null
        }
        Insert: {
          green_min?: number | null
          id?: never
          level: string
          metric: string
          next_level_requirement?: string | null
          updated_at?: string
          yellow_min?: number | null
        }
        Update: {
          green_min?: number | null
          id?: never
          level?: string
          metric?: string
          next_level_requirement?: string | null
          updated_at?: string
          yellow_min?: number | null
        }
        Relationships: []
      }
      growth_messages: {
        Row: {
          created_at: string
          id: number
          message: Json
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          message: Json
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          message?: Json
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      growth_profiles: {
        Row: {
          focus: string | null
          start_date: string | null
          training_week: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          focus?: string | null
          start_date?: string | null
          training_week?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          focus?: string | null
          start_date?: string | null
          training_week?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      guidance_gateway_state: {
        Row: {
          id: number
          paused: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guidance_knowledge: {
        Row: {
          approved: boolean
          content: string
          id: string
          source: string
          source_date: string
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          id?: string
          source: string
          source_date: string
          title: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          id?: string
          source?: string
          source_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guidance_messages: {
        Row: {
          created_at: string
          id: number
          message: Json
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          message: Json
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          message?: Json
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      proof_viewers: {
        Row: {
          granted_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      specialty_entries: {
        Row: {
          approved: boolean
          costylist_id: string
          created_at: string
          educator_id: string
          feedback: string | null
          id: number
          next_assignment: string | null
          result: string | null
          service: string | null
          stage: string
          technique: string | null
          track: string
        }
        Insert: {
          approved?: boolean
          costylist_id: string
          created_at?: string
          educator_id: string
          feedback?: string | null
          id?: never
          next_assignment?: string | null
          result?: string | null
          service?: string | null
          stage: string
          technique?: string | null
          track: string
        }
        Update: {
          approved?: boolean
          costylist_id?: string
          created_at?: string
          educator_id?: string
          feedback?: string | null
          id?: never
          next_assignment?: string | null
          result?: string | null
          service?: string | null
          stage?: string
          technique?: string | null
          track?: string
        }
        Relationships: []
      }
      specialty_proof: {
        Row: {
          costylist_id: string
          created_at: string
          files: Json
          id: number
          note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          stage: string
          status: string
          track: string
        }
        Insert: {
          costylist_id: string
          created_at?: string
          files?: Json
          id?: never
          note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          stage: string
          status?: string
          track: string
        }
        Update: {
          costylist_id?: string
          created_at?: string
          files?: Json
          id?: never
          note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          stage?: string
          status?: string
          track?: string
        }
        Relationships: []
      }
      specialty_signoff_restrictions: {
        Row: {
          educator_id: string
          track: string
        }
        Insert: {
          educator_id: string
          track: string
        }
        Update: {
          educator_id?: string
          track?: string
        }
        Relationships: []
      }
      support_gateway_state: {
        Row: {
          id: number
          paused: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          paused?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_knowledge: {
        Row: {
          approved: boolean
          content: string
          id: string
          source: string
          source_date: string
          title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          id?: string
          source: string
          source_date: string
          title: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          id?: string
          source?: string
          source_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: number
          message: Json
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          message: Json
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          message?: Json
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      accept_sanctuary_invitation: { Args: never; Returns: string }
      can_sign_specialty: { Args: { _track: string }; Returns: boolean }
      can_view_proof: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_bootcamp_educator: { Args: never; Returns: boolean }
      is_sanctuary_employee: { Args: never; Returns: boolean }
      is_sanctuary_owner: { Args: never; Returns: boolean }
      list_bootcamp_roster: {
        Args: never
        Returns: {
          display_name: string
          educator: boolean
          user_id: string
        }[]
      }
      list_calculator_usage: {
        Args: never
        Returns: {
          days_used: number
          display_name: string
          last_used: string
          questions: number
          user_id: string
        }[]
      }
      list_growth_roster: {
        Args: never
        Returns: {
          display_name: string
          level: string
          user_id: string
        }[]
      }
      list_invitation_tracker: {
        Args: never
        Returns: {
          invitation_id: string
          last_sign_in_at: string
          opened_at: string
        }[]
      }
      list_sanctuary_employees: {
        Args: never
        Returns: {
          display_name: string
          email: string
          revoked_at: string
          user_id: string
        }[]
      }
      list_sanctuary_invitations: {
        Args: never
        Returns: {
          accepted_at: string
          created_at: string
          display_name: string
          email: string
          id: string
          status: string
        }[]
      }
      my_stylist_level: {
        Args: never
        Returns: {
          level: string
          name: string
        }[]
      }
      review_specialty_proof: {
        Args: { approve: boolean; note: string; proof_id: number }
        Returns: undefined
      }
      revoke_sanctuary_employee: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      sanctuary_session_status: { Args: never; Returns: Json }
      sanctuary_session_valid: { Args: never; Returns: boolean }
      set_bootcamp_educator: {
        Args: { make_educator: boolean; target_user_id: string }
        Returns: undefined
      }
      set_proof_viewer: {
        Args: { allow: boolean; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "educator"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "employee", "educator"],
    },
  },
} as const
