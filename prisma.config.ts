import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma 7 tidak memuat .env sendiri. loadEnvFile tidak menimpa variabel yang sudah ada
// (CI, Docker), jadi aman dipakai di semua lingkungan.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Hanya perintah yang butuh koneksi (migrate) yang membaca URL ini; `generate` tidak.
    url: process.env.DATABASE_URL ?? '',
  },
});
