# Flows — Module Templates

## Flow 1 : Créer un template parcours

```
MiKL → "Nouveau template" → Renseigne nom + description + type
  → Ajoute étapes (min 2) → Réordonne si besoin
  → "Sauvegarder"
  → Server Action saveParcourTemplate() → UPSERT parcours_templates
  → Toast succès → Retour à la liste
```

## Flow 2 : Assigner un template à un client

```
MiKL → CRM → Fiche client → "Assigner parcours"
  → Sélectionne un template actif
  → COPIE du template au moment de l'assignation (parcours.active_stages = template.stages)
  → Client voit son parcours dans Lab
```

## Flow 3 : Personnaliser un email automatique

```
MiKL → Templates → Onglet "Emails"
  → Sélectionne un template (ex: brief_valide)
  → Modifie sujet + corps
  → Insère variables via boutons ({prenom}, etc.)
  → Prévisualise le rendu
  → "Sauvegarder"
  → Server Action saveEmailTemplate() → UPDATE email_templates
  → Prochain email de ce type utilise la version personnalisée
```

## Flow 4 : Envoi email avec template personnalisé

```
Événement (brief validé) → Notification créée
  → Edge Function send-email invoquée
  → Handler vérifie email_templates DB pour template_key "brief_valide"
  → Si trouvé : substitution variables {prenom}→recipient.name, etc.
  → Sinon : fallback template hardcodé
  → Email envoyé via Resend
```
