import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Voir tests/stubs/server-only.ts : le garde-fou reste entier dans
  // l'application, seul l'environnement de test le neutralise.
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.test.tsx',
      'packages/modules/**/*.test.ts',
      'packages/modules/**/*.test.tsx',
      'supabase/**/*.test.ts',
      'tests/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
      'scripts/**/*.test.ts',
    ],
  },
})
