# Contributing

Thanks for keeping the chapter's site alive. Content-only changes (members, events, photos) need no coding:
see [docs/CONTENT.md](docs/CONTENT.md). This page is for code changes.

## Setup

```bash
nvm use            # Node 22 (.nvmrc)
npm install
cp .env.example .env.local   # optional: MAIL_DRY_RUN=1 lets the forms "succeed" locally without email or database
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run check` | Types + unit/content tests + production build. **Run before every push.** |
| `npm test` | Unit tests and content checks (Vitest, ~1 s) |
| `npm run content:check` | Only the content checks |
| `npm run content:schemas` | Regenerate `content/schemas/` after changing `lib/content/schema.ts` |
| `npm run build && MAIL_DRY_RUN=1 npm start` then `npm run test:e2e` | End-to-end checks against the built site (every page, phone + desktop, accessibility, forms, headers) |
| `npm run build:static` | The static backup build (`out/`); needs the `NEXT_PUBLIC_SUPABASE_*` variables |
| `npm run preview:html` | Single-file HTML preview of the running site, for sharing |

CI (`.github/workflows/ci.yml`) runs all of this on every push and pull request.

## Workflow

1. Branch from the default branch: `git checkout -b short-description`.
2. Make the change; keep pull requests small and about one thing.
3. `npm run check` (and the end-to-end checks if you touched pages, forms or CSS).
4. Open a pull request; fill in the checklist; wait for green CI; merge. Both hosts deploy automatically.

## Conventions

- **Content never goes in code.** Names, dates and copy belong in `content/`. If a component needs new data, add a field
  to `lib/content/schema.ts` (with a `.describe()` explaining it) and run `npm run content:schemas`.
- **Server/client boundary.** Pages import data from `@/lib/content`. Client components (`'use client'`) import only from
  `@/lib/content/model`, `@/lib/site` and `@/lib/validate`.
- **CSS** is one file, `app/globals.css`, with design tokens on `:root`. Sizes are in `rem` (the root size scales the
  whole site per screen width — see ADR 0006); hairline borders (1–2px) stay in `px`. No CSS framework.
- **Accessibility is not optional.** Every image has `alt` (empty for decorative ones), every form field a label,
  colours meet WCAG AA. The end-to-end checks run axe on every page.
- **Pin dependency versions** (`npm install --save-exact`). Dependabot proposes updates weekly; merge them only when CI
  is green.
- **Database changes** are new files in `supabase/migrations/`, never edits to applied ones.
- **Comments explain why**, not what. Keep them current when you change the code next to them.
- **Record big decisions** as a new file in `docs/decisions/` (copy the format of an existing one).

## Where to start reading the code

1. `lib/content/schema.ts` — what the content looks like.
2. `lib/content/index.ts` — how it is loaded and joined.
3. `app/team/page.tsx`, `components/Team.tsx`, `app/m/[slug]/page.tsx` — a full path from data to page.
4. `lib/form-handler.ts` — the only server logic.
