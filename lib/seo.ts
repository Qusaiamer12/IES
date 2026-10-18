import type { Metadata } from 'next';
import { SITE } from './site';

/**
 * Page metadata with a canonical URL and a complete Open Graph block. Next replaces (does not merge) a parent's
 * openGraph object, so every page passes the shared fields again and falls back to the site's default share image.
 */
export function pageMeta({ title, description, path, image, type = 'website' }: {
  title?: string; description: string; path: string; image?: string | null; type?: 'website' | 'profile' | 'article';
}): Metadata {
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type, siteName: SITE.shortName, locale: 'en_US', url: path,
      title: title ? `${title} · ${SITE.shortName}` : `${SITE.shortName} · ${SITE.slogan}`,
      description,
      images: [image || '/opengraph-image'],
    },
  };
}
