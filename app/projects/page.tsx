import type { Metadata } from 'next';
import Link from 'next/link';
import { Cta, PageHero, SectionHead } from '@/components/Blocks';
import { Arrow, Icon } from '@/components/Icon';
import { Edge, Eyebrow } from '@/components/Motifs';
import { FIELDS } from '@/lib/content';

export const metadata: Metadata = { title: 'Projects', description: 'Long-term projects by the IEEE IES chapter at the Hashemite University.' };

export default function ProjectsPage() {
  return (
    <>
      <PageHero kicker="Projects" title="Projects" word="BUILD" lead="Long-term work we design, build and grow, term after term." />
      <section className="sec sec-white" aria-labelledby="pj-h">
        <div className="wrap">
          <SectionHead id="pj-h" kicker="What we built" title="Projects from the bench"
            lead="Things the chapter designs and builds. Our first long-term projects are being planned and will join this page once they launch." />
          <article className="proj" aria-labelledby="pid-h">
            <a className="proj-img" href="/projects/pid-duel" tabIndex={-1} aria-hidden="true">
              <img src="/projects/pid-duel.jpg" alt="" width={1280} height={720} loading="lazy" />
              <span className="tag">IEEE Jordan Day 2026</span>
            </a>
            <div className="proj-body">
              <div className="ev-meta"><span><Icon name="chip" size={15} />Game · Control engineering</span></div>
              <h3 id="pid-h" className="proj-title">PID Duel</h3>
              <p>A two-player control-engineering duel we built for our booth at IEEE Jordan Day 2026. Each player tunes Kp, Ki and Kd,
                then the same disturbances hit both systems for 12 seconds. The steadiest controller wins.</p>
              <ul className="proj-facts">
                <li><b>3</b><span>systems: pendulum on a cart, drone, robot arm</span></li>
                <li><b>12 s</b><span>rounds, 2 players or vs the computer</span></li>
                <li><b>100</b><span>points: survival, accuracy, smoothness</span></li>
              </ul>
              <p className="proj-note">Real physics at 2 ms steps, with sensor noise and motor saturation. The game is in Arabic and runs in the browser, best on a laptop or a big screen.</p>
              <div className="btn-row">
                <a className="btn btn-gold btn-hard" href="/projects/pid-duel">Play PID Duel <Arrow size={18} /></a>
                <Link className="btn btn-dark" href="/events/jordan-ieee-day-2026">The event</Link>
              </div>
            </div>
          </article>
        </div>
      </section>
      <section className="sec sec-navy" aria-labelledby="pa-h">
        <div className="wrap split">
          <div className="prose">
            <Eyebrow>Where we build</Eyebrow>
            <h2 id="pa-h">The areas our projects come from</h2>
            <p>Every IES HU project sits inside the society’s field of interest.</p>
          </div>
          <ul className="chips">{FIELDS.map(f => <li key={f} className="chip"><i />{f}</li>)}</ul>
        </div>
        <Edge />
      </section>
      <Cta title="Got a project idea?" text="Members can pitch a project to the committee. Tell us what you want to build." />
    </>
  );
}
