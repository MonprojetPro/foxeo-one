-- Migration: Facturation visio pilotee depuis le Hub (T-059)
--
-- MiKL veut pouvoir marquer une seance gratuite/payante a la creation, voir
-- une dette par client, et facturer la selection de son choix (pas un solde
-- global automatique). Deux ajustements de schema :
--
-- 1. meetings.is_free / meetings.price_cents — la decision prise a la creation.
-- 2. billable_items.item_type — elargi a 'visio_session' (jusqu'ici reserve au
--    coaching One+ hors forfait). Meme table, meme ecran de dette, pour ne pas
--    dupliquer la logique de facturation (demande explicite de MiKL).

ALTER TABLE meetings
  ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN price_cents INTEGER;

COMMENT ON COLUMN meetings.is_free IS 'T-059 — decide a la creation de la seance (Hub). true = aucune facturation.';
COMMENT ON COLUMN meetings.price_cents IS 'T-059 — montant HT en centimes, saisi par MiKL, uniquement si is_free = false.';

ALTER TABLE billable_items
  DROP CONSTRAINT billable_items_item_type_check,
  ADD CONSTRAINT billable_items_item_type_check
    CHECK (item_type IN ('coaching_session', 'visio_session'));

COMMENT ON COLUMN billable_items.item_type IS 'coaching_session = seance One+ hors forfait (auto, webhook Cal.com) ; visio_session = seance ponctuelle marquee payante depuis le Hub (T-059).';
