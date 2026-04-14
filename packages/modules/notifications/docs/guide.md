# Module Notifications — Guide

## Vue d'ensemble

Le module Notifications fournit l'infrastructure de notifications in-app temps réel pour tous les dashboards MonprojetPro (Hub, Lab, One).

## Architecture

- **Table** : `notifications` (multi-recipient : client & operator)
- **Temps réel** : Supabase Realtime → invalidation TanStack Query
- **Communication inter-modules** : Les autres modules créent des notifications via insert direct dans Supabase (pas d'import du module notifications)

## Composants

| Composant | Usage |
|-----------|-------|
| `NotificationBadge` | Badge compteur non lues dans le header |
| `NotificationCenter` | Panneau/dropdown avec liste des notifications |
| `NotificationItem` | Ligne individuelle dans le centre |
| `NotificationToast` | Toast éphémère pour nouvelles notifications |

## Hooks

| Hook | QueryKey |
|------|----------|
| `useNotifications(recipientId)` | `['notifications', recipientId]` |
| `useUnreadCount(recipientId)` | `['notifications', recipientId, 'unread-count']` |
| `useNotificationsRealtime(recipientId)` | N/A (souscription Realtime) |

## Server Actions

| Action | Description |
|--------|-------------|
| `getNotifications` | Liste paginée, ordonnée DESC |
| `getUnreadCount` | Compteur notifications non lues |
| `markAsRead` | Marquer une notification comme lue |
| `markAllAsRead` | Tout marquer comme lu |
| `createNotification` | Créer une notification (usage inter-modules) |

## Intégration dans un dashboard

```tsx
// Dans le layout dashboard
<DashboardShell header={<NotificationBadge recipientId={userId} />}>
  {children}
</DashboardShell>
```

## Créer une notification depuis un autre module

```typescript
// DIRECTEMENT via Supabase — PAS d'import du module notifications
const { error } = await supabase.from('notifications').insert({
  recipient_type: 'client',
  recipient_id: clientId,
  type: 'validation',
  title: 'Brief validé',
  body: 'Votre brief a été validé par MiKL',
  link: '/parcours/etape-3',
})
```
