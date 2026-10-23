# FAQ — Module CII

**Pourquoi le temps n'est-il jamais estimé par l'IA ?**
Décision de MiKL (23-10) : le temps doit venir directement du fichier uploadé (fourni par
l'autre Claude/Cursor qui a développé les fonctions). L'IA reformule le texte, jamais le temps.

**Que se passe-t-il si une ligne n'a pas de temps dans le fichier ?**
Elle reste visible avec un avertissement et `time_days` à `null` — MiKL la corrige manuellement
avant de pouvoir la sélectionner pour un transfert (le transfert refuse une ligne sans temps).

**Le TJM est-il le même pour toutes les lignes d'un import ?**
Oui, un TJM par import (300 € par défaut), modifiable à tout moment — il recalcule le montant
affiché de toutes les lignes de cet import.

**Que se passe-t-il après « Préparation devis/facture » ?**
Les lignes sélectionnées sont transformées en `LineItem` et envoyées à `createAndSendQuote` ou
`createInvoice` (module Comptabilité) — le devis/la facture apparaît ensuite dans Comptabilité
comme n'importe quel autre, à relire par MiKL avant envoi final.

**Le client voit-il cet onglet ?**
Non — module strictement opérateur (`targets: ['hub']`), comme Comptabilité et CRM.
