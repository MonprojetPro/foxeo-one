# Core Dashboard — Guide

## Description

Module d'accueil principal pour tous les dashboards MonprojetPro (Hub, Lab, One).
Affiche une vue d'ensemble personnalisee selon le type de dashboard et le role utilisateur.

## Fonctionnalites

- Page d'accueil avec metriques cles
- Navigation vers les modules actifs
- Vue personnalisee par dashboard (Hub/Lab/One)

## Utilisation

Le module est auto-decouvert par le registry via son `manifest.ts`.
Il est charge dynamiquement dans la route `/modules/core-dashboard`.
