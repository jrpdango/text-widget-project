// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
}));

const widgetMocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/db', () => dbMocks);
vi.mock('@/lib/models/Widget', () => ({ Widget: widgetMocks }));

import { GET, POST } from './route';

const CREATED = new Date('2026-01-02T03:04:05.000Z');
const UPDATED = new Date('2026-01-02T03:05:06.000Z');
const CREATED_ISO = '2026-01-02T03:04:05.000Z';
const UPDATED_ISO = '2026-01-02T03:05:06.000Z';
const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function widgetDoc(id: string, content: string) {
  return { id, content, createdAt: CREATED, updatedAt: UPDATED };
}

function postRequest(body?: string) {
  return new Request('http://localhost/api/widgets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  dbMocks.connectToDatabase.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/widgets', () => {
  it('returns serialized widgets and requests newest-first order', async () => {
    const older = { ...widgetDoc(ID_1, 'Older'), _id: 'mongo-1', __v: 0 };
    const newer = { ...widgetDoc(ID_2, 'Newer'), _id: 'mongo-2', __v: 0 };
    const lean = vi.fn().mockResolvedValue([newer, older]);
    const sort = vi.fn().mockReturnValue({ lean });
    widgetMocks.find.mockReturnValue({ sort });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: ID_2,
        content: 'Newer',
        createdAt: CREATED_ISO,
        updatedAt: UPDATED_ISO,
      },
      {
        id: ID_1,
        content: 'Older',
        createdAt: CREATED_ISO,
        updatedAt: UPDATED_ISO,
      },
    ]);
    expect(widgetMocks.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(lean).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without querying when the database is unreachable', async () => {
    dbMocks.connectToDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: 'database_unavailable',
        message: 'The database is unavailable.',
      },
    });
    expect(widgetMocks.find).not.toHaveBeenCalled();
  });
});

describe('POST /api/widgets', () => {
  it('creates a widget with a server-generated UUID and returns 201', async () => {
    widgetMocks.create.mockImplementation(async (input: { id: string; content: string }) =>
      widgetDoc(input.id, input.content),
    );

    const response = await POST(postRequest(JSON.stringify({ content: 'Hello' })));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      content: 'Hello',
      createdAt: CREATED_ISO,
      updatedAt: UPDATED_ISO,
    });

    expect(widgetMocks.create).toHaveBeenCalledTimes(1);
    const input = widgetMocks.create.mock.calls[0][0] as { id: string; content: string };
    expect(input.id).toMatch(UUID_PATTERN);
    expect(input.content).toBe('Hello');
  });

  it('creates an empty widget when content is omitted', async () => {
    widgetMocks.create.mockImplementation(async (input: { id: string; content: string }) =>
      widgetDoc(input.id, input.content),
    );

    const response = await POST(postRequest(JSON.stringify({})));

    expect(response.status).toBe(201);
    expect((await response.json()).content).toBe('');
    expect(widgetMocks.create.mock.calls[0][0]).toMatchObject({ content: '' });
  });

  it('rejects malformed JSON with 400 and does not create', async () => {
    const response = await POST(postRequest('{not valid json'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_json',
        message: 'Request body must be valid JSON.',
      },
    });
    expect(widgetMocks.create).not.toHaveBeenCalled();
  });

  it('rejects unknown fields and does not create', async () => {
    const response = await POST(postRequest(JSON.stringify({ content: 'Hi', extra: true })));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('validation_error');
    expect(widgetMocks.create).not.toHaveBeenCalled();
  });

  it('rejects content over 100000 characters and does not create', async () => {
    const response = await POST(postRequest(JSON.stringify({ content: 'a'.repeat(100_001) })));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('validation_error');
    expect(widgetMocks.create).not.toHaveBeenCalled();
  });

  it('accepts content at exactly 100000 characters', async () => {
    const content = 'a'.repeat(100_000);
    widgetMocks.create.mockImplementation(async (input: { id: string; content: string }) =>
      widgetDoc(input.id, input.content),
    );

    const response = await POST(postRequest(JSON.stringify({ content })));

    expect(response.status).toBe(201);
    expect((await response.json()).content).toHaveLength(100_000);
  });

  it('returns 503 without creating when the database is unreachable', async () => {
    dbMocks.connectToDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await POST(postRequest(JSON.stringify({ content: 'Hi' })));

    expect(response.status).toBe(503);
    expect(widgetMocks.create).not.toHaveBeenCalled();
  });

  it('returns 500 when the create query fails', async () => {
    widgetMocks.create.mockRejectedValue(new Error('write failed'));

    const response = await POST(postRequest(JSON.stringify({ content: 'Hi' })));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'Something went wrong.',
      },
    });
  });
});
