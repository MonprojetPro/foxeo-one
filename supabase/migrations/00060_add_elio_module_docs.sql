-- Migration: Add elio_module_docs column to client_configs
-- Story 10.3: Configuration modules actifs par MiKL & injection documentation Elio One

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS elio_module_docs JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN client_configs.elio_module_docs IS
  'Documentation des modules actifs injectée par MiKL pour le system prompt Élio One. '
  'Array de ElioModuleDoc: [{ moduleId, description, faq, commonIssues, updatedAt }]';
