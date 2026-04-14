-- Ajout colonne color pour les intégrations calendrier
alter table calendar_integrations
  add column if not exists color text not null default '#06b6d4';
