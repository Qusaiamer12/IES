# IEEE IES HU — chapter website

Website of the IEEE Industrial Electronics Society student chapter at the Hashemite University.

**Live:** https://ies-hu.vercel.app (Vercel project `ieee-ies-hu`, Supabase project `ies-hu`)
Next.js 15 (App Router, TypeScript), hosted on Vercel. Content lives in `data/*.json`; form submissions are saved to Supabase
(and optionally emailed to the chapter inbox).

## Pages

| Route | What it is |
|---|---|
| `/` | Home: hero, IES at a glance, upcoming events, IES 75 years, branch partners |
| `/chapter` | About the chapter and IEEE IES, publications, history, where we belong |
| `/team` | Committee by term: Core Team, then Executive Team |
| `/events`, `/events/<slug>` | Upcoming and past events, one page per event |
| `/projects` | Projects: PID Duel, the control-engineering game built for IEEE Jordan Day 2026 |
| `/projects/pid-duel` | The game itself (`public/games/pid-duel.html`, a self-contained page served under this URL) |
| `/join` | Why join, benefits, join form, FAQ |
| `/contact` | Contact form, address, Instagram |
| `/m/<slug>` | Member profile. **NFC target**: this URL is written to the member's card |
| `/m/<slug>/contact.vcf` | The member's contact card (vCard) |
| `/api/contact`, `/api/join` | Form endpoints (POST JSON) |

Old names redirect: `/about` → `/chapter`, `/officers` → `/team`, `/membership` → `/join`.

## Run locally

```bash
npm install
cp .env.example .env.local      # MAIL_DRY_RUN=1 tests the forms with no emails and no database rows
npm run dev                     # http://localhost:3000
```

Checks before pushing:

```bash
npm run check                   # typecheck + production build
npm run build && MAIL_DRY_RUN=1 npm start &   # then, in another terminal:
npm run test:e2e                # every page at phone and desktop width: axe accessibility, links, images,
                                # overflow, menu, both forms, API, redirects, security headers
```

Single-file HTML preview (all pages, CSS, fonts and photos in one file, for sharing before deploy):

```bash
npm run build && npm start &    # then:
npm run preview:html            # writes preview/ies-hu-preview.html
```

## Deploy and forms

**Vercel** (Hobby, free) builds every push to the production branch (the repository's default branch); functions run in Frankfurt (`fra1`).
Project settings:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | the public address, no trailing slash (update it when a custom domain is added) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API keys → publishable key |
| `MAIL_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | set: every submission is emailed to `ies.2026.hu@gmail.com`, sent from that same Gmail account |
| `SMTP_PASS` | a Gmail **App Password** for `ies.2026.hu@gmail.com` (Google Account → Security → 2-Step Verification → App passwords). Emails start once it is added |

Change a variable → redeploy (Deployments → ⋯ → Redeploy). Add a domain under **Settings → Domains**.

**Supabase** stores the forms in two tables, `contact_messages` and `join_requests`
(open them in **Table Editor**). Row Level Security lets the public key only *insert* rows with `status = 'new'`;
nobody can read them through the API, so submissions are visible only in the Supabase dashboard.
Use the `status` column to track replies: `new / replied / archived` for messages, `new / contacted / accepted / declined` for join requests.
The schema is in `supabase/migrations/`.

If neither Supabase nor SMTP is configured, both forms answer "not connected yet" and point people to Instagram.
A submission succeeds when at least one of them works.

## Backup copy (Render)

The same site is also built as plain files and hosted on Render: **https://ies-hu.onrender.com** (Cloudflare network,
independent of Vercel). Every push to the production branch updates both. Use it if a network can't reach `vercel.app`;
every path works on both hosts, including `/m/<slug>` for the NFC cards.

- Build: `npm run build:static` (see `scripts/build-static.mjs`), publish directory `out/`.
- Render environment: `NEXT_PUBLIC_SITE_URL=https://ies-hu.onrender.com`, `NEXT_PUBLIC_NOINDEX=1` (kept out of search),
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NODE_VERSION=22`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.
- Its forms insert straight into Supabase (insert-only tables, throttled by the database), so they keep working even
  when Vercel is down. No email notifications from the backup.
- Upcoming/past events are decided at build time there; the next push rebuilds it.

## Add or change content

**A member** — add an entry to `data/members.json`, put the photo in `public/members/<slug>.jpg`:

```json
{
  "slug": "firstname",
  "nameEn": "First Last",
  "nameAr": "الاسم بالعربي",
  "role": "chair | vice | secretary | membership | pr | events | media | design | member",
  "specialtyEn": "Electrical Engineering",
  "year": "3rd year",
  "memberId": "IES-001",
  "validThru": "08/2027",
  "founding": true,
  "motto": null,
  "bio": "Short bio, as the member submitted it.",
  "highlights": ["One achievement per line."],
  "badges": [],
  "photo": "/members/firstname.jpg",
  "term": "2026/2027",
  "links": { "linkedin": null, "instagram": null, "email": null, "phone": null }
}
```

Publish only officers who gave consent in the profile form, and never their email, phone, IEEE number or home area.
Slugs are lowercase letters, digits and hyphens (we use `firstname-lastname`). Once a slug is written to an NFC card it must never change,
and neither may the domain. Write `https://<domain>/m/<slug>` with the NFC Tools app, test on iPhone and Android, then lock the tag.

**An event** — add an entry to `data/events.json`. Events move from "Coming up" to "Past events" on their date (Amman time):

```json
{
  "slug": "plc-workshop-2026",
  "titleEn": "PLC Workshop",
  "categoryEn": "Workshop",
  "date": "2026-11-20",
  "locationEn": "Faculty of Engineering",
  "summaryEn": "One sentence for the card.",
  "bodyEn": ["Paragraph one.", "Paragraph two."],
  "image": "/events/plc-workshop-2026.jpg",
  "thumb": "/events/plc-workshop-2026-card.jpg",
  "link": null
}
```

`imageSize` is the image's `[width, height]` (keeps the page from jumping while the photo loads; without it the cover
is cropped to 4:3). `thumb` is optional: an ~800px copy of the image for the event cards (the full image is used on the event page).
Optional `gallery` (`[{ "src": "...", "alt": "..." }]`) shows extra photos under the write-up when there are two or more.

**Site settings** (email, social links, address, current term) are in `lib/site.ts`. Empty values stay hidden.
Shared copy (fields, benefits, publications, timeline, partners, FAQ) is in `lib/content.ts`.

## Project layout

```
app/            pages, API routes, sitemap, robots, icon, Open Graph image
components/     header, footer, page blocks, events, team, forms, icons, card motifs
lib/            site settings, data loading, content, validation, Supabase, mailer, rate limit, vCard
data/           members.json, events.json
public/images/  logos and partner logos
supabase/       database schema (migrations)
tests/e2e.mjs   end-to-end checks (Playwright + axe)
DESIGN_SPEC.md  brand and card spec · reference/ original card designs
```

---

### بالعربي باختصار
- **تشغيل محلي:** `npm install` بعدها `npm run dev`.
- **عضو جديد:** سطر بـ `data/members.json` وصورة بـ `public/members/`. رابط العضو `/m/<slug>` ما بيتغيّر أبدًا.
- **فعالية جديدة:** سطر بـ `data/events.json`. بتنتقل لحالها من "القادمة" لـ "السابقة" بتاريخها.
- **النشر:** على Vercel، وأي push للفرع الرئيسي بينزل لحاله.
- **الفورمات:** بتنحفظ بـ Supabase → Table Editor → `contact_messages` و `join_requests`. الإيميل (SMTP) اختياري.
