# Module Chat — Guide

## Vue d'ensemble

Le module Chat fournit une messagerie asynchrone en temps réel entre MiKL (opérateur) et ses clients (Lab ou One).

## Architecture

- **Table DB** : `messages` (append-only, seul `read_at` est modifiable)
- **Realtime** : Supabase Realtime sur la table `messages` → `invalidateQueries()`
- **Cache** : TanStack Query, queryKey `['messages', clientId]`
- **Optimistic update** : message visible immédiatement avant confirmation serveur

## Contextes d'utilisation

| Dashboard | Vue | Comportement |
|-----------|-----|--------------|
| **Hub** (MiKL) | Liste conversations + fenêtre chat | Navigation entre clients |
| **Lab** (client) | Fenêtre chat unique | Un seul interlocuteur : MiKL |
| **One** (client) | Fenêtre chat unique | Un seul interlocuteur : MiKL |

## Utilisation rapide

```tsx
// Hub — liste des conversations
import { ChatList } from '@monprojetpro/modules-chat'

// Client — fenêtre chat
import { ChatWindow } from '@monprojetpro/modules-chat'

// Hook messages
import { useChatMessages } from '@monprojetpro/modules-chat'
const { messages, sendMessage } = useChatMessages(clientId)
```

## Sender types

- `'client'` : message envoyé par le client
- `'operator'` : message envoyé par MiKL

## Logging

Format : `[CHAT:ACTION] message`

Exemples :
- `[CHAT:SEND_MESSAGE] Failed to insert`
- `[CHAT:GET_MESSAGES] DB error`
- `[CHAT:MARK_READ] Updated N messages`
