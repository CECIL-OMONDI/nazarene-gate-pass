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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      low_stock_alerts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          material_id: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          material_id: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          material_id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      material_receipts: {
        Row: {
          id: string
          material_id: string
          notes: string | null
          quantity: number
          received_at: string
          received_by: string
          supplier: string | null
        }
        Insert: {
          id?: string
          material_id: string
          notes?: string | null
          quantity: number
          received_at?: string
          received_by: string
          supplier?: string | null
        }
        Update: {
          id?: string
          material_id?: string
          notes?: string | null
          quantity?: number
          received_at?: string
          received_by?: string
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_receipts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_usage: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          quantity: number
          recorded_by: string
          site_id: string
          used_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          quantity: number
          recorded_by: string
          site_id: string
          used_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          quantity?: number
          recorded_by?: string
          site_id?: string
          used_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_usage_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_dispatches: {
        Row: {
          dispatched_at: string
          driver_name: string
          order_id: string
          plate_number: string
          vehicle: string | null
        }
        Insert: {
          dispatched_at?: string
          driver_name: string
          order_id: string
          plate_number: string
          vehicle?: string | null
        }
        Update: {
          dispatched_at?: string
          driver_name?: string
          order_id?: string
          plate_number?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_dispatches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          material_id: string
          order_id: string
          quantity: number
        }
        Insert: {
          id?: string
          material_id: string
          order_id: string
          quantity: number
        }
        Update: {
          id?: string
          material_id?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          contractor_id: string
          created_at: string
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          site_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          contractor_id: string
          created_at?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          contractor_id?: string
          created_at?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          password: string
          phone: string
          reject_reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          password: string
          phone: string
          reject_reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          password?: string
          phone?: string
          reject_reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      site_inventory: {
        Row: {
          material_id: string
          quantity: number
          site_id: string
          updated_at: string
        }
        Insert: {
          material_id: string
          quantity?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          material_id?: string
          quantity?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_inventory_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_inventory_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          contractor_id: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          site_keeper_id: string | null
          updated_at: string
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          site_keeper_id?: string | null
          updated_at?: string
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          site_keeper_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_site_keeper_id_fkey"
            columns: ["site_keeper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          broken_count: number
          condition: Database["public"]["Enums"]["tool_condition"]
          created_at: string
          id: string
          name: string
          quantity: number
          site_id: string
          updated_at: string
        }
        Insert: {
          broken_count?: number
          condition?: Database["public"]["Enums"]["tool_condition"]
          created_at?: string
          id?: string
          name: string
          quantity?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          broken_count?: number
          condition?: Database["public"]["Enums"]["tool_condition"]
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
      workers: {
        Row: {
          site_id: string
          skilled_count: number
          unskilled_count: number
          updated_at: string
        }
        Insert: {
          site_id: string
          skilled_count?: number
          unskilled_count?: number
          updated_at?: string
        }
        Update: {
          site_id?: string
          skilled_count?: number
          unskilled_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      yard_inventory: {
        Row: {
          material_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          material_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          material_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yard_inventory_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_site_material_usage_totals: {
        Row: {
          material_id: string | null
          site_id: string | null
          total_used: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_usage_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_pending_order: { Args: { _order_id: string }; Returns: undefined }
      create_low_stock_alert: {
        Args: { _material_id: string; _message: string }
        Returns: string
      }
      current_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      delete_low_stock_alert: { Args: { _id: string }; Returns: undefined }
      dispatch_order: {
        Args: {
          _driver: string
          _order_id: string
          _plate: string
          _vehicle?: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_site_contractor: { Args: { _site_id: string }; Returns: boolean }
      is_site_keeper: { Args: { _site_id: string }; Returns: boolean }
      is_staff_admin: { Args: { _user_id: string }; Returns: boolean }
      receive_order: { Args: { _order_id: string }; Returns: undefined }
      record_usage: {
        Args: {
          _material_id: string
          _notes?: string
          _quantity: number
          _site_id: string
          _used_on?: string
        }
        Returns: undefined
      }
      resolve_low_stock_alert: { Args: { _id: string }; Returns: undefined }
      restock_yard: {
        Args: {
          _material_id: string
          _notes?: string
          _quantity: number
          _supplier?: string
        }
        Returns: undefined
      }
      set_tool_broken_count: {
        Args: { _broken: number; _tool_id: string }
        Returns: undefined
      }
      set_tool_condition: {
        Args: {
          _condition: Database["public"]["Enums"]["tool_condition"]
          _tool_id: string
        }
        Returns: undefined
      }
      update_pending_order_item: {
        Args: { _item_id: string; _new_quantity: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "yard_storekeeper"
        | "contractor"
        | "site_storekeeper"
        | "engineer"
      order_status: "pending" | "dispatched" | "received" | "cancelled"
      tool_condition: "working" | "broken"
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
      app_role: [
        "admin",
        "yard_storekeeper",
        "contractor",
        "site_storekeeper",
        "engineer",
      ],
      order_status: ["pending", "dispatched", "received", "cancelled"],
      tool_condition: ["working", "broken"],
    },
  },
} as const
