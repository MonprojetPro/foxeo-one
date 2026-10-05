-- T-035 — Client « entite » (personne morale) : raison sociale, contact non facturable, SIRET.
--
-- Contexte : le formulaire « Nouveau client » supposait une personne physique (Prenom + Nom).
-- Premier client reel = le CSE d'Habitat 77, une personne morale. On distingue desormais
-- explicitement le particulier de l'entite, et on stocke le SIRET + les informations
-- rapprochees aupres du repertoire Sirene.
--
-- `clients.contact` existe deja depuis l'origine et n'etait utilisee par AUCUN code
-- (ni formulaire, ni action) : elle devient le porteur du nom de contact d'une entite.
-- Ce contact ne doit JAMAIS partir en facturation — seule la raison sociale le fait.

alter table public.clients
  add column if not exists client_kind text not null default 'individual',
  add column if not exists siret text,
  add column if not exists naf_code text,
  add column if not exists billing_address text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_country_alpha2 text;

-- Particulier (nom + prenom) ou entite (raison sociale + contact facultatif).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_client_kind_check'
  ) then
    alter table public.clients
      add constraint clients_client_kind_check
      check (client_kind in ('individual', 'entity'));
  end if;
end $$;

-- 14 chiffres exactement. Volontairement permissif sur l'absence : un client peut
-- exister sans SIRET (association sans numero, particulier, saisie differee).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_siret_format_check'
  ) then
    alter table public.clients
      add constraint clients_siret_format_check
      check (siret is null or siret ~ '^[0-9]{14}$');
  end if;
end $$;

comment on column public.clients.client_kind is
  'individual = personne physique (name = nom de famille, first_name = prenom) · entity = personne morale (name = company = raison sociale, contact = nom du contact, jamais facture)';
comment on column public.clients.siret is
  'SIRET a 14 chiffres, sert au rapprochement avec le repertoire Sirene (API Recherche d''entreprises).';
comment on column public.clients.contact is
  'Nom du contact chez une entite. N''APPARAIT JAMAIS en facturation — seule la raison sociale est envoyee a Pennylane.';
comment on column public.clients.billing_address is
  'Adresse de facturation, pre-remplie par le rapprochement SIRET. Transmise a Pennylane a la creation du compte client.';
