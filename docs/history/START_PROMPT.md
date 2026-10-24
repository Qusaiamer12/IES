# Prompt for Claude Code — IEEE IES HU Chapter Website

> Copy everything below this line into Claude Code, from inside this folder.

---

You are building the website for the **IEEE Industrial Electronics Society (IES) Student Chapter at the Hashemite University (HU), Jordan** — term 2026/2027. The chapter is brand new. Every member gets a physical **NFC member card**; tapping the card with a phone must open that member's personal page on this site. The site must feel like the card: bold, energetic, engineering-flavoured, bilingual (Arabic + English).

Read these files in this folder before writing any code:

1. `DESIGN_SPEC.md` — brand tokens, fonts, the member card (front/back, 3 themes, roles), the interactive 3D card, page list, data model, NFC and vCard rules. **This is the source of truth.**
2. `data/members.json` and `data/events.json` — content. Never invent members, stats, events or quotes; anything missing stays a clearly marked placeholder like `[TBD]`.
3. `assets/` — logos (some are low-resolution placeholders, see the spec).
4. `reference/card-design/*.dc.html` — the original card designs. They use a custom template format (`{{holes}}`, `<sc-if>`, `<sc-for>`, `<dc-import>`), so **do not copy them as-is**; read them for exact layout, sizes, colours and copy, and rebuild them as React components.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS, static export (`output: 'export'`) so it can be hosted free on Vercel or GitHub Pages.
- Fonts via `next/font/google`: Space Grotesk, IBM Plex Sans Arabic, JetBrains Mono, Permanent Marker, Herr Von Muellerhoff.
- Content from the JSON files in `data/` (no database, no backend for now).
- No UI kit. Build the components from the spec.

## Build in this order, and show me each step running before moving on
1. **Project setup + design tokens** (Tailwind theme from the spec's colour and font tables, RTL/LTR support).
2. **`<MemberCard>` component** — pixel-faithful to the spec at 856×540 with a `scale` prop; props: `member`, `side` (`front`|`back`), `theme` (`colored`|`white`|`navy`). Role drives the accent colour, the gold executive frame, the chevron ranks and the badges exactly as specified.
3. **`<Card3D>`** — tilt on pointer move, glare overlay, click/tap or button to flip, theme switch button; respects `prefers-reduced-motion`; works with touch on phones.
4. **Member page `/m/[slug]`** (the NFC target — most important page, mobile-first): 3D card, name, role, specialty, motto, achievement badges, social links, **"Save contact" (.vcf download)**, and a "Join IES" call to action.
5. **Home, About, Team, Events, Join** pages (see spec §6).
6. **Language toggle** Arabic ⇄ English (Arabic default, full RTL).
7. Lighthouse pass: performance, accessibility (real buttons/links, alt text, 4.5:1 contrast), SEO meta and Open Graph image per member.

## Rules
- Mobile-first: most visits come from a phone tapping a card.
- Member URLs must be short and **never change** once written to an NFC chip: `/m/<slug>` (e.g. `/m/qusai`).
- Keep all member data in `data/members.json` so adding a member is one JSON entry plus a photo.
- Ask me before adding any paid service, tracking or analytics.
- When done, give me: how to run locally, how to deploy, and how to add a new member.
