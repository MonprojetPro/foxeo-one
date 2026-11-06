-- T-076 — AUCUNE policy RLS UPDATE sur `clients` n'autorise un client a modifier sa
-- propre fiche (seule `clients_update_operator` existe, reservee a is_operator()).
-- Resultat verifie en base : les 3 UPDATE direct tentes depuis le code client
-- (middleware.ts:first_login_at, complete-onboarding.ts:onboarding_completed,
-- change-temporary-password.ts:password_change_required) sont bloques EN SILENCE
-- par la RLS (0 ligne modifiee, Postgres ne renvoie aucune erreur pour un filtre RLS)
-- -> l'onboarding ne se termine jamais, le client reboucle sur l'ecran de bienvenue.
--
-- Plutot qu'une policy RLS large (qui laisserait un client modifier N'IMPORTE QUEL
-- champ de sa propre fiche, y compris client_type/status/operator_id), on reprend
-- le pattern deja en place et deja fiable pour `graduation_screen_shown`
-- (fn_mark_graduation_screen_shown) : une fonction SECURITY DEFINER par champ,
-- bornee a auth.uid(), qui retourne le nombre de lignes modifiees pour que
-- l'appelant puisse enfin detecter un echec au lieu de le supposer reussi.

create or replace function public.fn_mark_first_login()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update clients
  set first_login_at = now()
  where auth_user_id = auth.uid()
    and first_login_at is null;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

comment on function public.fn_mark_first_login() is
  'Pose first_login_at = now() pour le client connecte, une seule fois (idempotent). Renvoie true si une ligne a ete modifiee.';

create or replace function public.fn_complete_client_onboarding()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update clients
  set onboarding_completed = true
  where auth_user_id = auth.uid()
    and onboarding_completed = false;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

comment on function public.fn_complete_client_onboarding() is
  'Marque onboarding_completed = true pour le client connecte. Renvoie true si une ligne a ete modifiee.';

create or replace function public.fn_clear_password_change_required()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update clients
  set password_change_required = false
  where auth_user_id = auth.uid()
    and password_change_required = true;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

comment on function public.fn_clear_password_change_required() is
  'Marque password_change_required = false pour le client connecte, apres changement de mot de passe. Renvoie true si une ligne a ete modifiee.';
