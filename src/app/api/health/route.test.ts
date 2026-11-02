// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  pingDatabase: vi.fn(),
}));

vi.mock('@/lib/db', () => dbMocks);

import { GET } from './route';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/health', () => {
  it('returns ok when the database ping succeeds', async () => {
    dbMocks.pingDatabase.mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(dbMocks.pingDatabase).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when the database ping fails', async () => {
    dbMocks.pingDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: 'database_unavailable',
        message: 'The database is unavailable.',
      },
    });
  });
});
