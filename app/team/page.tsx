import type { Metadata } from 'next';
import Link from 'next/link';
import { Cta, PageHero } from '@/components/Blocks';
import { Arrow } from '@/components/Icon';
import { EmptyState } from '@/components/Motifs';
import { TeamBrowser } from '@/components/Team';
import { sortedMembers } from '@/lib/data';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Our Team', description: 'The students who run the IEEE IES chapter at the Hashemite University.' };

export default function TeamPage() {
  const list = sortedMembers();
  return (
    <>
      <PageHero kicker="Our team" title="Our Team" word="TEAM" lead="The students who run IES HU, term after term." />
      <section className="sec sec-white" aria-labelledby={list.length ? 'committee-h' : 'soon-h'}>
        <div className="wrap">
          {list.length ? (
            <TeamBrowser members={list} currentTerm={SITE.currentTerm} />
          ) : (
            <>
              <h2 id="soon-h" className="sr-only">Committee {SITE.currentTerm}</h2>
              <EmptyState icon="network" title={`Our ${SITE.currentTerm} committee is being announced`}>
                The founding team will be introduced here soon, each member with their own page.
              </EmptyState>
              <div className="btn-row" style={{ marginTop: '1.75rem' }}>
                <Link className="btn btn-dark btn-hard" href="/join">Want to be part of it? Join us <Arrow size={18} /></Link>
              </div>
            </>
          )}
        </div>
      </section>
      <Cta />
    </>
  );
}
