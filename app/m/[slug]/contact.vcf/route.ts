import { getMember, members } from '@/lib/data';
import { SITE } from '@/lib/site';
import { buildVCard } from '@/lib/vcard';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = () => members.map(m => ({ slug: m.slug }));

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const m = getMember((await params).slug);
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(buildVCard(m, SITE.url), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${m.slug}.vcf"`,
    },
  });
}
