import Link from 'next/link';
import { Arrow } from './Icon';
import { Eyebrow } from './Motifs';

type Crumb = { label: string; href?: string };

export function PageHero({ kicker, title, lead, crumbs, word, children }: { kicker: string; title: string; lead?: React.ReactNode; crumbs?: Crumb[]; word?: string; children?: React.ReactNode }) {
  const trail = crumbs ?? [{ label: title }];
  return (
    <section className="hero page-hero">
      <div className="slab-corner" aria-hidden="true">
        <svg viewBox="0 0 440 400" preserveAspectRatio="xMaxYMid slice">
          <polygon points="250,0 440,0 440,400 130,400" fill="#FF6B1A" />
          <polygon points="180,0 216,0 96,400 60,400" fill="#FFC21A" />
          <g stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M0 320 H40 L70 290 H120" /></g>
          <circle cx="120" cy="290" r="6" fill="#FFFFFF" />
        </svg>
      </div>
      {word && <span className="outline-word" aria-hidden="true">{word}</span>}
      <div className="wrap">
        <div className="hero-copy">
          <Eyebrow>{kicker}</Eyebrow>
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children}
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            {trail.map((c, i) => (
              <span key={c.label} className="crumb">
                <span className="sep" aria-hidden="true">/</span>
                {c.href && i < trail.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </span>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, lead, id, action }: { kicker: string; title: React.ReactNode; lead?: React.ReactNode; id: string; action?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <div>
        <Eyebrow>{kicker}</Eyebrow>
        <h2 id={id}>{title}</h2>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Cta({ title = 'Be part of the next 75 years.', text = 'IES turns 75 the same year our chapter is born at the Hashemite University. Join the founding term and build with us.' }: { title?: string; text?: string }) {
  return (
    <section className="cta" aria-labelledby="cta-h">
      <div className="art" aria-hidden="true">
        <svg viewBox="0 0 560 400" preserveAspectRatio="xMaxYMid slice">
          <polygon points="300,0 560,0 560,400 140,400" fill="#0B1530" />
          <polygon points="220,0 262,0 102,400 60,400" fill="#FFC21A" />
          <g stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M560 90 H470 L430 130 V230" /></g>
          <circle cx="430" cy="230" r="7" fill="#FFFFFF" />
        </svg>
      </div>
      <div className="wrap">
        <div className="cta-in">
          <h2 id="cta-h">{title}</h2>
          <p>{text}</p>
          <div className="btn-row">
            <Link className="btn btn-navy btn-hard" href="/join">Join IES HU <Arrow /></Link>
            <Link className="btn btn-dark" href="/contact">Contact us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
