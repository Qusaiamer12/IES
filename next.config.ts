import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    // Projects that are self-contained HTML apps, served from public/ under a clean URL.
    return [{ source: '/projects/pid-duel', destination: '/games/pid-duel.html' }];
  },
  async redirects() {
    // Friendly aliases for the old page names.
    return [
      { source: '/about', destination: '/chapter', permanent: true },
      { source: '/officers', destination: '/team', permanent: true },
      { source: '/membership', destination: '/join', permanent: true },
    ];
  },
};

export default nextConfig;
