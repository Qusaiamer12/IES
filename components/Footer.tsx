import Link from 'next/link';
import { IEEE_LEGAL, IEEE_LINKS, JOIN_IEEE_URL, NAV, SITE } from '@/lib/site';
import { Icon } from './Icon';

const SOCIALS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
] as const;

export function Footer() {
  const socials = SOCIALS.filter(s => SITE.social[s.key]);
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-logos">
              <span className="p"><img src="/images/ies-hu-logo.jpg" alt="IEEE Industrial Electronics Society, HU Student Branch IES Chapter" width={83} height={48} loading="lazy" /></span>
              <span className="c"><img src="/images/ieee-hu-branch-logo.png" alt="IEEE Hashemite University Student Branch" width={56} height={56} loading="lazy" /></span>
              <span className="c"><img src="/images/hu-logo.png" alt="The Hashemite University" width={56} height={56} loading="lazy" /></span>
            </div>
            <strong>IEEE IES Student Chapter</strong>
            <p>The Hashemite University · IEEE HU Student Branch, Jordan Section, Region 8.</p>
          </div>
          <div>
            <h2 className="foot-h">Explore</h2>
            <ul>
              {NAV.map(n => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
              <li><Link href="/join">Join Us</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="foot-h">IEEE</h2>
            <ul>
              {IEEE_LINKS.map(l => <li key={l.href}><a href={l.href} target="_blank" rel="noopener">{l.label}</a></li>)}
              <li><a href={JOIN_IEEE_URL} target="_blank" rel="noopener">Join IEEE</a></li>
            </ul>
          </div>
          <div>
            <h2 className="foot-h">Visit us</h2>
            <address>{SITE.address.map((l, i) => <span key={l}>{l}{i < SITE.address.length - 1 && <br />}</span>)}</address>
            {SITE.email && <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>}
            {socials.length > 0 && (
              <div className="socials">
                {socials.map(s => (
                  <a key={s.key} className="soc" href={SITE.social[s.key]!} target="_blank" rel="noopener" aria-label={s.label}>
                    <Icon name={s.key} size={20} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="foot-bottom">
          <ul className="foot-legal">
            {IEEE_LEGAL.map(l => <li key={l.href}><a href={l.href} target="_blank" rel="noopener">{l.label}</a></li>)}
          </ul>
          <p className="foot-copy">© Copyright 2026 IEEE – All rights reserved. A public charity, IEEE is the world&apos;s largest technical professional organization dedicated to advancing technology for the benefit of humanity.</p>
          <p className="foot-copy">{SITE.slogan} · IEEE IES HU, est. {SITE.founded}</p>
        </div>
      </div>
    </footer>
  );
}
