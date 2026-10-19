import { handleForm } from '@/lib/form-handler';
import { joinRow } from '@/lib/rows';
import { validateJoin } from '@/lib/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return handleForm(req, 'join', validateJoin, d => ({
    subject: `[Join request] ${d.name} (${d.major}, ${d.year})`,
    replyTo: d.email,
    text: [
      `Name: ${d.name}`,
      `Email: ${d.email}`,
      `Phone: ${d.phone || '-'}`,
      `Major: ${d.major}`,
      `Year: ${d.year}`,
      `IEEE member: ${d.ieeeMember}`,
      `Interests: ${d.interests.join(', ') || '-'}`,
      '',
      d.message || '(no message)',
    ].join('\n'),
  }), d => ({ table: 'join_requests', row: joinRow(d) }));
}
