import type { Metadata } from 'next';
import { Cta, PageHero, SectionHead } from '@/components/Blocks';
import { Edge, EmptyState, Eyebrow } from '@/components/Motifs';
import { FIELDS } from '@/lib/content';

export const metadata: Metadata = { title: 'Projects', description: 'Long-term projects by the IEEE IES chapter at the Hashemite University.' };

export default function ProjectsPage() {
  return (
    <>
      <PageHero kicker="Projects" title="Projects" word="BUILD" lead="Long-term work we design, build and grow, term after term." />
      <section className="sec sec-white" aria-labelledby="pj-h">
        <div className="wrap">
          <SectionHead id="pj-h" kicker="In the making" title="Our first projects are on the bench"
            lead="The founding team is planning the chapter’s first long-term projects. Each one will get its own page here once it launches." />
          <EmptyState icon="chip" title="No projects launched yet">Follow the Events page for the workshops where they start.</EmptyState>
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
