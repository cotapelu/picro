import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/legacy/**',
      '**/*.extended.test.ts',
      '**/*-extended.test.ts',
    ],
  },
});
