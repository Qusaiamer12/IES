// The shape of every file in content/. This is the single source of truth: the site's TypeScript types are inferred
// from it, the build validates content against it, and content/schemas/*.json (editor autocomplete and hover docs)
// is generated from it by `npm run content:schemas`. Change a field here, and the editor, the checks and the types
// all follow.
import { z } from 'zod';
import { ICON_NAMES } from '@/lib/icons';

const text = z.string().trim().min(1, 'must not be empty');

/** An optional field: leave it out or write null; both mean "not set". */
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform(v => v ?? undefined);

/** URL-safe id used in links. Members' slugs are written to NFC cards, so they must never change. */
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and hyphens, e.g. "noor-naser"');

/** A file served from public/, referenced from the site root. */
const asset = z
  .string()
  .regex(/^\/[A-Za-z0-9._/-]+\.(?:jpe?g|png|webp|svg)$/, 'a path inside public/ starting with "/", e.g. "/members/noor-naser.jpg"');

const url = z.url({ protocol: /^https?$/, error: 'a full web address starting with https://' });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'write dates as YYYY-MM-DD, e.g. "2026-10-14"')
  .refine(d => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), 'not a real calendar date');

/** An academic term such as "2026/2027". */
export const term = z
  .string()
  .regex(/^\d{4}\/\d{4}$/, 'write terms as "2026/2027"')
  .refine(t => Number(t.slice(5)) === Number(t.slice(0, 4)) + 1, 'the second year must follow the first, e.g. "2026/2027"');

// ---------------------------------------------------------------- content/site.json

export const SiteSchema = z
  .object({
    shortName: text.describe('Short name used in titles and the header, e.g. "IEEE IES HU".'),
    name: text.describe('Full official name of the chapter.'),
    slogan: text,
    description: text.describe('One or two sentences for search engines and link previews.'),
    founded: z.number().int().min(2026),
    currentTerm: term.describe('The term shown on the team page and member pages. Must match a term in committees.json once its committee is announced.'),
    email: z.email().nullable().describe('Public chapter email (shown on the contact page and footer). null hides it.'),
    address: z.array(text).min(1).describe('One line per array item.'),
    mapsUrl: url,
    social: z
      .object({ instagram: url.nullable(), linkedin: url.nullable(), facebook: url.nullable() })
      .strict()
      .describe('Chapter accounts. null hides a network.'),
    instagramHandle: z.string().regex(/^@[\w.]+$/, 'e.g. "@ieee.ies.hu"'),
  })
  .strict();

// ---------------------------------------------------------------- content/roles.json

export const RoleSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z-]*$/, 'lowercase letters and hyphens, e.g. "treasurer"').describe('Id used in committees.json.'),
    label: text.describe('Title shown on the site, e.g. "Vice Chair".'),
    core: z.boolean().describe('true: listed in the Core Team. false: the Executive Team.'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'a colour like "#1449D6"').describe('Colour of the role label and dot.'),
  })
  .strict();
export const RolesSchema = z.array(RoleSchema).min(1).describe('Officer positions, in the order the team page lists them.');

// ---------------------------------------------------------------- content/people.json

export const PersonSchema = z
  .object({
    slug: slug.describe('Permanent id: the member page is /m/<slug> and it is written to the NFC card. Never change it.'),
    memberId: z.string().regex(/^IES-\d{3,}$/, 'e.g. "IES-011"').describe('Chapter member number, printed on the card. Never reuse one.'),
    nameEn: text,
    nameAr: optional(text),
    specialtyEn: text.describe('Major, e.g. "Mechatronics Engineering".'),
    photo: asset.nullable().default(null).describe('Portrait 4:5 (e.g. 640×800), in public/members/<slug>.jpg. null shows initials.'),
    bio: text.nullable().default(null).describe('As the member submitted it. A blank line starts a new paragraph.'),
    highlights: z.array(text).default([]).describe('One achievement per item.'),
    motto: text.nullable().default(null),
    links: z
      .object({ linkedin: optional(url), instagram: optional(url), email: optional(z.email()), phone: optional(text) })
      .strict()
      .prefault({})
      .describe('Only what the member agreed to publish.'),
  })
  .strict();
export const PeopleSchema = z.array(PersonSchema).describe('Everyone who has served on a committee. People are never deleted, so old NFC cards keep working.');

// ---------------------------------------------------------------- content/committees.json

export const SeatSchema = z
  .object({
    person: slug.describe('The slug of someone in people.json.'),
    role: z.string().describe('A key from roles.json.'),
    year: optional(text).describe('Study year during this term, e.g. "3rd year".'),
    badges: z.array(text).default([]).describe('Extra tags for this term, e.g. "workshop".'),
  })
  .strict();
export const CommitteeSchema = z
  .object({
    term: term,
    validThru: optional(z.string().regex(/^\d{2}\/\d{4}$/, 'e.g. "08/2027"')).describe('Card validity for this term.'),
    members: z.array(SeatSchema),
  })
  .strict();
export const CommitteesSchema = z.array(CommitteeSchema).describe('One entry per term. Add a new term; never edit or delete an old one.');

// ---------------------------------------------------------------- content/events.json

export const EventSchema = z
  .object({
    slug: slug.describe('The event page is /events/<slug>, e.g. "plc-workshop-2026".'),
    titleEn: text,
    categoryEn: optional(text).describe('Small label on the card, e.g. "Workshop".'),
    date: isoDate.describe('Events move from "Coming up" to "Past" after this date (Amman time).'),
    locationEn: optional(text),
    summaryEn: optional(text).describe('One sentence for the card and the top of the page.'),
    bodyEn: z.array(text).default([]).describe('Paragraphs of the write-up.'),
    image: optional(asset).describe('Cover photo, e.g. /events/<slug>/cover.jpg (max ~1600px wide).'),
    imageSize: optional(z.tuple([z.number().int().positive(), z.number().int().positive()])).describe('[width, height] of image; keeps the page from jumping while it loads.'),
    thumb: optional(asset).describe('~800px copy of image for event cards.'),
    imageAlt: optional(text).describe('What the cover photo shows, for screen readers.'),
    gallery: z.array(z.object({ src: asset, alt: text }).strict()).default([]),
    link: url.nullable().default(null).describe('Registration or details page.'),
  })
  .strict();
export const EventsSchema = z.array(EventSchema);

// ---------------------------------------------------------------- content/chapter.json

export const ChapterSchema = z
  .object({
    fields: z.array(text).min(1).max(7).describe('Areas the chapter works in. Also the interest options in the join form (max 7, the database allows 7).'),
    benefits: z.array(z.object({ icon: z.enum(ICON_NAMES), title: text, text: optional(text) }).strict()),
    publications: z.array(z.object({ kind: text, since: z.number().int(), name: text }).strict()),
    timeline: z.array(z.object({ year: z.number().int(), title: text, text: text, now: optional(z.boolean()) }).strict()),
    sources: z.array(z.object({ label: text, href: url }).strict()),
    faq: z.array(z.object({ q: text, a: text }).strict()),
  })
  .strict();

// ---------------------------------------------------------------- content/partners.json

export const PartnersSchema = z
  .array(
    z
      .object({
        name: text,
        logo: asset.describe('In public/images/partners/.'),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        url: optional(url),
      })
      .strict(),
  )
  .describe('Partners of the IEEE HU Student Branch.');

export type Site = z.infer<typeof SiteSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Seat = z.infer<typeof SeatSchema>;
export type Committee = z.infer<typeof CommitteeSchema>;
export type ChapterEvent = z.infer<typeof EventSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Partner = z.infer<typeof PartnersSchema>[number];

/** Every content file with its schema, for validation and for generating the editor schemas. */
export const CONTENT_FILES = {
  'site.json': SiteSchema,
  'roles.json': RolesSchema,
  'people.json': PeopleSchema,
  'committees.json': CommitteesSchema,
  'events.json': EventsSchema,
  'chapter.json': ChapterSchema,
  'partners.json': PartnersSchema,
} as const;
