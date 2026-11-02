import { ensureDatabase, errorResponse, internalError, parseJsonBody } from '@/lib/http';
import { Widget } from '@/lib/models/Widget';
import { serializeWidget } from '@/lib/serializeWidget';
import { updateWidgetSchema, widgetIdSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function invalidId(): Response {
  return errorResponse(400, 'invalid_id', 'Widget id must be a UUID.');
}

function notFound(): Response {
  return errorResponse(404, 'not_found', 'Widget not found.');
}

async function resolveId(context: RouteContext): Promise<string | Response> {
  const { id } = await context.params;
  const parsed = widgetIdSchema.safeParse(id);

  if (!parsed.success) {
    return invalidId();
  }

  return parsed.data;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const id = await resolveId(context);

  if (id instanceof Response) {
    return id;
  }

  const unavailable = await ensureDatabase();

  if (unavailable) {
    return unavailable;
  }

  try {
    const widget = await Widget.findOne({ id }).lean();

    if (!widget) {
      return notFound();
    }

    return Response.json(serializeWidget(widget));
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const id = await resolveId(context);

  if (id instanceof Response) {
    return id;
  }

  const parsed = await parseJsonBody(request, updateWidgetSchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const unavailable = await ensureDatabase();

  if (unavailable) {
    return unavailable;
  }

  try {
    const widget = await Widget.findOneAndUpdate(
      { id },
      { content: parsed.data.content },
      { new: true, runValidators: true },
    ).lean();

    if (!widget) {
      return notFound();
    }

    return Response.json(serializeWidget(widget));
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const id = await resolveId(context);

  if (id instanceof Response) {
    return id;
  }

  const unavailable = await ensureDatabase();

  if (unavailable) {
    return unavailable;
  }

  try {
    const widget = await Widget.findOneAndDelete({ id }).lean();

    if (!widget) {
      return notFound();
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return internalError(error);
  }
}
