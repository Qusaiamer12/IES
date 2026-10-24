# 0001 · Next.js, static-first, minimal server code

**Context.** The site is maintained by students who change every year, on free hosting, with a budget of zero. It must
stay fast, cheap and understandable.

**Decision.** Next.js (App Router, TypeScript) with every page generated at build time. The only server code is the two
form endpoints. No CSS framework (one `globals.css` with design tokens). Runtime dependencies are kept to Next.js,
React, Zod and nodemailer, with exact versions.

**Consequences.** Pages are plain HTML on a CDN: fast and nearly impossible to take down. The whole site can be exported
as static files (ADR 0005). Next.js is widely taught, so successors find help easily. Upgrading Next.js major versions
is the main maintenance task; CI and the end-to-end checks make it safe.
