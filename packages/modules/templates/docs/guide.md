# Guide — Module Templates

## Vue d'ensemble

Le module Templates permet à MiKL de :
1. Créer et gérer des templates de parcours Lab réutilisables
2. Personnaliser les emails automatiques de la plateforme

## Templates Parcours Lab

Un template parcours définit une séquence d'étapes (stages) réutilisables pour l'onboarding des clients Lab.

### Créer un template
- Cliquer sur "Nouveau template"
- Définir un nom, une description et un type (`complet`, `partiel`, `ponctuel`)
- Ajouter au minimum 2 étapes
- Chaque étape a un titre, une description et un ordre
- Utiliser les boutons "↑" / "↓" pour réordonner les étapes

### Modifier un template
- Cliquer sur "Modifier" sur la ligne du template
- Les modifications ne touchent PAS les parcours en cours (copie au moment de l'assignation)

### Dupliquer un template
- Cliquer sur "Dupliquer" pour créer une copie avec le préfixe "[Copie] "

### Archiver un template
- Cliquer sur "Archiver" pour désactiver le template (non suppression)
- Les parcours en cours ne sont pas affectés

## Templates Emails

Les emails automatiques sont personnalisables via l'onglet "Emails".

### Templates disponibles
| Clé | Déclencheur |
|-----|-------------|
| `bienvenue_lab` | Première connexion Lab |
| `brief_valide` | Brief validé par MiKL |
| `brief_refuse` | Brief refusé par MiKL |
| `graduation` | Graduation Lab → One |
| `facture_envoyee` | Facture envoyée |
| `echec_paiement` | Paiement échoué |
| `rappel_parcours` | Client Lab inactif |

### Variables disponibles
- `{prenom}` — Prénom/nom du client
- `{titre_brief}` — Titre du brief concerné
- `{commentaire}` — Commentaire MiKL
- `{lien}` — Lien vers la plateforme
- `{montant}` — Montant de la facture

### Réinitialiser au défaut
Cliquer sur "Réinitialiser" pour restaurer le template d'origine.
