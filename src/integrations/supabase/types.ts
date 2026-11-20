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
      app_settings: {
        Row: {
          cash_enabled: boolean
          courier_fee_kobo: number
          id: number
          service_fee_bps: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cash_enabled?: boolean
          courier_fee_kobo?: number
          id?: number
          service_fee_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cash_enabled?: boolean
          courier_fee_kobo?: number
          id?: number
          service_fee_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
        }
        Relationships: []
      }
      courier_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          courier_id: string
          id: string
          notes: string | null
          order_id: string
          package_count: number
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          courier_id: string
          id?: string
          notes?: string | null
          order_id: string
          package_count?: number
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          courier_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          package_count?: number
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          approval_status: Database["public"]["Enums"]["courier_approval"]
          availability: Database["public"]["Enums"]["courier_availability"]
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          last_lat: number | null
          last_lng: number | null
          last_location_at: string | null
          phone: string | null
          user_id: string | null
          vehicle: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["courier_approval"]
          availability?: Database["public"]["Enums"]["courier_availability"]
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          phone?: string | null
          user_id?: string | null
          vehicle?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["courier_approval"]
          availability?: Database["public"]["Enums"]["courier_availability"]
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          phone?: string | null
          user_id?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      delivery_events: {
        Row: {
          actor_id: string | null
          assignment_id: string | null
          courier_id: string | null
          created_at: string
          event_type: string
          id: string
          is_issue: boolean
          lat: number | null
          lng: number | null
          message: string | null
          order_id: string
          source: string
        }
        Insert: {
          actor_id?: string | null
          assignment_id?: string | null
          courier_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_issue?: boolean
          lat?: number | null
          lng?: number | null
          message?: string | null
          order_id: string
          source?: string
        }
        Update: {
          actor_id?: string | null
          assignment_id?: string | null
          courier_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_issue?: boolean
          lat?: number | null
          lng?: number | null
          message?: string | null
          order_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "courier_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          app_version: string | null
          auth_session_id: string
          device_id: string
          device_name: string | null
          ended_at: string | null
          ended_reason: string | null
          id: string
          last_seen_at: string
          platform: string | null
          signed_in_at: string
          status: Database["public"]["Enums"]["device_session_status"]
          user_id: string
        }
        Insert: {
          app_version?: string | null
          auth_session_id: string
          device_id: string
          device_name?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          last_seen_at?: string
          platform?: string | null
          signed_in_at?: string
          status?: Database["public"]["Enums"]["device_session_status"]
          user_id: string
        }
        Update: {
          app_version?: string | null
          auth_session_id?: string
          device_id?: string
          device_name?: string | null
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          last_seen_at?: string
          platform?: string | null
          signed_in_at?: string
          status?: Database["public"]["Enums"]["device_session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          message: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          message?: string | null
          order_id: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          message?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          actual_price_kobo: number | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          availability: Database["public"]["Enums"]["item_availability"]
          id: string
          name: string
          order_id: string
          position: number
          procurement_note: string | null
          quantity: number
          substitute_name: string | null
          substitute_price_kobo: number | null
          target_price_kobo: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          actual_price_kobo?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          availability?: Database["public"]["Enums"]["item_availability"]
          id?: string
          name: string
          order_id: string
          position?: number
          procurement_note?: string | null
          quantity?: number
          substitute_name?: string | null
          substitute_price_kobo?: number | null
          target_price_kobo?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          actual_price_kobo?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          availability?: Database["public"]["Enums"]["item_availability"]
          id?: string
          name?: string
          order_id?: string
          position?: number
          procurement_note?: string | null
          quantity?: number
          substitute_name?: string | null
          substitute_price_kobo?: number | null
          target_price_kobo?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
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
          assigned_courier_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          courier_fee_kobo: number
          created_at: string
          customer_id: string | null
          customer_instructions: string | null
          delivery_address: string
          delivery_landmark: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          discount_kobo: number
          goods_subtotal_kobo: number
          id: string
          internal_notes: string | null
          is_test: boolean
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          procurement_notes: string | null
          service_fee_bps: number
          service_fee_kobo: number
          status: Database["public"]["Enums"]["order_status"]
          total_kobo: number
          updated_at: string
        }
        Insert: {
          assigned_courier_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          courier_fee_kobo?: number
          created_at?: string
          customer_id?: string | null
          customer_instructions?: string | null
          delivery_address?: string
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_kobo?: number
          goods_subtotal_kobo?: number
          id?: string
          internal_notes?: string | null
          is_test?: boolean
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          procurement_notes?: string | null
          service_fee_bps?: number
          service_fee_kobo?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_kobo?: number
          updated_at?: string
        }
        Update: {
          assigned_courier_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          courier_fee_kobo?: number
          created_at?: string
          customer_id?: string | null
          customer_instructions?: string | null
          delivery_address?: string
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_kobo?: number
          goods_subtotal_kobo?: number
          id?: string
          internal_notes?: string | null
          is_test?: boolean
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          procurement_notes?: string | null
          service_fee_bps?: number
          service_fee_kobo?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_kobo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_courier_id_fkey"
            columns: ["assigned_courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kobo: number
          created_at: string
          failure_reason: string | null
          id: string
          order_id: string
          provider: Database["public"]["Enums"]["payment_method"]
          raw: Json | null
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          verified_via: string | null
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          order_id: string
          provider: Database["public"]["Enums"]["payment_method"]
          raw?: Json | null
          reference: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_via?: string | null
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          order_id?: string
          provider?: Database["public"]["Enums"]["payment_method"]
          raw?: Json | null
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          description: string
          key: string
        }
        Insert: {
          category: string
          description: string
          key: string
        }
        Update: {
          category?: string
          description?: string
          key?: string
        }
        Relationships: []
      }
      procurement_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          id: string
          instructions: string | null
          order_id: string
          runner_name: string | null
          status: Database["public"]["Enums"]["procurement_status"]
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          order_id: string
          runner_name?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          order_id?: string
          runner_name?: string | null
          status?: Database["public"]["Enums"]["procurement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "procurement_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          phone: string | null
          status: Database["public"]["Enums"]["staff_status"]
          suspended_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          assigned_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_admin_count: { Args: never; Returns: number }
      assign_courier: {
        Args: {
          _courier_id: string
          _notes: string
          _order_ids: string[]
          _package_counts: number[]
        }
        Returns: number
      }
      assign_procurement: {
        Args: {
          _assigned_to: string
          _instructions: string
          _order_id: string
          _runner_name: string
          _status?: Database["public"]["Enums"]["procurement_status"]
        }
        Returns: undefined
      }
      cancel_courier_assignment: {
        Args: { _assignment_id: string; _reason: string }
        Returns: undefined
      }
      complete_procurement: {
        Args: { _note?: string; _order_id: string }
        Returns: undefined
      }
      current_auth_session_id: { Args: never; Returns: string }
      dashboard_summary: { Args: never; Returns: Json }
      end_device_session: { Args: never; Returns: undefined }
      get_my_access: { Args: never; Returns: Json }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      is_active_staff: { Args: { _user_id: string }; Returns: boolean }
      item_line_kobo: {
        Args: { i: Database["public"]["Tables"]["order_items"]["Row"] }
        Returns: number
      }
      mark_notifications_read: { Args: { _ids: string[] }; Returns: undefined }
      notify_staff: {
        Args: {
          _body: string
          _entity_id: string
          _entity_type: string
          _kind: string
          _permission: string
          _title: string
        }
        Returns: undefined
      }
      recompute_order_totals: {
        Args: { _order_id: string }
        Returns: undefined
      }
      record_cash_payment: {
        Args: { _amount_kobo: number; _note: string; _order_id: string }
        Returns: string
      }
      record_item_procurement: {
        Args: {
          _actual_price_kobo: number
          _availability: Database["public"]["Enums"]["item_availability"]
          _item_id: string
          _note: string
          _substitute_name: string
          _substitute_price_kobo: number
        }
        Returns: undefined
      }
      register_device_session: {
        Args: {
          _app_version: string
          _device_id: string
          _device_name: string
          _platform: string
        }
        Returns: Json
      }
      report_delivery_issue: {
        Args: { _message: string; _order_id: string }
        Returns: undefined
      }
      require_permission: { Args: { _permission: string }; Returns: undefined }
      revoke_device_session: {
        Args: { _session_id: string }
        Returns: undefined
      }
      set_role_permissions: {
        Args: { _permission_keys: string[]; _role_id: string }
        Returns: undefined
      }
      set_staff_roles: {
        Args: { _role_ids: string[]; _user_id: string }
        Returns: undefined
      }
      set_staff_status: {
        Args: {
          _reason: string
          _status: Database["public"]["Enums"]["staff_status"]
          _user_id: string
        }
        Returns: undefined
      }
      set_substitution_approval: {
        Args: {
          _approval: Database["public"]["Enums"]["approval_status"]
          _item_id: string
          _note: string
        }
        Returns: undefined
      }
      touch_device_session: { Args: never; Returns: string }
      update_app_settings: {
        Args: {
          _cash_enabled: boolean
          _courier_fee_kobo: number
          _service_fee_bps: number
        }
        Returns: undefined
      }
      update_my_profile: {
        Args: { _full_name: string; _phone: string }
        Returns: undefined
      }
      update_order_notes: {
        Args: {
          _internal_notes: string
          _order_id: string
          _procurement_notes: string
        }
        Returns: undefined
      }
      update_order_status: {
        Args: {
          _note?: string
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      write_audit: {
        Args: {
          _action: string
          _details?: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      approval_status: "not_required" | "pending" | "approved" | "rejected"
      assignment_status:
        | "assigned"
        | "accepted"
        | "picked_up"
        | "delivered"
        | "failed"
        | "cancelled"
      courier_approval: "pending" | "approved" | "rejected"
      courier_availability: "available" | "busy" | "offline"
      device_session_status: "active" | "revoked" | "signed_out"
      item_availability: "pending" | "found" | "unavailable" | "substituted"
      order_status:
        | "new"
        | "awaiting_confirmation"
        | "awaiting_procurement"
        | "processing"
        | "awaiting_courier"
        | "courier_assigned"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      payment_method: "paystack" | "cash"
      payment_status:
        | "pending"
        | "awaiting_verification"
        | "paid"
        | "failed"
        | "refunded"
      procurement_status: "assigned" | "in_progress" | "done"
      staff_status: "active" | "suspended"
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
      approval_status: ["not_required", "pending", "approved", "rejected"],
      assignment_status: [
        "assigned",
        "accepted",
        "picked_up",
        "delivered",
        "failed",
        "cancelled",
      ],
      courier_approval: ["pending", "approved", "rejected"],
      courier_availability: ["available", "busy", "offline"],
      device_session_status: ["active", "revoked", "signed_out"],
      item_availability: ["pending", "found", "unavailable", "substituted"],
      order_status: [
        "new",
        "awaiting_confirmation",
        "awaiting_procurement",
        "processing",
        "awaiting_courier",
        "courier_assigned",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      payment_method: ["paystack", "cash"],
      payment_status: [
        "pending",
        "awaiting_verification",
        "paid",
        "failed",
        "refunded",
      ],
      procurement_status: ["assigned", "in_progress", "done"],
      staff_status: ["active", "suspended"],
    },
  },
} as const
