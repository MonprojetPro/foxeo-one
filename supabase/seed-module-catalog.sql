-- Story 13.5: Seed initial du catalogue de modules
-- A executer une fois apres la migration 00088
-- Les prix sont indicatifs et editables depuis le Hub

INSERT INTO module_catalog (module_key, name, description, category, kind, setup_price_ht, monthly_price_ht, is_default, is_active, manifest_path) VALUES

-- === Modules du One de base (is_default = true) ===
('core-dashboard', 'Dashboard', 'Tableau de bord principal — accueil personnalise, navigation, metriques cles', 'business', 'catalog', 0, 0, true, true, 'packages/modules/core-dashboard/manifest.ts'),
('chat', 'Chat', 'Messagerie temps reel entre MiKL et le client — texte, fichiers, notifications', 'communication', 'catalog', 0, 0, true, true, 'packages/modules/chat/manifest.ts'),
('documents', 'Documents', 'Gestion documentaire — upload, telechargement, partage, classement par tags', 'business', 'catalog', 0, 0, true, true, 'packages/modules/documents/manifest.ts'),
('elio', 'Elio — Assistant IA', 'Agent IA conversationnel — guidance, FAQ, generation de documents, alertes proactives', 'integration', 'catalog', 0, 0, true, true, 'packages/modules/elio/manifest.ts'),

-- === Modules supplementaires (is_default = false) ===
('crm', 'CRM', 'Gestion de la relation client — fiches, historique, suivi, onglets modulaires', 'business', 'catalog', 500, 49, false, true, 'packages/modules/crm/manifest.ts'),
('facturation', 'Comptabilite', 'Facturation, devis, abonnements — integration Pennylane, suivi paiements', 'business', 'catalog', 800, 79, false, true, 'packages/modules/facturation/manifest.ts'),
('visio', 'Visioconference', 'Appels video integres — OpenVidu, planification, enregistrement', 'communication', 'catalog', 300, 29, false, true, 'packages/modules/visio/manifest.ts'),
('email', 'Email', 'Integration Gmail — lecture, envoi, reponse, gestion threads depuis le Hub', 'communication', 'catalog', 200, 19, false, true, 'packages/modules/email/manifest.ts'),
('validation-hub', 'Validation Hub', 'File d attente des demandes client — validation, refus, commentaires, workflows', 'business', 'catalog', 400, 39, false, true, 'packages/modules/validation-hub/manifest.ts'),
('analytics', 'Analytics', 'Tableaux de bord analytiques — metriques, tendances, KPIs operateur', 'business', 'catalog', 300, 29, false, true, 'packages/modules/analytics/manifest.ts'),
('templates', 'Templates', 'Bibliotheque de templates — documents, emails, briefs reutilisables', 'business', 'catalog', 200, 0, false, true, 'packages/modules/templates/manifest.ts'),
('notifications', 'Notifications', 'Systeme de notifications — temps reel, email, in-app, preferences', 'integration', 'catalog', 0, 0, false, true, 'packages/modules/notifications/manifest.ts'),
('parcours', 'Parcours Lab', 'Parcours d incubation Lab — etapes, briefs, soumissions, graduation', 'business', 'catalog', 0, 0, false, true, 'packages/modules/parcours/manifest.ts'),
('support', 'Support', 'Module support client — tickets, FAQ, assistance', 'communication', 'catalog', 100, 9, false, true, 'packages/modules/support/manifest.ts'),
('admin', 'Administration', 'Administration systeme — provisioning, monitoring, logs, maintenance, impersonation', 'integration', 'catalog', 0, 0, false, true, 'packages/modules/admin/manifest.ts')

ON CONFLICT (module_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  manifest_path = EXCLUDED.manifest_path,
  updated_at = NOW();
