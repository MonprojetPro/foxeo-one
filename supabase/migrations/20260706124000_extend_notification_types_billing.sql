-- ============================================================
-- Chantier Élio Hub / Coaching One+ (2026-07-06)
-- Fix : billing-sync émet des notifications avec des types absents
-- de notifications_type_check → INSERT rejetés silencieusement.
-- Types ajoutés : billing_payment_failed, billing_payment_received,
--                 lab_payment_received, billing_sync_alert
-- ============================================================

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'message', 'validation', 'alert', 'system', 'graduation', 'payment',
    'inactivity_alert', 'csv_import_complete', 'success', 'info', 'warning',
    'error', 'export_ready', 'elio_escalation', 'tool_update', 'tool_comment',
    'billing_payment_failed', 'billing_payment_received',
    'lab_payment_received', 'billing_sync_alert'
  ]));
