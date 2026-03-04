-- Migration: 00048_client_configs_modules_documentation.sql
-- Story 8.7: Élio One — Chat, FAQ, guidance dashboard & héritage Lab
-- Adds modules_documentation column to client_configs
-- Adds elio_escalation notification type

-- 1. Add modules_documentation column to client_configs
-- Will be populated by MiKL via Story 10.3
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS modules_documentation JSONB DEFAULT NULL;

COMMENT ON COLUMN client_configs.modules_documentation IS 'Documentation des modules actifs injectée par MiKL (Story 10.3). Structure: { [moduleId]: { description, parameters, client_questions, common_issues } }';

-- 2. Extend notification types to include elio_escalation
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

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
    'elio_escalation'
  ));

COMMENT ON COLUMN notifications.type IS 'Type de notification: message, validation, alert, system, graduation, payment, inactivity_alert, csv_import_complete, success, info, warning, error, elio_escalation';
