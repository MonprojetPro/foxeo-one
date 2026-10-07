-- T-041b — autoriser entity_type = 'credit_note' dans billing_sync.
--
-- CONTEXTE, pour qui relira dans six mois : l'avoir F-2026-102 a bien ete emis
-- chez Pennylane le 2026-10-07 (le premier avoir reel de MonProjetPro), mais son
-- miroir local echouait a l'ecriture — la contrainte n'acceptait que
-- quote / invoice / subscription / customer. L'echec n'etant traite que par un
-- console.warn cote application, il etait TOTALEMENT SILENCIEUX : l'avoir
-- existait chez le fournisseur et nulle part chez nous.
--
-- CONSEQUENCE LA PLUS GRAVE, et la raison d'etre de cette migration : la garde
-- anti-double-avoir de `createCreditNote` interroge cette meme table. Elle
-- lisait donc un registre condamne a rester vide, et n'empechait rien — une
-- facture pouvait etre creditee deux fois, en produisant un avoir de trop lui
-- aussi definitif.
--
-- Ajout purement ADDITIF : aucune ligne existante n'est affectee, aucune valeur
-- n'est retiree. Applique en production le 2026-10-07 et verifie par relecture
-- de pg_get_constraintdef.

alter table public.billing_sync
  drop constraint if exists billing_sync_entity_type_check;

alter table public.billing_sync
  add constraint billing_sync_entity_type_check
  check (entity_type = any (array[
    'quote'::text,
    'invoice'::text,
    'subscription'::text,
    'customer'::text,
    'credit_note'::text
  ]));
