import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { TrashIcon } from '@/components/Icons';
import { IconButton, Textarea, ToggleGroup, type ToggleGroupOption } from '@/components/ui';
import type { WidgetView } from '@/hooks/useWidgets';
import { MAX_WIDGET_CONTENT_LENGTH } from '@/lib/widgetLimits';

const MarkdownPreview = lazy(async () => {
  const previewModule = await import('./MarkdownPreview');
  return { default: previewModule.MarkdownPreview };
});

type Mode = 'write' | 'preview';

const MODE_OPTIONS: readonly ToggleGroupOption<Mode>[] = [
  { value: 'write', label: 'Write' },
  { value: 'preview', label: 'Preview' },
];

interface TextWidgetProps {
  widget: WidgetView;
  autoFocus: boolean;
  onChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onFlush: (id: string) => void;
  onRetry: (id: string) => void;
}

export function TextWidget({
  widget,
  autoFocus,
  onChange,
  onDelete,
  onFlush,
  onRetry,
}: TextWidgetProps) {
  const [mode, setMode] = useState<Mode>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = widget.content.length;

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <article className="widget" aria-label="Text widget">
      <div className="widget-toolbar">
        <ToggleGroup<Mode>
          label="Widget mode"
          value={mode}
          options={MODE_OPTIONS}
          onChange={setMode}
        />

        <IconButton
          label="Delete widget"
          tone="danger"
          size="sm"
          onClick={() => onDelete(widget.id)}
        >
          <TrashIcon className="icon" />
        </IconButton>
      </div>

      <div className="widget-content">
        {mode === 'write' ? (
          <Textarea
            ref={textareaRef}
            label="Widget text"
            hideLabel
            value={widget.content}
            maxLength={MAX_WIDGET_CONTENT_LENGTH}
            onChange={(event) => onChange(widget.id, event.target.value)}
            onBlur={() => onFlush(widget.id)}
            placeholder="Write anything. Markdown is supported."
            spellCheck
          />
        ) : (
          <Suspense fallback={<p className="preview-empty">Loading preview…</p>}>
            <MarkdownPreview content={widget.content} />
          </Suspense>
        )}
      </div>

      <div className="widget-footer">
        <span className="widget-count">
          {characterCount} {characterCount === 1 ? 'character' : 'characters'}
        </span>

        <span
          className={
            widget.saveState === 'error' ? 'widget-status widget-status--error' : 'widget-status'
          }
        >
          <span role="status">
            {widget.saveState === 'saving' && 'Saving…'}
            {widget.saveState === 'saved' && 'Saved'}
            {widget.saveState === 'error' && (widget.errorMessage ?? 'Unable to save.')}
          </span>

          {widget.saveState === 'idle' && <span className="widget-hint">Markdown</span>}

          {widget.saveState === 'error' && (
            <button type="button" className="widget-retry" onClick={() => onRetry(widget.id)}>
              Retry
            </button>
          )}
        </span>
      </div>
    </article>
  );
}
