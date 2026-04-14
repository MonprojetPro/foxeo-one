# Backlog — Fonctionnalités à développer

> Fonctionnalités identifiées en cours de développement, à planifier dans une story dédiée.

---

## Élio — Auto-analyse de la séance de découverte

**Priorité :** Haute  
**Module :** Élio / Visio  
**Contexte :** Lors de la 1ère séance de découverte (visio) avec un nouveau client, la retranscription de l'appel doit être analysée automatiquement par Claude pour en déduire le profil de communication Élio du client (ton, niveau technique, style d'échange, tutoiement, etc.).

**Comportement attendu :**
1. MiKL termine la visio de découverte avec le client
2. La retranscription est disponible (module Visio → OpenVidu ou autre)
3. Un trigger ou action manuelle déclenche l'analyse de la retranscription
4. Claude analyse le texte et extrait les dimensions du `CommunicationProfile` :
   - `levelTechnical` (beginner / intermediaire / advanced)
   - `styleExchange` (direct / conversationnel / formel)
   - `adaptedTone` (formel / pro_decontracte / chaleureux / coach)
   - `messageLength` (court / moyen / detaille)
   - `tutoiement` (boolean)
   - `concreteExamples` (boolean)
   - `avoid` (liste de choses à éviter)
   - `privilege` (liste de choses à privilégier)
   - `styleNotes` (résumé libre)
5. Le profil est pré-rempli dans l'onglet "Config Élio > Profil de communication" de la fiche client
6. MiKL peut revoir, ajuster et valider le profil avant sauvegarde

**Fallback :** Si pas de séance de découverte, MiKL remplit manuellement le formulaire "Profil de communication" dans la fiche client (déjà disponible — Story implémentée le 2026-04-09).

**Dépendances :**
- Module Visio avec accès à la retranscription
- Edge Function ou Server Action d'analyse via Claude API
- Story à créer dans Epic 13 ou epic dédié Visio

**Noté le :** 2026-04-09
