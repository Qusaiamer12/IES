'use client';

import Link from 'next/link';
import { useState } from 'react';
import { initials, type Member } from '@/lib/content/model';

export function MemberTile({ m }: { m: Member }) {
  return (
    <Link className="mtile" href={`/m/${m.slug}`} style={{ '--acc': m.accent } as React.CSSProperties}>
      <div className="mt-photo">
        {m.photo ? <img src={m.photo} alt="" loading="lazy" width={400} height={400} /> : <div className="ini" aria-hidden="true">{initials(m.nameEn)}</div>}
      </div>
      <div className="mt-body">
        <span className="mt-role"><i aria-hidden="true" />{m.roleLabel}</span>
        <span className="mt-name">{m.nameEn}</span>
        <span className="mt-spec">{m.specialtyEn}</span>
      </div>
    </Link>
  );
}

/** Committee for a term: the Core Team first, then the Executive Team. Members arrive sorted, newest term first. */
export function TeamBrowser({ members, currentTerm }: { members: Member[]; currentTerm: string }) {
  const terms = [...new Set(members.map(m => m.term))];
  const [term, setTerm] = useState(terms.includes(currentTerm) ? currentTerm : terms[0]);
  const inTerm = members.filter(m => m.term === term);
  const core = inTerm.filter(m => m.core);
  const executive = inTerm.filter(m => !m.core);

  return (
    <>
      <div className="terms">
        <h2 id="committee-h">Committee {term}</h2>
        {terms.length > 1 && (
          <div className="filters" role="group" aria-label="Choose term">
            {terms.map(t => (
              <button key={t} type="button" className="filter" aria-pressed={t === term} onClick={() => setTerm(t)}>{t}</button>
            ))}
          </div>
        )}
      </div>
      {core.length > 0 && (
        <section className="team-group" aria-labelledby="core-h">
          <div className="team-group-head">
            <h3 id="core-h">Core Team</h3>
            <p>Leads the chapter, sets the plan for the year and coordinates the committees.</p>
          </div>
          <div className="team-grid core">{core.map(m => <MemberTile key={m.slug} m={m} />)}</div>
        </section>
      )}
      {executive.length > 0 && (
        <section className="team-group" aria-labelledby="exec-h">
          <div className="team-group-head">
            <h3 id="exec-h">Executive Team</h3>
            <p>Runs membership, public relations, events, social media and design.</p>
          </div>
          <div className="team-grid">{executive.map(m => <MemberTile key={m.slug} m={m} />)}</div>
        </section>
      )}
    </>
  );
}
