/**
 * Schémas de base de données simplifiés pour Élio Hub.
 * Injectés dans le system prompt pour que le LLM comprenne
 * quelles données sont disponibles lors de la recherche client.
 */
export const HUB_DATABASE_SCHEMAS = `
# Schémas de base de données disponibles

## Table clients
- id (UUID)
- operator_id (UUID) — ID de l'opérateur
- name (TEXT) — Nom complet
- email (TEXT)
- company (TEXT) — Entreprise
- client_type (TEXT) — 'ponctuel' | 'lab' | 'one'
- status (TEXT) — 'active' | 'suspended' | 'archived'
- created_at (TIMESTAMP)

## Table validation_requests
- id (UUID)
- client_id (UUID)
- type (TEXT) — 'brief_lab' | 'evolution_one'
- title (TEXT)
- status (TEXT) — 'pending' | 'approved' | 'rejected'
- created_at (TIMESTAMP)

## Table elio_messages
- id (UUID)
- conversation_id (UUID)
- role (TEXT) — 'user' | 'assistant'
- content (TEXT)
- created_at (TIMESTAMP)

## Table parcours (Lab uniquement)
- id (UUID)
- client_id (UUID)
- current_step (INTEGER)
- total_steps (INTEGER)
- status (TEXT) — 'in_progress' | 'completed'

**Note** : Tu peux rechercher et filtrer ces tables pour répondre aux questions de MiKL.
`.trim()
