import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      // Next plafonne le corps des Server Actions à 1 Mo par défaut : au-delà,
      // la requête est rejetée AVANT d'atteindre l'action, sans message.
      // Les uploads d'images du Hub (bannière MenuFacile) passent par une
      // Server Action et visent le bucket `screenshots`, plafonné à 10 Mo.
      // On laisse une marge pour l'encodage multipart.
      bodySizeLimit: '12mb',
    },
  },
  transpilePackages: [
    '@monprojetpro/ui',
    '@monprojetpro/supabase',
    '@monprojetpro/utils',
    '@monprojetpro/types',
    '@monprojetpro/modules-chat',
    '@monprojetpro/module-elio',
    '@monprojetpro/modules-email',
  ],
}

export default nextConfig
