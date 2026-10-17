import { handleForm } from '@/lib/form-handler';
import { validateContact } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return handleForm(req, 'contact', validateContact, d => ({
    subject: `[Website] ${d.topic}: ${d.name}`,
    replyTo: d.email,
    text: [`Name: ${d.name}`, `Email: ${d.email}`, `Topic: ${d.topic}`, '', d.message].join('\n'),
  }), d => ({ table: 'contact_messages', row: { name: d.name, email: d.email, topic: d.topic, message: d.message } }));
}
