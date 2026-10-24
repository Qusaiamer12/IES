# Operations and handover

## Where everything runs

| Service | What it does | Where |
|---|---|---|
| **GitHub** | Source of truth; every push deploys | `Qusaiamer12/IES`. Production branch: the repository's default branch |
| **Vercel** (Hobby) | Primary host: pages + form API, functions in Frankfurt (`fra1`) | Project `ieee-ies-hu`, team `ies14` → https://ies-hu.vercel.app |
| **Render** (static site) | Backup host on a different network (Cloudflare); forms post straight to Supabase | Service `ies-hu` → https://ies-hu.onrender.com |
| **Supabase** (free) | Database for form submissions | Project `ies-hu` (`xsinyhdbbzricunklqiw`, eu-central-1) |
| **Gmail** | Chapter inbox; optional notification email per submission | `ies.2026.hu@gmail.com` |
| **Google Drive** | Original photos, logos, consent forms | Shared with the chapter account |

Both hosts rebuild automatically from GitHub; nobody deploys by hand.

## Environment variables

Set in the host's dashboard, never in the repository (`.env*` files are git-ignored; `.env.example` lists them all).

| Variable | Vercel | Render | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://ies-hu.vercel.app` | `https://ies-hu.onrender.com` | Used in links, sitemap, vCards, previews. Change when a custom domain is added. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | ✓ | – | Server-side inserts (API routes). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | – | ✓ | Browser inserts on the backup. The publishable key is designed to be public: the tables are insert-only. |
| `NEXT_PUBLIC_NOINDEX` | – | `1` | Keeps the backup out of search engines. |
| `MAIL_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | ✓ (set) | – | Notification emails to the chapter inbox. |
| `SMTP_PASS` | **not set yet** | – | A Gmail **App Password** of `ies.2026.hu@gmail.com` (Google Account → Security → 2-Step Verification → App passwords). Emails start once it is added and the project is redeployed. |
| `NODE_VERSION`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | – | `22`, `1` | Build settings. |

## Reading form submissions

Supabase dashboard → project `ies-hu` → **Table Editor**:
- `join_requests` — name, email, phone, major, year, IEEE member, interests, message.
- `contact_messages` — name, email, topic, message.

Use the `status` column to track replies (`new → contacted / accepted / declined` for join requests,
`new → replied / archived` for messages). The public website can only *insert* rows; nobody can read them except
through the dashboard. A database trigger refuses more than 3 submissions per email and 60 per form per hour.

**Export to a spreadsheet:** Table Editor → the table → *Export* → CSV (opens in Google Sheets / Excel).

## Changing the database

Only through a **new** file in `supabase/migrations/` (`YYYYMMDDHHMMSS_what_it_does.sql`), applied with the Supabase
dashboard's SQL editor or the Supabase CLI. Never edit a migration that was already applied; write a new one. If a
form option changes, update `lib/validate.ts` too — `tests/unit/forms.test.ts` fails until both agree.

## When something breaks

| Symptom | Check |
|---|---|
| Site doesn't open on some network | Try the backup https://ies-hu.onrender.com. Some mobile networks have had trouble reaching `vercel.app`; a custom domain fixes that for good. |
| A deploy failed | Vercel / Render dashboard → the failed deployment → build log. Usually a content error with a clear message; fix the file and push. |
| Forms say "could not be sent" | Supabase dashboard: is the project paused (free projects pause after a week without activity — click *Restore*)? Are the env vars set on Vercel? |
| No notification emails | `SMTP_PASS` missing or the App Password was revoked. Submissions are still saved in Supabase. |
| CI is red | GitHub → Actions → the run → the failing step. The message names the file and the problem. |

## Custom domain (recommended before mass-producing NFC cards)

A domain (e.g. `ieshu.org`, ~$10–15/year) means the cards never depend on one host's address, and it avoids networks
that block `vercel.app`. Add it in Vercel → Settings → Domains, set `NEXT_PUBLIC_SITE_URL`, redeploy, then write cards
with the new domain. The `.vercel.app` and `.onrender.com` addresses keep working alongside it. Renew the domain every year —
add it to the handover checklist.

## Yearly handover checklist

The outgoing committee goes through this with the incoming one before leaving.

**Accounts (most important).** Today several services are on personal accounts of the founding officers. Move each to
the chapter account `ies.2026.hu@gmail.com` (or add it as owner) so the chapter never loses access when people graduate:

- [ ] GitHub: transfer the repository to a chapter-owned account or organization (Settings → Transfer), or add the
      new web lead as an admin collaborator.
- [ ] Vercel: invite the chapter account to team `ies14` as owner (or transfer the project).
- [ ] Render: invite the chapter account to the workspace.
- [ ] Supabase: invite the chapter account to the organization as owner.
- [ ] Gmail / Drive: change the chapter account's password and recovery phone to the new chair's; revoke old App Passwords and create a new one.
- [ ] Domain (if any): renewal date, registrar login.

**Content.**
- [ ] New committee in `content/committees.json`, new people in `content/people.json`, `currentTerm` in `site.json`.
- [ ] NFC cards written for new members (`/m/<slug>`), tested on iPhone and Android, locked.
- [ ] Past events have their write-ups and photos.

**Health.**
- [ ] CI green on the default branch; merge or close open Dependabot pull requests.
- [ ] Form submissions of the year exported to CSV and archived on Drive.
- [ ] Read `docs/ARCHITECTURE.md` together (30 minutes) so the new web lead knows where things are.

---

### قائمة التسليم السنوية (بالعربي)
- **أهم إشي الحسابات:** حاليًا GitHub و Vercel و Render و Supabase على حسابات شخصية. انقلوها أو ضيفوا حساب الشعبة `ies.2026.hu@gmail.com` كمالك، عشان ما تضيع الصلاحيات لما الأعضاء يتخرجوا.
- **حساب جيميل الشعبة:** غيّروا كلمة السر ورقم الاسترجاع للرئيس الجديد، واعملوا App Password جديد للإيميلات.
- **المحتوى:** ضيفوا اللجنة الجديدة، واكتبوا بطاقات NFC للأعضاء الجدد.
- **الطلبات:** صدّروا طلبات الانضمام والرسائل من Supabase (CSV)، واحفظوها على الدرايف.
- **الدومين:** إذا في دومين، تأكدوا من موعد تجديده.
