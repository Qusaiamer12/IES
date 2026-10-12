'use client';

import Link from 'next/link';
import { useState } from 'react';
import { accentOf, initials, ROLE_ORDER, ROLES, roleOf, type Member, type RoleKey } from '@/lib/data';

export function MemberTile({ m }: { m: Member }) {
  return (
    <Link className="mtile" href={`/m/${m.slug}`} style={{ '--acc': accentOf(m) } as React.CSSProperties}>
      <div className="mt-photo">
        {m.photo ? <img src={m.photo} alt="" loading="lazy" width={400} height={400} /> : <div className="ini" aria-hidden="true">{initials(m.nameEn)}</div>}
      </div>
      <div className="mt-body">
        <span className="mt-role"><i aria-hidden="true" />{roleOf(m).label}</span>
        <span className="mt-name">{m.nameEn}</span>
        <span className="mt-spec">{m.specialtyEn}</span>
      </div>
    </Link>
  );
}

/** Committee grid with term and role filters. Members arrive already sorted. */
export function TeamBrowser({ members, currentTerm }: { members: Member[]; currentTerm: string }) {
  const termOf = (m: Member) => m.term || currentTerm;
  const terms = [...new Set(members.map(termOf))].sort().reverse();
  const [term, setTerm] = useState(terms[0] ?? currentTerm);
  const [role, setRole] = useState<RoleKey | 'all'>('all');
  const inTerm = members.filter(m => termOf(m) === term);
  const roles = ROLE_ORDER.filter(r => inTerm.some(m => m.role === r));
  const list = inTerm.filter(m => role === 'all' || m.role === role);

  return (
    <>
      <div className="terms">
        <h2 id="committee-h">Committee {term}</h2>
        {terms.length > 1 && (
          <div className="filters" role="group" aria-label="Choose term">
            {terms.map(t => (
              <button key={t} type="button" className="filter" aria-pressed={t === term} onClick={() => { setTerm(t); setRole('all'); }}>{t}</button>
            ))}
          </div>
        )}
      </div>
      {roles.length > 1 && (
        <div className="filters" role="group" aria-label="Filter by role" style={{ marginBottom: 36 }}>
          <button type="button" className="filter" aria-pressed={role === 'all'} onClick={() => setRole('all')}>All</button>
          {roles.map(r => (
            <button key={r} type="button" className="filter" aria-pressed={role === r} onClick={() => setRole(r)} style={{ '--acc': ROLES[r].accent } as React.CSSProperties}>
              <i aria-hidden="true" />{ROLES[r].label}
            </button>
          ))}
        </div>
      )}
      <div className="team-grid" aria-live="polite">{list.map(m => <MemberTile key={m.slug} m={m} />)}</div>
    </>
  );
}
