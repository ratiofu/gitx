import { defineConfig } from 'vitest/config'

// biome-ignore lint/style/noDefaultExport: this is what vitest expects
export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 90,
        lines: 90,
      },
    },
  },
})
