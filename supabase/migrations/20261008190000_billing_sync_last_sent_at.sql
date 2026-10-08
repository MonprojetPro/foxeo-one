-- T-044 — date du dernier envoi par email d'une facture ou d'un avoir.
--
-- Contexte : MiKL le 08-10, « comment je fais pour envoyer une facture quand elle
-- a ete generee ? ». Il ne pouvait pas : l'envoi n'existait qu'au moment de la
-- creation (`createInvoice` avec `sendNow`), et la liste des factures n'avait
-- aucun bouton — alors que les devis en avaient un. En ajoutant ce bouton, il
-- faut aussi savoir si c'est DEJA parti, sinon on renvoie deux fois la meme
-- facture au client sans le savoir.
--
-- ⚠️ POURQUOI UNE COLONNE ET PAS UNE CLE DANS `data` : l'Edge Function
-- billing-sync REECRIT entierement `data` a chaque passage (`{...inv}` depuis la
-- reponse Pennylane — seul `consecutive_unpaid_count` est preserve, et encore,
-- uniquement sur les transitions d'impaye). Une date posee dans `data` aurait
-- donc disparu au prochain cron, EN SILENCE. Une colonne dediee survit : un
-- UPSERT ne met a jour que les colonnes qu'il liste, et le cron ne liste pas
-- celle-ci.

ALTER TABLE billing_sync
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN billing_sync.last_sent_at IS
  'T-044 — dernier envoi par email de ce document (facture ou avoir), declenche depuis le Hub. NULL = jamais envoye depuis le Hub. Ne jamais deplacer dans `data` : le cron billing-sync reecrit cette colonne JSON en entier.';
