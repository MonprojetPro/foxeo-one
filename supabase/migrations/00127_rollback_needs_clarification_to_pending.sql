-- Migration 00127 — Rollback : needs_clarification → pending
--
-- Décision MiKL (mai 2026) : le statut needs_clarification était une usine à gaz.
-- La nouvelle logique :
--   1. La demande reste en 'pending' (ni validée ni refusée)
--   2. La question MiKL est envoyée comme message dans le chat MiKL ↔ Client
--   3. Le client répond dans le chat, MiKL valide/refuse plus tard
--
-- On rebascule les demandes existantes en 'pending' pour qu'elles réapparaissent dans la
-- file d'attente Hub. On garde le CHECK constraint inchangé pour ne pas casser les
-- archives ou les éventuels appels externes.

UPDATE validation_requests
SET
  status = 'pending',
  updated_at = NOW()
WHERE status = 'needs_clarification';

-- Note : la migration 00124 (sync step_feedback_injections rétroactif) reste en place
--   pour l'historique mais ne sera plus alimentée par le code TS.
