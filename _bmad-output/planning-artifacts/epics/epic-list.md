# Epic List

## Epic 1 : Fondation Plateforme & Authentification
MiKL et les clients peuvent acceder aux dashboards MonprojetPro de maniere securisee avec isolation des donnees, design responsive et dark mode "Minimal Futuriste". Setup monorepo + packages partages, migrations Supabase, dashboard shell avec module registry, auth (2FA MiKL, login client), RLS Lab, middleware, CGU/consentements, multi-device, etats vides, messages confirmation, robustesse. **Modele dual** : Lab multi-tenant (RLS) + One instance par client. Communication Hub↔Instances via API REST + HMAC.
**FRs couverts:** FR52, FR53, FR54, FR55, FR56, FR73, FR82, FR108, FR112, FR113, FR114, FR117, FR118, FR119, FR134, FR140, FR141, FR142, FR143, FR151, FR152, **FR155**

## Epic 2 : Gestion de la Relation Client (CRM Hub)
MiKL peut creer, gerer et piloter l'ensemble de son portefeuille clients depuis le Hub avec recherche, rappels, statistiques et gestion du cycle de vie.
**FRs couverts:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR79, FR80, FR81, FR84, FR85, FR89, FR90, FR106, FR130, FR131, FR132, FR133, FR149

## Epic 3 : Communication Temps Reel & Notifications
MiKL et les clients communiquent en temps reel via chat asynchrone avec un systeme de notifications complet (email + in-app), indicateur de presence et support/FAQ.
**FRs couverts:** FR57, FR61, FR99, FR100, FR101, FR109, FR110, FR111, FR127, FR128, FR129

## Epic 4 : Gestion Documentaire
Clients et MiKL peuvent gerer, visualiser, partager et exporter des documents avec viewer HTML, PDF, recherche, autosave et organisation en dossiers.
**FRs couverts:** FR62, FR63, FR64, FR65, FR86, FR107, FR135, FR136, FR144, FR145, FR146, FR150

## Epic 5 : Visioconference & Onboarding Prospect
MiKL conduit des visios enregistrees/transcrites avec prospects/clients via OpenVidu, et les nouveaux prospects vivent un parcours d'onboarding fluide (Cal.com, salle d'attente, post-visio).
**FRs couverts:** FR58, FR59, FR60, FR70, FR71, FR72

## Epic 6 : Parcours Lab — Accompagnement Creation
Les clients en creation suivent un parcours structure guide par Elio Lab, qui pose les questions, genere et soumet les briefs automatiquement au Validation Hub.
**FRs couverts:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37

## Epic 7 : Validation Hub
MiKL examine, valide ou refuse les soumissions clients via un workflow structure avec contexte complet et choix d'actions de traitement.
**FRs couverts:** FR8, FR9, FR10, FR11, FR12, FR13, FR14

## Epic 8 : Agents IA Elio (Hub, Lab, One)
MiKL et les clients beneficient d'une assistance IA contextuelle adaptee a leur role avec profil de communication personnalise, historique persistant et feedback.
**FRs couverts:** FR21, FR22, FR23, FR24, FR25, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR66, FR67, FR68, FR69, FR83, FR87, FR122, FR123, FR124, FR125, FR126

## Epic 9 : Graduation Lab vers One & Cycle de Vie Client
Les clients transitent de Lab vers One avec **provisioning d'une instance dediee** (Supabase + Vercel) et migration complete du contexte. MiKL gere le cycle de vie complet (abandon, changement tier, export RGPD, retention). **Le client quitte One** avec code + DB + documentation. Lab = propriete MonprojetPro (client recupere uniquement ses documents).
**FRs couverts:** FR74, FR75, FR76, FR88, FR91, FR92, FR93, **FR157, FR161, FR166, FR167, FR168**

## Epic 10 : Dashboard One & Modules Commerciaux
Les clients etablis accedent a un dashboard personnalise **deploye sur leur instance dediee** avec des modules metier activables (signature Yousign, calendrier sync, branding, site web, SEO, reseaux sociaux, maintenance). **Le client est proprietaire** de son code et de ses donnees.
**FRs couverts:** FR38, FR39, FR40, FR41, FR42, FR43, FR139, **FR154**

## Epic 11 : Facturation & Abonnements
MiKL et les clients gerent devis, factures et abonnements via Pennylane API v2 (SaaS) avec Stripe connecte pour les paiements CB. Synchronisation par polling intelligent (Edge Function cron 5min). Inclut le forfait Lab a 199€ (paiement unique, deduction setup One). Conformite facturation electronique sept. 2026 geree nativement par Pennylane.
**FRs couverts:** FR77, FR78, FR94, FR95, FR96, FR97, FR98, **FR169, FR170**

## Epic 12 : Administration, Analytics, Templates & Monitoring Instances
MiKL pilote la plateforme avec outils d'administration, **monitoring des instances One** (usage, seuils, upgrade), analytics, templates personnalisables, **verification documentation obligatoire** et preparation des integrations futures. **Provisioning** de nouvelles instances One depuis le Hub.
**FRs couverts:** FR102, FR103, FR104, FR105, FR115, FR116, FR120, FR121, FR137, FR138, FR147, FR148, **FR155, FR156, FR158, FR159, FR160, FR162, FR163, FR164, FR165**

---
