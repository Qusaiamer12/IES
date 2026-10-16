# IEEE IES HU — chapter website

Website of the IEEE Industrial Electronics Society student chapter at the Hashemite University.
Next.js 15 (App Router, TypeScript), no database: content lives in `data/*.json`, forms are emailed to the chapter inbox.

## Pages

| Route | What it is |
|---|---|
| `/` | Home: hero, IES at a glance, upcoming events, IES 75 years, branch partners |
| `/chapter` | About the chapter and IEEE IES, publications, history, where we belong |
| `/team` | Committee by term with role filters (shows "being announced" while `members.json` is empty) |
| `/events`, `/events/<slug>` | Upcoming and past events, one page per event |
| `/projects` | Projects (none launched yet) |
| `/join` | Why join, benefits, join form, FAQ |
| `/contact` | Contact form, address, Instagram |
| `/m/<slug>` | Member profile. **NFC target**: this URL is written to the member's card |
| `/m/<slug>/contact.vcf` | The member's contact card (vCard) |
| `/api/contact`, `/api/join` | Form endpoints (POST JSON) |

Old names redirect: `/about` → `/chapter`, `/officers` → `/team`, `/membership` → `/join`.

## Run locally

```bash
npm install
cp .env.example .env.local      # then set MAIL_DRY_RUN=1 to test forms without sending email
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

## Deploy (Vercel, free)

1. Import this GitHub repository on vercel.com. The defaults for Next.js work as they are.
2. In **Settings → Environment Variables** add the values from `.env.example`:
   `NEXT_PUBLIC_SITE_URL`, `MAIL_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (and optionally `MAIL_FROM`).
   With Gmail, turn on 2-step verification and create an **App Password** for `SMTP_PASS`.
3. Add the domain under **Settings → Domains**, then redeploy.

Until the SMTP variables are set, both forms answer "not connected yet" and point people to Instagram.
The site needs a Node host for the form API, so GitHub Pages alone is not enough.

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
  "link": null
}
```

**Site settings** (email, social links, address, current term) are in `lib/site.ts`. Empty values stay hidden.
Shared copy (fields, benefits, publications, timeline, partners, FAQ) is in `lib/content.ts`.

## Project layout

```
app/            pages, API routes, sitemap, robots, icon, Open Graph image
components/     header, footer, page blocks, events, team, forms, icons, card motifs
lib/            site settings, data loading, content, validation, mailer, rate limit, vCard
data/           members.json, events.json
public/images/  logos and partner logos
tests/e2e.mjs   end-to-end checks (Playwright + axe)
DESIGN_SPEC.md  brand and card spec · reference/ original card designs
```

---

### بالعربي باختصار
- **تشغيل محلي:** `npm install` بعدها `npm run dev`.
- **عضو جديد:** سطر بـ `data/members.json` وصورة بـ `public/members/`. رابط العضو `/m/<slug>` ما بيتغيّر أبدًا.
- **فعالية جديدة:** سطر بـ `data/events.json`. بتنتقل لحالها من "القادمة" لـ "السابقة" بتاريخها.
- **النشر:** على Vercel مجانًا، وحطّ إعدادات الإيميل (SMTP) عشان الفورمات توصل على إيميل الشعبة.
