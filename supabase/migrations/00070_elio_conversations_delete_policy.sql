-- Migration 00069: Add DELETE RLS policy for elio_conversations
-- Allows conversation owners to delete their own conversations (and CASCADE deletes messages)

CREATE POLICY "elio_conversations_delete_owner"
  ON elio_conversations FOR DELETE
  USING (auth.uid() = user_id);
