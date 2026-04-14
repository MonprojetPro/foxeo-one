-- Migration 00067: Seed email templates pour Story 12.3 — Templates éditables par MiKL
-- Ajoute les 7 templates définis dans les AC de la Story 12.3

INSERT INTO public.email_templates (template_key, subject, body, variables) VALUES
  (
    'bienvenue_lab',
    'Bienvenue dans votre espace Lab MonprojetPro',
    'Bonjour {prenom},

Bienvenue dans votre espace Lab MonprojetPro. Votre parcours d''accompagnement commence aujourd''hui.

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise']
  ),
  (
    'brief_valide',
    'Votre brief a été validé — MonprojetPro',
    'Bonjour {prenom},

Bonne nouvelle ! Votre brief "{titre_brief}" a été validé par votre accompagnateur.

{commentaire}

Connectez-vous à votre espace Lab pour voir les prochaines étapes : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'titre_brief', 'commentaire', 'lien']
  ),
  (
    'brief_refuse',
    'Votre brief nécessite des ajustements — MonprojetPro',
    'Bonjour {prenom},

Votre brief "{titre_brief}" a été retourné avec des commentaires de votre accompagnateur.

{commentaire}

Connectez-vous à votre espace Lab pour le modifier : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'titre_brief', 'commentaire', 'lien']
  ),
  (
    'graduation',
    'Félicitations ! Votre espace One est prêt — MonprojetPro',
    'Bonjour {prenom},

Félicitations pour l''obtention de votre graduation ! Votre dashboard One MonprojetPro est maintenant accessible : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'lien']
  ),
  (
    'facture_envoyee',
    'Votre facture MonprojetPro est disponible',
    'Bonjour {prenom},

Votre facture d''un montant de {montant} est disponible sur votre espace MonprojetPro : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'montant', 'lien']
  ),
  (
    'echec_paiement',
    'Échec de paiement — MonprojetPro',
    'Bonjour {prenom},

Nous n''avons pas pu traiter votre paiement de {montant}. Veuillez mettre à jour vos informations de paiement en vous connectant à votre espace : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'montant', 'lien']
  ),
  (
    'rappel_parcours',
    'Votre parcours Lab vous attend — MonprojetPro',
    'Bonjour {prenom},

Votre accompagnateur a remarqué que vous n''avez pas visité votre espace Lab depuis quelques jours. Ne laissez pas votre projet en pause — continuez votre aventure : {lien}

Votre Centaure,
MiKL',
    ARRAY['prenom', 'entreprise', 'lien']
  )
ON CONFLICT (template_key) DO NOTHING;
