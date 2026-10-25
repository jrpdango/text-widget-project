import { useCallback, useEffect, useState } from 'react';
import type { WidgetData } from '../types';
import { loadWidgets, saveWidgets } from '../lib/storage';

function createWidgetId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useWidgets() {
  const [widgets, setWidgets] = useState<WidgetData[]>(loadWidgets);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    saveWidgets(widgets);
  }, [widgets]);

  const addWidget = useCallback(() => {
    const id = createWidgetId();
    setFocusId(id);
    setWidgets((current) => [{ id, content: '' }, ...current]);
  }, []);

  const updateWidget = useCallback((id: string, content: string) => {
    setWidgets((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, content } : widget)),
    );
  }, []);

  const deleteWidget = useCallback((id: string) => {
    setWidgets((current) => current.filter((widget) => widget.id !== id));
  }, []);

  return { widgets, focusId, addWidget, updateWidget, deleteWidget };
}
