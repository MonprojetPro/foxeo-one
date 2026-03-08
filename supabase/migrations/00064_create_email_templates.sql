-- Migration 00064: Table email_templates (prépare Story 12.3)
-- Stocke les templates d'emails transactionnels réutilisables

CREATE TABLE IF NOT EXISTS public.email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  variables    TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- RLS : seul l'opérateur peut lire/modifier les templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_templates_select_operator
  ON public.email_templates
  FOR SELECT
  USING (is_operator());

CREATE POLICY email_templates_insert_operator
  ON public.email_templates
  FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY email_templates_update_operator
  ON public.email_templates
  FOR UPDATE
  USING (is_operator());

-- Seed : templates par défaut
INSERT INTO public.email_templates (template_key, subject, body, variables) VALUES
  (
    'welcome_lab',
    'Bienvenue dans votre espace Lab Foxeo',
    'Bonjour {{client_name}},\n\nBienvenue dans votre espace Lab Foxeo. Votre accompagnement commence aujourd''hui.\n\nVotre Centaure,\n{{operator_name}}',
    ARRAY['client_name', 'operator_name']
  ),
  (
    'welcome_one',
    'Votre dashboard One Foxeo est prêt',
    'Bonjour {{client_name}},\n\nFélicitations ! Votre dashboard One est maintenant accessible à l''adresse : {{dashboard_url}}\n\nVotre Centaure,\n{{operator_name}}',
    ARRAY['client_name', 'operator_name', 'dashboard_url']
  ),
  (
    'invoice_paid',
    'Votre facture {{invoice_number}} a été réglée',
    'Bonjour {{client_name}},\n\nNous confirmons la réception de votre paiement pour la facture {{invoice_number}} d''un montant de {{amount}}.\n\nMerci,\n{{operator_name}}',
    ARRAY['client_name', 'invoice_number', 'amount', 'operator_name']
  ),
  (
    'invoice_overdue',
    'Rappel : facture {{invoice_number}} en attente de paiement',
    'Bonjour {{client_name}},\n\nNous vous rappelons que la facture {{invoice_number}} d''un montant de {{amount}} est en attente de paiement depuis le {{due_date}}.\n\nPour régler votre facture : {{payment_url}}\n\nCordialement,\n{{operator_name}}',
    ARRAY['client_name', 'invoice_number', 'amount', 'due_date', 'payment_url', 'operator_name']
  ),
  (
    'credit_note_issued',
    'Avoir {{credit_note_number}} émis sur votre compte',
    'Bonjour {{client_name}},\n\nUn avoir de {{amount}} a été émis sur votre compte en référence à la facture {{invoice_number}}.\n\nCordialement,\n{{operator_name}}',
    ARRAY['client_name', 'credit_note_number', 'invoice_number', 'amount', 'operator_name']
  )
ON CONFLICT (template_key) DO NOTHING;
