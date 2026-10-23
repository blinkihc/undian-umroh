import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/*
 * Aturan ESLint proyek (docs/CODE_STYLE.md §4 dan §10, docs/ARCHITECTURE.md §8).
 * Batas modul murni, larangan Math.random di area undian, dan larangan console
 * dipaksa di sini, bukan hanya didokumentasikan.
 */

const PESAN_RANDOM =
  'Dilarang memakai Math.random di area undian. Gunakan secureRandomInt (crypto.getRandomValues) dari @/lib/draw.';

/** Impor relatif hanya di folder yang sama; lintas folder lewat alias @/ (CODE_STYLE §4). */
const PATRON_RELATIF = {
  group: ['../*', '../**'],
  message:
    'Impor lintas folder memakai alias @/ (mis. @/lib/domain); relatif hanya di folder yang sama.',
};

const SEL_USE_CLIENT = {
  selector:
    "Program:has(> ExpressionStatement[directive='use client']) > ImportDeclaration[source.value=/^@\\/server(\\/|$)/]",
  message: "Client Component ('use client') dilarang mengimpor @/server/**.",
};

const SEL_SERVER_ONLY = {
  selector: "Program:not(:has(> ImportDeclaration[source.value='server-only']))",
  message: "File di src/server/** wajib diawali import 'server-only'.",
};

const SEL_RANDOM_DESTRUKTUR = {
  selector: "VariableDeclarator[init.name='Math'] > ObjectPattern > Property[key.name='random']",
  message: PESAN_RANDOM,
};

/** Modul murni: tanpa I/O, UI, DB, node:*, atau API browser selain Web Crypto. */
const BATAS_LIB = {
  patterns: [
    PATRON_RELATIF,
    {
      group: [
        '@/server',
        '@/server/**',
        '@/client',
        '@/client/**',
        '@/components',
        '@/components/**',
        '@/app',
        '@/app/**',
        '@/config',
        '@/config/**',
      ],
      message:
        'src/lib bersifat murni dan tidak boleh bergantung pada server, klien, komponen, app, atau config (ARCHITECTURE §8).',
    },
    {
      group: [
        '@prisma/*',
        'node:*',
        'server-only',
        'react',
        'react-dom',
        'next',
        'next/*',
        'lucide-react',
      ],
      message: 'src/lib hanya boleh bergantung pada zod dan modul src/lib lain (ARCHITECTURE §8).',
    },
  ],
};

const GLOBAL_DILARANG_LIB = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'fetch',
  'process',
  'Buffer',
].map((name) => ({
  name,
  message: 'src/lib murni: tidak boleh memakai API browser/Node selain Web Crypto.',
}));

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.scratch/**',
    '.storage/**',
    '.backups/**',
    'dist/**',
    'docs/**',
    'design/**',
    'public/**',
    'next-env.d.ts',
    'src/generated/**',
  ]),

  ...nextVitals,
  ...nextTs,

  {
    files: ['**/*.{ts,mts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    plugins: {
      import: importPlugin,
    },
    settings: { 'import/internal-regex': '^@/' },
    rules: {
      // Urutan impor: bawaan Node, paket eksternal, alias @/, lalu relatif (CODE_STYLE §4).
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
        },
      ],
      'react/no-danger': 'error',
    },
  },

  // Seluruh kode aplikasi: relatif hanya di folder yang sama, tanpa console, tanpa 'use client' -> server.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // Return type eksplisit untuk fungsi dan komponen yang diekspor (CODE_STYLE §6).
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-restricted-imports': ['error', { patterns: [PATRON_RELATIF] }],
      'no-console': 'error',
      'no-restricted-syntax': ['error', SEL_USE_CLIENT],
    },
  },

  // Modul murni src/lib: batas impor, tanpa Node/browser API, tanpa Math.random.
  {
    files: ['src/lib/**/*.ts'],
    rules: {
      'import/no-nodejs-modules': 'error',
      'no-restricted-imports': ['error', BATAS_LIB],
      'no-restricted-globals': ['error', ...GLOBAL_DILARANG_LIB],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: PESAN_RANDOM },
      ],
      'no-restricted-syntax': ['error', SEL_USE_CLIENT, SEL_RANDOM_DESTRUKTUR],
    },
  },

  // Kode offline Layar Undian (browser): sama larangannya untuk Math.random.
  {
    files: ['src/client/offline/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: PESAN_RANDOM },
      ],
      'no-restricted-syntax': ['error', SEL_USE_CLIENT, SEL_RANDOM_DESTRUKTUR],
    },
  },

  // Klien tidak boleh mengimpor server.
  {
    files: ['src/client/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            PATRON_RELATIF,
            {
              group: ['@/server', '@/server/**', 'server-only', '@prisma/*'],
              message: 'src/client tidak boleh mengimpor kode server (ARCHITECTURE §8).',
            },
          ],
        },
      ],
    },
  },

  // Komponen UI tidak boleh mengakses database langsung.
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            PATRON_RELATIF,
            {
              group: ['@prisma/*', '@/server/db', '@/server/db/**'],
              message:
                'Komponen UI tidak boleh mengakses database langsung; baca data lewat @/server/services.',
            },
          ],
        },
      ],
    },
  },

  // Kode server: wajib 'server-only'.
  {
    files: ['src/server/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', SEL_SERVER_ONLY],
    },
  },
]);
