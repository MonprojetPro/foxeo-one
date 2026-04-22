# FAQ — Module Visio

## Q: Pourquoi le meeting s'ouvre dans un nouvel onglet et pas dans l'app ?

**A:** Google Meet n'autorise pas l'intégration dans une iframe pour des raisons de sécurité (politique X-Frame-Options). Ouvrir dans un nouvel onglet est la solution standard — Google Meet dispose de toutes les fonctionnalités natives (qualité vidéo, partage d'écran, mobile, etc.).

## Q: Est-ce que MiKL peut voir le bouton "Rejoindre" avant la date du meeting ?

**A:** Oui. Le lien Google Meet est généré à la création du meeting (pas au démarrage). MiKL et le client peuvent rejoindre à tout moment — Google Meet gèrera l'admission selon la config d'accès (`TRUSTED`).

## Q: Élio peut-il me rappeler mes prochains meetings ?

**A:** Oui. Élio Hub et Élio One/Lab peuvent consulter la liste des meetings via le module Visio et rappeler les prochains RDV programmés.

## Q: Comment un client prend-il RDV ?

**A:** Deux façons :
1. Via le widget **Cal.com** dans l'onglet Visio — il choisit un créneau disponible dans l'agenda MiKL
2. Via le **Chat** — il écrit à MiKL pour proposer des horaires alternatifs si aucun créneau Cal.com ne lui convient

## Q: Où sont stockés les enregistrements ?

**A:** Dans **Google Drive** du compte Workspace MiKL. MonprojetPro ne stocke pas les vidéos — il affiche un lien vers Google Drive. Les transcriptions sont dans **Google Docs**.

## Q: La transcription Gemini est-elle automatique ?

**A:** Oui, si la transcription automatique est activée dans les paramètres de ton compte Google Workspace. Elle apparaît dans MonprojetPro quelques minutes après la fin du meeting (état "En cours de traitement" puis "Disponible").

## Q: Que se passe-t-il si je ferme l'onglet Google Meet sans cliquer "Terminer" dans MonprojetPro ?

**A:** Le meeting reste en statut `in_progress` dans MonprojetPro. Il faut cliquer "Terminer" dans l'interface Hub pour marquer officiellement la fin et déclencher la récupération des enregistrements.

## Q: Le client peut-il rejoindre sans compte Google ?

**A:** Oui, selon la configuration d'accès. Avec `accessType: 'TRUSTED'`, les participants sans compte Google peuvent rejoindre en tant qu'invités (le host MiKL doit les admettre depuis Google Meet).

## Q: Comment configurer les enregistrements automatiques ?

**A:** Dans les paramètres Google Workspace Admin (`admin.google.com`) → Applications → Google Workspace → Meet → Paramètres vidéo → activer "Enregistrement automatique". Ou dans les paramètres de chaque meeting individuellement.
