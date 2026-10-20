# FAQ — Module CRM

## Questions fréquentes

### Recherche et filtres

**Q: Comment rechercher un client rapidement ?**
R: Utilisez le champ de recherche en haut de la liste. La recherche porte sur le nom, l'entreprise, l'email et le secteur d'activité. Les résultats apparaissent en temps réel.

**Q: Puis-je combiner plusieurs filtres ?**
R: Oui, tous les filtres sont combinables entre eux et avec la recherche. Utilisez le bouton "Réinitialiser les filtres" pour tout effacer.

**Q: La recherche est-elle sensible à la casse ?**
R: Non, la recherche ignore la casse (majuscules/minuscules).

### Liste vide

**Q: Que faire si la liste est vide ?**
R: Si vous n'avez pas encore de clients, cliquez sur le bouton "Créer un client" pour créer votre première fiche. Si vous avez des clients mais que la liste est vide, vérifiez vos filtres actifs.

**Q: Pourquoi je ne vois pas tous mes clients ?**
R: Vérifiez que des filtres ne sont pas actifs. Si des filtres sont appliqués, un indicateur apparaît avec un bouton pour les réinitialiser.

### Création et édition

**Q: Que faire si l'email est déjà utilisé ?**
R: Chaque email doit être unique par opérateur. Si un message d'erreur s'affiche indiquant que l'email est déjà associé à un client, utilisez un email différent ou retrouvez le client existant via la recherche.

**Q: Comment modifier un client ?**
R: Accédez à la fiche du client, puis cliquez sur le bouton "Modifier". Le formulaire s'ouvrira pré-rempli avec les données actuelles. Modifiez les champs souhaités et cliquez sur "Enregistrer".

**Q: Puis-je changer le type de client ?**
R: Oui, le type de client (Complet, Direct One, Ponctuel) peut être modifié à tout moment via le formulaire d'édition.

**Q: Que se passe-t-il en cas d'erreur lors de la création ?**
R: Un message d'erreur s'affiche en haut du formulaire. Vos données saisies sont conservées — vous ne perdez rien. Corrigez l'erreur et réessayez.

### Performance

**Q: Combien de clients puis-je avoir dans la liste ?**
R: La liste supporte des milliers de clients. La pagination et la recherche intelligente garantissent de bonnes performances même avec un large portefeuille.

**Q: Pourquoi la recherche est-elle parfois plus lente ?**
R: Si vous avez plus de 500 clients, la recherche utilise une requête serveur optimisée. Cela peut prendre jusqu'à 1 seconde, mais garantit des résultats précis même avec un grand volume.

### Fiche client

**Q: Comment voir l'historique d'un client ?**
R: Ouvrez la fiche du client en cliquant dessus dans la liste, puis cliquez sur l'onglet **"Historique"**. Vous verrez une timeline chronologique de tous les événements : création, changements de statut, validations, visios, etc.

**Q: Où trouver les documents partagés avec un client ?**
R: Dans la fiche du client, cliquez sur l'onglet **"Documents"**. Vous y verrez la liste de tous les documents partagés (briefs, livrables, rapports) avec leur statut de visibilité.

**Q: Comment partager un lien vers un onglet spécifique de la fiche client ?**
R: L'onglet actif est automatiquement reflété dans l'URL (ex: `?tab=historique`). Copiez simplement l'URL du navigateur et partagez-la. Le destinataire arrivera directement sur le bon onglet.

**Q: Pourquoi certains onglets affichent "Aucun document" ou "Aucun échange" ?**
R: Les onglets Documents et Échanges afficheront du contenu une fois que les modules correspondants (Documents et Chat) seront activés et que des données auront été créées pour ce client.

### Notes privées

**Q: Les notes privées sont-elles visibles par le client ?**
R: Non, absolument pas. Les notes privées sont strictement réservées à votre usage interne. Le client ne peut ni les voir ni en être informé.

**Q: Puis-je modifier ou supprimer une note après l'avoir créée ?**
R: Oui, chaque note dispose d'un menu contextuel (trois points) permettant de la modifier ou de la supprimer. La suppression demande une confirmation.

**Q: Y a-t-il une limite au nombre de notes par client ?**
R: Non, vous pouvez ajouter autant de notes que nécessaire. Elles sont ordonnées de la plus récente à la plus ancienne pour faciliter la lecture.

**Q: Les notes sont-elles limitées en taille ?**
R: Chaque note peut contenir jusqu'à 5000 caractères, ce qui est largement suffisant pour des annotations détaillées.

### Épinglage et report de clients

**Q: Combien de clients puis-je épingler ?**
R: Aucune limite. Cependant, pour que l'épinglage reste utile, il est recommandé de ne garder épinglés que vos clients actifs prioritaires.

**Q: Que se passe-t-il quand j'épingle plusieurs clients ?**
R: Tous les clients épinglés apparaissent en haut de la liste, triés par date de création (les plus récents en premier). Les clients non-épinglés apparaissent ensuite.

**Q: Comment savoir quand un client reporté doit être traité ?**
R: L'indicateur "Reporté" disparaît automatiquement une fois la date de rappel passée. Vous pouvez consulter votre liste de clients pour voir lesquels ne sont plus reportés.

**Q: Puis-je modifier la date de report d'un client ?**
R: Oui, cliquez à nouveau sur "À traiter plus tard" et choisissez une nouvelle date. Vous pouvez également annuler complètement le report.

**Q: Le report d'un client affecte-t-il son parcours ou ses accès ?**
R: Non, le report est uniquement un indicateur visuel pour votre organisation personnelle. Il n'a aucun impact sur le parcours, les accès ou les fonctionnalités du client.

### Parcours et accès

**Q: Comment assigner un parcours Lab à un client ?**
R: Ouvrez la fiche du client, onglet Informations. Dans la section "Parcours & Accès", cliquez sur "Assigner un parcours Lab". Sélectionnez un template et configurez les étapes actives.

**Q: Que se passe-t-il si je désactive l'accès Lab d'un client en parcours ?**
R: Le parcours est suspendu (pas supprimé). L'état courant est préservé. Si vous réactivez l'accès Lab, le parcours reprend exactement là où il en était.

**Q: Puis-je modifier les étapes d'un parcours après l'assignation ?**
R: Dans cette version, les étapes sont configurées lors de l'assignation. La modification post-assignation sera disponible dans une future story.

**Q: Pourquoi je ne vois pas de templates de parcours ?**
R: Les templates sont créés par l'opérateur. Un template "Parcours Complet" est disponible par défaut. Le CRUD complet des templates sera disponible via le module Templates (Epic 12).

**Q: Quel est l'effet de la désactivation de l'accès One ?**
R: Le client perd l'accès à son dashboard One. Le dashboard_type est modifié en conséquence. L'action est tracée dans les logs d'activité.

### Suspension, clôture et réactivation

**Q: Quelle est la différence entre "Suspendre" et "Clôturer" un client ?**
R: **Suspendre** est une action temporaire réversible (ex: en attente de paiement). **Clôturer** est une action permanente qui archive définitivement les données en lecture seule (ex: fin de mission). Les deux peuvent être réactivés, mais la clôture nécessite une double validation.

**Q: Pourquoi la clôture nécessite-t-elle une double validation ?**
R: Pour éviter les clôtures accidentelles. Vous devez saisir le nom exact du client pour confirmer l'action. Cette sécurité garantit que vous êtes conscient des conséquences (archivage en lecture seule).

**Q: Que se passe-t-il avec les données d'un client clôturé ?**
R: Toutes les données sont conservées et archivées en lecture seule. Vous pouvez consulter la fiche (onglets Informations, Historique, Documents, Échanges) mais vous ne pouvez plus modifier ni supprimer quoi que ce soit. Le client n'apparaît plus dans la liste par défaut.

**Q: Comment accéder à un client clôturé ?**
R: Utilisez le filtre "Statut" → "Clôturé" dans la liste des clients. Les clients clôturés sont exclus par défaut pour éviter l'encombrement de la liste.

**Q: Puis-je clôturer un client qui est déjà suspendu ?**
R: Oui, vous pouvez clôturer un client depuis n'importe quel statut (actif ou suspendu). La clôture est toujours disponible via le bouton rouge "Clôturer" dans le header de la fiche.

**Q: Est-il possible de réactiver un client clôturé ?**
R: Oui, vous pouvez réactiver un client clôturé à tout moment. Sur la fiche d'un client clôturé, un bandeau d'information affiche un bouton "Réactiver". La réactivation repasse le statut à "Actif" et restaure tous les droits d'édition.

**Q: Que se passe-t-il quand je réactive un client suspendu ?**
R: Le statut repasse à "Actif" immédiatement, le client peut à nouveau accéder à son dashboard, et tous les boutons d'édition sont réactivés. L'action est tracée dans les logs d'activité.

**Q: La réactivation nécessite-t-elle une confirmation ?**
R: Non, la réactivation est immédiate (un seul clic). Elle est considérée comme une action moins risquée que la suspension ou la clôture.

**Q: Puis-je ajouter une raison lors de la suspension ?**
R: Oui, le dialog de suspension propose un champ optionnel "Raison" (max 500 caractères). Cette raison est stockée mais n'est pas affichée dans l'interface pour le moment. Elle sera disponible dans les logs d'activité détaillés.

**Q: Les dates de suspension/clôture sont-elles conservées après réactivation ?**
R: Non, lors de la réactivation, les champs `suspended_at` et `archived_at` sont effacés. L'historique des événements (activity_logs) conserve la trace des actions, mais les timestamps de statut sont nettoyés.

**Q: Un client clôturé peut-il envoyer des messages ou accéder à son espace ?**
R: Non, un client clôturé perd tout accès à son dashboard (Lab ou One). Il ne peut ni se connecter, ni envoyer de messages, ni accéder à ses données.

**Q: Puis-je supprimer définitivement un client au lieu de le clôturer ?**
R: Non, le système ne permet pas la suppression définitive des clients. La clôture est l'action la plus forte disponible. Si vous devez réellement supprimer des données client (conformité RGPD), cela sera géré via le module d'export/anonymisation (Epic 9).

### Alertes d'inactivité

**Q: Qu'est-ce qu'une alerte d'inactivité ?**
R: Lorsqu'un client Lab n'a aucune activité (login, message, soumission) depuis un certain nombre de jours, une notification est automatiquement créée pour vous alerter. Cela évite qu'un client Lab ne tombe dans l'oubli.

**Q: Comment configurer le seuil d'inactivité ?**
R: Le seuil est configurable par opérateur (défaut : 7 jours). Modifiez la valeur `inactivity_threshold_days` dans vos paramètres opérateur. La détection est exécutée quotidiennement à 8h via une Edge Function Supabase.

**Q: Est-ce que je recevrai plusieurs alertes pour le même client ?**
R: Non, une seule alerte est envoyée par période d'inactivité. Un flag `inactivity_alert_sent` empêche les doublons. Si le client redevient actif (nouvelle entrée dans les logs d'activité), le flag est automatiquement réinitialisé.

**Q: Que puis-je faire depuis une notification d'inactivité ?**
R: Quatre actions sont possibles : ouvrir la fiche client, envoyer un message via Chat (lien préparé, Epic 3), reporter le client ("À traiter plus tard", Story 2.6), ou ignorer l'alerte (la marquer comme lue).

**Q: Les alertes concernent-elles tous les types de clients ?**
R: Non, seuls les clients Lab actifs (avec un `dashboard_type` incluant "lab") sont concernés par les alertes d'inactivité.

### Import CSV

**Q: Quel format de fichier est accepté pour l'import ?**
R: Uniquement les fichiers CSV (`.csv`). Un template téléchargeable est disponible via le bouton "Télécharger le template CSV" dans le dialog d'import.

**Q: Quelles sont les colonnes du template CSV ?**
R: `nom` (obligatoire), `email` (obligatoire), `entreprise`, `telephone`, `secteur`, `type_client` (complet, direct_one, ponctuel — défaut : ponctuel).

**Q: Que se passe-t-il si un email existe déjà ?**
R: Avant l'import, les emails sont vérifiés en batch côté serveur. Les lignes avec des emails déjà présents pour votre compte opérateur sont marquées comme "Email déjà existant" et sont ignorées lors de l'import.

**Q: Comment sont gérées les erreurs dans le CSV ?**
R: L'aperçu affiche chaque ligne avec un code couleur : vert (valide), rouge (erreur). Les erreurs détaillées sont visibles par ligne (email invalide, champ obligatoire manquant, type client invalide). Vous pouvez exclure les lignes en erreur avant de confirmer l'import.

**Q: Puis-je exclure des lignes valides de l'import ?**
R: Oui, dans l'aperçu, chaque ligne valide dispose d'une case à cocher. Décochez les lignes que vous ne souhaitez pas importer.

**Q: Y a-t-il une limite au nombre de lignes ?**
R: Aucune limite stricte. Au-delà de 500 lignes, le traitement peut être plus long. L'import est effectué en batch pour garantir de bonnes performances.

**Q: Quelles configurations sont créées automatiquement pour les clients importés ?**
R: Chaque client importé reçoit automatiquement une `client_configs` avec les modules par défaut (`core-dashboard`) et un `dashboard_type` correspondant à son type client (lab pour complet, one pour direct_one).

**Q: Le parsing du CSV gère-t-il les cas spéciaux ?**
R: Oui, le parser gère : l'encodage UTF-8 avec BOM, les retours chariot Windows (`\r\n`), les valeurs entre guillemets contenant des virgules, les guillemets échappés (`""`), et les lignes vides.

### Onglet Projet (dossier local)

**Q: Pourquoi le bouton "Ouvrir dans Cursor" a-t-il disparu ?**
R: Il pointait sur un chemin écrit en dur au format Mac (`/Users/mikl/bmad/clients/...`), jamais valide sous Windows — il n'a jamais fonctionné sur ce poste. Le Hub est hébergé sur Vercel, un serveur distant qui n'a aucun accès au disque de l'opérateur ; aucune intégration de ce type ne peut fonctionner par construction.

**Q: Comment relier un dossier local à un client ?**
R: Dans l'onglet "Projet" de la fiche client, créez un projet (un nom libre), puis cliquez sur "Lier un dossier local". Le sélecteur Windows s'ouvre pour choisir le dossier existant.

**Q: Pourquoi dois-je parfois ré-autoriser l'accès à un dossier déjà lié ?**
R: Le navigateur peut révoquer la permission entre deux sessions. L'onglet affiche "Permission à renouveler" avec un bouton "Autoriser" dans ce cas — rien n'est perdu, la liaison (le handle du dossier) reste enregistrée.

**Q: Le bouton "Lier un dossier local" ne fait rien, que faire ?**
R: Cette fonction demande Chrome ou Edge (la File System Access API n'existe pas dans Firefox). Un message l'indique dans l'onglet.

**Q: Un client peut-il avoir plusieurs projets ?**
R: Oui — autant que nécessaire s'il y a plusieurs chantiers en parallèle. Chaque projet a son propre dossier local.

**Q: Que se passe-t-il si je supprime un projet ?**
R: Seule la liaison dans le Hub disparaît. Le dossier local et son contenu ne sont jamais touchés, et les documents déjà rangés dans ce projet restent référencés (le rattachement repasse simplement à vide).

### Rappels et calendrier

**Q: Les rappels sont-ils partagés avec les clients ?**
R: Non, les rappels sont strictement personnels. Seul l'opérateur peut les voir et les gérer. C'est un outil de planification interne.

**Q: Puis-je créer un rappel sans l'associer à un client ?**
R: Oui, le champ "Client associé" est optionnel. Vous pouvez créer des rappels généraux non liés à un client spécifique.

**Q: Que se passe-t-il si je supprime un client qui a des rappels associés ?**
R: Les rappels restent dans votre liste mais ne sont plus liés à un client (client_id devient null). Vous ne perdez pas vos rappels.

**Q: Comment voir rapidement combien de rappels j'ai en retard ?**
R: Cliquez sur l'onglet "En retard" dans la vue Rappels. Tous les rappels non complétés avec une date passée s'affichent.

**Q: Le calendrier affiche-t-il seulement le mois en cours ?**
R: Non, vous pouvez naviguer librement entre les mois avec les flèches ← →. Le système charge automatiquement les rappels du mois affiché.

**Q: Y a-t-il une limite au nombre de rappels ?**
R: Non, vous pouvez créer autant de rappels que nécessaire. L'affichage du calendrier reste performant même avec des centaines de rappels.

**Q: Puis-je modifier la date d'échéance d'un rappel après sa création ?**
R: Oui, via le menu actions (⋮) → Modifier, vous pouvez changer le titre, la description et la date d'échéance.

**Q: Que signifie "marquer comme complété" ?**
R: C'est une action qui indique que la tâche du rappel est terminée. Le rappel reste visible (en grisé) mais n'apparaît plus dans "À venir" ou "En retard".

**Q: Les rappels complétés sont-ils automatiquement supprimés ?**
R: Non, ils restent dans votre historique. Vous devez les supprimer manuellement si vous souhaitez les retirer définitivement.

**Q: Puis-je "décocher" un rappel complété ?**
R: Oui, cliquez à nouveau sur la checkbox pour le marquer comme non complété. Le rappel redeviendra actif.

### Statistiques et temps passé

**Q: Comment accéder aux statistiques du CRM ?**
R: Depuis le module CRM, utilisez la sous-navigation : Clients | Rappels | **Statistiques**. Vous pouvez aussi accéder directement via l'URL `/modules/crm/stats`.

**Q: Comment est calculé le temps passé par client ?**
R: Le temps est estimé à partir des activités enregistrées : 2 minutes par message envoyé, 5 minutes par validation Hub (approbation ou refus), et la durée réelle des visioconférences. Ces constantes sont configurables.

**Q: Pourquoi le MRR affiche "Module Facturation requis" ?**
R: Le MRR (revenu mensuel récurrent) nécessite le module Facturation (Epic 11). Tant que ce module n'est pas activé, un placeholder est affiché.

**Q: Les statistiques sont-elles en temps réel ?**
R: Les données sont mises en cache pendant 10 minutes pour optimiser les performances. Rechargez la page pour forcer une mise à jour des données.

**Q: Que signifie le taux de graduation ?**
R: C'est le pourcentage de clients ayant un parcours Lab de type "Complet" qui ont gradué vers un dashboard One. Il mesure le taux de conversion de l'accompagnement.

**Q: Puis-je trier le tableau du temps passé ?**
R: Oui, cliquez sur les en-têtes de colonne (Client, Temps total, Dernière activité) pour trier par ordre croissant ou décroissant.

**Q: Le temps passé est-il exact ?**
R: Le temps des visios est exact (durée réelle). Pour les messages et validations, ce sont des estimations moyennes (2 min/message, 5 min/validation) qui donnent un ordre de grandeur fiable.

### Upgrade d'un client Ponctuel

**Q: Quand peut-on upgrader un client Ponctuel ?**
R: Uniquement si le client est de type **Ponctuel** et en statut **Actif**. Les boutons "Upgrader vers Lab" et "Upgrader vers One" n'apparaissent pas pour les clients de type Complet ou Direct One.

**Q: Quelle est la différence entre "Upgrader vers Lab" et "Upgrader vers One" ?**
R: **Upgrader vers Lab** crée un parcours d'incubation (template requis) et passe le type client à "Complet". **Upgrader vers One** active directement le dashboard business et passe le type client à "Direct One".

**Q: Peut-on annuler un upgrade ?**
R: Non, l'upgrade est permanent. Si nécessaire, modifiez manuellement le type de client via le bouton "Modifier".

**Q: Que se passe-t-il si aucun template de parcours n'est disponible pour l'upgrade vers Lab ?**
R: Un message "Aucun template de parcours" s'affiche. Créez d'abord un template via le module Templates (Epic 12), puis revenez pour effectuer l'upgrade.

**Q: Les modules sélectionnés lors de l'upgrade vers One sont-ils définitifs ?**
R: Ils constituent la configuration initiale. Vous pouvez modifier les modules actifs ultérieurement via les accès client (si la fonctionnalité est disponible dans votre version).

**Q: L'upgrade est-il traçable ?**
R: Oui, chaque upgrade génère une entrée dans les logs d'activité (`client_upgraded`) avec le type de cible et les paramètres choisis.

## Besoin d'aide ?

Contactez le support technique via le module d'aide en ligne.
