import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Aligne sur apps/hub : database.types.ts ne couvre pas toutes les tables
  // (dette technique Story 1.2 — à résoudre via `npm run gen:types` quand
  // Supabase local sera dispo). Les Server Actions sont type-checkées par
  // leurs tests vitest dédiés. Le dev mode affiche les erreurs normalement.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Défaut Next.js = 1 Mo, trop bas pour les Server Actions d'upload — sinon
    // la requête est rejetée silencieusement côté client (bug signalé le
    // 2026-08-31 sur uploadScreenshot, 5 Mo).
    // Relevé de 6 à 12 Mo le 2026-09-20 : trois actions annonçaient déjà 10 Mo
    // (chat, elio inject-step-context, facturation justificatif) et étaient donc
    // coupées entre 6 et 10 Mo, en mentant sur leur propre limite. La marge
    // au-delà de 10 Mo couvre le surcoût d'encodage multipart.
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
  transpilePackages: [
    '@monprojetpro/ui',
    '@monprojetpro/supabase',
    '@monprojetpro/utils',
    '@monprojetpro/types',
    '@monprojetpro/module-admin',
    '@monprojetpro/module-analytics',
    '@monprojetpro/modules-chat',
    '@monprojetpro/module-core-dashboard',
    '@monprojetpro/modules-crm',
    '@monprojetpro/module-documents',
    '@monprojetpro/module-elio',
    '@monprojetpro/modules-email',
    '@monprojetpro/modules-facturation',
    '@monprojetpro/modules-notifications',
    '@monprojetpro/module-parcours',
    '@monprojetpro/modules-support',
    '@monprojetpro/module-templates',
    '@monprojetpro/modules-validation-hub',
    '@monprojetpro/module-visio',
  ],
}

export default nextConfig
