import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // The static backup copy stays out of search results so it never competes with the main site.
  if (process.env.NEXT_PUBLIC_NOINDEX === '1') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }], sitemap: `${SITE.url}/sitemap.xml` };
}
