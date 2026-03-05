-- Migration: Extend notification types with export_ready
-- Story: 9.5a — Export RGPD des données client

-- Drop old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add extended constraint with export_ready
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'message',
    'validation',
    'alert',
    'system',
    'graduation',
    'payment',
    'inactivity_alert',
    'csv_import_complete',
    'success',
    'info',
    'warning',
    'error',
    'export_ready'
  ));

COMMENT ON COLUMN notifications.type IS 'Type de notification: message, validation, alert, system, graduation, payment, inactivity_alert, csv_import_complete, success, info, warning, error, export_ready';
