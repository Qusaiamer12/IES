import { useId } from 'react';
import { iconPath, type IconName } from './Icon';

/** Section marker: the rank chevrons from the member card. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow">
      <svg aria-hidden="true" width="14" height="16" viewBox="0 0 20 22" fill="none" stroke="#FF6B1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10l6-5 6 5" />
        <path d="M4 17l6-5 6 5" />
      </svg>
      {children}
    </span>
  );
}

export function Stamp({ top, center, ring, label }: { top: string; center: string; ring: string; label: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="stamp" role="img" aria-label={label} viewBox="0 0 150 150">
      <defs>
        <path id={`ring${id}`} d="M75 75 m-53 0 a53 53 0 1 1 106 0 a53 53 0 1 1 -106 0" />
      </defs>
      <circle cx="75" cy="75" r="73" fill="#0B1530" />
      <circle cx="75" cy="75" r="69" fill="none" stroke="#FFC21A" strokeWidth="2" />
      <circle cx="75" cy="75" r="36" fill="#FFC21A" />
      <text style={{ fontFamily: 'var(--f-en)' }} fontSize="16" fontWeight="700" fill="#FFC21A">
        <textPath href={`#ring${id}`} textLength="328" lengthAdjust="spacing">{ring}</textPath>
      </text>
      <text x="75" y="70" textAnchor="middle" style={{ fontFamily: 'var(--f-en)' }} fontSize="13" fontWeight="700" fill="#0B1530" letterSpacing="0.5">{top}</text>
      <text x="75" y="93" textAnchor="middle" style={{ fontFamily: 'var(--f-en)' }} fontSize="24" fontWeight="700" fill="#0B1530">{center}</text>
    </svg>
  );
}

const Star = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#FFC21A">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
  </svg>
);

export function Sticker({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticker">
      <Star />
      <span>{children}</span>
      <Star />
    </div>
  );
}

/** Hexagon badge. Filled = earned/active, dashed = empty. */
export function Hex({ icon, filled, size = 58 }: { icon: IconName; filled: boolean; size?: number }) {
  const line = filled ? '#FFC21A' : '#0B1530';
  return (
    <svg className="hex" aria-hidden="true" width={size} height={Math.round((size * 72) / 64)} viewBox="0 0 64 72">
      <polygon points="32,3 61,19.5 61,52.5 32,69 3,52.5 3,19.5" fill={filled ? '#0B1530' : 'none'} stroke={line} strokeWidth="3" strokeDasharray={filled ? undefined : '6 5'} />
      <svg x="20" y="24" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {iconPath(icon)}
      </svg>
    </svg>
  );
}

export function Edge() {
  return (
    <div className="edge" aria-hidden="true">
      <svg viewBox="0 0 1440 22" preserveAspectRatio="none">
        <polygon points="1050,0 1440,0 1440,22 1040,22" fill="#FF6B1A" />
        <polygon points="1000,0 1030,0 1020,22 990,22" fill="#FFC21A" />
      </svg>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <Hex icon={icon} filled={false} size={64} />
      <div>
        <h3>{title}</h3>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
