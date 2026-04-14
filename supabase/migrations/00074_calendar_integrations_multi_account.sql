-- Permet plusieurs comptes Google (pro, perso, etc.)
-- On supprime la contrainte unique(user_id, provider) et on ajoute un label

alter table calendar_integrations
  add column if not exists label text not null default 'default';

-- Supprime l'ancienne contrainte unique
alter table calendar_integrations
  drop constraint if exists calendar_integrations_user_id_provider_key;

-- Nouvelle contrainte : un seul compte par (user, provider, label)
alter table calendar_integrations
  add constraint calendar_integrations_user_provider_label_key
  unique (user_id, provider, label);
