import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
