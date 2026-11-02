import 'server-only';
import { z } from 'zod';
import { MAX_WIDGET_CONTENT_LENGTH } from '@/lib/widgetLimits';

export const widgetIdSchema = z.uuid();

export const createWidgetSchema = z
  .object({
    content: z.string().max(MAX_WIDGET_CONTENT_LENGTH).optional(),
  })
  .strict();

export const updateWidgetSchema = z
  .object({
    content: z.string().max(MAX_WIDGET_CONTENT_LENGTH),
  })
  .strict();
