# Text Widgets

A local-first collection of Markdown text widgets. Add as many widgets as you like, write in
plain text or Markdown, preview the rendered result, and switch between Monokai Pro light and
dark themes.

## Features

- Add unlimited text widgets; each new widget appears at the top and receives focus.
- Write/Preview toggle per widget, with GitHub-flavored Markdown, tables, task lists, and
  syntax-highlighted code blocks.
- Live character count; the editor comfortably handles 1,000+ characters.
- Delete widgets immediately.
- Light/dark theme using Monokai Pro and Monokai Pro Light.
- Theme follows the OS preference until you toggle it; an explicit choice is remembered.
- Widgets, text, and theme choice persist in `localStorage`.
- Markdown is rendered without raw HTML. Images are stripped and links open safely in a new tab.
- Production Docker image served by unprivileged Nginx.

## Requirements

- Node.js 22.12+ (see `engines`)
- pnpm 12

## Development

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite (usually <http://localhost:5173>).

## Quality checks

```bash
pnpm test         # Vitest + Testing Library
pnpm lint         # ESLint
pnpm format       # Prettier write
pnpm format:check # Prettier check (CI-friendly)
pnpm build        # TypeScript check + production build
```

Formatting is configured in `.prettierrc.json` with semicolons enabled and single quotes to match
the existing code style.

The test suite covers widget creation, ordering, focus, editing, 1,000+ character content,
character counts, deletion, localStorage hydration and malformed data, Markdown rendering,
GFM tables/task lists, syntax highlighting, HTML/image safety, per-widget preview toggles, and
theme behavior (system default, OS tracking, explicit choice, persistence).

## Docker

Build and run:

```bash
docker build -t text-widgets .
docker run --rm -p 8080:8080 text-widgets
```

Open <http://localhost:8080>. The container serves the static production build with Nginx on
port 8080, with SPA fallback, gzip, asset caching, and basic security headers.

## Storage

| Key                  | Contents                                |
| -------------------- | --------------------------------------- |
| `text-widgets:v1`    | JSON array of `{ id, content }` widgets |
| `text-widgets:theme` | `"light"` or `"dark"`                   |

Storage failures (private mode, quota, malformed JSON) are handled gracefully; the app falls
back to in-memory state.

## Structure

```text
src/
  components/       Header, TextWidget, MarkdownPreview, icons
  hooks/            useWidgets (CRUD + persistence), useTheme
  lib/storage.ts    Validated localStorage access
  test/             Vitest setup and matchMedia helper
  App.tsx           Page layout
Dockerfile          Multi-stage build
nginx.conf          Nginx site configuration
```
