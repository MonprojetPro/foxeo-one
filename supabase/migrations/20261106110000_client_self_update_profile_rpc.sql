-- T-078 — Nouveau parcours d'activation (remplace l'ancien tutoriel a 5 etapes) :
-- presentation -> creation du mot de passe -> verification/completion des coordonnees
-- -> connexion. La page de coordonnees doit permettre au client de corriger ou
-- completer sa propre fiche (prenom/nom, contact, telephone, secteur, site web) —
-- meme defaut RLS que T-076 : AUCUNE policy n'autorise un client a modifier sa
-- propre fiche clients, donc meme pattern (RPC SECURITY DEFINER bornee a auth.uid()).
--
-- Email et SIRET restent VOLONTAIREMENT hors de cette RPC : un email se modifie des
-- 2 cotes (auth.users + clients, cf. DEP email-deux-sources-auth-clients) et un SIRET
-- est un identifiant legal/facturation — les deux restent du ressort de MiKL.

create or replace function public.fn_update_onboarding_profile(
  p_first_name text,
  p_name text,
  p_contact text,
  p_phone text,
  p_sector text,
  p_website text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update clients
  set
    first_name = nullif(trim(p_first_name), ''),
    name = coalesce(nullif(trim(p_name), ''), name),
    contact = nullif(trim(p_contact), ''),
    phone = nullif(trim(p_phone), ''),
    sector = nullif(trim(p_sector), ''),
    website = nullif(trim(p_website), '')
  where auth_user_id = auth.uid();

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

comment on function public.fn_update_onboarding_profile(text, text, text, text, text, text) is
  'Permet au client connecte de corriger/completer sa propre fiche (hors email et SIRET, jamais auto-editables). Renvoie true si une ligne a ete modifiee.';
