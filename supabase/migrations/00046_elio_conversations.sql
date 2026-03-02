-- Migration: 00046_elio_conversations.sql
-- Story 8.2: Conversations Élio — Liste, commutation & historique persistant

-- Table elio_conversations
CREATE TABLE elio_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('hub', 'lab', 'one')),
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_elio_conversations_user_id ON elio_conversations(user_id);
CREATE INDEX idx_elio_conversations_dashboard_type ON elio_conversations(dashboard_type);
CREATE INDEX idx_elio_conversations_updated_at ON elio_conversations(updated_at DESC);

-- RLS
ALTER TABLE elio_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elio_conversations_select_owner"
  ON elio_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "elio_conversations_insert_owner"
  ON elio_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "elio_conversations_update_owner"
  ON elio_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Table elio_messages
CREATE TABLE elio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES elio_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_elio_messages_conversation_id ON elio_messages(conversation_id);
CREATE INDEX idx_elio_messages_created_at ON elio_messages(created_at);

-- RLS
ALTER TABLE elio_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elio_messages_select_owner"
  ON elio_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elio_conversations
      WHERE elio_conversations.id = elio_messages.conversation_id
        AND elio_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "elio_messages_insert_owner"
  ON elio_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM elio_conversations
      WHERE elio_conversations.id = elio_messages.conversation_id
        AND elio_conversations.user_id = auth.uid()
    )
  );

-- Trigger: mettre à jour updated_at sur elio_conversations à chaque nouveau message
CREATE OR REPLACE FUNCTION fn_update_elio_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE elio_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_elio_conversations_updated_at
  AFTER INSERT ON elio_messages
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_elio_conversation_timestamp();
