import type { WidgetData } from '@/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(input: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    let code = 'request_failed';
    let message = `Request failed with status ${response.status}.`;

    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // Keep the fallback message for non-JSON error responses.
    }

    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchWidgets(): Promise<WidgetData[]> {
  return request<WidgetData[]>('/api/widgets');
}

export function createWidget(content = ''): Promise<WidgetData> {
  return request<WidgetData>('/api/widgets', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function updateWidget(id: string, content: string): Promise<WidgetData> {
  return request<WidgetData>(`/api/widgets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export function deleteWidget(id: string): Promise<void> {
  return request<void>(`/api/widgets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function flushWidgetUpdate(id: string, content: string): Promise<void> {
  return fetch(`/api/widgets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
    keepalive: true,
  }).then(
    () => undefined,
    () => undefined,
  );
}
