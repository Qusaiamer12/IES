const PATHS = {
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  wrench: <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z" />,
  chip: <path d="M8 8h8v8H8zM10 3v5M14 3v5M10 16v5M14 16v5M3 10h5M3 14h5M16 10h5M16 14h5" />,
  doc: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  network: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 6h7M7.3 8.3l3.4 7.4M16.7 8.3l-3.4 7.4" />
    </>
  ),
  factory: <path d="M3 21V10l5 3v-3l5 3v-3l5 3V4h3v17zM3 21h18" />,
  cv: <path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h3" />,
  pen: <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />,
  nfc: (
    <>
      <path d="M6 8.5a5 5 0 0 1 0 7" />
      <path d="M9.5 6a9 9 0 0 1 0 12" />
      <path d="M13 3.5a13 13 0 0 1 0 17" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  mail: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: <path d="M12 8v5M12 16.5v.01M10.3 3.9L2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17 7h.01" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16" />
    </>
  ),
  facebook: <path d="M14 21v-8h3l.5-3.5H14V7.8c0-1 .4-1.8 1.9-1.8H18V3.1A20 20 0 0 0 15.4 3C12.8 3 11 4.6 11 7.5v2H8V13h3v8" />,
};

export type IconName = keyof typeof PATHS;

export const iconPath = (name: IconName) => PATHS[name];

/** Pixel size as rem, so icons scale with the root font size like the rest of the layout. */
export const rem = (px: number) => `${px / 16}rem`;

export function Icon({ name, size = 22, stroke = 'currentColor', width = 2, className }: { name: IconName; size?: number; stroke?: string; width?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} style={{ width: rem(size), height: rem(size) }} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[name]}
    </svg>
  );
}

export const Arrow = ({ size = 20 }: { size?: number }) => <Icon name="arrow" size={size} />;
