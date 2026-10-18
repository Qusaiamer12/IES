import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { PageHero } from '@/components/Blocks';
import { ContactForm } from '@/components/Forms';
import { Icon } from '@/components/Icon';
import { SITE } from '@/lib/site';

export const metadata: Metadata = pageMeta({ title: 'Contact', description: 'Contact the IEEE IES chapter at the Hashemite University: questions, ideas and partnerships.', path: '/contact' });

export default function ContactPage() {
  return (
    <>
      <PageHero kicker="Contact" title="Contact" word="HELLO" lead="Questions, ideas and partnerships. We would like to hear from you." />
      <section className="sec sec-white" aria-labelledby="cf-h">
        <div className="wrap split">
          <div className="panel">
            <h2 id="cf-h" className="panel-title">Send us a message</h2>
            <ContactForm />
          </div>
          <div className="info-list">
            <div>
              <span className="ic"><Icon name="pin" size={20} /></span>
              <div>
                <h3>Where to find us</h3>
                <address>{SITE.address.map((l, i) => <span key={l}>{l}{i < SITE.address.length - 1 && <br />}</span>)}</address>
                <a href={SITE.mapsUrl} target="_blank" rel="noopener">Open in Maps <Icon name="external" size={16} /></a>
              </div>
            </div>
            {SITE.email && (
              <div><span className="ic"><Icon name="mail" size={20} /></span><div><h3>Email</h3><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div></div>
            )}
            {SITE.social.instagram && (
              <div><span className="ic"><Icon name="instagram" size={20} /></span><div><h3>Instagram</h3><a href={SITE.social.instagram} target="_blank" rel="noopener">{SITE.instagramHandle} <Icon name="external" size={16} /></a></div></div>
            )}
            <div><span className="ic"><Icon name="flag" size={20} /></span><div><h3>Partnerships</h3><p>A company or organization that wants to support a workshop or an industry visit? Choose “Partnership or sponsorship” in the form.</p></div></div>
          </div>
        </div>
      </section>
    </>
  );
}
