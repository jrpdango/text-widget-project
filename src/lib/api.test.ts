// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The shared Vitest setup mocks `@/lib/api` for the UI tests. Import the real
// module here so these tests exercise the HTTP boundary itself.
const api = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

const WIDGET = {
  id: '11111111-1111-4111-8111-111111111111',
  content: 'Hello',
  createdAt: '2026-01-02T03:04:05.000Z',
  updatedAt: '2026-01-02T03:05:06.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function callAt(index = 0): [string, RequestInit] {
  return fetchMock.mock.calls[index] as [string, RequestInit];
}

describe('fetchWidgets', () => {
  it('requests the widget list without caching and parses the response', async () => {
    fetchMock.mockResolvedValue(jsonResponse([WIDGET]));

    await expect(api.fetchWidgets()).resolves.toEqual([WIDGET]);

    const [input, init] = callAt();
    expect(input).toBe('/api/widgets');
    expect(init).toMatchObject({ cache: 'no-store' });
    expect(init.method).toBeUndefined();
  });
});

describe('createWidget', () => {
  it('posts JSON content and returns the created widget', async () => {
    fetchMock.mockResolvedValue(jsonResponse(WIDGET, 201));

    await expect(api.createWidget('Hello')).resolves.toEqual(WIDGET);

    const [input, init] = callAt();
    expect(input).toBe('/api/widgets');
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ content: 'Hello' }),
    });
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(init.cache).toBe('no-store');
  });

  it('defaults to empty content', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...WIDGET, content: '' }, 201));

    await api.createWidget();

    expect(callAt()[1]).toMatchObject({ body: JSON.stringify({ content: '' }) });
  });
});

describe('updateWidget', () => {
  it('patches the encoded id and returns the updated widget', async () => {
    const id = 'a/b c';
    fetchMock.mockResolvedValue(jsonResponse({ ...WIDGET, content: 'Updated' }));

    await expect(api.updateWidget(id, 'Updated')).resolves.toMatchObject({
      content: 'Updated',
    });

    const [input, init] = callAt();
    expect(input).toBe(`/api/widgets/${encodeURIComponent(id)}`);
    expect(init).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ content: 'Updated' }),
    });
  });
});

describe('deleteWidget', () => {
  it('resolves without a body on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.deleteWidget('some-id')).resolves.toBeUndefined();

    expect(callAt()[1]).toMatchObject({ method: 'DELETE' });
  });
});

describe('flushWidgetUpdate', () => {
  it('sends a keepalive PATCH and swallows the response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.flushWidgetUpdate('some-id', 'draft')).resolves.toBeUndefined();

    const [input, init] = callAt();
    expect(input).toBe('/api/widgets/some-id');
    expect(init).toMatchObject({
      method: 'PATCH',
      keepalive: true,
      body: JSON.stringify({ content: 'draft' }),
    });
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('swallows network failures', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(api.flushWidgetUpdate('some-id', 'draft')).resolves.toBeUndefined();
  });
});

describe('error handling', () => {
  it('turns an API error envelope into an ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'database_unavailable',
            message: 'The database is unavailable.',
          },
        },
        503,
      ),
    );

    const error = await api.fetchWidgets().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 503,
      code: 'database_unavailable',
      message: 'The database is unavailable.',
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>bad gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    );

    await expect(api.fetchWidgets()).rejects.toMatchObject({
      status: 502,
      code: 'request_failed',
      message: 'Request failed with status 502.',
    });
  });

  it('falls back when the error envelope is malformed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 500));

    await expect(api.fetchWidgets()).rejects.toMatchObject({
      status: 500,
      code: 'request_failed',
      message: 'Request failed with status 500.',
    });
  });
});
