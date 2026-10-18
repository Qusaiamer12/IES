'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IEEE_LINKS, JOIN_IEEE_URL, NAV } from '@/lib/site';
import { Arrow, Icon } from './Icon';

const sectionOf = (path: string) => {
  if (path.startsWith('/m/')) return '/team';
  if (path.startsWith('/events/')) return '/events';
  return path;
};

export function Header() {
  const pathname = usePathname() || '/';
  const active = sectionOf(pathname);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    // The menu comes before its button in the page, so send keyboard users into it and keep the page still behind it.
    document.querySelector<HTMLElement>('#nav a')?.focus();
    const root = document.documentElement, prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { root.style.overflow = prev; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const current = (href: string) => (active === href ? { 'aria-current': 'page' as const } : {});

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <nav className="ieee-bar" aria-label="IEEE sites">
        <div className="wrap">
          <ul>
            {IEEE_LINKS.map((l, i) => (
              <li key={l.href} className={i > 1 ? 'opt' : undefined}>
                <a href={l.href} target="_blank" rel="noopener">{l.label}</a>
              </li>
            ))}
            <li><a href={JOIN_IEEE_URL} target="_blank" rel="noopener">Join IEEE</a></li>
          </ul>
          <span className="mark" aria-hidden="true">IEEE</span>
        </div>
      </nav>
      <header className="top">
        <div className="wrap top-in">
          <Link className="brand" href="/" aria-label="IEEE IES Hashemite University Student Chapter, home">
            <img src="/images/ies-hu-logo.png" alt="" width={93} height={52} />
            <span className="brand-txt">HASHEMITE<br />UNIVERSITY</span>
          </Link>
          <nav className={`nav${open ? ' open' : ''}`} id="nav" aria-label="Main" onClick={e => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
            {NAV.map(n => (
              <Link key={n.href} href={n.href} {...current(n.href)}>{n.label}</Link>
            ))}
            <Link href="/join" className="nav-join" {...current('/join')}>Join Us</Link>
          </nav>
          <Link className="btn btn-gold top-cta" href="/join" {...current('/join')}>Join Us <Arrow size={18} /></Link>
          <button ref={btn} type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}>
            <Icon name={open ? 'close' : 'menu'} width={2.4} />
          </button>
        </div>
      </header>
    </>
  );
}
