import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Permanent_Marker, Space_Grotesk } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SITE } from '@/lib/site';
import './globals.css';

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-grotesk', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'], variable: '--font-mono', display: 'swap' });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['500', '700'], variable: '--font-arabic', display: 'swap', preload: false });
const marker = Permanent_Marker({ subsets: ['latin'], weight: ['400'], variable: '--font-marker', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.shortName} · ${SITE.slogan}`, template: `%s · ${SITE.shortName}` },
  description: SITE.description,
  applicationName: SITE.shortName,
  ...(process.env.NEXT_PUBLIC_NOINDEX === '1' ? { robots: { index: false, follow: false } } : {}),
  openGraph: { type: 'website', siteName: SITE.shortName, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

// Structured data so search engines show the chapter's name and logo.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#org`,
      name: SITE.name,
      alternateName: [SITE.shortName, 'IES HU'],
      url: SITE.url,
      logo: `${SITE.url}/icon-512.png`,
      ...(SITE.email ? { email: SITE.email } : {}),
      sameAs: Object.values(SITE.social).filter(Boolean),
      parentOrganization: { '@type': 'Organization', name: 'IEEE Industrial Electronics Society', url: 'https://www.ieee-ies.org/' },
    },
    { '@type': 'WebSite', '@id': `${SITE.url}/#site`, name: SITE.shortName, alternateName: SITE.name, url: SITE.url, publisher: { '@id': `${SITE.url}/#org` } },
  ],
};

export const viewport: Viewport = { themeColor: '#0B1530', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable} ${arabic.variable} ${marker.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
