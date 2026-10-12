import type { Metadata } from 'next';
import { Cta, PageHero, SectionHead } from '@/components/Blocks';
import { Edge, Eyebrow } from '@/components/Motifs';
import { FIELDS, PUBLICATIONS, SOURCES, TIMELINE } from '@/lib/content';

export const metadata: Metadata = {
  title: 'The Chapter',
  description: 'IES HU is the IEEE Industrial Electronics Society student chapter at the Hashemite University, founded in 2026, the society’s 75th year.',
};

export default function ChapterPage() {
  return (
    <>
      <PageHero kicker="The chapter" title="The IES HU Chapter" word="IES"
        lead="An IEEE Industrial Electronics Society student chapter at the Hashemite University, founded in the society’s 75th year." />

      <section className="sec sec-white" aria-labelledby="who-h">
        <div className="wrap split">
          <div className="prose">
            <Eyebrow>Who we are</Eyebrow>
            <h2 id="who-h">A chapter for students who build things</h2>
            <p>IES HU is the IEEE Industrial Electronics Society chapter in the IEEE Hashemite University Student Branch. 2026/2027 is our founding term.</p>
            <p>We bring together students interested in automation, robotics, power electronics and embedded systems, and we learn the way industry works: by designing, wiring, programming and testing real things.</p>
          </div>
          <div className="panel">
            <h3>Field of interest</h3>
            <ul className="chips">{FIELDS.map(f => <li key={f} className="chip"><i />{f}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="sec sec-navy" aria-labelledby="ies-h">
        <div className="wrap">
          <SectionHead id="ies-h" kicker="The society" title="What is IEEE IES?"
            lead="An IEEE technical society for the theory and application of electronics, control, communications, instrumentation and computational intelligence in industrial and manufacturing systems." />
          <ul className="facts4">
            <li><b>1951</b><span>First meeting of the IRE Industrial Electronics Group</span></li>
            <li><b>1953</b><span>First volume of its Transactions</span></li>
            <li><b>1975</b><span>First IECON, held in Philadelphia</span></li>
            <li><b>100+</b><span>Countries with IES members (2021)</span></li>
          </ul>
        </div>
      </section>

      <section className="sec sec-navy sec-flush" aria-labelledby="pub-h">
        <div className="wrap">
          <SectionHead id="pub-h" kicker="Publications" title="Where industrial electronics gets published" />
          <ul className="pubs">
            {PUBLICATIONS.map(p => (
              <li key={p.name} className="pub"><span className="k"><span>{p.kind}</span><span>Since {p.since}</span></span><h3>{p.name}</h3></li>
            ))}
          </ul>
          <p className="src">
            Flagship conference: IECON, first held in 1975. Sources:{' '}
            {SOURCES.map((s, i) => <span key={s.href}>{i > 0 && ', '}<a href={s.href} target="_blank" rel="noopener">{s.label}</a></span>)}
          </p>
        </div>
        <Edge />
      </section>

      <section className="sec sec-white" aria-labelledby="hist-h">
        <div className="wrap split">
          <div className="prose">
            <Eyebrow>Our story</Eyebrow>
            <h2 id="hist-h">From 1951 to Zarqa</h2>
            <p>Our chapter joins a story that is 75 years long, and a student branch that has been active at the Hashemite University since 2002.</p>
          </div>
          <ol className="timeline">
            {TIMELINE.map(t => (
              <li key={t.year} className={`tl${'now' in t ? ' now' : ''}`}><b>{t.year}</b><h3>{t.title}</h3><p>{t.text}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec sec-paper" aria-labelledby="bel-h">
        <div className="wrap">
          <SectionHead id="bel-h" kicker="Where we belong" title="Part of something much bigger" />
          <ul className="chain">
            <li><a className="link-node" href="https://www.ieee.org/" target="_blank" rel="noopener"><span className="lg"><span className="word">IEEE</span></span><b>IEEE</b><small>Global organization</small></a></li>
            <li><a className="link-node" href="https://www.ieee-ies.org/" target="_blank" rel="noopener"><span className="lg"><span className="word">IES</span></span><b>Industrial Electronics Society</b><small>Technical society</small></a></li>
            <li><a className="link-node" href="https://edu.ieee.org/jo-hu/" target="_blank" rel="noopener"><span className="lg"><img className="round" src="/images/ieee-hu-branch-logo.png" alt="" width={56} height={56} loading="lazy" /></span><b>IEEE HU Student Branch</b><small>Since 2002</small></a></li>
            <li><a className="link-node" href="https://hu.edu.jo/" target="_blank" rel="noopener"><span className="lg"><img className="round" src="/images/hu-logo.png" alt="" width={56} height={56} loading="lazy" /></span><b>The Hashemite University</b><small>Zarqa, Jordan</small></a></li>
            <li><div className="link-node us"><span className="lg"><img src="/images/ies-hu-logo.jpg" alt="" width={96} height={56} loading="lazy" /></span><b>IES HU Chapter</b><small>Est. 2026</small></div></li>
          </ul>
        </div>
      </section>
      <Cta />
    </>
  );
}
