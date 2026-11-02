// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
}));

const widgetMocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
}));

vi.mock('@/lib/db', () => dbMocks);
vi.mock('@/lib/models/Widget', () => ({ Widget: widgetMocks }));

import { DELETE, GET, PATCH } from './route';

const CREATED = new Date('2026-01-02T03:04:05.000Z');
const UPDATED = new Date('2026-01-02T03:05:06.000Z');
const CREATED_ISO = '2026-01-02T03:04:05.000Z';
const UPDATED_ISO = '2026-01-02T03:05:06.000Z';
const ID = '11111111-1111-4111-8111-111111111111';
const CONTEXT = { params: Promise.resolve({ id: ID }) };

function widgetDoc(id: string, content: string) {
  return { id, content, createdAt: CREATED, updatedAt: UPDATED };
}

function itemRequest(method: string, body?: unknown) {
  return new Request(`http://localhost/api/widgets/${ID}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  dbMocks.connectToDatabase.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/widgets/:id', () => {
  it('returns the widget and queries by the id from the path', async () => {
    const lean = vi.fn().mockResolvedValue(widgetDoc(ID, 'Hello'));
    widgetMocks.findOne.mockReturnValue({ lean });

    const response = await GET(itemRequest('GET'), CONTEXT);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: ID,
      content: 'Hello',
      createdAt: CREATED_ISO,
      updatedAt: UPDATED_ISO,
    });
    expect(widgetMocks.findOne).toHaveBeenCalledWith({ id: ID });
    expect(lean).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid id before touching the database', async () => {
    const response = await GET(itemRequest('GET'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'invalid_id', message: 'Widget id must be a UUID.' },
    });
    expect(widgetMocks.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the widget does not exist', async () => {
    widgetMocks.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const response = await GET(itemRequest('GET'), CONTEXT);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'Widget not found.' },
    });
  });

  it('returns 503 when the database is unreachable', async () => {
    dbMocks.connectToDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await GET(itemRequest('GET'), CONTEXT);

    expect(response.status).toBe(503);
    expect(widgetMocks.findOne).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/widgets/:id', () => {
  it('updates only the content and returns the updated widget', async () => {
    const lean = vi.fn().mockResolvedValue(widgetDoc(ID, 'Updated'));
    widgetMocks.findOneAndUpdate.mockReturnValue({ lean });

    const response = await PATCH(itemRequest('PATCH', { content: 'Updated' }), CONTEXT);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: ID,
      content: 'Updated',
      createdAt: CREATED_ISO,
      updatedAt: UPDATED_ISO,
    });
    expect(widgetMocks.findOneAndUpdate).toHaveBeenCalledWith(
      { id: ID },
      { content: 'Updated' },
      { new: true, runValidators: true },
    );
  });

  it('rejects a body without content and does not update', async () => {
    const response = await PATCH(itemRequest('PATCH', {}), CONTEXT);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('validation_error');
    expect(widgetMocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects content over 100000 characters and does not update', async () => {
    const response = await PATCH(itemRequest('PATCH', { content: 'a'.repeat(100_001) }), CONTEXT);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('validation_error');
    expect(widgetMocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid id before validating or updating', async () => {
    const response = await PATCH(itemRequest('PATCH', { content: 'Updated' }), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_id');
    expect(widgetMocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the widget does not exist', async () => {
    widgetMocks.findOneAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const response = await PATCH(itemRequest('PATCH', { content: 'Updated' }), CONTEXT);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'Widget not found.' },
    });
  });

  it('returns 503 when the database is unreachable', async () => {
    dbMocks.connectToDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await PATCH(itemRequest('PATCH', { content: 'Updated' }), CONTEXT);

    expect(response.status).toBe(503);
    expect(widgetMocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when the update query fails', async () => {
    widgetMocks.findOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('write failed')),
    });

    const response = await PATCH(itemRequest('PATCH', { content: 'Updated' }), CONTEXT);

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe('internal_error');
  });
});

describe('DELETE /api/widgets/:id', () => {
  it('deletes the widget and returns 204', async () => {
    widgetMocks.findOneAndDelete.mockReturnValue({
      lean: vi.fn().mockResolvedValue(widgetDoc(ID, 'Bye')),
    });

    const response = await DELETE(itemRequest('DELETE'), CONTEXT);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(widgetMocks.findOneAndDelete).toHaveBeenCalledWith({ id: ID });
  });

  it('rejects an invalid id before touching the database', async () => {
    const response = await DELETE(itemRequest('DELETE'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_id');
    expect(widgetMocks.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('returns 404 when the widget does not exist', async () => {
    widgetMocks.findOneAndDelete.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const response = await DELETE(itemRequest('DELETE'), CONTEXT);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'not_found', message: 'Widget not found.' },
    });
  });

  it('returns 503 when the database is unreachable', async () => {
    dbMocks.connectToDatabase.mockRejectedValue(new Error('connection refused'));

    const response = await DELETE(itemRequest('DELETE'), CONTEXT);

    expect(response.status).toBe(503);
    expect(widgetMocks.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('returns 500 when the delete query fails', async () => {
    widgetMocks.findOneAndDelete.mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('write failed')),
    });

    const response = await DELETE(itemRequest('DELETE'), CONTEXT);

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe('internal_error');
  });
});
