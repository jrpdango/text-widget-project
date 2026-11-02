# Text Widgets

A collection of Markdown text widgets backed by MongoDB. Add as many widgets as you like, write
in plain text or Markdown, preview the rendered result, and switch between light and dark themes.

## Features

- Add unlimited text widgets; each new widget appears at the top and receives focus.
- Write/Preview toggle per widget, with GitHub-flavored Markdown, tables, task lists, and
  syntax-highlighted code blocks.
- Live character count; the editor comfortably handles 1,000+ characters.
- Debounced autosave (600 ms) to MongoDB, with a per-widget saving/saved/error status and retry.
- Delete widgets immediately; a failed delete restores the widget with a retry action.
- Light/dark theme toggle. The theme follows the OS preference until you toggle it, and the
  explicit choice is remembered in `localStorage`.
- Markdown is rendered without raw HTML. Images are stripped and links open safely in a new tab.
- Production Docker image using Next.js standalone output, served by an unprivileged Node user.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- MongoDB 8 accessed through Mongoose from server-only code
- Zod request validation
- Vitest + Testing Library
- Docker Compose (MongoDB + app, with separate production and dev profiles)

## Architecture

```text
Browser (React Client Components)
        │  fetch('/api/widgets')
        ▼
Next.js Route Handlers (Node.js runtime)
        │  Mongoose
        ▼
MongoDB
```

The browser only talks to the REST API. `src/lib/db.ts` and `src/lib/models/Widget.ts` import
`server-only`, so accidentally importing database code into a client component fails the build.

## Requirements

- Node.js 22.13+ (see `engines`)
- pnpm 12
- Docker (for MongoDB or the full stack)

## Local development

Start MongoDB first (the app defaults to `mongodb://127.0.0.1:27017/text-widgets`):

```bash
pnpm install
docker compose up -d mongo
pnpm dev
```

Open <http://localhost:3000>.

If MongoDB is running elsewhere, set `MONGODB_URI` before starting the app:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/text-widgets pnpm dev
```

## Docker Compose

The stack has two application profiles:

```bash
# Production build: Next.js standalone server + MongoDB
pnpm docker:prod

# Development with source bind-mounted and Next.js hot reload + MongoDB
pnpm docker:dev

# Stop everything (both profiles)
pnpm docker:down
```

If Docker requires `sudo` on your machine, run the Compose commands directly with `sudo`
instead of using the `pnpm docker:*` scripts. The scripts run Docker without `sudo`, so they
will fail with a permission error:

```bash
sudo docker compose --profile prod up --build
sudo docker compose --profile dev up --build
sudo docker compose --profile prod --profile dev down
```

The app is available at <http://localhost:3000> and MongoDB at `localhost:27017`.

Both profiles use the same `MONGODB_URI=mongodb://mongo:27017/text-widgets` set inside the
Compose service. There are no credentials and no `.env` file; this is a local/trusted-use setup.

## Scripts

```bash
pnpm dev           # next dev
pnpm build         # next build
pnpm start         # next start
pnpm lint          # eslint .
pnpm format        # prettier --write .
pnpm format:check  # prettier --check .
pnpm test          # vitest run
pnpm test:watch    # vitest
```

## API

| Method   | Path               | Body                     | Success                  | Errors                     |
| -------- | ------------------ | ------------------------ | ------------------------ | -------------------------- |
| `GET`    | `/api/widgets`     | —                        | `200 WidgetData[]`       | `500`, `503`               |
| `POST`   | `/api/widgets`     | `{ "content"?: string }` | `201 WidgetData`         | `400`, `500`, `503`        |
| `GET`    | `/api/widgets/:id` | —                        | `200 WidgetData`         | `400`, `404`, `500`, `503` |
| `PATCH`  | `/api/widgets/:id` | `{ "content": string }`  | `200 WidgetData`         | `400`, `404`, `500`, `503` |
| `DELETE` | `/api/widgets/:id` | —                        | `204`                    | `400`, `404`, `500`, `503` |
| `GET`    | `/api/health`      | —                        | `200 { "status": "ok" }` | `503`                      |

`GET /api/widgets` returns widgets newest first. IDs are server-generated UUIDs. Content is
limited to 100,000 characters; the editor enforces the same limit client-side. Unexpected
server failures return `500` with the same error envelope.

Widget shape:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "content": "# Hello",
  "createdAt": "2026-01-02T03:04:05.000Z",
  "updatedAt": "2026-01-02T03:05:06.000Z"
}
```

Errors use a consistent envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Too big: expected string to have <=100000 characters"
  }
}
```

Example:

```bash
curl localhost:3000/api/widgets
curl -X POST localhost:3000/api/widgets \
  -H 'content-type: application/json' \
  -d '{"content":"# Hello"}'
```

## Session exports

- [Initial build session](docs/session-174a3795-0857-4eed-9955-7ff6ff26eb45.md)
- [Next.js and MongoDB migration session](docs/session-4570206b-b61c-4c13-a0f3-c958691e5925.md)

## Storage

Widgets live in MongoDB (`text-widgets` database, `widgets` collection). The browser never
accesses MongoDB directly.

The theme preference is intentionally kept in `localStorage`:

| Key                  | Contents              |
| -------------------- | --------------------- |
| `text-widgets:theme` | `"light"` or `"dark"` |

Widgets saved by earlier versions of this project under the old `text-widgets:v1`
`localStorage` key are ignored. There is no migration.

## Testing

```bash
pnpm test
pnpm test:watch
```

Tests use Vitest, Testing Library, and jsdom. The UI tests mock `@/lib/api` (the HTTP boundary),
while the route-handler tests mock `@/lib/models/Widget` and `@/lib/db` (the storage boundary).
Assertions check observable behaviour: HTTP status and body, model call arguments, rendered DOM,
outgoing API payloads, and save/retry transitions.

## Quality checks

```bash
pnpm lint
pnpm format:check
pnpm build
```

`pnpm peers check` reports warnings because some ESLint plugins bundled with
`eslint-config-next` do not list ESLint 10 in their peer ranges yet. Linting itself works, and
Next.js 16.4+ supports ESLint 10.

## Security notes

- There is no authentication and one shared widget list. Anyone who can reach the app can
  read and write every widget.
- MongoDB is published on port `27017` without credentials. This is intended for local
  development only; do not expose the stack to an untrusted network.
- Markdown renders without raw HTML, strips images, and opens links with
  `rel="noopener noreferrer"`.
- Next.js applies basic security headers (`nosniff`, `DENY` framing, strict referrer policy, and a
  restrictive permissions policy).

## Structure

```text
src/
  app/
    layout.tsx          Root layout, global CSS, pre-paint theme script
    page.tsx            Server page that renders the client app
    api/                Route handlers for widgets and health
  components/           Header, TextWidget, MarkdownPreview, icons, UI controls
  hooks/                useWidgets (optimistic CRUD + autosave), useTheme
  lib/
    api.ts              Client HTTP layer
    db.ts               Server-only Mongoose connection
    models/Widget.ts    Server-only Mongoose model
    validation.ts       Zod schemas
    http.ts             API response/error helpers
    serializeWidget.ts  Server-side serializer that emits the client-safe shape
    themeStorage.ts     Theme localStorage access
  test/                 Vitest setup, fixtures, matchMedia helper
  App.tsx               Client page layout
docs/                   OpenCode session export
compose.yaml            MongoDB + app (prod/dev profiles)
Dockerfile              Multi-stage Next.js standalone build
```
