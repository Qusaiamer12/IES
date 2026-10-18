import Link from 'next/link';
import type { ChapterEvent } from '@/lib/data';
import { dayParts, formatDay } from '@/lib/dates';
import { SITE } from '@/lib/site';
import { Arrow, Icon } from './Icon';
import { EmptyState } from './Motifs';

function Placeholder() {
  return (
    <svg viewBox="0 0 400 225" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <polygon points="270,0 400,0 400,225 200,225" fill="#FF6B1A" />
      <polygon points="226,0 246,0 176,225 156,225" fill="#FFC21A" />
      <g stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M0 170 H60 L90 140 H140" />
        <path d="M40 0 V30 L70 60 H120" />
      </g>
      <g fill="#FFFFFF" fillOpacity=".6"><circle cx="140" cy="140" r="5" /><circle cx="120" cy="60" r="5" /></g>
    </svg>
  );
}

export function EventCard({ e, headingLevel = 3 }: { e: ChapterEvent; headingLevel?: 2 | 3 }) {
  const d = dayParts(e.date);
  const H = `h${headingLevel}` as const;
  return (
    <article className="event">
      <div className="ev-img">
        {e.image ? <img src={e.thumb || e.image} alt="" loading="lazy" width={640} height={360} /> : <Placeholder />}
        {e.categoryEn && <span className="tag">{e.categoryEn}</span>}
        {d && <div className="ev-date" aria-hidden="true"><b>{d.day}</b><span>{d.month}</span></div>}
      </div>
      <div className="ev-body">
        <div className="ev-meta">
          <span><Icon name="calendar" size={15} /><time dateTime={e.date}>{formatDay(e.date)}</time></span>
          {e.locationEn && <span><Icon name="pin" size={15} />{e.locationEn}</span>}
        </div>
        <H className="ev-title"><Link href={`/events/${e.slug}`}>{e.titleEn}</Link></H>
        {e.summaryEn && <p>{e.summaryEn}</p>}
        <Link className="textlink" href={`/events/${e.slug}`}>Read more<span className="sr-only"> about {e.titleEn}</span> <Arrow size={18} /></Link>
      </div>
    </article>
  );
}

export function EventsGrid({ list, emptyTitle = 'No events announced yet', headingLevel }: { list: ChapterEvent[]; emptyTitle?: string; headingLevel?: 2 | 3 }) {
  if (!list.length) {
    return (
      <EmptyState icon="calendar" title={emptyTitle}>
        New events appear here as soon as they are announced.
        {SITE.social.instagram && <> Follow <a href={SITE.social.instagram} target="_blank" rel="noopener">{SITE.instagramHandle}</a> on Instagram.</>}
      </EmptyState>
    );
  }
  return <div className="events">{list.map(e => <EventCard key={e.slug} e={e} headingLevel={headingLevel} />)}</div>;
}
