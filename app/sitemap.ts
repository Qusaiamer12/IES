import type { MetadataRoute } from 'next';
import { events, members } from '@/lib/data';
import { NAV, SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [...NAV.map(n => n.href), '/join'];
  return [
    ...pages.map(p => ({ url: `${SITE.url}${p === '/' ? '' : p}`, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...events.map(e => ({ url: `${SITE.url}/events/${e.slug}`, priority: 0.6 })),
    { url: `${SITE.url}/projects/pid-duel`, priority: 0.6 },
    ...members.map(m => ({ url: `${SITE.url}/m/${m.slug}`, priority: 0.4 })),
  ];
}
