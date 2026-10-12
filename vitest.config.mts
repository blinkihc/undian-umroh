import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(import.meta.dirname, 'src') };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    // Proyek tanpa berkas tes (mis. integrasi di tiket awal) tidak dianggap gagal.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.tsx'],
          setupFiles: ['tests/setup-dom.ts'],
        },
      },
      {
        // Butuh PostgreSQL tes: npm run db:test:up (DATABASE_URL_TEST).
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // Modul murni wajib >= 95% baris & cabang (TESTING §6).
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/index.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
