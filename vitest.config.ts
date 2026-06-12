import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules/**', 'llm-context/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/tui/**', 'src/cli/**'],
      thresholds: { autoUpdate: false, branches: 80, functions: 80, lines: 80, statements: 80 },
    },
    setupFiles: ['./src/tui/ink/test-setup.ts'],
  },
});