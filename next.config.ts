import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

// Friendly aliases for the old page names. The static backup build writes these as small redirect pages.
export const ALIASES = [
  { source: '/about', destination: '/chapter' },
  { source: '/officers', destination: '/team' },
  { source: '/membership', destination: '/join' },
];

// STATIC_EXPORT=1 builds the static backup site (scripts/build-static.mjs): plain files, no server features.
const staticExport: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The game is indexed at its clean URL (/projects/pid-duel), not at the raw file.
      { source: '/games/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
  async rewrites() {
    // Projects that are self-contained HTML apps, served from public/ under a clean URL.
    return [{ source: '/projects/pid-duel', destination: '/games/pid-duel.html' }];
  },
  async redirects() {
    return ALIASES.map(a => ({ ...a, permanent: true }));
  },
};

export default process.env.STATIC_EXPORT === '1' ? staticExport : nextConfig;
