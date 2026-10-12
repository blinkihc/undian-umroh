import { afterEach, describe, expect, it, vi } from 'vitest';

const { validateEnvOrExit } = vi.hoisted(() => ({ validateEnvOrExit: vi.fn() }));

vi.mock('@/config/startup', () => ({ validateEnvOrExit }));

import { register } from '@/instrumentation';

describe('register (hook instrumentation Next.js)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    validateEnvOrExit.mockClear();
  });

  it('memvalidasi env saat runtime nodejs sehingga server gagal cepat', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');

    await register();

    expect(validateEnvOrExit).toHaveBeenCalledTimes(1);
  });

  it('tidak memvalidasi di runtime lain (edge)', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');

    await register();

    expect(validateEnvOrExit).not.toHaveBeenCalled();
  });
});
