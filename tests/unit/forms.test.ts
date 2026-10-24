// Form validation, and its agreement with the database: the lists in lib/validate.ts must match the CHECK
// constraints in supabase/migrations, or valid-looking submissions would be rejected by the database.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contactRow, joinRow } from '@/lib/rows';
import { CONTACT_TOPICS, FIELDS, IEEE_STATUS, YEARS, validateContact, validateJoin } from '@/lib/validate';

const sql = readdirSync(new URL('../../supabase/migrations/', import.meta.url))
  .map(f => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8'))
  .join('\n');
const allowed = (column: string) => {
  const m = new RegExp(`${column} text not null[^\\n]*check \\(${column} in \\(([^)]*)\\)\\)`).exec(sql);
  if (!m) throw new Error(`No CHECK list for ${column} in supabase/migrations`);
  return [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
};

const contact = { name: 'Lina Ahmad', email: 'lina@example.com', topic: 'General question', message: 'Hello, I have a question.' };
const join = { name: 'Omar Ali', email: 'omar@example.com', major: 'Mechatronics', year: 'Third year', ieeeMember: 'No', interests: [FIELDS[0]] };

describe('form options match the database', () => {
  it('contact topics', () => expect([...CONTACT_TOPICS]).toEqual(allowed('topic')));
  it('study years', () => expect([...YEARS]).toEqual(allowed('year')));
  it('IEEE membership answers', () => expect([...IEEE_STATUS]).toEqual(allowed('ieee_member')));
});

describe('validateContact', () => {
  it('accepts a normal message', () => expect(validateContact(contact).ok).toBe(true));
  it('rejects a bad email and an unknown topic', () => {
    const r = validateContact({ ...contact, email: 'nope', topic: 'Other' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['email', 'topic']);
  });
  it('counts characters like Postgres, so emoji cannot pass the minimum here and fail in the database', () => {
    expect(validateContact({ ...contact, message: 'Hello 👋👋' }).ok).toBe(false);
  });
  it('maps to the contact_messages columns', () => {
    const r = validateContact(contact);
    if (r.ok) expect(Object.keys(contactRow(r.data)).sort()).toEqual(['email', 'message', 'name', 'topic']);
  });
});

describe('validateJoin', () => {
  it('accepts a normal request and drops unknown interests', () => {
    const r = validateJoin({ ...join, interests: [FIELDS[0], 'Hacking'] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.interests).toEqual([FIELDS[0]]);
  });
  it('checks the phone number only when given', () => {
    expect(validateJoin({ ...join, phone: '+962 79 123 4567' }).ok).toBe(true);
    expect(validateJoin({ ...join, phone: 'abc' }).ok).toBe(false);
  });
  it('maps to the join_requests columns', () => {
    const r = validateJoin(join);
    if (r.ok) expect(joinRow(r.data)).toMatchObject({ ieee_member: 'No', phone: null, message: null });
  });
});
