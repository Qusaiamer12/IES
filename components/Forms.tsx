'use client';

import { useEffect, useRef, useState } from 'react';
import { FIELDS } from '@/lib/content';
import { SITE } from '@/lib/site';
import { contactRow, joinRow } from '@/lib/rows';
import { CONTACT_TOPICS, IEEE_STATUS, YEARS, validateContact, validateJoin, type ContactData, type JoinData, type Result } from '@/lib/validate';
import { Arrow, Icon } from './Icon';

type Status = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string };

function readForm(form: HTMLFormElement) {
  const fd = new FormData(form);
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).map(String);
    out[key] = key === 'interests' ? all : all[0];
  }
  return out;
}

// The static backup site has no API routes, so its forms insert straight into Supabase with the publishable key
// (the tables accept inserts only, and a database trigger throttles them). The main site posts to /api/*.
const DIRECT = process.env.NEXT_PUBLIC_FORMS_DIRECT === '1'
  ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '' }
  : null;

async function sendDirect(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${DIRECT!.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: DIRECT!.key, Authorization: `Bearer ${DIRECT!.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => '');
  return { ok: false, error: text.includes('"rate_limited"') ? 'Too many messages in the last hour. Try again later.' : 'Something went wrong. Try again in a moment.' };
}

function useFormSubmit<T>(endpoint: string, validate: (d: Record<string, unknown>) => Result<T>, direct: { table: string; row: (d: T) => Record<string, unknown> }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const focusFirst = (errs: Record<string, string>) => {
    const first = Object.keys(errs)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === 'sending') return;
    const data = readForm(e.currentTarget);
    const local = validate(data);
    if (!local.ok) {
      setErrors(local.errors);
      setStatus({ kind: 'error', message: 'Check the highlighted fields.' });
      focusFirst(local.errors);
      return;
    }
    setErrors({});
    setStatus({ kind: 'sending' });
    try {
      let res: { ok: boolean }, body: { ok?: boolean; error?: string; errors?: Record<string, string> };
      if (DIRECT) {
        // Same honeypot rule as the API: bots that fill the hidden field get a fake success.
        body = typeof data.website === 'string' && data.website.trim() ? { ok: true } : await sendDirect(direct.table, direct.row(local.data));
        res = { ok: !!body.ok };
      } else {
        res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        body = await (res as Response).json().catch(() => ({}));
      }
      if (res.ok && body.ok) {
        formRef.current?.reset();
        setStatus({ kind: 'sent' });
        return;
      }
      if (body.errors) {
        setErrors(body.errors);
        focusFirst(body.errors);
      }
      setStatus({ kind: 'error', message: body.error || (body.errors ? 'Check the highlighted fields.' : 'Something went wrong. Try again in a moment.') });
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    }
  }

  const field = (name: string) => ({
    name,
    id: `f-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `f-${name}-err` : undefined,
  });
  return { status, setStatus, errors, formRef, onSubmit, field };
}

const FieldError = ({ name, errors }: { name: string; errors: Record<string, string> }) =>
  errors[name] ? <p className="field-err" id={`f-${name}-err`}><Icon name="alert" size={16} />{errors[name]}</p> : null;

// Hidden from people and screen readers; bots tend to fill it in.
const Honeypot = () => (
  <div className="hp" aria-hidden="true">
    <label htmlFor="f-website">Website</label>
    <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
  </div>
);

function StatusLine({ status }: { status: Status }) {
  return (
    <p className={`form-status${status.kind === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
      {status.kind === 'sending' && 'Sending…'}
      {status.kind === 'error' && status.message}
    </p>
  );
}

function Sent({ title, text, onReset }: { title: string; text: string; onReset: () => void }) {
  // The card is shorter than the form it replaces, so without this it can end up above the screen on phones.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const h = heading.current;
    if (!h) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    h.closest('.sent')?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
    h.focus({ preventScroll: true });
  }, []);
  return (
    <div className="sent" role="status">
      <span className="sent-ic"><Icon name="check" size={28} width={2.6} /></span>
      <h3 ref={heading} tabIndex={-1}>{title}</h3>
      <p>{text}</p>
      <button type="button" className="btn btn-dark" onClick={onReset}>Send another</button>
    </div>
  );
}

export function ContactForm() {
  const f = useFormSubmit<ContactData>('/api/contact', validateContact, { table: 'contact_messages', row: contactRow });
  // /contact?topic=partnership preselects the partnership topic (used by "Become a partner").
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('topic') !== 'partnership') return;
    const sel = f.formRef.current?.querySelector<HTMLSelectElement>('select[name="topic"]');
    if (sel) sel.value = 'Partnership or sponsorship';
  }, [f.formRef]);
  if (f.status.kind === 'sent') {
    return <Sent title="Message sent" text="Thanks for writing. The committee will reply by email." onReset={() => f.setStatus({ kind: 'idle' })} />;
  }
  return (
    <form ref={f.formRef} className="form" noValidate onSubmit={f.onSubmit}>
      <div className="field"><label htmlFor="f-name">Name</label><input {...f.field('name')} autoComplete="name" required maxLength={100} /><FieldError name="name" errors={f.errors} /></div>
      <div className="field"><label htmlFor="f-email">Email</label><input {...f.field('email')} type="email" autoComplete="email" required maxLength={200} /><FieldError name="email" errors={f.errors} /></div>
      <div className="field">
        <label htmlFor="f-topic">Topic</label>
        <select {...f.field('topic')} defaultValue={CONTACT_TOPICS[0]}>{CONTACT_TOPICS.map(t => <option key={t}>{t}</option>)}</select>
        <FieldError name="topic" errors={f.errors} />
      </div>
      <div className="field"><label htmlFor="f-message">Message</label><textarea {...f.field('message')} required maxLength={3000} /><FieldError name="message" errors={f.errors} /></div>
      <Honeypot />
      <div><button type="submit" className="btn btn-gold btn-hard" disabled={f.status.kind === 'sending'}>{f.status.kind === 'sending' ? 'Sending…' : <>Send message <Arrow /></>}</button></div>
      <StatusLine status={f.status} />
    </form>
  );
}

export function JoinForm() {
  const f = useFormSubmit<JoinData>('/api/join', validateJoin, { table: 'join_requests', row: joinRow });
  if (f.status.kind === 'sent') {
    return <Sent title="Request received" text={`Thanks for joining. The committee will reply by email. Meanwhile, follow ${SITE.instagramHandle} on Instagram.`} onReset={() => f.setStatus({ kind: 'idle' })} />;
  }
  return (
    <form ref={f.formRef} className="form form-grid" noValidate onSubmit={f.onSubmit}>
      <div className="field"><label htmlFor="f-name">Full name</label><input {...f.field('name')} autoComplete="name" required maxLength={100} /><FieldError name="name" errors={f.errors} /></div>
      <div className="field"><label htmlFor="f-email">Email</label><input {...f.field('email')} type="email" autoComplete="email" required maxLength={200} /><FieldError name="email" errors={f.errors} /></div>
      <div className="field"><label htmlFor="f-phone">Phone <span className="opt">optional</span></label><input {...f.field('phone')} type="tel" autoComplete="tel" maxLength={20} placeholder="+962 7X XXX XXXX" /><FieldError name="phone" errors={f.errors} /></div>
      <div className="field"><label htmlFor="f-major">Major</label><input {...f.field('major')} required maxLength={100} placeholder="e.g. Mechatronics Engineering" /><FieldError name="major" errors={f.errors} /></div>
      <div className="field">
        <label htmlFor="f-year">Academic year</label>
        <select {...f.field('year')} defaultValue=""><option value="" disabled>Choose…</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select>
        <FieldError name="year" errors={f.errors} />
      </div>
      <fieldset className="field" aria-describedby={f.errors.ieeeMember ? 'f-ieeeMember-err' : undefined}>
        <legend>Are you an IEEE member?</legend>
        <div className="radios">
          {IEEE_STATUS.map((s, i) => (
            <label key={s} className="radio"><input type="radio" name="ieeeMember" value={s} id={i === 0 ? 'f-ieeeMember' : undefined} />{s}</label>
          ))}
        </div>
        <FieldError name="ieeeMember" errors={f.errors} />
      </fieldset>
      <fieldset className="field span-2">
        <legend>What are you interested in? <span className="opt">optional</span></legend>
        <div className="checks">
          {FIELDS.map(x => <label key={x} className="check"><input type="checkbox" name="interests" value={x} />{x}</label>)}
        </div>
      </fieldset>
      <div className="field span-2"><label htmlFor="f-message">Anything you want us to know? <span className="opt">optional</span></label><textarea {...f.field('message')} maxLength={1500} /><FieldError name="message" errors={f.errors} /></div>
      <Honeypot />
      <div className="span-2"><button type="submit" className="btn btn-gold btn-hard" disabled={f.status.kind === 'sending'}>{f.status.kind === 'sending' ? 'Sending…' : <>Send join request <Arrow /></>}</button></div>
      <div className="span-2"><StatusLine status={f.status} /></div>
    </form>
  );
}
