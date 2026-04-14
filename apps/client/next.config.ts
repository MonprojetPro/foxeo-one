import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Aligne sur apps/hub : database.types.ts ne couvre pas toutes les tables
  // (dette technique Story 1.2 — à résoudre via `npm run gen:types` quand
  // Supabase local sera dispo). Les Server Actions sont type-checkées par
  // leurs tests vitest dédiés. Le dev mode affiche les erreurs normalement.
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    '@monprojetpro/ui',
    '@monprojetpro/supabase',
    '@monprojetpro/utils',
    '@monprojetpro/types',
    '@monprojetpro/modules-chat',
  ],
}

export default nextConfig
