-- pg_net requis par trigger_send_email_on_notification (net.http_post).
-- Découvert le 2026-06-10 : l'extension n'était pas installée → aucun email
-- transactionnel ne pouvait partir (trigger échouait en silence).
CREATE EXTENSION IF NOT EXISTS pg_net;
