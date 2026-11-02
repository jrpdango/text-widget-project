import 'server-only';
import type { ZodType } from 'zod';
import { connectToDatabase } from '@/lib/db';

export interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ErrorBody, { status });
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'invalid_json', 'Request body must be valid JSON.'),
    };
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        400,
        'validation_error',
        parsed.error.issues[0]?.message ?? 'Invalid request body.',
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function databaseUnavailable(): Response {
  return errorResponse(503, 'database_unavailable', 'The database is unavailable.');
}

export async function ensureDatabase(): Promise<Response | null> {
  try {
    await connectToDatabase();
    return null;
  } catch (error) {
    console.error(error);
    return databaseUnavailable();
  }
}

export function internalError(error: unknown): Response {
  console.error(error);
  return errorResponse(500, 'internal_error', 'Something went wrong.');
}
