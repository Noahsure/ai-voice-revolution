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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agent_performance: {
        Row: {
          agent_id: string | null
          average_call_duration: unknown | null
          conversion_rate: number | null
          cost_per_lead_cents: number | null
          created_at: string | null
          date: string
          id: string
          quality_score: number | null
          revenue_generated_cents: number | null
          successful_calls: number | null
          total_calls: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          average_call_duration?: unknown | null
          conversion_rate?: number | null
          cost_per_lead_cents?: number | null
          created_at?: string | null
          date: string
          id?: string
          quality_score?: number | null
          revenue_generated_cents?: number | null
          successful_calls?: number | null
          total_calls?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          average_call_duration?: unknown | null
          conversion_rate?: number | null
          cost_per_lead_cents?: number | null
          created_at?: string | null
          date?: string
          id?: string
          quality_score?: number | null
          revenue_generated_cents?: number | null
          successful_calls?: number | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          avg_call_duration: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          knowledge_base: string | null
          language: string | null
          max_call_duration: number | null
          name: string
          objection_handlers: Json | null
          opening_message: string
          personality: string | null
          purpose: string | null
          success_rate: number | null
          system_prompt: string
          type: string | null
          updated_at: string | null
          user_id: string | null
          voice_id: string
        }
        Insert: {
          avg_call_duration?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          language?: string | null
          max_call_duration?: number | null
          name: string
          objection_handlers?: Json | null
          opening_message: string
          personality?: string | null
          purpose?: string | null
          success_rate?: number | null
          system_prompt: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_id: string
        }
        Update: {
          avg_call_duration?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          language?: string | null
          max_call_duration?: number | null
          name?: string
          objection_handlers?: Json | null
          opening_message?: string
          personality?: string | null
          purpose?: string | null
          success_rate?: number | null
          system_prompt?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      call_monitoring: {
        Row: {
          call_record_id: string | null
          created_at: string | null
          health_score: number | null
          id: string
          last_heartbeat: string | null
          status: string
          timeout_threshold: unknown | null
          twilio_call_sid: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          call_record_id?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_heartbeat?: string | null
          status: string
          timeout_threshold?: unknown | null
          twilio_call_sid?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          call_record_id?: string | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          last_heartbeat?: string | null
          status?: string
          timeout_threshold?: unknown | null
          twilio_call_sid?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_quality_scores: {
        Row: {
          call_record_id: string | null
          compliance_score: number | null
          created_at: string | null
          engagement_score: number | null
          feedback_notes: string | null
          id: string
          overall_score: number | null
          quality_flags: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          script_adherence_score: number | null
          tone_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          call_record_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          feedback_notes?: string | null
          id?: string
          overall_score?: number | null
          quality_flags?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          script_adherence_score?: number | null
          tone_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          call_record_id?: string | null
          compliance_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          feedback_notes?: string | null
          id?: string
          overall_score?: number | null
          quality_flags?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          script_adherence_score?: number | null
          tone_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_quality_scores_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queue: {
        Row: {
          agent_id: string | null
          attempts: number | null
          campaign_id: string
          completed_at: string | null
          contact_id: string
          created_at: string | null
          error_message: string | null
          id: string
          max_attempts: number | null
          priority: number | null
          processing_started_at: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          attempts?: number | null
          campaign_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          processing_started_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          attempts?: number | null
          campaign_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          priority?: number | null
          processing_started_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_records: {
        Row: {
          agent_id: string | null
          ai_summary: string | null
          call_direction: string | null
          call_outcome: string | null
          call_status: string | null
          campaign_id: string | null
          contact_id: string | null
          cost_cents: number | null
          created_at: string
          duration_seconds: number | null
          end_time: string | null
          error_message: string | null
          failure_reason: string | null
          id: string
          last_error_at: string | null
          next_retry_at: string | null
          phone_number: string
          recording_url: string | null
          retry_count: number | null
          sentiment_score: number | null
          start_time: string | null
          transcript: string | null
          twilio_call_sid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          ai_summary?: string | null
          call_direction?: string | null
          call_outcome?: string | null
          call_status?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          error_message?: string | null
          failure_reason?: string | null
          id?: string
          last_error_at?: string | null
          next_retry_at?: string | null
          phone_number: string
          recording_url?: string | null
          retry_count?: number | null
          sentiment_score?: number | null
          start_time?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          ai_summary?: string | null
          call_direction?: string | null
          call_outcome?: string | null
          call_status?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          cost_cents?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          error_message?: string | null
          failure_reason?: string | null
          id?: string
          last_error_at?: string | null
          next_retry_at?: string | null
          phone_number?: string
          recording_url?: string | null
          retry_count?: number | null
          sentiment_score?: number | null
          start_time?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_records_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          appointments_booked: number | null
          calls_attempted: number | null
          calls_completed: number | null
          calls_connected: number | null
          campaign_id: string | null
          cold_leads: number | null
          conversion_rate: number | null
          cost_total_cents: number | null
          created_at: string | null
          date: string
          hot_leads: number | null
          id: string
          sales_closed: number | null
          total_talk_time: unknown | null
          updated_at: string | null
          user_id: string
          warm_leads: number | null
        }
        Insert: {
          appointments_booked?: number | null
          calls_attempted?: number | null
          calls_completed?: number | null
          calls_connected?: number | null
          campaign_id?: string | null
          cold_leads?: number | null
          conversion_rate?: number | null
          cost_total_cents?: number | null
          created_at?: string | null
          date: string
          hot_leads?: number | null
          id?: string
          sales_closed?: number | null
          total_talk_time?: unknown | null
          updated_at?: string | null
          user_id: string
          warm_leads?: number | null
        }
        Update: {
          appointments_booked?: number | null
          calls_attempted?: number | null
          calls_completed?: number | null
          calls_connected?: number | null
          campaign_id?: string | null
          cold_leads?: number | null
          conversion_rate?: number | null
          cost_total_cents?: number | null
          created_at?: string | null
          date?: string
          hot_leads?: number | null
          id?: string
          sales_closed?: number | null
          total_talk_time?: unknown | null
          updated_at?: string | null
          user_id?: string
          warm_leads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agent_id: string | null
          completed_calls: number | null
          created_at: string | null
          id: string
          name: string
          status: string | null
          success_rate: number | null
          total_contacts: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          completed_calls?: number | null
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          success_rate?: number | null
          total_contacts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          completed_calls?: number | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          success_rate?: number | null
          total_contacts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contacts: {
        Row: {
          call_attempts: number | null
          call_result: string | null
          call_status: string | null
          campaign_id: string | null
          company: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          first_name: string | null
          id: string
          last_called_at: string | null
          last_name: string | null
          next_call_at: string | null
          notes: string | null
          phone_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          call_attempts?: number | null
          call_result?: string | null
          call_status?: string | null
          campaign_id?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_called_at?: string | null
          last_name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          call_attempts?: number | null
          call_result?: string | null
          call_status?: string | null
          campaign_id?: string | null
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_called_at?: string | null
          last_name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          features: Json | null
          max_agents: number
          max_call_minutes: number
          max_campaigns: number
          max_contacts: number
          plan_type: string
          price_monthly_gbp: number
          price_yearly_gbp: number
        }
        Insert: {
          features?: Json | null
          max_agents: number
          max_call_minutes: number
          max_campaigns: number
          max_contacts: number
          plan_type: string
          price_monthly_gbp: number
          price_yearly_gbp: number
        }
        Update: {
          features?: Json | null
          max_agents?: number
          max_call_minutes?: number
          max_campaigns?: number
          max_contacts?: number
          plan_type?: string
          price_monthly_gbp?: number
          price_yearly_gbp?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          plan_type: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          plan_type?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          plan_type?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          agents_created: number | null
          call_minutes_used: number | null
          campaigns_active: number | null
          contacts_uploaded: number | null
          created_at: string | null
          id: string
          month_year: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agents_created?: number | null
          call_minutes_used?: number | null
          campaigns_active?: number | null
          contacts_uploaded?: number | null
          created_at?: string | null
          id?: string
          month_year: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agents_created?: number | null
          call_minutes_used?: number | null
          campaigns_active?: number | null
          contacts_uploaded?: number | null
          created_at?: string | null
          id?: string
          month_year?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_retry: {
        Args: { retry_count: number }
        Returns: string
      }
      get_call_system_health: {
        Args: { user_uuid: string }
        Returns: {
          active_calls: number
          avg_retry_count: number
          failed_calls: number
          retry_calls: number
          success_rate: number
          total_calls: number
        }[]
      }
      handle_call_failure: {
        Args: {
          call_record_id: string
          error_message?: string
          failure_reason?: string
        }
        Returns: undefined
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
