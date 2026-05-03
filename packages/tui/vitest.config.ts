import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/atoms/setup.ts'],
    include: ['tests/atoms/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
    alias: {
      // Ensure internal imports resolve correctly
      '@': resolve(__dirname, 'src'),
    },
  },
});
