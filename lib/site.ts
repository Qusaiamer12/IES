// Site-wide settings. Anything still null is hidden on the site until it is filled in.
export const SITE = {
  shortName: 'IEEE IES HU',
  name: 'IEEE IES Student Chapter, The Hashemite University',
  slogan: 'We Make Industry Move',
  description:
    'The IEEE Industrial Electronics Society student chapter at the Hashemite University. Students who learn automation, robotics, power electronics and embedded systems by building them.',
  // Production URL, e.g. https://ieshu.org. Set NEXT_PUBLIC_SITE_URL on the host before writing NFC tags.
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  ).replace(/\/+$/, ''),
  currentTerm: '2026/2027',
  founded: 2026,
  email: 'ies.2026.hu@gmail.com' as string | null,
  address: ['Faculty of Engineering', 'Department of Electrical Engineering', 'The Hashemite University', 'Zarqa, Jordan'],
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Faculty+of+Engineering+The+Hashemite+University+Zarqa',
  social: {
    instagram: 'https://www.instagram.com/ieee.ies.hu/' as string | null,
    linkedin: null as string | null,
    facebook: null as string | null,
  },
  instagramHandle: '@ieee.ies.hu',
} as const;

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
