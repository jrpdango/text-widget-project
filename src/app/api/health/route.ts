import { pingDatabase } from '@/lib/db';
import { databaseUnavailable } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await pingDatabase();
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error(error);
    return databaseUnavailable();
  }
}
