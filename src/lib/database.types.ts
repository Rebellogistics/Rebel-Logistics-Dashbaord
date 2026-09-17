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
      customers: {
        Row: {
          abn: string | null
          avatar: string | null
          billing_basis: string
          company_name: string | null
          created_at: string
          default_notes: string | null
          default_rate: number | null
          default_service: string | null
          deleted_at: string | null
          email: string | null
          id: string
          import_batch: string | null
          last_job_date: string | null
          name: string
          notes: string | null
          override_hourly_rate: number | null
          override_metro_rate: number | null
          phone: string | null
          source: string | null
          total_jobs: number
          total_spent: number
          type: string
          vip: boolean
        }
        Insert: {
          abn?: string | null
          avatar?: string | null
          billing_basis?: string
          company_name?: string | null
          created_at?: string
          default_notes?: string | null
          default_rate?: number | null
          default_service?: string | null
          deleted_at?: string | null
          email?: string | null
          id: string
          import_batch?: string | null
          last_job_date?: string | null
          name: string
          notes?: string | null
          override_hourly_rate?: number | null
          override_metro_rate?: number | null
          phone?: string | null
          source?: string | null
          total_jobs?: number
          total_spent?: number
          type?: string
          vip?: boolean
        }
        Update: {
          abn?: string | null
          avatar?: string | null
          billing_basis?: string
          company_name?: string | null
          created_at?: string
          default_notes?: string | null
          default_rate?: number | null
          default_service?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          import_batch?: string | null
          last_job_date?: string | null
          name?: string
          notes?: string | null
          override_hourly_rate?: number | null
          override_metro_rate?: number | null
          phone?: string | null
          source?: string | null
          total_jobs?: number
          total_spent?: number
          type?: string
          vip?: boolean
        }
        Relationships: []
      }
      drivers: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      job_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: string
          job_id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: string
          job_id: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: string
          job_id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          container_job_id: string | null
          container_size: string | null
          disposal_amount: number | null
          disposal_load: string | null
          disposal_transport_amount: number | null
          fuel_levy_pct_applied: number | null
          labourers: number | null
          legs_hours: number | null
          packaging_amount: number | null
          storage_days: number | null
          storage_term: string | null
          storage_tier: string | null
          truck_size: string | null
          warehouse_service: string | null
          wh_labour_type: string | null
          fuel_levy_mode: string
          assigned_truck: string | null
          completed_at: string | null
          completed_by_driver_id: string | null
          completed_by_driver_name: string | null
          completion_sms_sent_at: string | null
          created_at: string
          cubic_metres: number | null
          customer_company_name: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          date: string
          day_prior_sms_sent_at: string | null
          decline_reason: string | null
          deleted_at: string | null
          delivery_address: string
          distance_km: number | null
          en_route_sms_sent_at: string | null
          fee: number
          fuel_levy: number
          google_calendar_event_id: string | null
          gst_amount: number | null
          hourly_rate: number | null
          hours_estimated: number | null
          id: string
          is_draft: boolean
          item_dimensions: string | null
          item_weight_kg: number | null
          location: string | null
          notes: string | null
          pickup_address: string
          price_is_manual: boolean
          pricing_type: string | null
          proof_photo: string | null
          quote_number: string | null
          recipient_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          send_complete: boolean
          send_day_prior: boolean
          send_en_route: boolean
          sequence: number | null
          signature: string | null
          status: string
          type: string
          valid_until: string | null
        }
        Insert: {
          container_job_id?: string | null
          container_size?: string | null
          disposal_amount?: number | null
          disposal_load?: string | null
          disposal_transport_amount?: number | null
          fuel_levy_pct_applied?: number | null
          labourers?: number | null
          legs_hours?: number | null
          packaging_amount?: number | null
          storage_days?: number | null
          storage_term?: string | null
          storage_tier?: string | null
          truck_size?: string | null
          warehouse_service?: string | null
          wh_labour_type?: string | null
          fuel_levy_mode?: string
          assigned_truck?: string | null
          completed_at?: string | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          completion_sms_sent_at?: string | null
          created_at?: string
          cubic_metres?: number | null
          customer_company_name?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          date: string
          day_prior_sms_sent_at?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          delivery_address: string
          distance_km?: number | null
          en_route_sms_sent_at?: string | null
          fee: number
          fuel_levy?: number
          google_calendar_event_id?: string | null
          gst_amount?: number | null
          hourly_rate?: number | null
          hours_estimated?: number | null
          id: string
          is_draft?: boolean
          item_dimensions?: string | null
          item_weight_kg?: number | null
          location?: string | null
          notes?: string | null
          pickup_address: string
          price_is_manual?: boolean
          pricing_type?: string | null
          proof_photo?: string | null
          quote_number?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          send_complete?: boolean
          send_day_prior?: boolean
          send_en_route?: boolean
          sequence?: number | null
          signature?: string | null
          status: string
          type: string
          valid_until?: string | null
        }
        Update: {
          container_job_id?: string | null
          container_size?: string | null
          disposal_amount?: number | null
          disposal_load?: string | null
          disposal_transport_amount?: number | null
          fuel_levy_pct_applied?: number | null
          labourers?: number | null
          legs_hours?: number | null
          packaging_amount?: number | null
          storage_days?: number | null
          storage_term?: string | null
          storage_tier?: string | null
          truck_size?: string | null
          warehouse_service?: string | null
          wh_labour_type?: string | null
          fuel_levy_mode?: string
          assigned_truck?: string | null
          completed_at?: string | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          completion_sms_sent_at?: string | null
          created_at?: string
          cubic_metres?: number | null
          customer_company_name?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          date?: string
          day_prior_sms_sent_at?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          delivery_address?: string
          distance_km?: number | null
          en_route_sms_sent_at?: string | null
          fee?: number
          fuel_levy?: number
          google_calendar_event_id?: string | null
          gst_amount?: number | null
          hourly_rate?: number | null
          hours_estimated?: number | null
          id?: string
          is_draft?: boolean
          item_dimensions?: string | null
          item_weight_kg?: number | null
          location?: string | null
          notes?: string | null
          pickup_address?: string
          price_is_manual?: boolean
          pricing_type?: string | null
          proof_photo?: string | null
          quote_number?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          send_complete?: boolean
          send_day_prior?: boolean
          send_en_route?: boolean
          sequence?: number | null
          signature?: string | null
          status?: string
          type?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          avatar: string
          content: string
          created_at: string
          id: string
          sender: string
          timestamp: string
          unread: boolean
        }
        Insert: {
          avatar: string
          content: string
          created_at?: string
          id: string
          sender: string
          timestamp: string
          unread?: boolean
        }
        Update: {
          avatar?: string
          content?: string
          created_at?: string
          id?: string
          sender?: string
          timestamp?: string
          unread?: boolean
        }
        Relationships: []
      }
      pricing_rates: {
        Row: {
          billing_increment_hours: number
          container_20ft_aud: number
          container_40ft_aud: number
          container_included_hours: number
          disposal_trailer_aud: number
          disposal_transport_aud: number
          disposal_transport_large_aud: number
          disposal_van_aud: number
          fuel_levy_on: boolean
          fuel_levy_pct: number
          hourly_rate_large_aud: number
          labour_min_hours: number
          labour_min_labourers: number
          labour_per_hour_aud: number
          short_term_uplift_pct: number
          storage_grace_days: number
          storage_high_end_aud: number
          storage_insured_aud: number
          storage_standard_aud: number
          wg_disposal_threshold_m3: number
          wh_labour_min_crew: number
          wh_labour_min_hours: number
          wh_labour_outbound_aud: number
          wh_labour_qc_aud: number
          wh_labour_unload_aud: number
          gst_percent: number
          hourly_rate_aud: number
          id: string
          metro_per_cube_aud: number
          minimum_hours: number
          regional_minimum_aud: number
          updated_at: string
          updated_by: string | null
          wg_metro_per_cube_aud: number
          wg_regional_minimum_aud: number
        }
        Insert: {
          billing_increment_hours?: number
          container_20ft_aud?: number
          container_40ft_aud?: number
          container_included_hours?: number
          disposal_trailer_aud?: number
          disposal_transport_aud?: number
          disposal_transport_large_aud?: number
          disposal_van_aud?: number
          fuel_levy_on?: boolean
          fuel_levy_pct?: number
          hourly_rate_large_aud?: number
          labour_min_hours?: number
          labour_min_labourers?: number
          labour_per_hour_aud?: number
          short_term_uplift_pct?: number
          storage_grace_days?: number
          storage_high_end_aud?: number
          storage_insured_aud?: number
          storage_standard_aud?: number
          wg_disposal_threshold_m3?: number
          wh_labour_min_crew?: number
          wh_labour_min_hours?: number
          wh_labour_outbound_aud?: number
          wh_labour_qc_aud?: number
          wh_labour_unload_aud?: number
          gst_percent?: number
          hourly_rate_aud?: number
          id?: string
          metro_per_cube_aud?: number
          minimum_hours?: number
          regional_minimum_aud?: number
          updated_at?: string
          updated_by?: string | null
          wg_metro_per_cube_aud?: number
          wg_regional_minimum_aud?: number
        }
        Update: {
          billing_increment_hours?: number
          container_20ft_aud?: number
          container_40ft_aud?: number
          container_included_hours?: number
          disposal_trailer_aud?: number
          disposal_transport_aud?: number
          disposal_transport_large_aud?: number
          disposal_van_aud?: number
          fuel_levy_on?: boolean
          fuel_levy_pct?: number
          hourly_rate_large_aud?: number
          labour_min_hours?: number
          labour_min_labourers?: number
          labour_per_hour_aud?: number
          short_term_uplift_pct?: number
          storage_grace_days?: number
          storage_high_end_aud?: number
          storage_insured_aud?: number
          storage_standard_aud?: number
          wg_disposal_threshold_m3?: number
          wh_labour_min_crew?: number
          wh_labour_min_hours?: number
          wh_labour_outbound_aud?: number
          wh_labour_qc_aud?: number
          wh_labour_unload_aud?: number
          gst_percent?: number
          hourly_rate_aud?: number
          id?: string
          metro_per_cube_aud?: number
          minimum_hours?: number
          regional_minimum_aud?: number
          updated_at?: string
          updated_by?: string | null
          wg_metro_per_cube_aud?: number
          wg_regional_minimum_aud?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          assigned_truck: string | null
          created_at: string
          email: string | null
          full_name: string | null
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          assigned_truck?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          assigned_truck?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      metro_postcodes: {
        Row: {
          created_at: string
          created_by: string | null
          note: string | null
          postcode: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          note?: string | null
          postcode: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          note?: string | null
          postcode?: number
        }
        Relationships: []
      }
      quote_number_counter: {
        Row: {
          next_number: number
          year: number
        }
        Insert: {
          next_number?: number
          year: number
        }
        Update: {
          next_number?: number
          year?: number
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          created_at: string
          customer_id: string | null
          direction: string
          error_message: string | null
          id: string
          job_id: string | null
          message_body: string
          parent_message_sid: string | null
          provider_message_id: string | null
          read_at: string | null
          recipient_name: string
          recipient_phone: string
          sent_at: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          message_body: string
          parent_message_sid?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient_name: string
          recipient_phone: string
          sent_at?: string
          status: string
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          message_body?: string
          parent_message_sid?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          builtin: boolean
          created_at: string
          default_duration_minutes: number | null
          default_rate: number | null
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          builtin?: boolean
          created_at?: string
          default_duration_minutes?: number | null
          default_rate?: number | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          builtin?: boolean
          created_at?: string
          default_duration_minutes?: number | null
          default_rate?: number | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to_driver_id: string | null
          assigned_to_driver_name: string | null
          completed_at: string | null
          completed_by_driver_id: string | null
          completed_by_driver_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          kind: string
          scheduled_date: string
          sequence: number | null
          title: string
          truck_name: string
        }
        Insert: {
          assigned_to_driver_id?: string | null
          assigned_to_driver_name?: string | null
          completed_at?: string | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          kind?: string
          scheduled_date: string
          sequence?: number | null
          title: string
          truck_name: string
        }
        Update: {
          assigned_to_driver_id?: string | null
          assigned_to_driver_name?: string | null
          completed_at?: string | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          kind?: string
          scheduled_date?: string
          sequence?: number | null
          title?: string
          truck_name?: string
        }
        Relationships: []
      }
      storage_records: {
        Row: {
          actual_out_date: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          deleted_at: string | null
          id: string
          in_date: string
          items_description: string
          monthly_rate: number | null
          notes: string | null
          planned_out_date: string | null
          updated_at: string
        }
        Insert: {
          actual_out_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          deleted_at?: string | null
          id?: string
          in_date: string
          items_description: string
          monthly_rate?: number | null
          notes?: string | null
          planned_out_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_out_date?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          deleted_at?: string | null
          id?: string
          in_date?: string
          items_description?: string
          monthly_rate?: number | null
          notes?: string | null
          planned_out_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_shifts: {
        Row: {
          created_at: string
          driver_name: string
          driver_user_id: string | null
          ended_at: string
          id: string
          job_count: number
          shift_date: string
          started_at: string
          truck_name: string
        }
        Insert: {
          created_at?: string
          driver_name: string
          driver_user_id?: string | null
          ended_at?: string
          id?: string
          job_count?: number
          shift_date: string
          started_at?: string
          truck_name: string
        }
        Update: {
          created_at?: string
          driver_name?: string
          driver_user_id?: string | null
          ended_at?: string
          id?: string
          job_count?: number
          shift_date?: string
          started_at?: string
          truck_name?: string
        }
        Relationships: []
      }
      truck_credentials: {
        Row: {
          truck_id: string
          password: string
          updated_at: string
        }
        Insert: {
          truck_id: string
          password: string
          updated_at?: string
        }
        Update: {
          truck_id?: string
          password?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_credentials_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: true
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      current_user_truck: { Args: never; Returns: string }
      find_repeat_customer: {
        Args: { p_phone: string }
        Returns: {
          customer_name: string
          job_count: number
          last_delivery: string
          last_job_date: string
          last_pickup: string
          override_hourly_rate: number
          override_metro_rate: number
        }[]
      }
      is_owner: { Args: never; Returns: boolean }
      record_job_completion: {
        Args: { p_driver_id: string; p_driver_name: string; p_job_id: string }
        Returns: undefined
      }
      upsert_customer_by_phone: {
        Args: {
          p_email?: string
          p_name: string
          p_phone?: string
          p_source?: string
        }
        Returns: string
      }
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
