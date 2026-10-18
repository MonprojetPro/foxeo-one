-- T-047 : le widget Cal.com ne pouvait jamais s'afficher cote client.
-- calendar_integrations n'avait qu'une policy SELECT proprietaire (auth.uid() = user_id) :
-- le client, qui lit la ligne de SON OPERATEUR, se la voyait toujours filtrer -> maybeSingle()
-- rendait null SANS erreur -> "La prise de RDV en ligne n'est pas encore disponible", pour toujours.
--
-- Scope volontairement restreint a provider = 'calcom' : les lignes 'google' portent
-- access_token/refresh_token (verifie en base, 2 lignes avec jetons OAuth presents) et ne
-- doivent JAMAIS etre lisibles par un client. Les lignes calcom ne portent aucun jeton
-- (verifie : access_token/refresh_token NULL) — seule une URL de reservation publique.

create policy "calendar_integrations_select_client_calcom"
  on calendar_integrations
  for select
  using (
    provider = 'calcom'
    and exists (
      select 1
      from clients c
      join operators o on o.id = c.operator_id
      where c.auth_user_id = (select auth.uid())
        and o.auth_user_id = calendar_integrations.user_id
    )
  );
