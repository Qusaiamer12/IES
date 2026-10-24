# IEEE IES HU · chapter website

The website of the **IEEE Industrial Electronics Society student chapter at the Hashemite University** (founded 2026, the
society's 75th year). Every committee member has a page at `/m/<slug>`, and that address is written to their NFC card.

| | |
|---|---|
| **Live site** | https://ies-hu.vercel.app |
| **Backup copy** | https://ies-hu.onrender.com (independent host, same content) |
| **Form submissions** | Supabase project `ies-hu` → Table Editor → `join_requests`, `contact_messages` |

This repository is meant to be inherited, term after term. Start here:

| You want to… | Read |
|---|---|
| Add a new committee, member, event or photo (no coding) | [docs/CONTENT.md](docs/CONTENT.md) |
| Understand how the site is built and why | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Deploy, check form submissions, hand the project over | [docs/OPERATIONS.md](docs/OPERATIONS.md) |
| Change code safely | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Know why a decision was made | [docs/decisions/](docs/decisions/) |

## Quick start (developers)

```bash
nvm use               # Node 22 (see .nvmrc)
npm install
npm run dev           # http://localhost:3000
npm run check         # types + unit/content tests + production build
```

## The two rules that keep this site alive for years

1. **Never remove or rename a person in `content/people.json`.** Their `/m/<slug>` page is printed on an NFC card.
   New terms add new committees; old ones stay as history.
2. **Content goes in `content/`, never in code.** Every content file is checked at build time against
   `lib/content/schema.ts`. A mistake stops the build with a message saying exactly what to fix, so a broken page is
   never published.

---

### بالعربي باختصار

- **الموقع:** https://ies-hu.vercel.app · **النسخة الاحتياطية:** https://ies-hu.onrender.com
- **تعديل المحتوى** (لجنة جديدة، عضو، فعالية، صور) بدون برمجة: اقرأ [docs/CONTENT.md](docs/CONTENT.md) — فيه دليل بالعربي.
- **أهم قاعدتين:** لا تحذف ولا تغيّر `slug` أي عضو (رابطه مطبوع على بطاقة NFC)، وكل المحتوى بمجلد `content/` بس.
- **تسليم المشروع للجنة الجاية:** [docs/OPERATIONS.md](docs/OPERATIONS.md) فيه قائمة التسليم السنوية.
