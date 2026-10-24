// Form validation shared by the browser forms and the API routes.
import chapter from '@/content/chapter.json';

/** Interest options of the join form: the chapter's fields (content/chapter.json). */
export const FIELDS: readonly string[] = chapter.fields;

export const CONTACT_TOPICS = ['General question', 'Joining the chapter', 'Partnership or sponsorship', 'Event collaboration'] as const;
export const YEARS = ['First year', 'Second year', 'Third year', 'Fourth year', 'Fifth year', 'Graduate'] as const;
export const IEEE_STATUS = ['Yes', 'No', 'Not sure'] as const;

type Errors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s-]{6,18}$/;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
// Strips control characters except newline and tab.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const oneLine = (s: string) => clean(s).replace(/\s+/g, ' ');

function text(errors: Errors, key: string, raw: unknown, label: string, min: number, max: number, required = true) {
  const v = key === 'message' ? clean(str(raw)) : oneLine(str(raw));
  if (!v) {
    if (required) errors[key] = `Enter your ${label}.`;
    return v;
  }
  const len = [...v].length;
  if (len < min) errors[key] = `${label[0].toUpperCase() + label.slice(1)} is too short.`;
  else if (len > max) errors[key] = `${label[0].toUpperCase() + label.slice(1)} must be ${max} characters or fewer.`;
  return v;
}

function email(errors: Errors, raw: unknown) {
  const v = str(raw);
  if (!v) errors.email = 'Enter your email address.';
  else if (v.length > 200 || !EMAIL.test(v)) errors.email = 'Enter a valid email address, like name@example.com.';
  return v;
}

function choice<T extends readonly string[]>(errors: Errors, key: string, raw: unknown, options: T, label: string): T[number] {
  const v = str(raw);
  if (!(options as readonly string[]).includes(v)) errors[key] = `Choose ${label}.`;
  return v as T[number];
}

export type ContactData = { name: string; email: string; topic: (typeof CONTACT_TOPICS)[number]; message: string };

export function validateContact(input: Record<string, unknown>): Result<ContactData> {
  const errors: Errors = {};
  const data = {
    name: text(errors, 'name', input.name, 'name', 2, 100),
    email: email(errors, input.email),
    topic: choice(errors, 'topic', input.topic, CONTACT_TOPICS, 'a topic'),
    message: text(errors, 'message', input.message, 'message', 10, 3000),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

export type JoinData = {
  name: string;
  email: string;
  phone: string;
  major: string;
  year: (typeof YEARS)[number];
  ieeeMember: (typeof IEEE_STATUS)[number];
  interests: string[];
  message: string;
};

export function validateJoin(input: Record<string, unknown>): Result<JoinData> {
  const errors: Errors = {};
  const phone = oneLine(str(input.phone));
  if (phone && !PHONE.test(phone)) errors.phone = 'Enter a valid phone number, like +962 7X XXX XXXX.';
  const rawInterests = Array.isArray(input.interests) ? input.interests : [];
  const interests = rawInterests.filter((i): i is string => typeof i === 'string' && FIELDS.includes(i));
  const data = {
    name: text(errors, 'name', input.name, 'full name', 2, 100),
    email: email(errors, input.email),
    phone,
    major: text(errors, 'major', input.major, 'major', 2, 100),
    year: choice(errors, 'year', input.year, YEARS, 'your academic year'),
    ieeeMember: choice(errors, 'ieeeMember', input.ieeeMember, IEEE_STATUS, 'an answer'),
    interests: [...new Set(interests)],
    message: text(errors, 'message', input.message, 'message', 0, 1500, false),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
