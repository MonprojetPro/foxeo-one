-- T-067e — trace l'envoi reel de l'email "votre espace est pret" (Lab gratuit, Lab payant,
-- One direct). Avant cette colonne, aucune surface ne savait distinguer "compte cree mais
-- email jamais parti" de "tout est bon" : le header/renvoi en ont besoin comme source unique.
alter table public.clients
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.clients.welcome_email_sent_at is
  'Horodatage du dernier envoi reussi de l''email "votre espace est pret" (invitation initiale ou renvoi). NULL = jamais envoye.';
