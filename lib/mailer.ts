import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

export class MailNotConfigured extends Error {}

let transporter: Transporter | null = null;

/**
 * SMTP settings come from the environment (see .env.example).
 * MAIL_DRY_RUN=1 builds the message without sending it, for local testing.
 */
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.MAIL_DRY_RUN === '1') {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !process.env.MAIL_TO) throw new MailNotConfigured();
  const port = Number(SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
  return transporter;
}

export async function sendMail(opts: { subject: string; text: string; replyTo: string }) {
  const t = getTransporter();
  const to = process.env.MAIL_TO || 'dry-run@localhost';
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'website@localhost';
  const info = await t.sendMail({
    from: `IES HU website <${from}>`,
    to,
    replyTo: opts.replyTo,
    subject: opts.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
    text: opts.text,
  });
  if (process.env.MAIL_DRY_RUN === '1') console.info('[mail dry run]', opts.subject);
  return info;
}

export const mailConfigured = () =>
  process.env.MAIL_DRY_RUN === '1' ||
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_TO);
