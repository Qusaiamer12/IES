# 0002 · Content as JSON files validated by schemas, not a CMS

**Context.** Officers who don't code must update members and events every term. A hosted CMS adds an account, a bill or
a free tier that can disappear, and content that lives outside the repository's history.

**Decision.** All editable content lives in `content/*.json`, versioned in Git. Its shape is defined once with Zod in
`lib/content/schema.ts`, which gives the TypeScript types, build-time validation with readable messages, and generated
JSON Schemas (`content/schemas/`) for autocomplete and inline errors in editors. Cross-file rules (references, unique
ids, existing images, image sizes) are checked in `lib/content/index.ts` and `tests/unit/content.test.ts`.

**Consequences.** Editing is a pull request — reviewable, reversible, with full history. Mistakes cannot reach the live
site. The price is editing JSON by hand; the editor schemas and the GitHub web editor make that manageable. If the
chapter later wants a visual editor, a Git-based CMS can sit on top of the same files without changing the site.
