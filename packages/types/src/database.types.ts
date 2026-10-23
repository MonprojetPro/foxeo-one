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
      activity_logs: {
        Row: {
          action: string
          actor_id: string
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          permissions: string[]
          revoked_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
          revoked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          revoked_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      billable_items: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string | null
          id: string
          invoiced_at: string | null
          item_type: string
          label: string
          meeting_id: string | null
          pennylane_invoice_id: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string | null
          id?: string
          invoiced_at?: string | null
          item_type: string
          label: string
          meeting_id?: string | null
          pennylane_invoice_id?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string | null
          id?: string
          invoiced_at?: string | null
          item_type?: string
          label?: string
          meeting_id?: string | null
          pennylane_invoice_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billable_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_sync: {
        Row: {
          amount: number | null
          client_id: string | null
          created_at: string
          data: Json
          entity_type: string
          id: string
          last_sent_at: string | null
          last_synced_at: string
          pennylane_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          data: Json
          entity_type: string
          id?: string
          last_sent_at?: string | null
          last_synced_at?: string
          pennylane_id: string
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          created_at?: string
          data?: Json
          entity_type?: string
          id?: string
          last_sent_at?: string | null
          last_synced_at?: string
          pennylane_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_sync_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_sync_state: {
        Row: {
          consecutive_errors: number
          entity_type: string
          last_error: string | null
          last_sync_at: string
          updated_at: string
        }
        Insert: {
          consecutive_errors?: number
          entity_type: string
          last_error?: string | null
          last_sync_at?: string
          updated_at?: string
        }
        Update: {
          consecutive_errors?: number
          entity_type?: string
          last_error?: string | null
          last_sync_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      calcom_bookings: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          calcom_booking_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          raw_payload: Json
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          calcom_booking_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          raw_payload?: Json
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          calcom_booking_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          raw_payload?: Json
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          color: string
          connected: boolean
          created_at: string
          id: string
          label: string
          metadata: Json
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          color?: string
          connected?: boolean
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          color?: string
          connected?: boolean
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cii_imports: {
        Row: {
          client_id: string
          client_project_id: string | null
          created_at: string
          file_name: string
          id: string
          raw_content: string
          tjm_euros: number
          updated_at: string
        }
        Insert: {
          client_id: string
          client_project_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          raw_content: string
          tjm_euros?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_project_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          raw_content?: string
          tjm_euros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cii_imports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cii_imports_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cii_reformulation_lines: {
        Row: {
          created_at: string
          function_name: string
          id: string
          import_id: string
          order_index: number
          reformulated_text: string | null
          status: string
          time_days: number | null
          time_raw: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          import_id: string
          order_index?: number
          reformulated_text?: string | null
          status?: string
          time_days?: number | null
          time_raw?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          import_id?: string
          order_index?: number
          reformulated_text?: string | null
          status?: string
          time_days?: number | null
          time_raw?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cii_reformulation_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "cii_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      client_concierge_messages: {
        Row: {
          agent_label: string | null
          answer_choice: string | null
          answered_at: string | null
          body: string
          client_id: string
          created_at: string
          dashboard_context: string
          event_type: string
          id: string
          notification_id: string | null
          source: string
        }
        Insert: {
          agent_label?: string | null
          answer_choice?: string | null
          answered_at?: string | null
          body: string
          client_id: string
          created_at?: string
          dashboard_context?: string
          event_type: string
          id?: string
          notification_id?: string | null
          source?: string
        }
        Update: {
          agent_label?: string | null
          answer_choice?: string | null
          answered_at?: string | null
          body?: string
          client_id?: string
          created_at?: string
          dashboard_context?: string
          event_type?: string
          id?: string
          notification_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_concierge_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_configs: {
        Row: {
          active_modules: string[]
          client_id: string
          coaching_monthly_credits: number
          created_at: string
          custom_branding: Json
          dashboard_type: string
          deposit_paid_at: string | null
          elio_alerts_preferences: Json | null
          elio_config: Json
          elio_lab_enabled: boolean
          elio_module_docs: Json
          elio_proactive_alerts: boolean | null
          elio_tier: string | null
          final_payment_at: string | null
          graduation_source: string | null
          inactivity_alert_sent: boolean
          lab_mode_available: boolean
          modules_documentation: Json | null
          one_mode_available: boolean
          one_status: string
          operator_id: string
          parcours_config: Json
          parcours_mode: string
          pending_billing_update: boolean | null
          show_lab_teasing: boolean
          subscription_tier: string | null
          theme_variant: string | null
          tier_changed_at: string | null
          updated_at: string
        }
        Insert: {
          active_modules?: string[]
          client_id: string
          coaching_monthly_credits?: number
          created_at?: string
          custom_branding?: Json
          dashboard_type?: string
          deposit_paid_at?: string | null
          elio_alerts_preferences?: Json | null
          elio_config?: Json
          elio_lab_enabled?: boolean
          elio_module_docs?: Json
          elio_proactive_alerts?: boolean | null
          elio_tier?: string | null
          final_payment_at?: string | null
          graduation_source?: string | null
          inactivity_alert_sent?: boolean
          lab_mode_available?: boolean
          modules_documentation?: Json | null
          one_mode_available?: boolean
          one_status?: string
          operator_id: string
          parcours_config?: Json
          parcours_mode?: string
          pending_billing_update?: boolean | null
          show_lab_teasing?: boolean
          subscription_tier?: string | null
          theme_variant?: string | null
          tier_changed_at?: string | null
          updated_at?: string
        }
        Update: {
          active_modules?: string[]
          client_id?: string
          coaching_monthly_credits?: number
          created_at?: string
          custom_branding?: Json
          dashboard_type?: string
          deposit_paid_at?: string | null
          elio_alerts_preferences?: Json | null
          elio_config?: Json
          elio_lab_enabled?: boolean
          elio_module_docs?: Json
          elio_proactive_alerts?: boolean | null
          elio_tier?: string | null
          final_payment_at?: string | null
          graduation_source?: string | null
          inactivity_alert_sent?: boolean
          lab_mode_available?: boolean
          modules_documentation?: Json | null
          one_mode_available?: boolean
          one_status?: string
          operator_id?: string
          parcours_config?: Json
          parcours_mode?: string
          pending_billing_update?: boolean | null
          show_lab_teasing?: boolean
          subscription_tier?: string | null
          theme_variant?: string | null
          tier_changed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_configs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          note: string | null
          operator_id: string
          receives_invoices: boolean
          show_on_invoice: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          note?: string | null
          operator_id: string
          receives_invoices?: boolean
          show_on_invoice?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          note?: string | null
          operator_id?: string
          receives_invoices?: boolean
          show_on_invoice?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      client_handoffs: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_log: Json
          github_repo_url: string | null
          handoff_type: string
          id: string
          started_at: string
          status: string
          supabase_anon_key: string | null
          supabase_project_url: string | null
          supabase_service_role_key: string | null
          supabase_url: string | null
          updated_at: string
          vercel_project_id: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_log?: Json
          github_repo_url?: string | null
          handoff_type: string
          id?: string
          started_at?: string
          status?: string
          supabase_anon_key?: string | null
          supabase_project_url?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          vercel_project_id?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_log?: Json
          github_repo_url?: string | null
          handoff_type?: string
          id?: string
          started_at?: string
          status?: string
          supabase_anon_key?: string | null
          supabase_project_url?: string | null
          supabase_service_role_key?: string | null
          supabase_url?: string | null
          updated_at?: string
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_handoffs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_instances: {
        Row: {
          activated_at: string | null
          active_modules: string[]
          alert_level: string | null
          client_id: string
          created_at: string
          id: string
          instance_url: string
          last_health_check: string | null
          metadata: Json
          slug: string
          status: string
          supabase_project_id: string | null
          tier: string
          transferred_at: string | null
          updated_at: string
          usage_metrics: Json | null
          vercel_project_id: string | null
        }
        Insert: {
          activated_at?: string | null
          active_modules?: string[]
          alert_level?: string | null
          client_id: string
          created_at?: string
          id?: string
          instance_url: string
          last_health_check?: string | null
          metadata?: Json
          slug: string
          status: string
          supabase_project_id?: string | null
          tier: string
          transferred_at?: string | null
          updated_at?: string
          usage_metrics?: Json | null
          vercel_project_id?: string | null
        }
        Update: {
          activated_at?: string | null
          active_modules?: string[]
          alert_level?: string | null
          client_id?: string
          created_at?: string
          id?: string
          instance_url?: string
          last_health_check?: string | null
          metadata?: Json
          slug?: string
          status?: string
          supabase_project_id?: string | null
          tier?: string
          transferred_at?: string | null
          updated_at?: string
          usage_metrics?: Json | null
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_lab_exports: {
        Row: {
          brief_count: number
          chat_count: number
          client_id: string
          created_at: string
          document_count: number
          downloaded_at: string | null
          expires_at: string
          generated_at: string
          id: string
          updated_at: string
          zip_url: string
        }
        Insert: {
          brief_count?: number
          chat_count?: number
          client_id: string
          created_at?: string
          document_count?: number
          downloaded_at?: string | null
          expires_at: string
          generated_at?: string
          id?: string
          updated_at?: string
          zip_url: string
        }
        Update: {
          brief_count?: number
          chat_count?: number
          client_id?: string
          created_at?: string
          document_count?: number
          downloaded_at?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          updated_at?: string
          zip_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_lab_exports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          operator_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          operator_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          operator_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      client_parcours_agents: {
        Row: {
          client_id: string
          created_at: string
          elio_lab_agent_id: string
          id: string
          is_enabled: boolean
          status: string
          step_label: string
          step_order: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          elio_lab_agent_id: string
          id?: string
          is_enabled?: boolean
          status?: string
          step_label: string
          step_order: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          elio_lab_agent_id?: string
          id?: string
          is_enabled?: boolean
          status?: string
          step_label?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_parcours_agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_parcours_agents_elio_lab_agent_id_fkey"
            columns: ["elio_lab_agent_id"]
            isOneToOne: false
            referencedRelation: "elio_lab_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_step_contexts: {
        Row: {
          client_id: string
          client_parcours_agent_id: string | null
          consumed_at: string | null
          content_type: string
          context_message: string
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          step_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          client_parcours_agent_id?: string | null
          consumed_at?: string | null
          content_type?: string
          context_message: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          step_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_parcours_agent_id?: string | null
          consumed_at?: string | null
          content_type?: string
          context_message?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          step_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_step_contexts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_step_contexts_client_parcours_agent_id_fkey"
            columns: ["client_parcours_agent_id"]
            isOneToOne: false
            referencedRelation: "client_parcours_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_step_contexts_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "parcours_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          auth_user_id: string | null
          avatar_url: string | null
          billing_address: string | null
          billing_city: string | null
          billing_country_alpha2: string | null
          billing_postal_code: string | null
          client_kind: string
          client_type: string
          company: string | null
          contact: string | null
          created_at: string
          deferred_until: string | null
          email: string
          email_notifications_enabled: boolean
          first_login_at: string | null
          first_name: string | null
          graduated_at: string | null
          graduation_message: string | null
          graduation_notes: string | null
          graduation_screen_shown: boolean
          hub_seen_at: string | null
          id: string
          is_demo: boolean
          is_pinned: boolean
          lab_amount: number | null
          lab_invoice_sent_at: string | null
          lab_paid: boolean | null
          lab_paid_at: string | null
          lead_message: string | null
          naf_code: string | null
          name: string
          notes: string | null
          onboarding_completed: boolean
          operator_id: string
          password_change_required: boolean
          pennylane_customer_id: string | null
          phone: string | null
          previous_status: string | null
          project_status: string | null
          project_type: string | null
          prospect_stage: string | null
          retention_until: string | null
          sector: string | null
          siret: string | null
          status: string
          suspended_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country_alpha2?: string | null
          billing_postal_code?: string | null
          client_kind?: string
          client_type: string
          company?: string | null
          contact?: string | null
          created_at?: string
          deferred_until?: string | null
          email: string
          email_notifications_enabled?: boolean
          first_login_at?: string | null
          first_name?: string | null
          graduated_at?: string | null
          graduation_message?: string | null
          graduation_notes?: string | null
          graduation_screen_shown?: boolean
          hub_seen_at?: string | null
          id?: string
          is_demo?: boolean
          is_pinned?: boolean
          lab_amount?: number | null
          lab_invoice_sent_at?: string | null
          lab_paid?: boolean | null
          lab_paid_at?: string | null
          lead_message?: string | null
          naf_code?: string | null
          name: string
          notes?: string | null
          onboarding_completed?: boolean
          operator_id: string
          password_change_required?: boolean
          pennylane_customer_id?: string | null
          phone?: string | null
          previous_status?: string | null
          project_status?: string | null
          project_type?: string | null
          prospect_stage?: string | null
          retention_until?: string | null
          sector?: string | null
          siret?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country_alpha2?: string | null
          billing_postal_code?: string | null
          client_kind?: string
          client_type?: string
          company?: string | null
          contact?: string | null
          created_at?: string
          deferred_until?: string | null
          email?: string
          email_notifications_enabled?: boolean
          first_login_at?: string | null
          first_name?: string | null
          graduated_at?: string | null
          graduation_message?: string | null
          graduation_notes?: string | null
          graduation_screen_shown?: boolean
          hub_seen_at?: string | null
          id?: string
          is_demo?: boolean
          is_pinned?: boolean
          lab_amount?: number | null
          lab_invoice_sent_at?: string | null
          lab_paid?: boolean | null
          lab_paid_at?: string | null
          lead_message?: string | null
          naf_code?: string | null
          name?: string
          notes?: string | null
          onboarding_completed?: boolean
          operator_id?: string
          password_change_required?: boolean
          pennylane_customer_id?: string | null
          phone?: string | null
          previous_status?: string | null
          project_status?: string | null
          project_type?: string | null
          prospect_stage?: string | null
          retention_until?: string | null
          sector?: string | null
          siret?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_credit_ledger: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string
          delta: number
          id: string
          meeting_id: string | null
          note: string | null
          reason: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string
          delta: number
          id?: string
          meeting_id?: string | null
          note?: string | null
          reason: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string
          delta?: number
          id?: string
          meeting_id?: string | null
          note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_credit_ledger_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_credit_ledger_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_reminders: {
        Row: {
          channel: string | null
          client_id: string
          created_at: string | null
          generated_body: string | null
          id: string
          invoice_amount: number
          invoice_date: string
          invoice_id: string
          invoice_number: string
          reminder_level: number
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          client_id: string
          created_at?: string | null
          generated_body?: string | null
          id?: string
          invoice_amount: number
          invoice_date: string
          invoice_id: string
          invoice_number: string
          reminder_level: number
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          client_id?: string
          created_at?: string | null
          generated_body?: string | null
          id?: string
          invoice_amount?: number
          invoice_date?: string
          invoice_id?: string
          invoice_number?: string
          reminder_level?: number
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_profiles: {
        Row: {
          client_id: string
          context_preferences: Json | null
          created_at: string
          id: string
          interaction_style: string
          preferred_length: string
          preferred_tone: string
          updated_at: string
        }
        Insert: {
          client_id: string
          context_preferences?: Json | null
          created_at?: string
          id?: string
          interaction_style?: string
          preferred_length?: string
          preferred_tone?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          context_preferences?: Json | null
          created_at?: string
          id?: string
          interaction_style?: string
          preferred_length?: string
          preferred_tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted: boolean
          client_id: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          version: string
        }
        Insert: {
          accepted: boolean
          client_id: string
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          version: string
        }
        Update: {
          accepted?: boolean
          client_id?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          requested_by: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          requested_by: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          requested_by?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          operator_id: string
          parent_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          operator_id: string
          parent_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          operator_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string
          client_project_id: string | null
          created_at: string
          deleted_at: string | null
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
          id: string
          last_synced_at: string | null
          name: string
          operator_id: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
          visibility: string
        }
        Insert: {
          client_id: string
          client_project_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          operator_id: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
          visibility?: string
        }
        Update: {
          client_id?: string
          client_project_id?: string | null
          created_at?: string
          deleted_at?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          operator_id?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_project_id_fkey"
            columns: ["client_project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_documents_folder_id"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      elio_config_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          client_id: string
          field_changed: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          client_id: string
          field_changed: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          client_id?: string
          field_changed?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "elio_config_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      elio_configs: {
        Row: {
          client_id: string
          created_at: string
          custom_instructions: string | null
          enabled_features: Json | null
          id: string
          max_tokens: number
          model: string
          temperature: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_instructions?: string | null
          enabled_features?: Json | null
          id?: string
          max_tokens?: number
          model?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_instructions?: string | null
          enabled_features?: Json | null
          id?: string
          max_tokens?: number
          model?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elio_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      elio_conversations: {
        Row: {
          created_at: string | null
          dashboard_type: string
          id: string
          step_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dashboard_type: string
          id?: string
          step_id?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dashboard_type?: string
          id?: string
          step_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      elio_hub_actions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          decided_at: string | null
          error: string | null
          executed_at: string | null
          id: string
          operator_id: string
          result: Json | null
          status: string
          summary: string
          tool_input: Json
          tool_name: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          operator_id: string
          result?: Json | null
          status?: string
          summary: string
          tool_input: Json
          tool_name: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          decided_at?: string | null
          error?: string | null
          executed_at?: string | null
          id?: string
          operator_id?: string
          result?: Json | null
          status?: string
          summary?: string
          tool_input?: Json
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "elio_hub_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "elio_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elio_hub_actions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      elio_lab_agents: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          file_path: string
          id: string
          image_path: string | null
          model: string
          name: string
          sort_order: number
          system_prompt: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          image_path?: string | null
          model?: string
          name: string
          sort_order?: number
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          image_path?: string | null
          model?: string
          name?: string
          sort_order?: number
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      elio_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "elio_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "elio_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      elio_token_usage: {
        Row: {
          client_id: string | null
          conversation_id: string | null
          cost_eur: number
          created_at: string
          elio_lab_agent_id: string | null
          id: string
          input_tokens: number
          model: string
          output_tokens: number
        }
        Insert: {
          client_id?: string | null
          conversation_id?: string | null
          cost_eur?: number
          created_at?: string
          elio_lab_agent_id?: string | null
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
        }
        Update: {
          client_id?: string | null
          conversation_id?: string | null
          cost_eur?: number
          created_at?: string
          elio_lab_agent_id?: string | null
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "elio_token_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elio_token_usage_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "elio_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elio_token_usage_elio_lab_agent_id_fkey"
            columns: ["elio_lab_agent_id"]
            isOneToOne: false
            referencedRelation: "elio_lab_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          subject: string
          template_key: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      gmail_integrations: {
        Row: {
          access_token: string
          created_at: string
          gmail_email: string
          id: string
          operator_id: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          gmail_email: string
          id?: string
          operator_id: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          gmail_email?: string
          id?: string
          operator_id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hub_project_widget_prefs: {
        Row: {
          enabled: boolean
          operator_id: string
          updated_at: string
          widget_key: string
        }
        Insert: {
          enabled?: boolean
          operator_id: string
          updated_at?: string
          widget_key: string
        }
        Update: {
          enabled?: boolean
          operator_id?: string
          updated_at?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_project_widget_prefs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          actions_count: number
          client_auth_user_id: string
          client_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          operator_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          actions_count?: number
          client_auth_user_id: string
          client_id: string
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          operator_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actions_count?: number
          client_auth_user_id?: string
          client_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          operator_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      instance_transfers: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          instance_id: string
          recipient_email: string
          sent_at: string | null
          status: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          instance_id: string
          recipient_email: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          instance_id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instance_transfers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instance_transfers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "client_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      justificatif_uploads: {
        Row: {
          created_at: string
          drive_file_id: string | null
          error_message: string | null
          file_name: string
          file_size: number
          id: string
          mime_type: string
          status: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          error_message?: string | null
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          status?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          status?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          created_at: string
          file_size_bytes: number
          id: string
          meeting_id: string
          recording_duration_seconds: number
          recording_url: string
          transcript_archived_at: string | null
          transcript_document_id: string | null
          transcript_synced_at: string | null
          transcript_text: string | null
          transcript_url: string | null
          transcription_language: string | null
          transcription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_size_bytes: number
          id?: string
          meeting_id: string
          recording_duration_seconds: number
          recording_url: string
          transcript_archived_at?: string | null
          transcript_document_id?: string | null
          transcript_synced_at?: string | null
          transcript_text?: string | null
          transcript_url?: string | null
          transcription_language?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_size_bytes?: number
          id?: string
          meeting_id?: string
          recording_duration_seconds?: number
          recording_url?: string
          transcript_archived_at?: string | null
          transcript_document_id?: string | null
          transcript_synced_at?: string | null
          transcript_text?: string | null
          transcript_url?: string | null
          transcription_language?: string | null
          transcription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recordings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_recordings_transcript_document_id_fkey"
            columns: ["transcript_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          invite_last_sent_at: string | null
          invite_last_sent_to: string | null
          invite_sent_count: number
          is_free: boolean
          meet_space_name: string | null
          meet_uri: string | null
          metadata: Json
          operator_id: string
          price_cents: number | null
          recording_url: string | null
          scheduled_at: string | null
          session_id: string | null
          started_at: string | null
          status: string
          title: string
          transcript_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          invite_last_sent_at?: string | null
          invite_last_sent_to?: string | null
          invite_sent_count?: number
          is_free?: boolean
          meet_space_name?: string | null
          meet_uri?: string | null
          metadata?: Json
          operator_id: string
          price_cents?: number | null
          recording_url?: string | null
          scheduled_at?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          transcript_url?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          invite_last_sent_at?: string | null
          invite_last_sent_to?: string | null
          invite_sent_count?: number
          is_free?: boolean
          meet_space_name?: string | null
          meet_uri?: string | null
          metadata?: Json
          operator_id?: string
          price_cents?: number | null
          recording_url?: string | null
          scheduled_at?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          transcript_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          client_id: string
          content: string
          created_at: string
          id: string
          operator_id: string
          read_at: string | null
          sender_type: string
          via_elio: boolean
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          client_id: string
          content: string
          created_at?: string
          id?: string
          operator_id: string
          read_at?: string | null
          sender_type: string
          via_elio?: boolean
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          operator_id?: string
          read_at?: string | null
          sender_type?: string
          via_elio?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      module_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          family: string
          id: string
          is_active: boolean
          is_default: boolean
          kind: string
          manifest_path: string | null
          module_key: string
          monthly_price_ht: number | null
          name: string
          requires_modules: string[]
          setup_price_ht: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          family?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind: string
          manifest_path?: string | null
          module_key: string
          monthly_price_ht?: number | null
          name: string
          requires_modules?: string[]
          setup_price_ht?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          family?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind?: string
          manifest_path?: string | null
          module_key?: string
          monthly_price_ht?: number | null
          name?: string
          requires_modules?: string[]
          setup_price_ht?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_inapp: boolean
          created_at: string
          id: string
          notification_type: string
          operator_override: boolean
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          channel_email?: boolean
          channel_inapp?: boolean
          created_at?: string
          id?: string
          notification_type: string
          operator_override?: boolean
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          channel_email?: boolean
          channel_inapp?: boolean
          created_at?: string
          id?: string
          notification_type?: string
          operator_override?: boolean
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          recipient_type: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          recipient_type: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          recipient_type?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          email_notifications_enabled: boolean
          id: string
          inactivity_threshold_days: number
          mfa_metadata: Json
          name: string
          role: string
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          email_notifications_enabled?: boolean
          id?: string
          inactivity_threshold_days?: number
          mfa_metadata?: Json
          name: string
          role?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          email_notifications_enabled?: boolean
          id?: string
          inactivity_threshold_days?: number
          mfa_metadata?: Json
          name?: string
          role?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      outgoing_webhooks: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[]
          id: string
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret: string
          updated_at?: string | null
          url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[]
          id?: string
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      parcours: {
        Row: {
          abandonment_reason: string | null
          active_stages: Json
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          operator_id: string
          started_at: string
          status: string
          suspended_at: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          abandonment_reason?: string | null
          active_stages?: Json
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          operator_id: string
          started_at?: string
          status?: string
          suspended_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          abandonment_reason?: string | null
          active_stages?: Json
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          operator_id?: string
          started_at?: string
          status?: string
          suspended_at?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcours_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "parcours_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_steps: {
        Row: {
          brief_assets: Json | null
          brief_content: string | null
          brief_template: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          one_teasing_message: string | null
          parcours_id: string
          status: string
          step_number: number
          title: string
          updated_at: string
          validation_id: string | null
          validation_required: boolean | null
        }
        Insert: {
          brief_assets?: Json | null
          brief_content?: string | null
          brief_template?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          one_teasing_message?: string | null
          parcours_id: string
          status?: string
          step_number: number
          title: string
          updated_at?: string
          validation_id?: string | null
          validation_required?: boolean | null
        }
        Update: {
          brief_assets?: Json | null
          brief_content?: string | null
          brief_template?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          one_teasing_message?: string | null
          parcours_id?: string
          status?: string
          step_number?: number
          title?: string
          updated_at?: string
          validation_id?: string | null
          validation_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "parcours_steps_parcours_id_fkey"
            columns: ["parcours_id"]
            isOneToOne: false
            referencedRelation: "parcours"
            referencedColumns: ["id"]
          },
        ]
      }
      parcours_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          operator_id: string
          parcours_type: string
          stages: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          operator_id: string
          parcours_type: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          operator_id?: string
          parcours_type?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcours_templates_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_metadata: {
        Row: {
          client_id: string
          created_at: string
          paid_at: string | null
          pennylane_invoice_id: string | null
          pennylane_quote_id: string
          processed_at: string | null
          quote_type: string
          sent_at: string | null
          signed_at: string | null
          total_amount_ht: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          paid_at?: string | null
          pennylane_invoice_id?: string | null
          pennylane_quote_id: string
          processed_at?: string | null
          quote_type: string
          sent_at?: string | null
          signed_at?: string | null
          total_amount_ht?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          paid_at?: string | null
          pennylane_invoice_id?: string | null
          pennylane_quote_id?: string
          processed_at?: string | null
          quote_type?: string
          sent_at?: string | null
          signed_at?: string | null
          total_amount_ht?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_metadata_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          client_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string
          id: string
          operator_id: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          operator_id: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          operator_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      step_feedback_injections: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          injected_at: string
          operator_id: string
          read_at: string | null
          step_id: string
          type: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          injected_at?: string
          operator_id: string
          read_at?: string | null
          step_id: string
          type: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          injected_at?: string
          operator_id?: string
          read_at?: string | null
          step_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_feedback_injections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      step_submissions: {
        Row: {
          client_id: string
          created_at: string
          feedback: string | null
          feedback_at: string | null
          id: string
          parcours_step_id: string
          status: string
          submission_content: string
          submission_files: Json | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          feedback?: string | null
          feedback_at?: string | null
          id?: string
          parcours_step_id: string
          status?: string
          submission_content: string
          submission_files?: Json | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          feedback?: string | null
          feedback_at?: string | null
          id?: string
          parcours_step_id?: string
          status?: string
          submission_content?: string
          submission_files?: Json | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          client_id: string
          created_at: string
          description: string
          id: string
          operator_id: string
          screenshot_urls: string[]
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description: string
          id?: string
          operator_id: string
          screenshot_urls?: string[]
          status?: string
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          operator_id?: string
          screenshot_urls?: string[]
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tool_post_comments: {
        Row: {
          author_id: string
          author_type: string
          body: string
          client_id: string
          created_at: string
          id: string
          image_paths: string[]
          post_id: string
        }
        Insert: {
          author_id: string
          author_type: string
          body: string
          client_id: string
          created_at?: string
          id?: string
          image_paths?: string[]
          post_id: string
        }
        Update: {
          author_id?: string
          author_type?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          image_paths?: string[]
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_post_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tool_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_posts: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          image_paths: string[]
          operator_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          image_paths?: string[]
          operator_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          image_paths?: string[]
          operator_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_posts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          client_id: string
          created_at: string
          preferences: Json
          show_graduation_screen: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          preferences?: Json
          show_graduation_screen?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          preferences?: Json
          show_graduation_screen?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_requests: {
        Row: {
          client_id: string
          content: string
          created_at: string
          document_ids: string[]
          id: string
          operator_id: string
          parcours_id: string | null
          reviewed_at: string | null
          reviewer_comment: string | null
          status: string
          step_id: string | null
          submitted_at: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          document_ids?: string[]
          id?: string
          operator_id: string
          parcours_id?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          status?: string
          step_id?: string | null
          submitted_at?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          document_ids?: string[]
          id?: string
          operator_id?: string
          parcours_id?: string | null
          reviewed_at?: string | null
          reviewer_comment?: string | null
          status?: string
          step_id?: string | null
          submitted_at?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validation_requests_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_module_catalog_analytics: {
        Row: {
          active_clients_count: number | null
          category: string | null
          estimated_first_year_revenue: number | null
          estimated_yearly_recurring_revenue: number | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          kind: string | null
          module_key: string | null
          monthly_price_ht: number | null
          name: string | null
          setup_price_ht: number | null
          total_setup_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      answer_one_checkin: {
        Args: { p_answer: string; p_message_id: string }
        Returns: boolean
      }
      apply_client_module_config: {
        Args: { p_client_id: string; p_module_keys: string[] }
        Returns: undefined
      }
      approve_validation_request: {
        Args: {
          p_comment: string
          p_notification_body?: string
          p_notification_title?: string
          p_operator_id: string
          p_request_id: string
        }
        Returns: {
          client_id: string
          content: string
          created_at: string
          document_ids: string[]
          id: string
          operator_id: string
          parcours_id: string | null
          reviewed_at: string | null
          reviewer_comment: string | null
          status: string
          step_id: string | null
          submitted_at: string
          title: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "validation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_parcours_steps_from_template: {
        Args: { p_parcours_id: string; p_steps: Json }
        Returns: undefined
      }
      find_inactive_parcours_clients: {
        Args: { p_cooldown_days?: number; p_idle_days?: number }
        Returns: {
          agent_label: string
          auth_user_id: string
          client_id: string
          idle_days: number
        }[]
      }
      find_one_clients_for_checkin: {
        Args: { p_cooldown_days?: number; p_idle_days?: number }
        Returns: {
          auth_user_id: string
          client_id: string
          client_name: string
          idle_days: number
        }[]
      }
      fn_admin_revoke_all_sessions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      fn_check_login_attempts: {
        Args: {
          p_email: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      fn_close_impersonation_session: {
        Args: { p_session_id: string; p_status?: string }
        Returns: {
          actions_count: number
          closed: boolean
          session_id: string
        }[]
      }
      fn_get_impersonation_session_actions: {
        Args: { p_session_id: string }
        Returns: {
          action: string
          occurred_at: string
          zone: string
        }[]
      }
      fn_get_operator_by_email: { Args: { p_email: string }; Returns: Json }
      fn_get_operator_id: { Args: never; Returns: string }
      fn_get_user_sessions: { Args: { p_user_id: string }; Returns: Json }
      fn_link_auth_user: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: Json
      }
      fn_link_operator_auth_user: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: Json
      }
      fn_mark_graduation_screen_shown: { Args: never; Returns: boolean }
      fn_record_login_attempt: {
        Args: { p_email: string; p_ip_address?: string; p_success?: boolean }
        Returns: undefined
      }
      fn_revoke_other_sessions: {
        Args: { p_keep_session_id: string }
        Returns: Json
      }
      fn_revoke_session: { Args: { p_session_id: string }; Returns: Json }
      get_coaching_balance: { Args: { p_client_id: string }; Returns: number }
      get_inactive_lab_clients: {
        Args: { p_cutoff_date: string; p_operator_id: string }
        Returns: {
          email: string
          id: string
          last_activity: string
          name: string
        }[]
      }
      has_ia_consent: { Args: { p_client_id: string }; Returns: boolean }
      inject_elio_questions: {
        Args: {
          p_client_id: string
          p_content: string
          p_injection_id: string
          p_step_id: string
        }
        Returns: string
      }
      inject_elio_roadmap: {
        Args: { p_client_id: string; p_content: string; p_step_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_client_write_allowed: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      is_current_client_write_allowed: { Args: never; Returns: boolean }
      is_operator:
        | { Args: never; Returns: boolean }
        | { Args: { p_operator_id: string }; Returns: boolean }
      is_owner: { Args: { p_client_id: string }; Returns: boolean }
      reject_validation_request: {
        Args: { p_comment: string; p_operator_id: string; p_request_id: string }
        Returns: {
          client_id: string
          content: string
          created_at: string
          document_ids: string[]
          id: string
          operator_id: string
          parcours_id: string | null
          reviewed_at: string | null
          reviewer_comment: string | null
          status: string
          step_id: string | null
          submitted_at: string
          title: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "validation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_reminder_completed: {
        Args: { p_reminder_id: string }
        Returns: {
          client_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string
          id: string
          operator_id: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_own_branding: { Args: { p_branding: Json }; Returns: Json }
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
    Enums: {},
  },
} as const
