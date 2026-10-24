# 0005 · A primary host and an independent static backup

**Context.** Before an event, the site would not load on a member's mobile network while it worked elsewhere — a host
reachable from most networks is not reachable from all of them. The site is shown at events and opened from NFC cards,
so "down for some people" is not acceptable.

**Decision.** Vercel is the primary host (pages + form API). The same site is also exported as static files
(`npm run build:static`) and served by Render on a different network (Cloudflare). Both deploy automatically from the
same branch. On the backup, forms insert directly into Supabase (ADR 0004).

**Consequences.** Every page and NFC link works on both addresses. Email notifications only come from the primary.
Upcoming/past events on the backup are decided at build time (it rebuilds on each push). A custom domain is still the
long-term fix for networks that block a provider's shared domain (see OPERATIONS).
