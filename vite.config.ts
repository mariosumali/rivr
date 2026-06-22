import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Limit the dependency scanner to the real app entry. The repo also contains
  // stray design-mockup HTML files under `html-templates?/` (note the literal
  // `?` in the directory name) which otherwise confuse the dev-server scanner.
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
