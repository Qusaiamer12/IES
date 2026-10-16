import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cta } from '@/components/Blocks';
import { Arrow, Icon, type IconName } from '@/components/Icon';
import { accentOf, getMember, initials, members, roleOf } from '@/lib/data';
import { SITE } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

// NFC target: /m/<slug> is written to a member’s card and must never change. Unknown slugs fall through to notFound().
export const generateStaticParams = () => members.map(m => ({ slug: m.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = getMember((await params).slug);
  if (!m) return {};
  const title = `${m.nameEn}, ${roleOf(m).label}`;
  return {
    title,
    description: `${m.nameEn} · ${roleOf(m).label} at IEEE IES HU · ${m.specialtyEn}.`,
    openGraph: { title, type: 'profile', images: m.photo ? [{ url: m.photo }] : undefined },
  };
}

const LINKS: Record<string, { label: string; icon: IconName; href: (v: string) => string }> = {
  linkedin: { label: 'LinkedIn', icon: 'linkedin', href: v => v },
  instagram: { label: 'Instagram', icon: 'instagram', href: v => v },
  email: { label: 'Email', icon: 'mail', href: v => `mailto:${v}` },
  phone: { label: 'Phone', icon: 'phone', href: v => `tel:${v.replace(/\s+/g, '')}` },
};
const BADGE_LABELS: Record<string, string> = { workshop: 'Workshop lead', maker: 'Maker' };

export default async function MemberPage({ params }: Props) {
  const m = getMember((await params).slug);
  if (!m) notFound();
  const role = roleOf(m);
  const tags = [m.founding ? 'Founding member' : null, ...(m.badges ?? []).map(b => BADGE_LABELS[b] ?? b)].filter(Boolean) as string[];
  const links = Object.entries(m.links ?? {}).filter((e): e is [string, string] => Boolean(e[1]) && e[0] in LINKS);
  return (
    <>
      <section className="profile" aria-labelledby="m-name" style={{ '--acc': accentOf(m) } as React.CSSProperties}>
        <div className="wrap profile-grid">
          <figure className="pf-photo">
            {m.photo ? <img src={m.photo} alt={`Photo of ${m.nameEn}`} width={380} height={475} /> : <div className="ini" aria-hidden="true">{initials(m.nameEn)}</div>}
          </figure>
          <div className="pf-info">
            <nav className="crumbs-dark" aria-label="Breadcrumb">
              <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/team">Our Team</Link><span aria-hidden="true">/</span><span aria-current="page">{m.nameEn}</span>
            </nav>
            <p className="pf-role"><i aria-hidden="true" />{role.label}<span>· Committee {m.term || SITE.currentTerm}</span></p>
            <h1 id="m-name">{m.nameEn}</h1>
            {m.nameAr && <p className="pf-ar ar" lang="ar">{m.nameAr}</p>}
            <p className="pf-spec">{[m.specialtyEn, m.year].filter(Boolean).join(' · ')}</p>
            {m.motto && <blockquote className="pf-quote">“{m.motto}”</blockquote>}
            {tags.length > 0 && <ul className="pf-tags">{tags.map(t => <li key={t}><Icon name="star" size={16} />{t}</li>)}</ul>}
            <div className="btn-row pf-actions">
              <a className="btn btn-navy" href={`/m/${m.slug}/contact.vcf`} download={`${m.slug}.vcf`}><Icon name="download" size={20} width={2.4} /> Save contact</a>
              <Link className="btn btn-dark" href="/join">Join IES HU <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>
      {(m.bio || (m.highlights ?? []).length > 0) && (
        <section className="sec sec-white pf-about" aria-labelledby="about-h">
          <div className="wrap pf-body">
            <div>
              <h2 id="about-h">About</h2>
              {m.bio ? <p className="pf-bio">{m.bio}</p> : <p className="pf-bio">{m.nameEn} is the {roleOf(m).label} of IES HU.</p>}
            </div>
            {(m.highlights ?? []).length > 0 && (
              <div>
                <h2>Highlights</h2>
                <ul className="pf-highlights">{m.highlights!.map(h => <li key={h}><Icon name="star" size={18} />{h}</li>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}
      <section className="sec sec-white" aria-label="Member details">
        <div className="wrap pf-body">
          <div>
            <h2>Membership</h2>
            <dl className="facts">
              <div><dt>Member ID</dt><dd>{m.memberId}</dd></div>
              {m.ieeeNumber && <div><dt>IEEE number</dt><dd>{m.ieeeNumber}</dd></div>}
              {m.validThru && <div><dt>Valid through</dt><dd>{m.validThru}</dd></div>}
            </dl>
          </div>
          <div>
            <h2>Connect</h2>
            {links.length ? (
              <ul className="links">
                {links.map(([k, v]) => (
                  <li key={k}>
                    <a className="link-row" href={LINKS[k].href(v)} {...(k === 'linkedin' || k === 'instagram' ? { target: '_blank', rel: 'noopener' } : {})}>
                      <Icon name={LINKS[k].icon} />{LINKS[k].label}<span className="v">{v.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Use “Save contact” to keep {m.nameEn.split(' ')[0]}’s details on your phone.</p>
            )}
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}
