-- Migration 00111 — Ajout sort_order à elio_lab_agents
-- Permet d'afficher les agents dans l'ordre logique du parcours Lab

ALTER TABLE elio_lab_agents
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 99;

CREATE INDEX IF NOT EXISTS idx_elio_lab_agents_sort_order ON elio_lab_agents(sort_order);
