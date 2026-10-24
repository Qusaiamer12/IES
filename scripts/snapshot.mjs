// Builds a single-file HTML preview of the running site: every page's server-rendered HTML,
// the real CSS and fonts, and all images inlined, with a tiny hash router in place of Next.js.
// Usage: npm run build && npm start (in another terminal), then: node scripts/snapshot.mjs [out-dir]
// Writes <out-dir>/ies-hu-preview.html (standalone) and <out-dir>/ies-hu-preview.body.html (no <html>/<head>).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.argv[2] || 'preview';
mkdirSync(OUT, { recursive: true });

const members = JSON.parse(readFileSync(new URL('../content/people.json', import.meta.url)));
const events = JSON.parse(readFileSync(new URL('../content/events.json', import.meta.url)));

// route -> page id used in the URL hash (letters, digits and hyphens only)
const ROUTES = [
  ['/', 'home'], ['/chapter', 'chapter'], ['/team', 'team'], ['/events', 'events'],
  ['/projects', 'projects'], ['/join', 'join'], ['/contact', 'contact'],
  ...events.map(e => [`/events/${e.slug}`, `e-${e.slug}`]),
  ...members.map(m => [`/m/${m.slug}`, `m-${m.slug}`]),
];
const idOf = Object.fromEntries(ROUTES);

const cache = new Map();
async function dataUri(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  const type = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0];
  const uri = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  cache.set(path, uri);
  return uri;
}
const text = async path => {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.text();
};
const between = (s, start, end) => {
  const a = s.indexOf(start);
  const b = s.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`markers not found: ${start} … ${end}`);
  return s.slice(a, b + end.length);
};

async function inlineAssets(html) {
  // images and the vCard downloads
  for (const m of [...html.matchAll(/(src|href)="(\/(?:images|members|events)\/[^"]+\.(?:jpe?g|png|webp|svg)|\/m\/[a-z0-9-]+\/contact\.vcf)"/g)]) {
    html = html.replaceAll(`${m[1]}="${m[2]}"`, `${m[1]}="${await dataUri(m[2])}"`);
  }
  // internal links -> hash routes
  html = html.replace(/href="(\/[^"#?]*)(\?[^"]*)?"/g, (all, path) => {
    const clean = path.replace(/\/$/, '') || '/';
    return idOf[clean] ? `href="#${idOf[clean]}"` : all;
  });
  return html.replace(/<script[\s\S]*?<\/script>/g, '');
}

const home = await text('/');
const htmlClass = /<html[^>]*class="([^"]+)"/.exec(home)[1];
const cssLinks = [...home.matchAll(/<link rel="stylesheet" href="([^"]+\.css)"/g)].map(m => m[1]);
let css = '';
for (const href of cssLinks) css += await text(href);
for (const m of [...css.matchAll(/url\((\/_next\/static\/media\/[^)]+)\)/g)]) css = css.replaceAll(m[1], await dataUri(m[1]));

const chrome = await inlineAssets(between(home, '<a class="skip"', '</header>'));
const footer = await inlineAssets(between(home, '<footer', '</footer>'));

const pages = [];
for (const [route, id] of ROUTES) {
  const html = route === '/' ? home : await text(route);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? 'IEEE IES HU';
  const main = between(html, '<main', '</main>');
  const inner = main.slice(main.indexOf('>') + 1, -'</main>'.length);
  pages.push(`<div class="pv-page" data-page="${id}" data-title="${title.replace(/"/g, '&quot;')}" hidden>${await inlineAssets(inner)}</div>`);
}

const script = `<script>
(() => {
  document.documentElement.classList.add(...${JSON.stringify(htmlClass.split(/\s+/))});
  const pages = [...document.querySelectorAll('.pv-page')];
  const ids = new Set(pages.map(p => p.dataset.page));
  const section = id => id.startsWith('m-') ? 'team' : id.startsWith('e-') ? 'events' : id;
  const nav = document.getElementById('nav'), menuBtn = document.querySelector('.menu-btn');
  function show() {
    const id = location.hash.slice(1);
    if (id && !ids.has(id)) return;
    const page = id || 'home';
    pages.forEach(p => { p.hidden = p.dataset.page !== page; });
    document.title = pages.find(p => p.dataset.page === page).dataset.title;
    document.querySelectorAll('header a[href^="#"]').forEach(a => {
      if (a.getAttribute('href') === '#' + section(page)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', show);
  show();
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); } });
  document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); document.getElementById('main').focus(); });
  // team role filters
  document.querySelectorAll('[aria-label="Filter by role"] .filter').forEach(btn => btn.addEventListener('click', () => {
    const group = btn.parentElement, label = btn.textContent.trim();
    group.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    group.parentElement.querySelectorAll('.mtile').forEach(t => {
      t.hidden = label !== 'All' && t.querySelector('.mt-role').textContent.trim() !== label;
    });
  }));
  // forms send email only on the live site
  document.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const status = f.querySelector('.form-status');
    if (status) status.textContent = 'Preview only: this form sends email on the live site.';
  }));
})();
</script>`;

const body = `<title>IEEE IES HU</title>
<style>${css}
.mtile[hidden]{display:none}</style>
${chrome}
<main id="main" tabindex="-1">${pages.join('\n')}</main>
${footer}
${script}`;

writeFileSync(join(OUT, 'ies-hu-preview.body.html'), body);
writeFileSync(join(OUT, 'ies-hu-preview.html'), `<!doctype html>
<html lang="en" class="${htmlClass}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0B1530"></head>
<body>
${body}
</body>
</html>
`);
console.log(`${pages.length} pages, ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB -> ${join(OUT, 'ies-hu-preview.html')}`);
