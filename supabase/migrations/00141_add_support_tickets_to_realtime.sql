-- Migration 00141 : Ajouter support_tickets à la publication Realtime
-- Raison : support_tickets n'était pas dans supabase_realtime → quand MiKL change le
-- statut d'un ticket depuis le Hub, le badge côté client (MyTicketsList) ne se mettait
-- jamais à jour en temps réel (TanStack staleTime 2 min + refetchOnWindowFocus seulement).
-- Symptôme MiKL : « quand je change de statut ça n'apparaît pas du côté client ».

ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
