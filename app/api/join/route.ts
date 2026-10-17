import { handleForm } from '@/lib/form-handler';
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
  }), d => ({
    table: 'join_requests',
    row: {
      name: d.name, email: d.email, phone: d.phone || null, major: d.major, year: d.year,
      ieee_member: d.ieeeMember, interests: d.interests, message: d.message || null,
    },
  }));
}
