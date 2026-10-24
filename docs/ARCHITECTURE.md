# Architecture

This site is built to outlive its authors. Every choice below favours **things a student can still understand, change
and run in five years** over cleverness. The decisions and their reasons are recorded in [decisions/](decisions/).

## Principles

1. **Content is data, not code.** Everything an officer edits lives in `content/*.json`. Code never contains names,
   dates or copy that changes from term to term.
2. **One source of truth per fact.** The shape of content is defined once (`lib/content/schema.ts`). Types, build-time
   validation and editor autocomplete are all derived from it. Form options are defined once (`lib/validate.ts`) and a
   test checks they match the database.
3. **Fail at build time, not in front of visitors.** Invalid content, missing photos, broken references and mismatched
   form options fail the build or the tests with a message that names the file, the item and the field.
4. **Static first.** Every page is generated at build time. The only server code is the two form endpoints. The whole
   site can also be exported as plain files (the backup host).
5. **Permanent addresses.** `/m/<slug>` is printed on NFC cards and must work forever. People are never deleted; a
   test guards it.
6. **Few dependencies, pinned versions.** Next.js, React, Zod and nodemailer at runtime; that's all.

## The big picture

```
                          ┌──────────────────────────── GitHub: Qusaiamer12/IES ───────────────────────────┐
  officers edit           │  content/*.json   public/ (photos)   app/ components/ lib/ (code)              │
  content/ + public/ ───► │                                                                                │
                          │  every push ──► CI (types, unit + content tests, builds, end-to-end checks)    │
                          └──────────────┬──────────────────────────────────────────┬──────────────────────┘
                                         │ auto-deploy                              │ auto-deploy
                                         ▼                                          ▼
                      Vercel  (primary)  ies-hu.vercel.app           Render  (backup)  ies-hu.onrender.com
                      static pages + /api/contact, /api/join         same pages as plain files (npm run build:static)
                                         │                                          │ forms post directly
                                         ▼                                          ▼
                                   Supabase (Postgres, eu-central-1): contact_messages, join_requests
                                   insert-only for the public key · spam guard trigger · read only in the dashboard
                                         │ (optional)
                                         ▼
                                   Gmail SMTP → ies.2026.hu@gmail.com  (notification email per submission)
```

## Directory map

```
content/                 Everything officers edit (JSON). See docs/CONTENT.md.
  site.json              Name, slogan, email, address, social links, current term
  people.json            Everyone who ever served: name, photo, bio, links. Permanent; never delete.
  committees.json        One entry per term: who held which role. Add a term; never edit old ones.
  roles.json             Officer positions, their order, Core/Executive team, colour
  events.json            Events with write-ups and photos
  chapter.json           Shared copy: fields, benefits, publications, timeline, FAQ
  partners.json          Branch partners
  schemas/               Generated JSON Schemas (editor autocomplete). Don't edit; run npm run content:schemas.
public/                  Static files: members/<slug>.jpg, events/<slug>/…, images/, games/
app/                     Routes (Next.js App Router). Thin: read from lib/content, render components.
  m/[slug]/              Member page (NFC target) + contact.vcf
  api/contact, api/join  The only server code: form endpoints (Vercel only)
components/              UI building blocks (Header, Footer, Team, Events, Forms, Stats, …)
lib/
  content/schema.ts      Shape of every content file (Zod). Single source of truth.
  content/index.ts       Loads + validates + cross-checks content; the only module that reads content/. Server only.
  content/model.ts       Types and helpers safe for client components (no data, no Zod).
  validate.ts            Form validation, shared by the browser and the API (and checked against the database).
  form-handler.ts        The API: checks, rate limit, honeypot, Supabase insert, optional email
  supabase.ts mailer.ts  Integrations
  seo.ts site.ts dates.ts vcard.ts rows.ts icons.ts
supabase/migrations/     Database schema, in order. The database is changed only through new migrations.
scripts/                 build-static.mjs (backup build), snapshot.mjs (single-file preview)
tests/unit/              Vitest: logic, content integrity, NFC guard, form options vs database
tests/e2e.mjs            Playwright + axe: every page, both widths, forms, accessibility, headers
docs/                    This documentation, decisions, design spec, brand assets, project history
```

## Routes

| Route | Page |
|---|---|
| `/` | Home: hero, stats, latest events, IES 75 years, partners |
| `/chapter` | About the chapter and IEEE IES: publications, timeline, where we belong |
| `/team` | Committee by term (Core Team, Executive Team), every past term selectable |
| `/events`, `/events/<slug>` | Upcoming and past events; one page per event with photos |
| `/projects`, `/projects/pid-duel` | Projects; PID Duel is a self-contained game (`public/games/pid-duel.html`) |
| `/join`, `/contact` | Forms (join request, message) |
| `/m/<slug>` | Member page — **NFC target**, permanent |
| `/m/<slug>/contact.vcf` | The member's contact card (photo, role, chapter email) |
| `/api/contact`, `/api/join` | Form endpoints (POST JSON), primary host only |
| `/about`, `/officers`, `/membership` | Permanent redirects to the current names |

## Data model

```
roles.json        people.json                    committees.json
──────────        ───────────                    ───────────────
key ◄───────────┐ slug  (permanent, NFC)  ◄───┐  term  "2026/2027"
label           │ memberId (IES-001…)         │  validThru
core            │ nameEn, nameAr              │  members[]
accent          │ photo, bio, highlights      └── person  (a slug)
                └──────────────────────────────── role    (a role key)
                                                   year, badges   (this term only)
```

- A **person** is who someone is; it never changes meaning and is never deleted.
- A **seat** is what they did in one term. A person can hold seats in several terms (Executive one year, Chair the
  next); their member page shows the latest seat and lists the rest under *Committees*.
- **Founding member** is derived (a seat in the first term), not typed by hand.
- `lib/content/index.ts` joins these into `Member` objects (`person + seat + role`), so pages never do lookups.

## Rendering and boundaries

- **Server components** (pages) import from `@/lib/content`. **Client components** (`'use client'`: Header, Team
  browser, Forms, Stats) must import only from `@/lib/content/model`, `@/lib/site` and `@/lib/validate`, which carry no
  data and no validation library. This keeps the browser bundle small.
- Home and events pages revalidate hourly so events move from *Coming up* to *Past* at midnight in Amman.
- Desktop sizing: all CSS sizes are `rem`; the root size is 16px on phones, 14px on tablets and a fluid
  `clamp(12px, 0.79vw, 16px)` on desktop, so the layout scales like a zoom and fills large screens (ADR 0006).

## Forms

```
browser form ──► validate (lib/validate.ts) ──► POST /api/join ──► form-handler: type/size checks, honeypot,
                                                                   per-IP rate limit, validate again
                                                                   ├─► Supabase insert (insert-only RLS,
                                                                   │   trigger: 3/email/hour, 60/form/hour)
                                                                   └─► Gmail notification (if SMTP_PASS set)
backup site: browser form ──► validate ──► Supabase REST insert directly (same RLS + trigger)
```

## Extending the site

| To add… | Do this |
|---|---|
| A new term's committee | `content/committees.json` (+ new people in `people.json`). No code. |
| A new officer position (e.g. Treasurer) | Add it to `content/roles.json`. No code. |
| A new field in a content file | Add it in `lib/content/schema.ts` → `npm run content:schemas` → use it in a component. |
| A new page | `app/<name>/page.tsx` using `pageMeta()` from `lib/seo.ts`; add it to `NAV` in `lib/site.ts` if it belongs in the menu; add the route to `tests/e2e.mjs`. |
| A new kind of content (e.g. workshops) | New `content/<name>.json` + schema in `schema.ts` (add to `CONTENT_FILES`) + loader export in `lib/content/index.ts`. |
| A new form or a database change | New file in `supabase/migrations/` (never edit an applied one), then API route + `lib/validate.ts`; extend `tests/unit/forms.test.ts`. |
| A new self-contained HTML project (like PID Duel) | `public/games/<name>.html` + rewrite in `next.config.ts` + copy step in `scripts/build-static.mjs` + card on `/projects`. |
