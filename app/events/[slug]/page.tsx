import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cta, PageHero } from '@/components/Blocks';
import { Arrow, Icon } from '@/components/Icon';
import { events, getEvent } from '@/lib/data';
import { formatDay } from '@/lib/dates';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => events.map(e => ({ slug: e.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = getEvent((await params).slug);
  if (!e) return {};
  return { title: e.titleEn, description: e.summaryEn ?? `${e.titleEn}, ${formatDay(e.date)}.` };
}

export default async function EventPage({ params }: Props) {
  const e = getEvent((await params).slug);
  if (!e) notFound();
  const body = (e.bodyEn ?? []).filter(Boolean);
  return (
    <>
      <PageHero kicker={e.categoryEn || 'Event'} title={e.titleEn} crumbs={[{ label: 'Events', href: '/events' }, { label: e.titleEn }]}>
        <p className="hero-meta">
          <span><Icon name="calendar" size={16} /><time dateTime={e.date}>{formatDay(e.date)}</time></span>
          {e.locationEn && <span><Icon name="pin" size={16} />{e.locationEn}</span>}
        </p>
      </PageHero>
      <section className="sec sec-white">
        <div className="wrap">
          <article className="article">
            {e.image && <div className="cover"><img src={e.image} alt="" /></div>}
            {e.summaryEn && <p className="article-lead">{e.summaryEn}</p>}
            {body.length ? (
              body.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>Time, venue and the full program will be announced on our Instagram.</p>
                <div><a className="btn btn-dark btn-hard" href={SITE.social.instagram!} target="_blank" rel="noopener"><Icon name="instagram" size={20} /> Follow {SITE.instagramHandle}</a></div>
              </>
            )}
            {e.link && <div><a className="btn btn-gold btn-hard" href={e.link} target="_blank" rel="noopener">Registration &amp; details <Arrow /></a></div>}
            <div><Link className="back-link" href="/events"><Arrow size={18} /> All events</Link></div>
          </article>
        </div>
      </section>
      <Cta />
    </>
  );
}
