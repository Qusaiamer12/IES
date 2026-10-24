import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { people, profileOf } from '@/lib/content';
import { SITE } from '@/lib/site';
import { buildVCard } from '@/lib/vcard';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = () => people.map(p => ({ slug: p.slug }));

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = profileOf((await params).slug)?.latest;
  if (!m) return new Response('Not found', { status: 404 });
  // The photo is embedded, so the saved contact shows the member's face (phones don't fetch photo URLs).
  const photo = m.photo ? await readFile(join(process.cwd(), 'public', m.photo)).then(b => b.toString('base64'), () => null) : null;
  return new Response(buildVCard(m, SITE.url, { email: SITE.email, photo }), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${m.slug}.vcf"`,
    },
  });
}
