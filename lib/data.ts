import membersJson from '@/data/members.json';
import eventsJson from '@/data/events.json';

export type RoleKey = 'chair' | 'vice' | 'secretary' | 'membership' | 'pr' | 'events' | 'media' | 'design' | 'member';

// Officer positions, in the order the team page lists them.
// core: the chapter's Core Team (Chair, Vice Chair, Secretary); everyone else is the Executive Team.
export const ROLES: Record<RoleKey, { label: string; accent: string; rank: number; core?: boolean }> = {
  chair: { label: 'Chair', accent: '#0B1530', rank: 3, core: true },
  vice: { label: 'Vice Chair', accent: '#1449D6', rank: 2, core: true },
  secretary: { label: 'Secretary', accent: '#2E3A59', rank: 0, core: true },
  membership: { label: 'Membership Development', accent: '#0B7A75', rank: 0 },
  pr: { label: 'Public Relations', accent: '#C2410C', rank: 0 },
  events: { label: 'Event Coordinator', accent: '#B0185A', rank: 0 },
  media: { label: 'Social Media', accent: '#6A2BE0', rank: 0 },
  design: { label: 'Designer', accent: '#8B5E00', rank: 0 },
  member: { label: 'Member', accent: '#2E3A59', rank: 0 },
};
export const ROLE_ORDER = Object.keys(ROLES) as RoleKey[];

export type Member = {
  slug: string;
  nameEn: string;
  nameAr?: string | null;
  role: RoleKey;
  specialtyEn: string;
  specialtyAr?: string | null;
  year?: string | null; // study year, e.g. "3rd year"
  bio?: string | null;
  highlights?: string[];
  memberId: string;
  ieeeNumber?: string | null;
  validThru?: string | null;
  founding?: boolean;
  motto?: string | null;
  signature?: string | null;
  badges?: string[];
  photo?: string | null;
  term?: string | null;
  links?: { linkedin?: string | null; instagram?: string | null; email?: string | null; phone?: string | null };
};

export type ChapterEvent = {
  slug: string;
  titleEn: string;
  categoryEn?: string | null;
  date: string; // YYYY-MM-DD
  locationEn?: string | null;
  summaryEn?: string | null;
  bodyEn?: string[];
  image?: string | null;
  link?: string | null;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const members: Member[] = (membersJson as Member[]).filter(m => SLUG.test(m.slug));
export const events: ChapterEvent[] = (eventsJson as ChapterEvent[]).filter(e => SLUG.test(e.slug));

export const roleOf = (m: Member) => ROLES[m.role] ?? ROLES.member;

export function sortedMembers(list: Member[] = members) {
  return [...list].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.memberId.localeCompare(b.memberId),
  );
}

export const getMember = (slug: string) => members.find(m => m.slug === slug);
export const getEvent = (slug: string) => events.find(e => e.slug === slug);

/** Today's date in Jordan as YYYY-MM-DD, so "upcoming" flips at local midnight, not UTC. */
export function todayInAmman(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function splitEvents(list: ChapterEvent[] = events, today = todayInAmman()) {
  const byDate = (a: ChapterEvent, b: ChapterEvent) => a.date.localeCompare(b.date);
  return {
    upcoming: list.filter(e => e.date >= today).sort(byDate),
    past: list.filter(e => e.date < today).sort(byDate).reverse(),
  };
}

/** Role colour for text and dots; the navy chair colour would disappear on white, so it uses the brand blue. */
export const accentOf = (m: Member) => {
  const a = roleOf(m).accent;
  return a === '#0B1530' ? '#1449D6' : a;
};

export const initials = (name: string) =>
  name.split(/\s+/).map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
