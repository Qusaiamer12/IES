import { describe, expect, it } from 'vitest';
import { allMembers } from '@/lib/content';
import { buildVCard } from '@/lib/vcard';

const raneem = allMembers.find(m => m.slug === 'raneem-abu-areda')!;

describe('vCard', () => {
  const card = buildVCard(raneem, 'https://example.org', { email: 'chapter@example.org', photo: 'A'.repeat(300) });
  const lines = card.split('\r\n');
  it('puts everything after the first name in the family name', () => expect(card).toContain('N:Abu Areda;Raneem;;;'));
  it('escapes commas', () => expect(card).toContain('ORG:IEEE IES Student Chapter\\, The Hashemite University'));
  it('folds every line at 75 octets', () => {
    for (const l of lines) expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
  });
  it('adds the chapter email and the photo', () => {
    expect(card).toContain('EMAIL;TYPE=INTERNET,WORK:chapter@example.org');
    expect(card).toContain('PHOTO;ENCODING=b;TYPE=JPEG:');
  });
  it('ends with CRLF', () => expect(card.endsWith('END:VCARD\r\n')).toBe(true));
});
