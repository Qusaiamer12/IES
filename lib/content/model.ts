// View types and small helpers that client components may import. Nothing here reads content files,
// so importing this module never ships the data (or the validation library) to the browser.
import type { Person } from './schema';

/** A person in one term's committee: who they are, plus the seat they held that term. */
export type Member = Person & {
  term: string;
  role: string;
  roleLabel: string;
  /** Role colour for text and dots (already adjusted for contrast on white). */
  accent: string;
  /** Core Team (Chair, Vice Chair, Secretary…) or Executive Team. */
  core: boolean;
  year?: string;
  badges: string[];
  validThru?: string;
  /** Served in the chapter's first term. */
  founding: boolean;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
