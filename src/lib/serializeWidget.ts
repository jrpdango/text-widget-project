import 'server-only';
import type { WidgetData } from '@/types';

export interface WidgetLike {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeWidget(widget: WidgetLike): WidgetData {
  return {
    id: widget.id,
    content: widget.content,
    createdAt: widget.createdAt.toISOString(),
    updatedAt: widget.updatedAt.toISOString(),
  };
}
