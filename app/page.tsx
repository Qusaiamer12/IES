import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { Cta, SectionHead } from '@/components/Blocks';
import { EventsGrid } from '@/components/Events';
import { Arrow } from '@/components/Icon';
import { Eyebrow, Stamp, Sticker } from '@/components/Motifs';
import { PARTNERS } from '@/lib/content';
import { splitEvents } from '@/lib/data';

export const metadata: Metadata = pageMeta({ description: SITE.description, path: '/' });

export const revalidate = 3600; // re-split upcoming/past events every hour

export default function Home() {
  const { upcoming, past } = splitEvents();
  // upcoming first, then the latest past events so recent photos stay visible
  const featured = [...upcoming, ...past].slice(0, 3);
  const evTitle = upcoming.length && past.length ? 'Coming up & recently' : upcoming.length || !featured.length ? 'What’s coming up' : 'Latest from the chapter';
  return (
    <>
      <section className="hero" aria-labelledby="hero-h">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <Eyebrow>IEEE IES Student Chapter · The Hashemite University</Eyebrow>
            <h1 id="hero-h">We Make Industry <em>Move</em></h1>
            <p className="lead">The IEEE Industrial Electronics Society chapter at the Hashemite University. Students who learn automation, robotics, power electronics and embedded systems by building them.</p>
            <div className="btn-row">
              <Link className="btn btn-gold btn-hard" href="/join">Join IES HU <Arrow /></Link>
              <Link className="btn btn-light" href="/events">Explore events</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="slabs">
              <svg viewBox="0 0 800 700" preserveAspectRatio="xMinYMid slice">
                <polygon points="360,0 800,0 800,700 130,700" fill="#FF6B1A" />
                <polygon points="280,0 336,0 106,700 50,700" fill="#FFC21A" />
                <g stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none">
                  <path d="M0 150 H70 L110 190 V300" /><path d="M0 560 H60" /><path d="M520 0 V50 L560 90 H700" />
                </g>
                <g fill="#FFFFFF"><circle cx="110" cy="300" r="7" /><circle cx="700" cy="90" r="7" /><circle cx="60" cy="560" r="6" /></g>
              </svg>
            </div>
            <span className="outline-word">IES</span>
            <Stamp top="IES" center="75" ring="IES 75 YEARS ★ 1951 – 2026 ★" label="IES 75 years, 1951 to 2026" />
            <Sticker>Est. 2026</Sticker>
          </div>
        </div>
      </section>

      <div className="wrap stats-wrap">
        <ul className="stats" aria-label="IES at a glance">
          <li className="stat hot"><b>75</b><span>Years of IES</span><small>1951 – 2026</small></li>
          <li className="stat"><b>100+</b><span>Countries with IES members</span><small>IES, 2021</small></li>
          <li className="stat"><b>6</b><span>IES journals &amp; magazines</span><small>Since 1953</small></li>
          <li className="stat"><b>2026</b><span>Our chapter founded</span><small>Founding term 2026/27</small></li>
        </ul>
      </div>

      <section className="sec sec-white" aria-labelledby="ev-h">
        <div className="wrap">
          <SectionHead id="ev-h" kicker="Events" title={evTitle}
            lead="Workshops, visits and IEEE days we organize or take part in."
            action={featured.length ? <Link className="btn btn-dark btn-hard" href="/events">All events <Arrow size={18} /></Link> : undefined} />
          <EventsGrid list={featured} />
        </div>
      </section>

      <section className="s75" aria-labelledby="s75-h">
        <div className="wrap s75-grid">
          <div className="n75-wrap" aria-hidden="true"><span className="n75">75</span><span className="n75-l">YEARS OF IEEE IES · 1951 — 2026</span></div>
          <div className="s75-copy">
            <Eyebrow>The IES diamond jubilee</Eyebrow>
            <h2 id="s75-h">75 years of industrial electronics. We are the first line of the next chapter.</h2>
            <p>It started with a meeting of the IRE Industrial Electronics Group on 21 February 1951. In 2026 the society turns 75, and our chapter is founded at the Hashemite University in the same year.</p>
            <ol className="mini-tl">
              <li><b>1951</b><span>First meeting</span></li>
              <li><b>1975</b><span>First IECON</span></li>
              <li><b>1982</b><span>Named IEEE IES</span></li>
              <li className="on"><b>2026</b><span>75 years · IES HU</span></li>
            </ol>
            <div><Link className="btn btn-navy btn-hard" href="/chapter" style={{ '--hard': 'var(--white)' } as React.CSSProperties}>Our story <Arrow size={18} /></Link></div>
          </div>
        </div>
      </section>

      <section className="sec sec-paper" aria-labelledby="pt-h">
        <div className="wrap">
          <SectionHead id="pt-h" kicker="Branch partners" title="The partners who power our branch"
            lead="Companies and schools that back the IEEE Hashemite University Student Branch, and every chapter in it."
            action={<Link className="btn btn-dark btn-hard" href="/contact?topic=partnership">Become a partner <Arrow size={18} /></Link>} />
          <ul className="partners">
            {PARTNERS.map(p => <li key={p.name} className="partner"><img src={p.logo} alt={p.name} width={p.width} height={p.height} loading="lazy" /></li>)}
          </ul>
          <p className="partners-note">Partners of the IEEE HU Student Branch.</p>
        </div>
      </section>
      <Cta />
    </>
  );
}
