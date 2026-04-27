-- Migration 00110: Add DELETE RLS policy on notifications
-- Allows authenticated users to delete their own notifications.
-- Previously missing: SELECT + UPDATE existed but no DELETE → deleteAllNotifications was silently blocked by RLS.

CREATE POLICY notifications_delete_owner ON notifications
  FOR DELETE
  USING (recipient_id = auth.uid());
