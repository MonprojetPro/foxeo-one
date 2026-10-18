-- T-048 : l'adresse Cal.com en base est l'ancienne, morte depuis le rebrand
-- Foxeo -> MonprojetPro (posee le 2026-04-05, jamais revue). Verifie par curl
-- le 2026-10-18 : https://cal.com/mikl-foxeo -> 404.
--
-- MiKL a fourni et valide (curl -> 200, le 2026-10-11 ET re-verifie le 2026-10-18)
-- les 2 vrais liens :
--   - visio-client : la consultation facturee, utilisee par le widget client (produit)
--   - rdv-offert   : le 1er RDV, HORS PRODUIT (diffuse depuis son site), stocke
--                    seulement pour que MiKL l'ait sous la main (decision 11-10)

update calendar_integrations
set metadata = jsonb_build_object(
  'url', 'https://cal.com/mickael-culus-unpfqq/visio-client',
  'rdvOffertUrl', 'https://cal.com/mickael-culus-unpfqq/rdv-offert'
)
where provider = 'calcom'
  and label = 'default'
  and metadata->>'url' = 'cal.com/mikl-foxeo';
