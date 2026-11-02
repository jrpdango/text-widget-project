import { ensureDatabase, internalError, parseJsonBody } from '@/lib/http';
import { Widget } from '@/lib/models/Widget';
import { serializeWidget } from '@/lib/serializeWidget';
import { createWidgetSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const unavailable = await ensureDatabase();

  if (unavailable) {
    return unavailable;
  }

  try {
    const widgets = await Widget.find({}).sort({ createdAt: -1, _id: -1 }).lean();
    return Response.json(widgets.map((widget) => serializeWidget(widget)));
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, createWidgetSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const unavailable = await ensureDatabase();

  if (unavailable) {
    return unavailable;
  }

  try {
    const widget = await Widget.create({
      id: crypto.randomUUID(),
      content: parsed.data.content ?? '',
    });

    return Response.json(serializeWidget(widget), { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
