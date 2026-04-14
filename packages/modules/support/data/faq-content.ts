export type FaqQuestion = {
  q: string
  a: string
}

export type FaqCategory = {
  id: string
  title: string
  icon: string
  questions: FaqQuestion[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Premiers pas',
    icon: 'rocket',
    questions: [
      {
        q: 'Comment fonctionne mon espace MonprojetPro ?',
        a: 'Votre espace MonprojetPro est votre tableau de bord personnel. Vous y retrouvez tous vos modules actifs, vos documents et votre messagerie avec MiKL.',
      },
      {
        q: "Qu'est-ce qu'Élio ?",
        a: "Élio est votre assistant IA personnel qui vous accompagne dans vos démarches. Il peut répondre à vos questions, vous guider dans votre parcours et vous aider à rédiger des documents.",
      },
      {
        q: 'Comment modifier mon profil ?',
        a: 'Accédez aux Paramètres depuis le menu principal pour gérer votre profil, vos sessions actives et vos consentements.',
      },
    ],
  },
  {
    id: 'lab-journey',
    title: 'Mon parcours Lab',
    icon: 'flask',
    questions: [
      {
        q: 'Comment avancer dans mon parcours ?',
        a: 'Chaque étape du parcours Lab est présentée sous forme de brief. Consultez le brief, travaillez dessus avec Élio si besoin, puis soumettez-le à MiKL pour validation.',
      },
      {
        q: 'Que se passe-t-il après la validation de mon parcours ?',
        a: 'Une fois votre parcours Lab terminé, vous passez à MonprojetPro One — votre espace business personnalisé avec tous les outils pour gérer votre activité.',
      },
      {
        q: 'Puis-je revenir sur une étape déjà validée ?',
        a: 'Les étapes validées sont consultables à tout moment mais ne peuvent pas être resoumises. Contactez MiKL si vous avez besoin de modifications.',
      },
    ],
  },
  {
    id: 'one-space',
    title: 'Mon espace One',
    icon: 'layout-dashboard',
    questions: [
      {
        q: 'Quels modules sont disponibles dans One ?',
        a: 'Les modules actifs sont configurés par MiKL selon votre abonnement. Vous retrouvez typiquement : Documents, Chat, Facturation et plus encore.',
      },
      {
        q: 'Comment personnaliser mon dashboard ?',
        a: 'La personnalisation du dashboard (couleurs, logo) sera disponible prochainement. MiKL peut déjà configurer certains éléments pour vous.',
      },
    ],
  },
  {
    id: 'account-security',
    title: 'Compte & sécurité',
    icon: 'shield',
    questions: [
      {
        q: 'Comment changer mon mot de passe ?',
        a: 'Utilisez le lien "Mot de passe oublié" sur la page de connexion pour réinitialiser votre mot de passe par email.',
      },
      {
        q: 'Comment voir mes sessions actives ?',
        a: 'Accédez à Paramètres > Sessions actives pour voir tous les appareils connectés et révoquer ceux que vous ne reconnaissez pas.',
      },
      {
        q: 'Mes données sont-elles protégées ?',
        a: 'Oui, vos données sont chiffrées et isolées. Seul vous et votre opérateur MiKL y avez accès. Consultez nos CGU pour plus de détails.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contacter MiKL',
    icon: 'message-circle',
    questions: [
      {
        q: 'Comment contacter MiKL ?',
        a: 'Utilisez le module Chat pour envoyer un message direct à MiKL. Il recevra une notification et vous répondra rapidement.',
      },
      {
        q: 'Comment signaler un problème technique ?',
        a: 'Cliquez sur "Signaler un problème" dans le menu ou en bas de cette page. Décrivez le problème et joignez une capture d\'écran si possible.',
      },
    ],
  },
]
