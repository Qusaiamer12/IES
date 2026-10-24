// Checks that go beyond the schemas: files referenced by content exist, image sizes match, the current term is real,
// and no member page that may be on an NFC card ever disappears. Run alone with: npm run content:check
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allMembers, chapter, committeeOf, events, partners, people, profileOf, site, terms } from '@/lib/content';
import { imageSize } from './image-size';

const publicFile = (p: string) => new URL(`../../public${p}`, import.meta.url);

describe('content files', () => {
  it('load and pass every schema and cross-check', () => {
    // Importing @/lib/content already validated everything; reaching this line means it passed.
    expect(people.length).toBeGreaterThan(0);
  });

  it('every image they reference exists in public/', () => {
    const paths = [
      ...people.map(p => p.photo),
      ...events.flatMap(e => [e.image, e.thumb, ...e.gallery.map(g => g.src)]),
      ...partners.map(p => p.logo),
    ].filter((p): p is string => Boolean(p));
    const missing = paths.filter(p => !existsSync(publicFile(p)));
    expect(missing, 'Add these files to public/ or fix the paths').toEqual([]);
  });

  it('event imageSize matches the real image', () => {
    for (const e of events) {
      if (!e.image || !e.imageSize) continue;
      expect(imageSize(readFileSync(publicFile(e.image))), `${e.slug}: imageSize`).toEqual(e.imageSize);
    }
  });

  it('the current term has a committee (or is about to be announced)', () => {
    const newest = terms[0];
    expect([newest, nextTerm(newest)], `site.currentTerm "${site.currentTerm}"`).toContain(site.currentTerm);
  });

  it('join form interests fit the database (at most 7)', () => {
    expect(chapter.fields.length).toBeLessThanOrEqual(7);
  });
});

describe('committees', () => {
  it('lists the Core Team first, in roles.json order', () => {
    const list = committeeOf(terms[0]);
    const firstExec = list.findIndex(m => !m.core);
    expect(list.slice(firstExec).every(m => !m.core)).toBe(true);
  });

  it('gives everyone a latest seat, so every member page has a role', () => {
    for (const p of people) expect(profileOf(p.slug)?.latest, p.slug).toBeTruthy();
  });

  it('marks first-term members as founding', () => {
    const first = terms[terms.length - 1];
    expect(allMembers.filter(m => m.term === first).every(m => m.founding)).toBe(true);
  });
});

describe('NFC cards', () => {
  // Slugs that may already be written to cards. People are never removed from people.json, so these pages
  // keep working forever. New members don't need to be added here; this list only guards against removal.
  const onCards: string[] = JSON.parse(readFileSync(new URL('./nfc-slugs.json', import.meta.url), 'utf8'));
  it('every slug that may be on a card still has a member page', () => {
    const slugs = new Set(people.map(p => p.slug));
    expect(onCards.filter(s => !slugs.has(s)), 'Never remove or rename people: their NFC cards would break').toEqual([]);
  });
});

function nextTerm(t: string) {
  const y = Number(t.slice(0, 4)) + 1;
  return `${y}/${y + 1}`;
}
