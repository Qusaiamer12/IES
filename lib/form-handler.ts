import 'server-only';
import { mailConfigured, sendMail } from './mailer';
import { insertRow, RateLimited, supabaseConfigured } from './supabase';
import { rateLimit } from './rate-limit';
import type { Result } from './validate';

const MAX_BODY = 16 * 1024;

const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Shared POST handler for the site's forms: size and type checks, honeypot, rate limit, validation,
 * then the submission is saved to Supabase and/or emailed to the chapter inbox, whichever is configured.
 * The request succeeds when at least one of them worked.
 */
export async function handleForm<T>(
  req: Request,
  name: string,
  validate: (input: Record<string, unknown>) => Result<T>,
  toMail: (data: T) => { subject: string; text: string; replyTo: string },
  toRow: (data: T) => { table: 'contact_messages' | 'join_requests'; row: Record<string, unknown> },
) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, error: 'Send the form as JSON.' });
  }
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return json(413, { ok: false, error: 'The message is too long.' });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'The message is too long.' });

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'The form data could not be read.' });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json(400, { ok: false, error: 'The form data could not be read.' });
  }
  const body = input as Record<string, unknown>;

  // Bots fill the hidden "website" field; pretend success and drop the message.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    console.warn(`[${name} form] honeypot filled, submission dropped`);
    return json(200, { ok: true });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const limit = rateLimit(`${name}:${ip}`);
  if (!limit.ok) {
    return json(429, { ok: false, error: 'Too many messages from this connection. Try again in a few minutes.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const result = validate(body);
  if (!result.ok) return json(400, { ok: false, errors: result.errors });

  // MAIL_DRY_RUN is for local testing: no emails and no database rows.
  const store = supabaseConfigured() && process.env.MAIL_DRY_RUN !== '1';
  const mail = mailConfigured();
  if (!store && !mail) {
    return json(503, { ok: false, error: `The ${name} form is not connected yet. Message us on Instagram instead.` });
  }

  const jobs: Promise<unknown>[] = [];
  if (store) {
    const { table, row } = toRow(result.data);
    jobs.push(insertRow(table, row));
  }
  if (mail) jobs.push(sendMail(toMail(result.data)));
  const outcomes = await Promise.allSettled(jobs);
  outcomes.forEach(o => { if (o.status === 'rejected') (o.reason instanceof RateLimited ? console.warn : console.error)(`[${name} form]`, o.reason); });

  if (outcomes.some(o => o.status === 'fulfilled')) return json(200, { ok: true });
  if (outcomes.some(o => o.status === 'rejected' && o.reason instanceof RateLimited)) {
    return json(429, { ok: false, error: 'Too many messages in the last hour. Try again later.' }, { 'Retry-After': '3600' });
  }
  return json(502, { ok: false, error: 'The message could not be sent. Try again in a moment.' });
}
