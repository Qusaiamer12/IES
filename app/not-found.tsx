import Link from 'next/link';
import { PageHero } from '@/components/Blocks';
import { Arrow } from '@/components/Icon';

export default function NotFound() {
  return (
    <>
      <PageHero kicker="404" title="Page not found" word="404" lead="This link does not lead anywhere on our site. It may have moved, or the address may have a typo." crumbs={[{ label: 'Not found' }]} />
      <section className="sec sec-white">
        <div className="wrap btn-row">
          <Link className="btn btn-gold btn-hard" href="/">Go to the home page <Arrow /></Link>
          <Link className="btn btn-dark" href="/events">See events</Link>
        </div>
      </section>
    </>
  );
}
