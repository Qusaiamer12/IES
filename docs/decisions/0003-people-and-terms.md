# 0003 · Permanent people, per-term committee seats

**Context.** Each officer's page `/m/<slug>` is written to an NFC card. Committees change every year, and the same person
can hold different roles in different terms. Storing role and term on the person would force deleting or duplicating
people each year and break printed cards.

**Decision.** `content/people.json` holds who someone is (slug, name, photo, bio, links) and is never shrunk.
`content/committees.json` holds, per term, which person held which role. `content/roles.json` defines the positions.
The content layer joins them; "founding member" is derived from the first term. A unit test fails if any slug that may
be on a card disappears.

**Consequences.** Cards work forever; the team page keeps every past committee; a member's page shows their latest role
and their history. Adding a term is a content change with no code. People files grow slowly (a few people a year).
