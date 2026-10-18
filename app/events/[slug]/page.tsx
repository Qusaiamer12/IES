import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cta, PageHero } from '@/components/Blocks';
import { Arrow, Icon } from '@/components/Icon';
import { events, getEvent, todayInAmman } from '@/lib/data';
import { formatDay } from '@/lib/dates';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => events.map(e => ({ slug: e.slug }));
export const revalidate = 3600; // the "to be announced" note turns into a past-event note after the date

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = getEvent((await params).slug);
  if (!e) return {};
  return pageMeta({
    title: e.titleEn,
    description: e.summaryEn ?? `${e.titleEn}, ${formatDay(e.date)}.`,
    path: `/events/${e.slug}`,
    image: e.image,
    type: 'article',
  });
}

export default async function EventPage({ params }: Props) {
  const e = getEvent((await params).slug);
  if (!e) notFound();
  const body = (e.bodyEn ?? []).filter(Boolean);
  const upcoming = e.date >= todayInAmman();
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
            {e.image && <div className="cover"><img src={e.image} alt={e.imageAlt ?? ''} /></div>}
            {e.summaryEn && <p className="article-lead">{e.summaryEn}</p>}
            {body.length ? (
              body.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <>
                <p>{upcoming
                  ? 'Time, venue and the full program will be announced on our Instagram.'
                  : 'Photos and a short write-up from this event are on the way. Our Instagram has the highlights.'}</p>
                {SITE.social.instagram && <div><a className="btn btn-dark btn-hard" href={SITE.social.instagram} target="_blank" rel="noopener"><Icon name="instagram" size={20} /> Follow {SITE.instagramHandle}</a></div>}
              </>
            )}
            {(e.gallery ?? []).length > 1 && (
              <section className="gallery" aria-labelledby="gallery-h">
                <h2 id="gallery-h">Photos</h2>
                <ul>
                  {e.gallery!.map(g => (
                    <li key={g.src}>
                      <a href={g.src} target="_blank" rel="noopener"><img src={g.src} alt={g.alt} loading="lazy" /></a>
                    </li>
                  ))}
                </ul>
              </section>
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
