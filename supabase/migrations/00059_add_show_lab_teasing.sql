-- Migration: add show_lab_teasing column to client_configs
-- Story: 10.2 — Documents hérités du Lab, livrables & teasing Lab

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS show_lab_teasing BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN client_configs.show_lab_teasing IS 'MiKL peut désactiver le teasing Lab par client (défaut: true = affiché)';
