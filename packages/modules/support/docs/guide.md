# Module Support — Guide

## Vue d'ensemble

Le module Support permet aux clients MonprojetPro de signaler des problèmes, poser des questions ou faire des suggestions directement depuis leur dashboard. Il inclut également une FAQ en ligne.

## Fonctionnalités

- **Signalement** : Dialog pour créer un ticket (bug, question, suggestion) avec jusqu'à 3 pièces jointes optionnelles (captures d'écran, PDF)
- **Mes signalements** : Liste des tickets du client avec statut en temps réel, accessible aussi via le bouton "+" de l'onglet
- **Icône d'alerte (Lab)** : raccourci vers le signalement dans la barre d'en-tête, à côté de la cloche de notification
- **FAQ** : Page d'aide avec catégories, recherche et liens vers le support
- **Vue Hub** : MiKL voit tous les tickets dans le CRM et peut changer le statut

## Utilisation

### Signaler un problème (client)

1. Ouvrir le dialog depuis l'icône d'alerte du header (Lab), le bouton en bas de la FAQ, ou le "+" de l'onglet "Mes signalements"
2. Choisir le type (Bug, Question, Suggestion)
3. Remplir le sujet et la description
4. Optionnel : joindre jusqu'à 3 pièces jointes (images ou PDF, 10 Mo max chacune avant compression — les images sont compressées automatiquement)
5. Soumettre → upload direct vers Supabase Storage, puis notification envoyée à MiKL

### Gérer les tickets (MiKL)

1. Accéder au CRM > onglet Support du client
2. Voir la liste des tickets triée par statut
3. Changer le statut : open → in_progress → resolved → closed
