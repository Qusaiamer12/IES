// Site-wide settings. The editable values live in content/site.json (validated by lib/content at build time);
// this module adds the site's public address, which depends on where it is deployed. Client components may import it.
import siteJson from '@/content/site.json';
import type { Site } from './content/schema';

const settings = siteJson as Site;

export const SITE = {
  ...settings,
  // Production URL, e.g. https://ies-hu.vercel.app. Set NEXT_PUBLIC_SITE_URL on the host before writing NFC tags.
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  ).replace(/\/+$/, ''),
};

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/chapter', label: 'The Chapter' },
  { href: '/team', label: 'Our Team' },
  { href: '/events', label: 'Events' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
] as const;

export const IEEE_LINKS = [
  { label: 'IEEE.org', href: 'https://www.ieee.org/' },
  { label: 'IEEE Xplore', href: 'https://ieeexplore.ieee.org/' },
  { label: 'IEEE Spectrum', href: 'https://spectrum.ieee.org/' },
  { label: 'IEEE IES', href: 'https://www.ieee-ies.org/' },
] as const;

export const JOIN_IEEE_URL = 'https://www.ieee.org/membership/join/index.html';

export const IEEE_LEGAL = [
  { label: 'Accessibility', href: 'https://www.ieee.org/accessibility_statement.html' },
  { label: 'Nondiscrimination Policy', href: 'https://www.ieee.org/p9-26.html' },
  { label: 'IEEE Ethics Reporting', href: 'https://ieee-ethics-reporting.org/' },
  { label: 'IEEE Privacy Policy', href: 'https://www.ieee.org/security_privacy.html' },
  { label: 'Terms & Disclosures', href: 'https://www.ieee.org/about/help/site-terms-conditions.html' },
] as const;
