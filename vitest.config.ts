import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      // Stub for openvidu-browser (browser SDK, not installed as npm package in monorepo)
      'openvidu-browser': path.resolve(__dirname, 'packages/modules/visio/__mocks__/openvidu-browser.ts'),
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
