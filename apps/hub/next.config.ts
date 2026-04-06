import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    '@foxeo/ui',
    '@foxeo/supabase',
    '@foxeo/utils',
    '@foxeo/types',
    '@foxeo/modules-chat',
    '@foxeo/module-elio',
  ],
}

export default nextConfig
