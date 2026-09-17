-- ============================================================================
-- RESTAURATION DES DONNEES DE DEMONSTRATION COMPTABLES — snapshot du 2026-09-17
-- ============================================================================
--
-- POURQUOI CE FICHIER
-- MiKL s'apprete a facturer de vrais clients et veut « y voir clair » en se
-- connectant au Hub. La comptabilite affichee jusqu'ici etait INTEGRALEMENT
-- fictive : 16 documents et 8 mouvements de credits rattaches aux 3 clients de
-- demonstration (Atelier Reynaud, Maison Vasseur, Le Comptoir de Camille), eux
-- memes declares fictifs dans `docs/vitrine-screenshots.md`.
--
-- Ces donnees ont ete SUPPRIMEES le 2026-09-17 (item T-025 du board). Ce
-- fichier existe pour pouvoir les REMETTRE a l'identique — MiKL : « on les
-- refera si besoin ». Utile notamment pour refaire des captures d'ecran de la
-- vitrine, ou montrer un Hub rempli lors de l'accreditation CII.
--
-- CE QU'ELLES NE SONT PAS
-- Elles n'existent PAS dans Pennylane. Preuve : leur champ `data` ne porte que
-- 4 a 6 cles (`date`, `label`, `currency`, `invoice_number`) la ou une reponse
-- reelle de l'API Pennylane en rend des dizaines. Elles ont ete ecrites a la
-- main. Les supprimer n'a donc eu AUCUN effet sur la comptabilite reelle.
--
-- COMMENT S'EN SERVIR
--   1. Verifier que les 3 clients de demonstration existent toujours (les UUID
--      ci-dessous y font reference) — ils n'ont pas ete supprimes le 17-09.
--   2. Executer ce fichier tel quel. Les identifiants sont explicites, donc le
--      rejeu est idempotent : une seconde execution echouera sur la cle
--      primaire au lieu de creer des doublons. C'est voulu.
--   3. ⚠️ NE JAMAIS l'executer sur une base contenant de VRAIES ecritures sans
--      avoir verifie qu'aucun `pennylane_id` reel ne porte les memes numeros
--      (FA-2026-0031 a FA-2026-0166, DE-2026-0009 a DE-2026-0048).
--
-- A NOTER POUR LA LECTURE DU LEDGER
-- Les lignes `created_by = 'system'` avec une note redigee en francais sont les
-- lignes de DEMONSTRATION. Les deux lignes `created_by = 'monthly-billing'`
-- (01-08 et 01-09) sont les seules produites par le VRAI cron. Cette
-- distinction a son importance : la superposition d'une ligne de demo datee du
-- 31-07 et de la ligne du cron datee du 01-08 avait fait conclure a tort a un
-- defaut d'idempotence du cron. Il n'y en a pas — le cron credite une fois par
-- mois, regulierement.
-- ============================================================================

insert into public.billing_sync (id, entity_type, pennylane_id, client_id, status, amount, data, created_at, updated_at, last_synced_at) values
  ('178edd6c-9bc7-40ef-a88d-25464f2cf382','invoice','FA-2026-0148','a1000000-0000-4000-8000-000000000001','paid',19900,'{"date": "2026-06-26", "label": "Forfait Lab — accompagnement MonprojetPro", "currency": "EUR", "invoice_number": "FA-2026-0148", "is_lab_invoice": true}'::jsonb,'2026-06-26 16:30:00+00','2026-06-27 09:10:00+00','2026-06-27 09:10:00+00'),
  ('9af6c9e3-d6eb-4d22-b020-e4f42b0b8e52','invoice','FA-2026-0031','b2000000-0000-4000-8000-000000000002','paid',19900,'{"date": "2026-02-13", "label": "Forfait Lab — accompagnement MonprojetPro", "currency": "EUR", "invoice_number": "FA-2026-0031", "is_lab_invoice": true, "lab_deduction_applied": true}'::jsonb,'2026-02-13 11:20:00+00','2026-02-14 10:00:00+00','2026-02-14 10:00:00+00'),
  ('39b17383-f373-4793-8201-307c5722b714','invoice','FA-2026-0112','b2000000-0000-4000-8000-000000000002','paid',180100,'{"date": "2026-05-14", "label": "Développement outil sur-mesure — acompte 50 % (déduction Lab -199 €)", "currency": "EUR", "invoice_number": "FA-2026-0112"}'::jsonb,'2026-05-14 11:00:00+00','2026-05-16 10:22:00+00','2026-05-16 10:22:00+00'),
  ('b43eff29-8c64-47e4-a2c4-c1d6cef243ec','invoice','FA-2026-0139','b2000000-0000-4000-8000-000000000002','paid',180000,'{"date": "2026-06-19", "label": "Développement outil sur-mesure — solde à la livraison", "currency": "EUR", "invoice_number": "FA-2026-0139"}'::jsonb,'2026-06-19 09:30:00+00','2026-06-20 14:05:00+00','2026-06-20 14:05:00+00'),
  ('4a3ced77-fdae-4eb5-845d-b0c22daa094e','invoice','FA-2026-0155','b2000000-0000-4000-8000-000000000002','paid',9900,'{"date": "2026-07-01", "label": "Abonnement MonprojetPro One+ — juillet 2026", "currency": "EUR", "invoice_number": "FA-2026-0155"}'::jsonb,'2026-07-01 08:00:00+00','2026-07-01 08:05:00+00','2026-07-01 08:05:00+00'),
  ('d3353a64-ef22-4ef1-9137-d253a6cb3d06','subscription','SUB-2026-0007','b2000000-0000-4000-8000-000000000002','active',9900,'{"label": "MonprojetPro One+ — abonnement mensuel", "status": "active", "start_date": "2026-05-12", "recurring_period": "monthly"}'::jsonb,'2026-05-12 15:00:00+00','2026-08-01 08:09:37.319908+00','2026-08-01 08:09:37.319908+00'),
  ('a1cafc28-314e-4baf-b58d-473bd8e9f193','subscription','SUB-2026-0011','766e2fb1-8b96-42ad-9fed-7faeb0cd541c','stopped',9900,'{"label": "MonprojetPro One+ — abonnement mensuel", "status": "stopped", "start_date": "2026-04-17", "recurring_period": "monthly"}'::jsonb,'2026-04-17 15:00:00+00','2026-08-01 08:09:37.319908+00','2026-08-01 08:09:37.319908+00'),
  ('dfae4962-b0bd-4217-8179-54b7af9e91e8','quote','DE-2026-0045','b2000000-0000-4000-8000-000000000002','pending',96000,'{"date": "2026-07-30", "label": "Evolution outil — planning atelier 6 semaines", "quote_type": "one_direct_deposit", "quote_number": "DE-2026-0045", "currency_amount_before_tax": "960.00"}'::jsonb,'2026-07-30 17:40:00+00','2026-08-01 08:09:37.319908+00','2026-08-01 08:09:37.319908+00'),
  ('de40acde-f5e9-45d6-acd1-e6b8cb9c5667','quote','DE-2026-0018','b2000000-0000-4000-8000-000000000002','accepted',360100,'{"date": "2026-05-13", "label": "Developpement outil sur-mesure — Atelier Reynaud (deduction Lab -199 EUR)", "quote_type": "one_direct_deposit", "quote_number": "DE-2026-0018", "currency_amount_before_tax": "3601.00"}'::jsonb,'2026-05-13 14:20:00+00','2026-08-01 08:09:37.319908+00','2026-08-01 08:09:37.319908+00'),
  ('4dc74cfa-e054-4250-96e6-f88885024aea','quote','DE-2026-0009','a1000000-0000-4000-8000-000000000001','accepted',19900,'{"date": "2026-06-24", "label": "Forfait Lab — accompagnement MonprojetPro", "quote_type": "lab_onboarding", "quote_number": "DE-2026-0009", "currency_amount_before_tax": "199.00"}'::jsonb,'2026-06-24 15:05:00+00','2026-08-01 08:09:37.319908+00','2026-08-01 08:09:37.319908+00'),
  ('72a60317-f317-4550-b1b7-3fc8d2baae3f','invoice','FA-2026-0161','b2000000-0000-4000-8000-000000000002','paid',9900,'{"date": "2026-08-01", "label": "Abonnement MonprojetPro One+ — août 2026", "currency": "EUR", "invoice_number": "FA-2026-0161"}'::jsonb,'2026-07-31 06:00:00+00','2026-08-01 08:09:37.319908+00','2026-07-31 06:00:00+00'),
  ('6ae6f50b-88c9-4fcc-a2b9-ffc46ebe9b33','quote','DE-2026-0042','a1000000-0000-4000-8000-000000000001','accepted',149000,'{"date": "2026-07-28", "label": "Site vitrine + prise de commande — Maison Vasseur", "quote_type": "one_direct_deposit", "quote_number": "DE-2026-0042", "currency_amount_before_tax": "1490.00"}'::jsonb,'2026-07-28 10:15:00+00','2026-08-01 08:10:15.443637+00','2026-08-01 08:09:37.319908+00'),
  ('5e756bb8-f637-4ab4-afc7-92c92527979a','invoice','FA-2026-0158','a1000000-0000-4000-8000-000000000001','paid',44700,'{"date": "2026-08-01", "label": "Site vitrine Maison Vasseur — acompte 30 %", "currency": "EUR", "invoice_number": "FA-2026-0158"}'::jsonb,'2026-07-15 09:00:00+00','2026-08-01 08:10:15.443637+00','2026-08-01 08:09:37.319908+00'),
  ('adeccd97-8a27-4a7a-8231-ae194488c9a5','invoice','FA-2026-0166','a1000000-0000-4000-8000-000000000001','unpaid',104300,'{"date": "2026-08-01", "label": "Site vitrine Maison Vasseur — solde a la livraison", "currency": "EUR", "invoice_number": "FA-2026-0166"}'::jsonb,'2026-08-01 09:00:00+00','2026-08-01 08:10:15.443637+00','2026-08-01 08:10:15.443637+00'),
  ('4e1b26e8-fc3b-44ac-b742-13971e300a8e','quote','DE-2026-0047','a1000000-0000-4000-8000-000000000001','pending',89000,'{"date": "2026-07-31", "label": "Option — prise de commande en ligne pour les abonnements pro", "quote_type": "one_direct_deposit", "quote_number": "DE-2026-0047", "currency_amount_before_tax": "890.00"}'::jsonb,'2026-07-31 11:20:00+00','2026-08-01 08:10:33.087992+00','2026-08-01 08:10:33.087992+00'),
  ('47fae0d3-eeb8-495e-89d9-208dd3f4e732','quote','DE-2026-0048','b2000000-0000-4000-8000-000000000002','draft',132000,'{"date": "2026-08-01", "label": "Cockpit chantiers — vue planning 6 semaines (brouillon)", "quote_type": "one_direct_deposit", "quote_number": "DE-2026-0048", "currency_amount_before_tax": "1320.00"}'::jsonb,'2026-08-01 08:45:00+00','2026-08-01 08:10:33.087992+00','2026-08-01 08:10:33.087992+00');

insert into public.coaching_credit_ledger (id, client_id, delta, reason, note, created_by, meeting_id, created_at) values
  ('3c0ea9b5-8d10-4ab6-8117-14f637a6a623','b2000000-0000-4000-8000-000000000002',1,'initial_grant','Ouverture de l''abonnement One+','system',NULL,'2026-05-12 15:00:00+00'),
  ('e4ef2986-dcc9-46d6-8caf-7b61b3fbde24','b2000000-0000-4000-8000-000000000002',1,'monthly_accrual','Crédit mensuel — juin 2026','system',NULL,'2026-06-01 06:00:00+00'),
  ('7bbd6aa9-d957-4845-99a5-e2b4d2304f71','b2000000-0000-4000-8000-000000000002',-1,'session_booked','Prise en main de l''outil','system',NULL,'2026-06-20 15:00:00+00'),
  ('ddf2b0ad-ed96-493e-89c4-52007e9ea51c','b2000000-0000-4000-8000-000000000002',1,'monthly_accrual','Crédit mensuel — juillet 2026','system',NULL,'2026-07-01 06:00:00+00'),
  ('2870ef76-7e98-4123-84c9-c8ef24df926f','b2000000-0000-4000-8000-000000000002',-1,'session_booked','Coaching mensuel — juillet','system',NULL,'2026-07-01 09:00:00+00'),
  ('e3bc70d3-cb26-4536-a621-0b60f4a4ce71','b2000000-0000-4000-8000-000000000002',1,'monthly_accrual','Crédit mensuel — août 2026','system',NULL,'2026-07-31 06:00:00+00'),
  ('3af0623e-3bb3-43ef-ac65-4bd09dc88fb4','b2000000-0000-4000-8000-000000000002',1,'monthly_accrual',NULL,'monthly-billing',NULL,'2026-08-01 05:00:06.230626+00'),
  ('72c8fc46-8eba-4be3-9b30-0732eb8fbb10','b2000000-0000-4000-8000-000000000002',1,'monthly_accrual',NULL,'monthly-billing',NULL,'2026-09-01 05:00:08.924959+00');
