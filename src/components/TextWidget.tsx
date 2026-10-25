import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { WidgetData } from '../types'
import { TrashIcon } from './Icons'

const MarkdownPreview = lazy(async () => {
  const module = await import('./MarkdownPreview')
  return { default: module.MarkdownPreview }
})

type Mode = 'write' | 'preview'

interface TextWidgetProps {
  widget: WidgetData
  autoFocus: boolean
  onChange: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export function TextWidget({ widget, autoFocus, onChange, onDelete }: TextWidgetProps) {
  const [mode, setMode] = useState<Mode>('write')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorId = `widget-editor-${widget.id}`
  const characterCount = widget.content.length

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus()
    }
  }, [autoFocus])

  return (
    <article className="widget" aria-label="Text widget">
      <div className="widget-toolbar">
        <div className="segmented-control" role="group" aria-label="Widget mode">
          <button
            type="button"
            className="segmented-control__option"
            aria-pressed={mode === 'write'}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            className="segmented-control__option"
            aria-pressed={mode === 'preview'}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>

        <button
          type="button"
          className="icon-button icon-button--danger"
          aria-label="Delete widget"
          title="Delete widget"
          onClick={() => onDelete(widget.id)}
        >
          <TrashIcon className="icon" />
        </button>
      </div>

      <div className="widget-content">
        {mode === 'write' ? (
          <>
            <label className="sr-only" htmlFor={editorId}>
              Widget text
            </label>
            <textarea
              ref={textareaRef}
              id={editorId}
              className="widget-editor"
              value={widget.content}
              onChange={(event) => onChange(widget.id, event.target.value)}
              placeholder="Write anything. Markdown is supported."
              spellCheck
            />
          </>
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
  )
}
