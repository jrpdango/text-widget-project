import type { WidgetData } from '@/types';

export const FIXED_TIMESTAMP = '2026-01-02T03:04:05.000Z';

let nextWidgetNumber = 0;

export function resetWidgetIds() {
  nextWidgetNumber = 0;
}

export function makeWidget(content = '', id?: string): WidgetData {
  nextWidgetNumber += 1;

  return {
    id: id ?? `00000000-0000-4000-8000-${String(nextWidgetNumber).padStart(12, '0')}`,
    content,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  };
}
