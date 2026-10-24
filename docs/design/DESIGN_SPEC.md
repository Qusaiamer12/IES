# IEEE IES HU Chapter — Design & Website Spec

Source of truth for the website and the NFC member cards. All sizes for the card are in CSS px at **856×540 = 85.6×54 mm (CR80 card), 10 px = 1 mm**.

---

## 1. Identity

| Item | Value |
|---|---|
| Organisation | IEEE Industrial Electronics Society (IES) Student Chapter |
| Parent | IEEE Hashemite University Student Branch (فرع IEEE · الجامعة الهاشمية) |
| Term | 2026/2027 (chapter is new — founding team) |
| Chapter slogan (AR) | جزء من البصمة |
| Chapter slogan (EN) | We Make Industry Move (was: Built to Connect) |
| Card call to action | قرّب جوالك (tap your phone) |

---

## 2. Colour tokens

| Token | Hex | Use |
|---|---|---|
| `blue` | `#1449D6` | Primary accent (Vice Chair card ground, links) |
| `navy` | `#0B1530` | Text on light, pills, stamp, hard shadows |
| `navy-deep` | `#0F2347` | Ground of the "navy" card theme |
| `orange` | `#FF6B1A` | Big diagonal slab, back ground |
| `gold` | `#FFC21A` | Thin diagonal stripe, executive frame, stars, chevrons pill |
| `white` | `#FFFFFF` | Ground of the "white" theme, text on dark |
| `ink-2` | `#4A5468` | Secondary text on white |
| `ink-3` | `#5A6478` | Labels on white |
| `rule` | `#D6DAE2` | Thin dividers on white |

### Role colours (card accent)
| Role key | Label EN | Label AR | Accent | Rank (chevrons) |
|---|---|---|---|---|
| `chair` | CHAIR | الرئيس | `#0B1530` | 3 |
| `vice` | VICE CHAIR | نائب الرئيس | `#1449D6` | 2 |
| `tech` | TECHNICAL TEAM | الفريق التقني | `#0B7A75` | 0 |
| `events` | EVENTS TEAM | فريق الفعاليات | `#B0185A` | 0 |
| `media` | MEDIA TEAM | فريق الإعلام | `#6A2BE0` | 0 |
| `member` | MEMBER | عضو | `#2E3A59` | 0 |

`leader = rank > 0` (Chair, Vice Chair). In the `navy` theme the accent is always `#0F2347`.

---

## 3. Typography

| Font | Use |
|---|---|
| **Space Grotesk** 400/500/700 | English display + UI (names, labels, buttons) |
| **IBM Plex Sans Arabic** 500/700 | All Arabic text |
| **JetBrains Mono** 600 | IDs, numbers (IES-002, 08/2027, IEEE no.) |
| **Permanent Marker** | Personal motto sticker only |
| **Herr Von Muellerhoff** | Signature only |

Print minimum on the card: labels ≥ 18 px (≈ 5 pt). Website body ≥ 16 px.

---

## 4. Visual motifs (reuse across the website)
- **Diagonal slabs**: wide orange slab + thin gold stripe (+ thin blue stripe in the white theme), slanting top-right → bottom-left.
- **Circuit traces**: 3 px rounded strokes with right-angle-then-45° bends and round nodes (r 6–7), low opacity.
- **Outlined "IES"**: huge Space Grotesk 700 letters, stroke only (white 28–30 %).
- **Hard offset shadows**: `8px 8px 0 #0B1530` (or gold `7px 7px 0 #FFC21A` on navy stickers). No soft blurry shadows except the 3D card.
- **Founding stamp**: navy disc, gold ring, gold inner disc, circular text `FOUNDING MEMBER ★ EST. 2026 ★` stretched to fill the circle, centre `FOUNDER` + `#<id number>`, rotated −12°.
- **Executive frame**: 3 px gold border inset 12 px, radius 24, only for leaders.
- **Chevron ranks**: inside the role pill, stacked up-chevrons (2 = Vice Chair, 3 = Chair), 2.6 px navy strokes, then a 2 px divider, then the role label.
- **Hex achievement badges**: 64×72 hexagon; earned = navy fill, gold stroke + gold icon; locked = no fill, dashed stroke (`6 5`).
- **Motto sticker**: navy rounded box, rotated −6°, gold offset shadow, Permanent Marker white text with gold stars each side.

No gradients washes, no emoji, no stock icons with different styles.

---

## 5. The member card

### 5.1 Front — `colored` theme (LTR)
- Root 856×540, radius 32, ground = role accent.
- SVG layer: orange polygon `560,0 856,0 856,540 380,540`; gold stripe `640,0 700,0 520,540 460,540`; outlined "IES" at x 470 y 520, font-size 300, letter-spacing −10; traces `M0 470 H150 L200 420 H300`, `M0 500 H90`, `M300 0 V40 L340 80 H460` (white 35 %), nodes at (300,420), (460,80), (90,500).
- Executive frame if leader.
- Founding stamp 190×190 at `right:56; top:176` (if `founding`).
- Content box padding `44 56 46`, column, space-between:
  - **Header:** chapter logo in a white pill (radius 16, padding 10/16, logo 114×66) + `HASHEMITE` / `UNIVERSITY` (20 px, 700, tracking .1em).
  - **Middle (max-width 470):** Arabic name 26 px 700 → English name 72 px 700, line-height .95, on 2 lines → role pill 22 px 700 tracking .08em, padding 9/22 (leader: gold bg + navy text + chevrons; others: navy bg + gold text) → specialty 21 px 700 tracking .08em (`MECHATRONICS ENGINEERING`).
  - **Bottom:** `MEMBER ID` / `VALID THRU` labels 18 px 700 tracking .14em, values JetBrains Mono 32 px.
- No personal photo on the card.

### 5.2 Back — `colored` theme (RTL)
- Ground orange `#FF6B1A`, text navy.
- SVG: accent polygon `0,0 300,0 476,540 0,540`; gold stripe `216,0 276,0 456,540 396,540`; white traces left, faint navy trace top-right.
- Executive frame if leader.
- Motto sticker at `left:356; top:152` (Permanent Marker 38 px).
- Padding `46 56 42`, column, space-between:
  - **Top row:** navy circle 62 px with NFC icon (gold) + `قرّب جوالك` 50 px 700 · Hashemite University logo in a 168 px white circle, 6 px white border, `8px 8px 0 navy` shadow.
  - **Middle row:** `جزء من البصمة` 38 px white on navy pill + `IEEE NO. <number>` mono 20 px · `إنجازاتي` label 20 px + 4 hex badges (58×65, label 18 px).
  - **Footer:** chapter logo pill + `فرع IEEE · الجامعة الهاشمية` 20 px 700 · signature (Herr Von Muellerhoff 72 px, white) with a hand-drawn swash under it.

### 5.3 `white` theme
- Front: white ground, navy text. Band on the right: blue stripe `556,0 572,0 452,540 436,540`, gold `580,0 596,0 476,540 460,540`, orange `604,0 856,0 856,540 484,540`; outlined "IES" white on the orange. Logo without pill + 2 px `rule` divider. Arabic name `ink-2`, specialty in accent colour, labels `ink-3`.
- Back: white ground; mirrored band on the left (orange `0,0 252,0 372,540 0,540`, gold `260,0 276,0 396,540 380,540`, accent `284,0 300,0 420,540 404,540`). Locked badges navy dashed. Sticker sits on white.

### 5.4 `navy` theme
Identical to `colored`, accent forced to `#0F2347`.

### 5.5 Achievement badges
| Badge (AR) | Earned when | Icon |
|---|---|---|
| مؤسس (Founder) | `founding === true` | star |
| قائد (Leader) | role is chair or vice | flag |
| ورشة (Workshop) | `badges` includes `workshop` | wrench |
| صانع (Maker) | `badges` includes `maker` | chip |

Later badges come from `members.json` → `badges: string[]`.

---

## 6. Interactive 3D card (`<Card3D>`)
- Container perspective 1600 px; inner `transform-style: preserve-3d`; two faces with `backface-visibility: hidden`, back face `rotateY(180deg)`.
- Pointer move over the card: `rotateX = (0.5 − y) × 18°`, `rotateY = (x − 0.5) × 26°` (+180° when flipped). Pointer leave → reset.
- Glare overlay (mix-blend overlay): `linear-gradient(115deg, transparent x−30%, rgba(255,255,255,.55) x%, rgba(120,220,255,.25) x+8%, transparent x+30%)`, where x = pointer X %, mirrored on the back.
- Transition `transform .55s cubic-bezier(.2,.8,.2,1)`. Big soft shadow `0 40px 80px rgba(0,0,0,.55)`.
- Buttons: **اقلب الكرت / شوف الوجه** (flip) and a theme cycle **white → colored → navy**.
- Touch: tap = flip; use device orientation for tilt only if permission is granted, otherwise static.
- `prefers-reduced-motion`: no tilt, flip becomes a cross-fade.

---

## 7. Website

### 7.1 Pages
| Route | Content |
|---|---|
| `/` | Hero on navy with slabs + traces, slogan, "Join" CTA, 3D card showcase, short "What is IES", upcoming events, team strip |
| `/about` | What IES is, field of interest, what members get (see §9) |
| `/team` | Grid of mini member cards, filter by role, link to each `/m/<slug>` |
| `/m/[slug]` | **NFC target.** 3D card, name AR/EN, role, specialty, motto, badges, links, "Save contact" (.vcf), "Join IES" CTA |
| `/events` | From `data/events.json`; empty state if none |
| `/join` | Join form (embed a Google Form or Formspree link from config; placeholder until provided) |

### 7.2 Layout
- Header: chapter logo, nav, AR/EN toggle. Footer: IEEE HU Student Branch, social links `[TBD]`.
- Section ground alternates navy / white; accent slabs at section edges.
- Buttons: pill, 48 px min height, gold fill navy text (primary) or 2 px outline (secondary).

### 7.3 Data model — `data/members.json`
```json
{
  "slug": "qusai",
  "nameEn": "Qusai Amer",
  "nameAr": "قصي عامر",
  "role": "vice",
  "specialtyEn": "Mechatronics Engineering",
  "specialtyAr": "هندسة الميكاترونكس",
  "memberId": "IES-002",
  "ieeeNumber": "101642449",
  "validThru": "08/2027",
  "founding": true,
  "motto": "The Special One",
  "signature": "Qusai Amer",
  "badges": [],
  "photo": null,
  "links": { "linkedin": null, "instagram": null, "email": null, "phone": null }
}
```
`photo` is optional and only used on the website, never on the card.

### 7.4 NFC + vCard
- Each card's NTAG216 chip stores **one URL**: `https://<domain>/m/<slug>`. Write it with the **NFC Tools** app, test on iPhone + Android, then **lock** the tag.
- Because tags get locked, slugs and the domain must never change. Buy the domain before writing tags.
- `/m/<slug>/contact.vcf` generated at build time from the member's fields (only non-null ones).

---

## 8. Print notes (for the card printer)
- Card: PVC CR80, 85.6×54 mm, 0.76–0.8 mm, NTAG216 inlay (original NXP chip).
- Export each face as PDF at 100 % with **3 mm bleed**; keep text 3 mm inside the edge.
- No metallic ink over the chip area (it blocks NFC).
- Personalised fields per card: name AR/EN, role, specialty, member ID, IEEE no., stamp number, motto, signature.

---

## 9. Content for About / Home
**What is IES:** an IEEE technical society for the theory and application of electronics, control, communications, instrumentation and computational intelligence in industrial and manufacturing systems (automation, robotics, power electronics, embedded systems, Industry 4.0, smart grid, industrial AI). Celebrating its 75th anniversary in 2026. Flagship publications: IEEE Transactions on Industrial Electronics, IEEE Transactions on Industrial Informatics, IEEE Industrial Electronics Magazine, Open Journal of the IES. Flagship conference: IECON. Source: ieee-ies.org.

**What members get:** hands-on workshops (Arduino, PLC, MATLAB, power electronics), access to IEEE research, networking with engineers and alumni, industry visits, leadership experience, a stronger CV, help with research and publishing, and a community of people who build things.

---

## 10. Assets & open items
| File | Status |
|---|---|
| `assets/ies-chapter-logo.png` | **Low-res** (from a 150 px image). Get the original vector/PNG from the chapter. |
| `assets/hashemite-university-logo.png` | **Low-res** (from an email screenshot). Get the official logo. |
| `assets/ieee-hu-branch-logo.png` | Medium-res, circular crop. Use in footer / partners. |
| `assets/qusai-portrait-optional.jpg` | Optional website photo (background removed, navy studio). Not for the card. |

Still needed: domain name, social links, the join form link, real handwritten signature scan (optional), list of other members.
