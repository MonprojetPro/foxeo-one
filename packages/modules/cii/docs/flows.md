# Flows — Module CII

## Flow principal : import → reformulation → transfert

```
MiKL uploade un fichier (fonctions + temps)
  → createCiiImport : parse le fichier (parseCiiFunctionsFile), crée cii_imports + cii_reformulation_lines (status=pending)
  → MiKL clique "Générer la reformulation IA"
    → generateCiiReformulations : un appel Anthropic par import (batch de toutes les lignes), met à jour reformulated_text + status=reformulated
  → MiKL relit/corrige chaque ligne (temps, texte) → updateCiiLine
  → MiKL ajuste le TJM si besoin → updateCiiImportTjm (recalcule l'affichage de toutes les lignes)
  → MiKL sélectionne les lignes prêtes, clique "Préparation devis" ou "Préparation facture"
    → transferCiiLines : construit les LineItem (quantity=time_days, unitPrice=tjm), appelle
      createAndSendQuote ou createInvoice (module facturation), marque les lignes status=transferred
  → Le devis/la facture apparaît dans Comptabilité, à relire et envoyer comme d'habitude
```

## Garde-fous

- `transferCiiLines` refuse si une ligne sélectionnée n'a pas de `reformulated_text` ou de `time_days`.
- Les lignes déjà `transferred` ne sont plus sélectionnables (évite une double facturation).
- RLS : toutes les tables sont réservées à `is_operator()` — le client n'y a jamais accès.
