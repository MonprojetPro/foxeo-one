-- Migration 00109 — Réintègre elio_escalation dans la contrainte notifications_type_check
-- La migration 00056 avait remplacé la contrainte sans inclure elio_escalation (ajouté en 00048)
-- ce qui rendait le bouton "Transmettre à MiKL" silencieusement non fonctionnel.

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
    'export_ready',
    'elio_escalation'
  ));

COMMENT ON COLUMN notifications.type IS 'Type de notification: message, validation, alert, system, graduation, payment, inactivity_alert, csv_import_complete, success, info, warning, error, export_ready, elio_escalation';
