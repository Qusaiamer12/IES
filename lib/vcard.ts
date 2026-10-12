import { roleOf, type Member } from './data';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** vCard 3.0 for a member. Only fields that are set are written. */
export function buildVCard(m: Member, siteUrl: string) {
  const parts = m.nameEn.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : '';
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(last)};${esc(parts.join(' '))};;;`,
    `FN:${esc(m.nameEn)}`,
    `ORG:${esc('IEEE IES Student Chapter, The Hashemite University')}`,
    `TITLE:${esc(roleOf(m).label)}`,
    `NOTE:${esc([m.nameAr, m.specialtyEn, m.memberId].filter(Boolean).join(' · '))}`,
    `URL:${siteUrl}/m/${m.slug}`,
  ];
  const l = m.links ?? {};
  if (l.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(l.email)}`);
  if (l.phone) lines.push(`TEL;TYPE=CELL:${esc(l.phone)}`);
  if (l.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${l.linkedin}`);
  if (l.instagram) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${l.instagram}`);
  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}
