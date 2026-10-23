# Module CII — Assistant de reformulation

Module interne Hub (opérateur uniquement) qui transforme une liste de fonctions dev
en lignes de devis/facture conformes au format officiel du Crédit d'Impôt Innovation.

## Utilisation

1. Dans la fiche client, onglet « CII », uploade un fichier texte listant les fonctions
   développées, une par ligne, avec le temps en fin de ligne (ex. `Export PDF — 2h` ou
   `Module de paiement : 1.5j`). Le temps n'est jamais estimé par l'IA — il doit être
   fourni dans le fichier, sinon la ligne reste à corriger manuellement.
2. Ajuste le TJM si besoin (300 € par défaut, toujours modifiable).
3. Clique « Générer la reformulation IA » — chaque fonction est reformulée au format
   Action + Innovation + Technologie + Bénéfice (voir `agrement CII/CONSIGNES-CII-HUB.md`).
4. Relis et corrige chaque ligne (temps, texte) avant de sélectionner les lignes à transférer.
5. « Préparation devis » ou « Préparation facture » envoie les lignes sélectionnées vers
   les écrans existants du module Comptabilité (`createAndSendQuote` / `createInvoice`) —
   aucun nouveau moteur de facturation.

```tsx
import { CiiReformulationTab } from '@monprojetpro/modules-cii'

<CiiReformulationTab clientId={client.id} clientProjects={projects} />
```

## Dépendances

Ce module appelle `createAndSendQuote` et `createInvoice` du module `facturation` —
dépendance directe assumée (même pattern que `admin/generate-quote-from-modules-modal.tsx`)
pour éviter de dupliquer le moteur de facturation.
