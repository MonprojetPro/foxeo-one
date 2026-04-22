-- Seed: Donnees initiales MonprojetPro
-- Story: 1.2 — Migrations Supabase fondation

-- Operateur MiKL (fondateur)
INSERT INTO operators (id, email, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'mikl@monprojet-pro.com',
  'MiKL',
  'operator'
);

-- Client demo pour le developpement
INSERT INTO clients (id, operator_id, email, name, company, sector, client_type, status)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'demo@example.com',
  'Client Demo',
  'Demo Corp',
  'Tech',
  'complet',
  'active'
);

-- Configuration client demo : dashboard Lab avec module socle
INSERT INTO client_configs (client_id, operator_id, active_modules, dashboard_type, theme_variant)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  ARRAY['core-dashboard', 'chat', 'documents', 'visio'],
  'lab',
  'lab'
);

-- Consentement CGU initial pour le client demo
INSERT INTO consents (client_id, consent_type, accepted, version, ip_address)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'cgu',
  true,
  '1.0',
  '127.0.0.1'
);

-- Log de creation du client demo
INSERT INTO activity_logs (actor_type, actor_id, action, entity_type, entity_id, metadata)
VALUES (
  'operator',
  '00000000-0000-0000-0000-000000000001',
  'create_client',
  'client',
  '00000000-0000-0000-0000-000000000010',
  '{"source": "seed", "note": "Client demo pour le developpement"}'::jsonb
);
