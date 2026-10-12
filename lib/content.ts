// Copy that several pages share. Facts about IES come from IE Technology News
// ("Celebrating 75 years of the IEEE Industrial Electronics Society", 2026) and ieee-ies.org.

export const FIELDS = [
  'Automation',
  'Robotics',
  'Power electronics',
  'Embedded systems',
  'Industry 4.0',
  'Smart grid',
  'Industrial AI',
] as const;

export const BENEFITS = [
  { icon: 'wrench', title: 'Hands-on workshops', text: 'Arduino, PLC, MATLAB and power electronics.' },
  { icon: 'doc', title: 'Access to IEEE research' },
  { icon: 'network', title: 'Networking with engineers and alumni' },
  { icon: 'factory', title: 'Industry visits' },
  { icon: 'flag', title: 'Leadership experience' },
  { icon: 'cv', title: 'A stronger CV' },
  { icon: 'pen', title: 'Help with research and publishing' },
  { icon: 'chip', title: 'A community of people who build things' },
] as const;

export const PUBLICATIONS = [
  { kind: 'Transactions', since: 1953, name: 'IEEE Transactions on Industrial Electronics' },
  { kind: 'Transactions', since: 2005, name: 'IEEE Transactions on Industrial Informatics' },
  { kind: 'Magazine', since: 2007, name: 'IEEE Industrial Electronics Magazine' },
  { kind: 'Journal', since: 2020, name: 'IEEE Journal of Emerging and Selected Topics in Industrial Electronics' },
  { kind: 'Open journal', since: 2020, name: 'IEEE Open Journal of the Industrial Electronics Society' },
  { kind: 'Transactions', since: 2023, name: 'IEEE Transactions on Industrial Cyber-Physical Systems' },
] as const;

export const TIMELINE = [
  { year: 1951, title: 'IES begins', text: 'The IRE Industrial Electronics Group holds its first meeting on 21 February.' },
  { year: 1953, title: 'The Transactions', text: 'The first volume of what is now IEEE Transactions on Industrial Electronics.' },
  { year: 1975, title: 'The first IECON', text: 'The society’s flagship conference starts in Philadelphia.' },
  { year: 1982, title: 'IEEE IES', text: 'The society adopts the name IEEE Industrial Electronics Society.' },
  { year: 2002, title: 'IEEE at the Hashemite University', text: 'The IEEE HU Student Branch is established in the Jordan Section, Region 8.' },
  { year: 2026, title: 'IES turns 75. IES HU is founded.', text: 'The founding term of our chapter.', now: true },
] as const;

export const SOURCES = [
  { label: 'IE Technology News', href: 'https://iten.ieee-ies.org/featured-news/2026/celebrating-75-years-of-the-ieee-industrial-electronics-society/' },
  { label: 'ieee-ies.org', href: 'https://www.ieee-ies.org/' },
  { label: 'IEEE HU Student Branch', href: 'https://edu.ieee.org/jo-hu/communities' },
] as const;

// Partners of the IEEE HU Student Branch; they support every chapter in the branch.
export const PARTNERS = [
  { name: 'HUBOT', logo: '/images/partners/hubot.png', width: 320, height: 71 },
  { name: 'Islamic Educational College Schools', logo: '/images/partners/iecs.png', width: 360, height: 113 },
  { name: 'KaDan', logo: '/images/partners/kadan.png', width: 160, height: 160 },
  { name: 'Good Day', logo: '/images/partners/good-day.png', width: 320, height: 85 },
  { name: 'Zeidan', logo: '/images/partners/zeidan.png', width: 260, height: 126 },
] as const;

export const FAQ = [
  {
    q: 'What is IEEE IES?',
    a: 'The Industrial Electronics Society, an IEEE technical society for electronics, control, communications, instrumentation and computational intelligence in industrial and manufacturing systems.',
  },
  {
    q: 'What do I get as a member?',
    a: 'Hands-on workshops (Arduino, PLC, MATLAB, power electronics), access to IEEE research, networking with engineers and alumni, industry visits, leadership experience, a stronger CV, help with research and publishing, and a community of people who build things.',
  },
  {
    q: 'How do I join?',
    a: 'Send the join form on this page. The committee reviews every request and replies by email.',
  },
  {
    q: 'Where can I find chapter events?',
    a: 'On the Events page of this site, and on Instagram at @ieee.ies.hu.',
  },
] as const;
