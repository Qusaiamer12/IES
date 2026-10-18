import { roleOf, type Member } from './data';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Folds a content line at 75 octets (RFC 2425), never inside a UTF-8 character. */
function fold(line: string) {
  const out: string[] = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** vCard 3.0 for a member. Only fields that are set are written. */
export function buildVCard(m: Member, siteUrl: string) {
  // Given name first, everything after it is the family name ("Raneem Abu Areda" -> Abu Areda; Raneem).
  const [given, ...family] = m.nameEn.trim().split(/\s+/);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(family.join(' '))};${esc(given)};;;`,
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
  return lines.map(fold).join('\r\n') + '\r\n';
}
