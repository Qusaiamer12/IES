# Decisions

Short records of the choices that shape this project and why they were made (Architecture Decision Records).
Before reversing one, read it: the reason may still hold. To change a decision, add a new record that supersedes it.

| # | Decision |
|---|---|
| [0001](0001-static-first-nextjs.md) | Next.js, static-first, minimal server code |
| [0002](0002-content-as-validated-json.md) | Content as JSON files validated by schemas, not a CMS |
| [0003](0003-people-and-terms.md) | Permanent people, per-term committee seats |
| [0004](0004-insert-only-forms.md) | Forms write to an insert-only Supabase table |
| [0005](0005-two-hosts.md) | A primary host and an independent static backup |
| [0006](0006-desktop-scale.md) | Desktop renders at a 75% scale and grows with the screen |

Format: **Context** (the situation), **Decision**, **Consequences** (what it costs and what it buys).
