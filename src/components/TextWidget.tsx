import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { WidgetData } from '../types';
import { TrashIcon } from './Icons';
import { IconButton, Textarea, ToggleGroup, type ToggleGroupOption } from './ui';

const MarkdownPreview = lazy(async () => {
  const module = await import('./MarkdownPreview');
  return { default: module.MarkdownPreview };
});

type Mode = 'write' | 'preview';

const MODE_OPTIONS: readonly ToggleGroupOption<Mode>[] = [
  { value: 'write', label: 'Write' },
  { value: 'preview', label: 'Preview' },
];

interface TextWidgetProps {
  widget: WidgetData;
  autoFocus: boolean;
  onChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function TextWidget({ widget, autoFocus, onChange, onDelete }: TextWidgetProps) {
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
            onChange={(event) => onChange(widget.id, event.target.value)}
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
        <span className="widget-hint">Markdown</span>
      </div>
    </article>
  );
}
