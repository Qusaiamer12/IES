import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import Link from 'next/link';
import { PageHero, SectionHead } from '@/components/Blocks';
import { Edge, Hex } from '@/components/Motifs';
import { JoinForm } from '@/components/Forms';
import { chapter } from '@/lib/content';

const { benefits: BENEFITS, faq: FAQ } = chapter;
import { JOIN_IEEE_URL } from '@/lib/site';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = pageMeta({ title: 'Join Us', description: 'Join the IEEE IES chapter at the Hashemite University: what you get and how to sign up.', path: '/join' });

export default function JoinPage() {
  return (
    <>
      <PageHero kicker="Join us" title="Join IES HU" word="JOIN" lead="What you get when you join, and how to get started." />

      <section className="sec sec-white" aria-labelledby="why-h">
        <div className="wrap">
          <SectionHead id="why-h" kicker="Why join" title="One membership, three communities" />
          <ul className="layers">
            <li className="layer"><span className="k">IEEE</span><h3>The world’s largest technical professional organization</h3>
              <p>Dedicated to advancing technology for the benefit of humanity. Membership connects you to a global technical community.</p>
              <a href={JOIN_IEEE_URL} target="_blank" rel="noopener">IEEE membership <Icon name="external" size={16} /></a></li>
            <li className="layer"><span className="k">IEEE IES</span><h3>Industrial Electronics Society</h3>
              <p>Automation, robotics, power electronics, embedded systems and Industry 4.0, with 75 years of research behind them.</p>
              <a href="https://www.ieee-ies.org/" target="_blank" rel="noopener">ieee-ies.org <Icon name="external" size={16} /></a></li>
            <li className="layer us"><span className="k">IES HU</span><h3>Our chapter at the Hashemite University</h3>
              <p>Workshops, visits and a team that learns and builds together, inside the IEEE HU Student Branch.</p>
              <Link href="/chapter">About the chapter</Link></li>
          </ul>
        </div>
      </section>

      <section className="sec sec-navy" aria-labelledby="get-h">
        <div className="wrap">
          <SectionHead id="get-h" kicker="Benefits" title="What members get" />
          <ul className="benefits">
            {BENEFITS.map(b => (
              <li key={b.title} className="benefit"><Hex icon={b.icon} filled size={52} /><div><h3>{b.title}</h3>{b.text && <p>{b.text}</p>}</div></li>
            ))}
          </ul>
        </div>
        <Edge />
      </section>

      <section className="sec sec-white" aria-labelledby="form-h" id="apply">
        <div className="wrap join-grid">
          <div className="prose">
            <SectionHead id="form-h" kicker="Sign up" title="Send your join request" />
            <ol className="steps-v">
              <li><b>1</b><div><h3>Fill in the form</h3><p>It takes about two minutes.</p></div></li>
              <li><b>2</b><div><h3>We get in touch</h3><p>The committee reviews your request and replies by email.</p></div></li>
              <li><b>3</b><div><h3>Come to your first activity</h3><p>Watch the Events page and our Instagram.</p></div></li>
            </ol>
          </div>
          <div className="panel"><JoinForm /></div>
        </div>
      </section>

      <section className="sec sec-paper" aria-labelledby="faq-h">
        <div className="wrap">
          <SectionHead id="faq-h" kicker="FAQ" title="Common questions" />
          <div className="faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}<span className="pm" aria-hidden="true"><Icon name="plus" size={16} stroke="#0B1530" width={2.6} /></span></summary>
                <div className="a">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
