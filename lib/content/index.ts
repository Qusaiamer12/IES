// The content layer: the only module that reads content/*.json. It validates every file against lib/content/schema.ts,
// checks the files against each other (committee seats point at real people and roles, ids are unique, …), and exposes
// ready-to-render data. A mistake in a content file stops the build with a message naming the file, the item and the
// field, so a broken page can never be published.
//
// Server-side only (pages, route handlers, metadata). Client components import types and helpers from ./model.
import { z } from 'zod';
import chapterJson from '@/content/chapter.json';
import committeesJson from '@/content/committees.json';
import eventsJson from '@/content/events.json';
import partnersJson from '@/content/partners.json';
import peopleJson from '@/content/people.json';
import rolesJson from '@/content/roles.json';
import siteJson from '@/content/site.json';
import { todayInAmman } from '@/lib/dates';
import type { Member } from './model';
import {
  ChapterSchema, CommitteesSchema, EventsSchema, PartnersSchema, PeopleSchema, RolesSchema, SiteSchema,
  type ChapterEvent, type Person, type Role,
} from './schema';

export class ContentError extends Error {
  constructor(file: string, problem: string) {
    super(`content/${file}: ${problem}`);
    this.name = 'ContentError';
  }
}

function parse<S extends z.ZodType>(file: string, schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ContentError(file, `\n${z.prettifyError(result.error)}`);
  return result.data;
}

function unique<T>(file: string, list: T[], key: (item: T) => string, what: string) {
  const seen = new Set<string>();
  for (const item of list) {
    const k = key(item);
    if (seen.has(k)) throw new ContentError(file, `${what} "${k}" is used twice`);
    seen.add(k);
  }
}

// ---------------------------------------------------------------- load and validate

export const site = parse('site.json', SiteSchema, siteJson);
export const roles: Role[] = parse('roles.json', RolesSchema, rolesJson);
export const people: Person[] = parse('people.json', PeopleSchema, peopleJson);
const committeeList = parse('committees.json', CommitteesSchema, committeesJson);
export const events: ChapterEvent[] = parse('events.json', EventsSchema, eventsJson);
export const chapter = parse('chapter.json', ChapterSchema, chapterJson);
export const partners = parse('partners.json', PartnersSchema, partnersJson);

unique('roles.json', roles, r => r.key, 'role key');
unique('people.json', people, p => p.slug, 'slug');
unique('people.json', people, p => p.memberId, 'memberId');
unique('committees.json', committeeList, c => c.term, 'term');
unique('events.json', events, e => e.slug, 'slug');

const roleByKey = new Map(roles.map(r => [r.key, r]));
const personBySlug = new Map(people.map(p => [p.slug, p]));
for (const c of committeeList) {
  unique('committees.json', c.members, s => s.person, `in ${c.term}, person`);
  for (const s of c.members) {
    if (!personBySlug.has(s.person)) throw new ContentError('committees.json', `${c.term}: "${s.person}" is not in people.json`);
    if (!roleByKey.has(s.role)) {
      throw new ContentError('committees.json', `${c.term}: "${s.person}" has role "${s.role}", which is not in roles.json (${roles.map(r => r.key).join(', ')})`);
    }
  }
}

const seated = new Set(committeeList.flatMap(c => c.members.map(s => s.person)));
for (const p of people) {
  if (!seated.has(p.slug)) throw new ContentError('people.json', `"${p.slug}" is not in any committee in committees.json`);
}

// ---------------------------------------------------------------- committees and members

/** Terms with a committee, newest first. */
export const terms = committeeList.map(c => c.term).sort().reverse();
const firstTerm = terms[terms.length - 1];
const roleRank = (key: string) => roles.findIndex(r => r.key === key);

/** The navy chair colour would disappear on white text backgrounds, so it is shown in the brand blue. */
const visibleAccent = (accent: string) => (accent.toUpperCase() === '#0B1530' ? '#1449D6' : accent);

function seatToMember(term: string, validThru: string | undefined, seat: (typeof committeeList)[number]['members'][number]): Member {
  const person = personBySlug.get(seat.person)!;
  const role = roleByKey.get(seat.role)!;
  return {
    ...person,
    term,
    role: role.key,
    roleLabel: role.label,
    accent: visibleAccent(role.accent),
    core: role.core,
    year: seat.year,
    badges: seat.badges,
    validThru,
    founding: term === firstTerm,
  };
}

const byRole = (a: Member, b: Member) => roleRank(a.role) - roleRank(b.role) || a.memberId.localeCompare(b.memberId);

/** The committee of one term, in team-page order (roles.json order, then member number). */
export function committeeOf(term: string): Member[] {
  const c = committeeList.find(x => x.term === term);
  return c ? c.members.map(s => seatToMember(c.term, c.validThru, s)).sort(byRole) : [];
}

/** Every seat of every term, newest term first. */
export const allMembers: Member[] = terms.flatMap(committeeOf);

export const getPerson = (slug: string) => personBySlug.get(slug);

/** A person's seats across all terms, newest first; `latest` is what their member page and contact card show. */
export function profileOf(slug: string) {
  const person = personBySlug.get(slug);
  if (!person) return null;
  const seats = allMembers.filter(m => m.slug === slug);
  return { person, seats, latest: seats[0] ?? null };
}

// ---------------------------------------------------------------- events

export const getEvent = (slug: string) => events.find(e => e.slug === slug);

/** Upcoming (soonest first) and past (latest first) events, split by the date in Amman. */
export function splitEvents(list: ChapterEvent[] = events, today = todayInAmman()) {
  const byDate = (a: ChapterEvent, b: ChapterEvent) => a.date.localeCompare(b.date);
  return {
    upcoming: list.filter(e => e.date >= today).sort(byDate),
    past: list.filter(e => e.date < today).sort(byDate).reverse(),
  };
}

export type { ChapterEvent, Member, Person, Role };
