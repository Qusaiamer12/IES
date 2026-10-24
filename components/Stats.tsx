'use client';

import { useLayoutEffect, useRef } from 'react';

export type Stat = { value: number; from?: number; suffix?: string; label: string; note: string; hot?: boolean };

const DURATION = 1600;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The home page's stat cards. The final numbers are in the server HTML (for search engines, no-JS and reduced motion);
 * in the browser they reset and count up, and the cards rise in, when the row scrolls into view.
 */
export function Stats({ items, label }: { items: Stat[]; label: string }) {
  const list = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const ul = list.current;
    if (!ul || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const nums = [...ul.querySelectorAll<HTMLElement>('[data-to]')];
    const show = (el: HTMLElement, v: number) => { el.textContent = `${Math.round(v)}${el.dataset.suffix ?? ''}`; };
    nums.forEach(el => show(el, Number(el.dataset.from)));
    ul.classList.add('stats-pre');

    let raf = 0;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      io.disconnect();
      ul.classList.add('stats-in');
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        nums.forEach(el => show(el, Number(el.dataset.from) + (Number(el.dataset.to) - Number(el.dataset.from)) * ease(t)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(ul);
    return () => { io.disconnect(); cancelAnimationFrame(raf); nums.forEach(el => show(el, Number(el.dataset.to))); };
  }, []);

  return (
    <ul className="stats" aria-label={label} ref={list}>
      {items.map(s => (
        <li key={s.label} className={`stat${s.hot ? ' hot' : ''}`}>
          {/* Screen readers get the final number at once; the animated digits are hidden from them. */}
          <b><span aria-hidden="true" data-to={s.value} data-from={s.from ?? 0} data-suffix={s.suffix ?? ''}>{s.value}{s.suffix}</span><span className="sr-only">{s.value}{s.suffix}</span></b>
          <span>{s.label}</span>
          <small>{s.note}</small>
        </li>
      ))}
    </ul>
  );
}
