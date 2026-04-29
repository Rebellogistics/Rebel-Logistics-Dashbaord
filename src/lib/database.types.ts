export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobStatusDb =
  | 'Quote'
  | 'Accepted'
  | 'Scheduled'
  | 'Notified'
  | 'In Delivery'
  | 'Completed'
  | 'Invoiced'
  | 'Declined'

export type PricingTypeDb = 'fixed' | 'hourly'
export type JobLocationDb = 'Metro' | 'Regional'

export type SmsTypeDb = 'day_prior' | 'en_route' | 'other'
export type SmsStatusDb = 'sent' | 'failed' | 'pending'
export type CustomerTypeDb = 'individual' | 'company'
export type UserRoleDb = 'owner' | 'driver' | 'dispatcher' | 'admin' | 'pending'

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          pickup_address: string
          delivery_address: string
          type: 'Standard' | 'White Glove' | 'House Move'
          status: JobStatusDb
          date: string
          assigned_truck: string | null
          notes: string | null
          proof_photo: string | null
          signature: string | null
          fee: number
          fuel_levy: number
          item_weight_kg: number | null
          item_dimensions: string | null
          distance_km: number | null
          pricing_type: PricingTypeDb | null
          hourly_rate: number | null
          hours_estimated: number | null
          decline_reason: string | null
          day_prior_sms_sent_at: string | null
          en_route_sms_sent_at: string | null
          customer_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_address: string | null
          location: JobLocationDb | null
          cubic_metres: number | null
          quote_number: string | null
          valid_until: string | null
          is_draft: boolean
          gst_amount: number | null
          completed_by_driver_id: string | null
          completed_by_driver_name: string | null
          completed_at: string | null
          google_calendar_event_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          customer_phone: string
          pickup_address: string
          delivery_address: string
          type: 'Standard' | 'White Glove' | 'House Move'
          status: JobStatusDb
          date: string
          assigned_truck?: string | null
          notes?: string | null
          proof_photo?: string | null
          signature?: string | null
          fee: number
          fuel_levy: number
          item_weight_kg?: number | null
          item_dimensions?: string | null
          distance_km?: number | null
          pricing_type?: PricingTypeDb | null
          hourly_rate?: number | null
          hours_estimated?: number | null
          decline_reason?: string | null
          day_prior_sms_sent_at?: string | null
          en_route_sms_sent_at?: string | null
          customer_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_address?: string | null
          location?: JobLocationDb | null
          cubic_metres?: number | null
          quote_number?: string | null
          valid_until?: string | null
          is_draft?: boolean
          gst_amount?: number | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          completed_at?: string | null
          google_calendar_event_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          pickup_address?: string
          delivery_address?: string
          type?: 'Standard' | 'White Glove' | 'House Move'
          status?: JobStatusDb
          date?: string
          assigned_truck?: string | null
          notes?: string | null
          proof_photo?: string | null
          signature?: string | null
          fee?: number
          fuel_levy?: number
          item_weight_kg?: number | null
          item_dimensions?: string | null
          distance_km?: number | null
          pricing_type?: PricingTypeDb | null
          hourly_rate?: number | null
          hours_estimated?: number | null
          decline_reason?: string | null
          day_prior_sms_sent_at?: string | null
          en_route_sms_sent_at?: string | null
          customer_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_address?: string | null
          location?: JobLocationDb | null
          cubic_metres?: number | null
          quote_number?: string | null
          valid_until?: string | null
          is_draft?: boolean
          gst_amount?: number | null
          completed_by_driver_id?: string | null
          completed_by_driver_name?: string | null
          completed_at?: string | null
          google_calendar_event_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sms_log: {
        Row: {
          id: string
          job_id: string | null
          type: SmsTypeDb
          recipient_name: string
          recipient_phone: string
          message_body: string
          status: SmsStatusDb
          sent_at: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          type: SmsTypeDb
          recipient_name: string
          recipient_phone: string
          message_body: string
          status: SmsStatusDb
          sent_at?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          type?: SmsTypeDb
          recipient_name?: string
          recipient_phone?: string
          message_body?: string
          status?: SmsStatusDb
          sent_at?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          type: CustomerTypeDb
          company_name: string | null
          abn: string | null
          source: string | null
          notes: string | null
          vip: boolean
          total_jobs: number
          total_spent: number
          last_job_date: string | null
          avatar: string | null
          override_metro_rate: number | null
          override_hourly_rate: number | null
          import_batch: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          type?: CustomerTypeDb
          company_name?: string | null
          abn?: string | null
          source?: string | null
          notes?: string | null
          vip?: boolean
          total_jobs?: number
          total_spent?: number
          last_job_date?: string | null
          avatar?: string | null
          override_metro_rate?: number | null
          override_hourly_rate?: number | null
          import_batch?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          type?: CustomerTypeDb
          company_name?: string | null
          abn?: string | null
          source?: string | null
          notes?: string | null
          vip?: boolean
          total_jobs?: number
          total_spent?: number
          last_job_date?: string | null
          avatar?: string | null
          override_metro_rate?: number | null
          override_hourly_rate?: number | null
          import_batch?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          user_id: string
          role: UserRoleDb
          full_name: string | null
          email: string | null
          phone: string | null
          assigned_truck: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          role?: UserRoleDb
          full_name?: string | null
          email?: string | null
          phone?: string | null
          assigned_truck?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: UserRoleDb
          full_name?: string | null
          email?: string | null
          phone?: string | null
          assigned_truck?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          id: string
          name: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      job_photos: {
        Row: {
          id: string
          job_id: string
          storage_path: string
          caption: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          storage_path: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          storage_path?: string
          caption?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender: string
          content: string
          timestamp: string
          unread: boolean
          avatar: string
          created_at: string
        }
        Insert: {
          id?: string
          sender: string
          content: string
          timestamp: string
          unread?: boolean
          avatar: string
          created_at?: string
        }
        Update: {
          id?: string
          sender?: string
          content?: string
          timestamp?: string
          unread?: boolean
          avatar?: string
          created_at?: string
        }
        Relationships: []
      }
      truck_shifts: {
        Row: {
          id: string
          truck_name: string
          driver_user_id: string | null
          driver_name: string
          shift_date: string
          started_at: string
          ended_at: string
          job_count: number
          created_at: string
        }
        Insert: {
          id?: string
          truck_name: string
          driver_user_id?: string | null
          driver_name: string
          shift_date: string
          started_at?: string
          ended_at?: string
          job_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          truck_name?: string
          driver_user_id?: string | null
          driver_name?: string
          shift_date?: string
          started_at?: string
          ended_at?: string
          job_count?: number
          created_at?: string
        }
        Relationships: []
      }
      job_history: {
        Row: {
          id: string
          job_id: string
          field: string
          old_value: string | null
          new_value: string | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          job_id: string
          field: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          field?: string
          old_value?: string | null
          new_value?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: []
      }
      pricing_rates: {
        Row: {
          id: string
          metro_per_cube_aud: number
          regional_minimum_aud: number
          hourly_rate_aud: number
          minimum_hours: number
          gst_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          metro_per_cube_aud?: number
          regional_minimum_aud?: number
          hourly_rate_aud?: number
          minimum_hours?: number
          gst_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          metro_per_cube_aud?: number
          regional_minimum_aud?: number
          hourly_rate_aud?: number
          minimum_hours?: number
          gst_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_customer_by_phone: {
        Args: {
          p_name: string
          p_phone?: string | null
          p_email?: string | null
          p_source?: string | null
        }
        Returns: string
      }
      find_repeat_customer: {
        Args: { p_phone: string }
        Returns: {
          customer_name: string
          job_count: number
          last_job_date: string
          last_pickup: string
          last_delivery: string
          override_metro_rate: number | null
          override_hourly_rate: number | null
        }[]
      }
      is_owner: {
        Args: Record<string, never>
        Returns: boolean
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      current_user_truck: {
        Args: Record<string, never>
        Returns: string
      }
      record_job_completion: {
        Args: {
          p_job_id: string
          p_driver_id: string | null
          p_driver_name: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
