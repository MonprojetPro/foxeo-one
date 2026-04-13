/**
 * Supabase database types — Story 1.2
 *
 * Types manuels alignes sur les migrations SQL (00001-00010).
 * Seront remplaces par `npm run gen:types` quand Supabase local sera disponible.
 *
 * IMPORTANT: Apres chaque migration, regenerer avec:
 *   npx supabase gen types typescript --local > packages/types/src/database.types.ts
 *
 * TODO [Story 1.2]: Verifier que gen:types preserve les unions litterales
 * (ex: 'operator' | 'admin') issues des CHECK constraints SQL.
 * Si gen:types genere `string` a la place, creer des types utilitaires
 * derives dans un fichier separe (ex: database.enums.ts).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      operators: {
        Row: {
          id: string
          email: string
          name: string
          role: 'operator' | 'admin'
          two_factor_enabled: boolean
          auth_user_id: string | null
          mfa_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'operator' | 'admin'
          two_factor_enabled?: boolean
          auth_user_id?: string | null
          mfa_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'operator' | 'admin'
          two_factor_enabled?: boolean
          auth_user_id?: string | null
          mfa_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          operator_id: string
          email: string
          name: string
          first_name: string | null
          company: string | null
          contact: string | null
          phone: string | null
          sector: string | null
          client_type: 'complet' | 'direct_one' | 'ponctuel'
          status: 'active' | 'suspended' | 'archived' | 'deleted' | 'prospect'
          auth_user_id: string | null
          is_pinned: boolean | null
          deferred_until: string | null
          suspended_at: string | null
          archived_at: string | null
          retention_until: string | null
          previous_status: string | null
          pennylane_customer_id: string | null
          lab_paid: boolean | null
          lab_paid_at: string | null
          lab_amount: number | null
          lab_invoice_sent_at: string | null
          hub_seen_at: string | null
          prospect_stage: 'nouveau' | 'qualifié' | 'sans_suite' | null
          project_type: string | null
          lead_message: string | null
          notes: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          email: string
          name: string
          first_name?: string | null
          company?: string | null
          contact?: string | null
          phone?: string | null
          sector?: string | null
          client_type: 'complet' | 'direct_one' | 'ponctuel'
          status?: 'active' | 'suspended' | 'archived' | 'deleted' | 'prospect'
          auth_user_id?: string | null
          is_pinned?: boolean | null
          deferred_until?: string | null
          suspended_at?: string | null
          archived_at?: string | null
          retention_until?: string | null
          previous_status?: string | null
          pennylane_customer_id?: string | null
          lab_paid?: boolean | null
          lab_paid_at?: string | null
          lab_amount?: number | null
          lab_invoice_sent_at?: string | null
          hub_seen_at?: string | null
          prospect_stage?: 'nouveau' | 'qualifié' | 'sans_suite' | null
          project_type?: string | null
          lead_message?: string | null
          notes?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          email?: string
          name?: string
          first_name?: string | null
          company?: string | null
          contact?: string | null
          phone?: string | null
          sector?: string | null
          client_type?: 'complet' | 'direct_one' | 'ponctuel'
          status?: 'active' | 'suspended' | 'archived' | 'deleted' | 'prospect'
          auth_user_id?: string | null
          is_pinned?: boolean | null
          deferred_until?: string | null
          suspended_at?: string | null
          archived_at?: string | null
          retention_until?: string | null
          previous_status?: string | null
          pennylane_customer_id?: string | null
          lab_paid?: boolean | null
          lab_paid_at?: string | null
          lab_amount?: number | null
          lab_invoice_sent_at?: string | null
          hub_seen_at?: string | null
          prospect_stage?: 'nouveau' | 'qualifié' | 'sans_suite' | null
          project_type?: string | null
          lead_message?: string | null
          notes?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_operator_id_fkey'
            columns: ['operator_id']
            isOneToOne: false
            referencedRelation: 'operators'
            referencedColumns: ['id']
          },
        ]
      }
      client_configs: {
        Row: {
          client_id: string
          operator_id: string
          active_modules: string[]
          dashboard_type: 'hub' | 'lab' | 'one'
          theme_variant: string | null
          custom_branding: Json
          elio_config: Json
          parcours_config: Json
          lab_mode_available: boolean
          elio_lab_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id: string
          operator_id: string
          active_modules?: string[]
          dashboard_type?: 'hub' | 'lab' | 'one'
          theme_variant?: string | null
          custom_branding?: Json
          elio_config?: Json
          parcours_config?: Json
          lab_mode_available?: boolean
          elio_lab_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          operator_id?: string
          active_modules?: string[]
          dashboard_type?: 'hub' | 'lab' | 'one'
          theme_variant?: string | null
          custom_branding?: Json
          elio_config?: Json
          parcours_config?: Json
          lab_mode_available?: boolean
          elio_lab_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_configs_client_id_fkey'
            columns: ['client_id']
            isOneToOne: true
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'client_configs_operator_id_fkey'
            columns: ['operator_id']
            isOneToOne: false
            referencedRelation: 'operators'
            referencedColumns: ['id']
          },
        ]
      }
      consents: {
        Row: {
          id: string
          client_id: string
          consent_type: 'cgu' | 'ia_processing'
          accepted: boolean
          version: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          consent_type: 'cgu' | 'ia_processing'
          accepted: boolean
          version: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        /** Table immutable (RGPD) — UPDATE interdit par design. Type present pour compatibilite gen:types. */
        Update: {
          id?: string
          client_id?: string
          consent_type?: 'cgu' | 'ia_processing'
          accepted?: boolean
          version?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'consents_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          actor_type: 'client' | 'operator' | 'system' | 'elio'
          actor_id: string
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_type: 'client' | 'operator' | 'system' | 'elio'
          actor_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        /** Table append-only — UPDATE interdit par design. Type present pour compatibilite gen:types. */
        Update: {
          id?: string
          actor_type?: 'client' | 'operator' | 'system' | 'elio'
          actor_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          id: string
          email: string
          ip_address: string | null
          success: boolean
          attempted_at: string
        }
        Insert: {
          id?: string
          email: string
          ip_address?: string | null
          success?: boolean
          attempted_at?: string
        }
        /** Table append-only — tracking brute force protection (NFR-S5). */
        Update: {
          id?: string
          email?: string
          ip_address?: string | null
          success?: boolean
          attempted_at?: string
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          id: string
          meeting_id: string
          recording_url: string
          recording_duration_seconds: number
          file_size_bytes: number
          transcript_url: string | null
          transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
          transcription_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          recording_url: string
          recording_duration_seconds: number
          file_size_bytes: number
          transcript_url?: string | null
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed'
          transcription_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          recording_url?: string
          recording_duration_seconds?: number
          file_size_bytes?: number
          transcript_url?: string | null
          transcription_status?: 'pending' | 'processing' | 'completed' | 'failed'
          transcription_language?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_recordings_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      fn_get_operator_id: {
        Args: Record<string, never>
        Returns: string
      }
      fn_update_updated_at: {
        Args: Record<string, never>
        Returns: unknown
      }
      fn_check_login_attempts: {
        Args: {
          p_email: string
          p_window_minutes?: number
          p_max_attempts?: number
        }
        Returns: { blocked: boolean; remainingSeconds: number }
      }
      fn_record_login_attempt: {
        Args: {
          p_email: string
          p_ip_address?: string
          p_success?: boolean
        }
        Returns: undefined
      }
      fn_link_auth_user: {
        Args: {
          p_auth_user_id: string
          p_email: string
        }
        Returns: { clientId: string; name: string } | null
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_owner: {
        Args: {
          p_client_id: string
        }
        Returns: boolean
      }
      is_operator: {
        Args: {
          p_operator_id: string
        }
        Returns: boolean
      }
      fn_get_operator_by_email: {
        Args: {
          p_email: string
        }
        Returns: { id: string; name: string; role: string; twoFactorEnabled: boolean; authUserId: string | null } | null
      }
      fn_link_operator_auth_user: {
        Args: {
          p_auth_user_id: string
          p_email: string
        }
        Returns: { id: string; name: string } | null
      }
      /** Story 1.6 — Session management functions */
      fn_get_user_sessions: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          created_at: string
          updated_at: string
          refreshed_at: string | null
          user_agent: string | null
          ip: string | null
          aal: string | null
          not_after: string | null
        }[] | null
      }
      fn_revoke_session: {
        Args: {
          p_session_id: string
        }
        Returns: { success: boolean; error?: string }
      }
      fn_revoke_other_sessions: {
        Args: {
          p_keep_session_id: string
        }
        Returns: { success: boolean; revokedCount?: number; error?: string }
      }
      fn_admin_revoke_all_sessions: {
        Args: {
          p_user_id: string
        }
        Returns: { success: boolean; revokedCount?: number; error?: string }
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
