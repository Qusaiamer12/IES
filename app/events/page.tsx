import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { Cta, PageHero, SectionHead } from '@/components/Blocks';
import { EventsGrid } from '@/components/Events';
import { splitEvents } from '@/lib/content';

export const revalidate = 3600;
export const metadata: Metadata = pageMeta({ title: 'Events', description: 'Workshops, visits and IEEE days by the IEEE IES chapter at the Hashemite University.', path: '/events' });

export default function EventsPage() {
  const { upcoming, past } = splitEvents();
  return (
    <>
      <PageHero kicker="Events" title="Events" word="EVENTS" lead="Workshops, visits and IEEE days. Every activity gets its own page, so the work stays on record." />
      <section className="sec sec-white" aria-labelledby="up-h">
        <div className="wrap">
          <SectionHead id="up-h" kicker="Upcoming" title="Coming up" />
          <EventsGrid list={upcoming} />
        </div>
      </section>
      {past.length > 0 && (
        <section className="sec sec-paper" aria-labelledby="past-h">
          <div className="wrap">
            <SectionHead id="past-h" kicker="Archive" title="Past events" />
            <EventsGrid list={past} />
          </div>
        </section>
      )}
      <Cta />
    </>
  );
}
