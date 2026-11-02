import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import type { WidgetData } from '@/types';

const SAVE_DEBOUNCE_MS = 600;

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type RetryAction = 'save' | 'delete';

export interface WidgetView extends WidgetData {
  /** Stable React key that survives the temp-id → server-id swap. */
  clientKey: string;
  saveState: SaveState;
  errorMessage?: string;
  retryAction?: RetryAction;
}

export type LoadStatus = 'loading' | 'ready' | 'error';

function toWidgetView(widget: WidgetData): WidgetView {
  return { ...widget, clientKey: widget.id, saveState: 'idle' };
}

function createTempId(): string {
  // `crypto.randomUUID` is only exposed in secure contexts. Fall back to a
  // non-cryptographic id so adding a widget still works over plain HTTP.
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `temp-${randomPart}`;
}

function createTempWidget(): WidgetView {
  const now = new Date().toISOString();
  const id = createTempId();

  return {
    id,
    clientKey: id,
    content: '',
    createdAt: now,
    updatedAt: now,
    saveState: 'idle',
  };
}

function isTempId(id: string): boolean {
  return id.startsWith('temp-');
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export function useWidgets() {
  const [widgets, setWidgets] = useState<WidgetView[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const widgetsRef = useRef<WidgetView[]>([]);
  const mountedRef = useRef(true);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latestContentRef = useRef(new Map<string, string>());
  const versionRef = useRef(new Map<string, number>());
  const queueRef = useRef(new Map<string, Promise<void>>());
  const dirtyRef = useRef(new Set<string>());
  const pendingCreatesRef = useRef(new Set<string>());
  const deletedWhileCreatingRef = useRef(new Set<string>());

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  function clearTimer(id: string) {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }

  function forgetWidget(id: string) {
    clearTimer(id);
    latestContentRef.current.delete(id);
    versionRef.current.delete(id);
    queueRef.current.delete(id);
    dirtyRef.current.delete(id);
  }

  async function persist(id: string, content: string, version: number) {
    if (!mountedRef.current) {
      return;
    }

    setWidgets((current) =>
      current.map((widget) =>
        widget.id === id
          ? { ...widget, saveState: 'saving', errorMessage: undefined, retryAction: undefined }
          : widget,
      ),
    );

    try {
      const saved = await api.updateWidget(id, content);

      if (!mountedRef.current) {
        return;
      }

      const isCurrent = versionRef.current.get(id) === version;

      if (isCurrent) {
        dirtyRef.current.delete(id);
      }

      setWidgets((current) =>
        current.map((widget) => {
          if (widget.id !== id) {
            return widget;
          }

          return {
            ...widget,
            content: isCurrent ? saved.content : widget.content,
            updatedAt: isCurrent ? saved.updatedAt : widget.updatedAt,
            saveState: isCurrent ? 'saved' : 'saving',
          };
        }),
      );
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      // A newer edit is already queued; let its save report the result.
      if (versionRef.current.get(id) !== version) {
        return;
      }

      setWidgets((current) =>
        current.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                saveState: 'error',
                errorMessage: messageFromError(error),
                retryAction: 'save',
              }
            : widget,
        ),
      );
    }
  }

  function enqueueSave(id: string) {
    const content = latestContentRef.current.get(id);
    const version = versionRef.current.get(id);

    if (content === undefined || version === undefined) {
      return;
    }

    const previous = queueRef.current.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => persist(id, content, version));

    queueRef.current.set(id, next);
    void next.finally(() => {
      if (queueRef.current.get(id) === next) {
        queueRef.current.delete(id);
      }
    });
  }

  function scheduleSave(id: string, content: string) {
    latestContentRef.current.set(id, content);
    versionRef.current.set(id, (versionRef.current.get(id) ?? 0) + 1);
    dirtyRef.current.add(id);

    clearTimer(id);
    timersRef.current.set(
      id,
      setTimeout(() => {
        timersRef.current.delete(id);
        enqueueSave(id);
      }, SAVE_DEBOUNCE_MS),
    );
  }

  function flushWidget(id: string) {
    if (!timersRef.current.has(id)) {
      return;
    }

    clearTimer(id);
    enqueueSave(id);
  }

  function updateWidget(id: string, content: string) {
    setWidgets((current) =>
      current.map((widget) => {
        if (widget.id !== id) {
          return widget;
        }

        // A temp widget may still be creating or may have failed to create.
        // Keep its status/retry action visible while the user types.
        if (isTempId(id)) {
          return { ...widget, content };
        }

        return {
          ...widget,
          content,
          saveState: 'idle',
          errorMessage: undefined,
          retryAction: undefined,
        };
      }),
    );

    if (isTempId(id)) {
      latestContentRef.current.set(id, content);
      dirtyRef.current.add(id);
      return;
    }

    scheduleSave(id, content);
  }

  async function createFromTemp(tempId: string) {
    const content = latestContentRef.current.get(tempId) ?? '';
    pendingCreatesRef.current.add(tempId);

    setWidgets((current) =>
      current.map((widget) =>
        widget.id === tempId
          ? { ...widget, saveState: 'saving', errorMessage: undefined, retryAction: undefined }
          : widget,
      ),
    );

    try {
      const created = await api.createWidget(content);

      if (!mountedRef.current) {
        return;
      }

      if (deletedWhileCreatingRef.current.delete(tempId)) {
        // The temp widget was removed while creation was in flight. Remove
        // the record that was just created so it cannot reappear on reload.
        void api.deleteWidget(created.id).catch(() => undefined);
        return;
      }

      const latest = latestContentRef.current.get(tempId) ?? content;
      latestContentRef.current.delete(tempId);
      versionRef.current.delete(tempId);
      dirtyRef.current.delete(tempId);

      if (latest !== content) {
        // The user typed while the create request was in flight.
        latestContentRef.current.set(created.id, latest);
        versionRef.current.set(created.id, 1);
        dirtyRef.current.add(created.id);

        setWidgets((current) =>
          current.map((widget) =>
            widget.id === tempId
              ? {
                  ...toWidgetView(created),
                  clientKey: tempId,
                  content: latest,
                  saveState: 'saving',
                }
              : widget,
          ),
        );
        setFocusId((current) => (current === tempId ? created.id : current));
        enqueueSave(created.id);
        return;
      }

      setWidgets((current) =>
        current.map((widget) =>
          widget.id === tempId
            ? { ...toWidgetView(created), clientKey: tempId, saveState: 'saved' }
            : widget,
        ),
      );
      setFocusId((current) => (current === tempId ? created.id : current));
    } catch (error) {
      deletedWhileCreatingRef.current.delete(tempId);

      if (!mountedRef.current) {
        return;
      }

      setWidgets((current) =>
        current.map((widget) =>
          widget.id === tempId
            ? {
                ...widget,
                saveState: 'error',
                errorMessage: messageFromError(error),
                retryAction: 'save',
              }
            : widget,
        ),
      );
    } finally {
      pendingCreatesRef.current.delete(tempId);
    }
  }

  function addWidget() {
    const temp = createTempWidget();
    latestContentRef.current.set(temp.id, '');
    setWidgets((current) => [temp, ...current]);
    setFocusId(temp.id);
    void createFromTemp(temp.id);
  }

  async function deleteWidget(id: string) {
    const index = widgetsRef.current.findIndex((widget) => widget.id === id);
    const existing = index >= 0 ? widgetsRef.current[index] : undefined;

    if (!existing) {
      return;
    }

    setWidgets((current) => current.filter((widget) => widget.id !== id));
    setFocusId((current) => (current === id ? null : current));
    forgetWidget(id);

    if (isTempId(id)) {
      if (pendingCreatesRef.current.has(id)) {
        deletedWhileCreatingRef.current.add(id);
      }

      return;
    }

    try {
      await api.deleteWidget(id);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      // A 404 means the widget is already gone, so the optimistic removal
      // was correct and there is nothing to restore.
      if (error instanceof api.ApiError && error.status === 404) {
        return;
      }

      setWidgets((current) => {
        if (current.some((widget) => widget.id === id)) {
          return current;
        }

        const restored: WidgetView = {
          ...existing,
          saveState: 'error',
          errorMessage: messageFromError(error),
          retryAction: 'delete',
        };
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, restored);
        return next;
      });
    }
  }

  function retryWidget(id: string) {
    const widget = widgetsRef.current.find((candidate) => candidate.id === id);

    if (!widget) {
      return;
    }

    if (widget.retryAction === 'delete') {
      void deleteWidget(id);
      return;
    }

    if (isTempId(id)) {
      void createFromTemp(id);
      return;
    }

    enqueueSave(id);
  }

  // Kept stable because it is a dependency of the mount effect below and the
  // Vitest pipeline does not run React Compiler.
  const loadWidgets = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);

    try {
      const loaded = await api.fetchWidgets();

      if (!mountedRef.current) {
        return;
      }

      setWidgets(loaded.map(toWidgetView));
      setStatus('ready');
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      setStatus('error');
      setLoadError(messageFromError(error));
    }
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    const dirty = dirtyRef.current;
    const latestContent = latestContentRef.current;

    mountedRef.current = true;
    void loadWidgets();

    return () => {
      mountedRef.current = false;

      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();

      // Best-effort flush when the component unmounts with unsaved edits.
      for (const id of dirty) {
        if (isTempId(id)) {
          continue;
        }

        const content = latestContent.get(id);

        if (content !== undefined) {
          void api.updateWidget(id, content).catch(() => undefined);
        }
      }
    };
  }, [loadWidgets]);

  useEffect(() => {
    const flush = () => {
      for (const id of dirtyRef.current) {
        if (isTempId(id)) {
          continue;
        }

        const content = latestContentRef.current.get(id);

        if (content !== undefined) {
          void api.flushWidgetUpdate(id, content);
        }
      }
    };

    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return {
    widgets,
    focusId,
    status,
    loadError,
    addWidget,
    updateWidget,
    deleteWidget,
    flushWidget,
    retryWidget,
    reload: loadWidgets,
  };
}
