-- Migration: 00081_billing_sync_operator_write_policies.sql
-- Fix: RLS manquant sur billing_sync pour INSERT/UPDATE/DELETE opérateurs
-- Sans ces policies, les Server Actions ne peuvent pas écrire dans billing_sync
-- (seule l'Edge Function avec service_role le pouvait)

CREATE POLICY billing_sync_insert_operator ON billing_sync
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY billing_sync_update_operator ON billing_sync
  FOR UPDATE USING (is_operator());

CREATE POLICY billing_sync_delete_operator ON billing_sync
  FOR DELETE USING (is_operator());
