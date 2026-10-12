import 'server-only';
import { mailConfigured, MailNotConfigured, sendMail } from './mailer';
import { rateLimit } from './rate-limit';
import type { Result } from './validate';

const MAX_BODY = 16 * 1024;

const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/**
 * Shared POST handler for the site's forms: size and type checks, honeypot, rate limit,
 * validation, then one email to the chapter inbox.
 */
export async function handleForm<T>(
  req: Request,
  name: string,
  validate: (input: Record<string, unknown>) => Result<T>,
  toMail: (data: T) => { subject: string; text: string; replyTo: string },
) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, error: 'Send the form as JSON.' });
  }
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
  if (typeof body.website === 'string' && body.website.trim() !== '') return json(200, { ok: true });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const limit = rateLimit(`${name}:${ip}`);
  if (!limit.ok) {
    return json(429, { ok: false, error: 'Too many messages from this connection. Try again in a few minutes.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const result = validate(body);
  if (!result.ok) return json(400, { ok: false, errors: result.errors });

  if (!mailConfigured()) {
    return json(503, { ok: false, error: `The ${name} form is not connected yet. Message us on Instagram instead.` });
  }
  try {
    await sendMail(toMail(result.data));
    return json(200, { ok: true });
  } catch (err) {
    if (err instanceof MailNotConfigured) {
      return json(503, { ok: false, error: `The ${name} form is not connected yet. Message us on Instagram instead.` });
    }
    console.error(`[${name} form] send failed`, err);
    return json(502, { ok: false, error: 'The message could not be sent. Try again in a moment.' });
  }
}
