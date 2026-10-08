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
        }
        Insert: {
          active?: boolean
          id?: never
          level: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          id?: never
          level?: string
          name?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_sanctuary_employee: { Args: never; Returns: boolean }
      is_sanctuary_owner: { Args: never; Returns: boolean }
      list_sanctuary_employees: {
        Args: never
        Returns: {
          display_name: string
          email: string
          revoked_at: string
          user_id: string
        }[]
      }
      revoke_sanctuary_employee: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      sanctuary_session_status: { Args: never; Returns: Json }
      sanctuary_session_valid: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
