// End-to-end checks against a running site: every page at phone and desktop width, accessibility (axe),
// broken links and images, layout overflow, the mobile menu, both forms and the form API.
// Usage: start the site with MAIL_DRY_RUN=1 (npm run build && MAIL_DRY_RUN=1 npm start), then npm run test:e2e
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = 'test-results';
mkdirSync(SHOTS, { recursive: true });

const members = JSON.parse(readFileSync(new URL('../data/members.json', import.meta.url)));
const events = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url)));

const ROUTES = [
  ['/', 'Home'],
  ['/chapter', 'The Chapter'],
  ['/team', 'Our Team'],
  ['/events', 'Events'],
  ['/projects', 'Projects'],
  ['/join', null],
  ['/contact', 'Contact'],
  ...events.map(e => [`/events/${e.slug}`, 'Events']),
  ...members.map(m => [`/m/${m.slug}`, 'Our Team']),
];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

const failures = [];
let checks = 0;
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
const ok = (cond, where, msg) => { checks++; if (!cond) fail(where, msg); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const linkStatus = new Map();

async function checkLink(href) {
  if (linkStatus.has(href)) return linkStatus.get(href);
  const res = await fetch(new URL(href, BASE), { redirect: 'manual' });
  linkStatus.set(href, res.status);
  return res.status;
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  for (const [path, navLabel] of ROUTES) {
    const where = `${vp.name} ${path}`;
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    ok(res.status() === 200, where, `status ${res.status()}`);
    await page.evaluate(() => document.fonts.ready);

    ok(errors.length === 0, where, `console errors: ${errors.join(' | ')}`);
    ok(await page.locator('h1').count() === 1, where, 'expected exactly one h1');
    const title = await page.title();
    ok(title && !title.includes('undefined'), where, `bad title "${title}"`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 0, where, `horizontal overflow ${overflow}px`);

    const brokenImgs = await page.$$eval('img', imgs => imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
    // lazy images below the fold may not be loaded yet; scroll to load them, then re-check
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForLoadState('networkidle');
    const stillBroken = await page.$$eval('img', imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
    ok(stillBroken.length === 0, where, `broken images: ${[...brokenImgs, ...stillBroken].join(', ')}`);

    if (navLabel) {
      const current = await page.locator('header nav a[aria-current="page"]').allTextContents();
      ok(current.includes(navLabel), where, `nav marks ${JSON.stringify(current)} instead of ${navLabel}`);
    }

    const hrefs = await page.$$eval('a[href^="/"]', as => [...new Set(as.map(a => a.getAttribute('href')))]);
    for (const h of hrefs) {
      const status = await checkLink(h.split('#')[0]);
      ok(status === 200, where, `internal link ${h} -> ${status}`);
    }
    const blankNoRel = await page.$$eval('a[target="_blank"]', as => as.filter(a => !/noopener/.test(a.rel)).map(a => a.href));
    ok(blankNoRel.length === 0, where, `target=_blank without rel=noopener: ${blankNoRel.join(', ')}`);

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
    for (const v of axe.violations) {
      fail(where, `axe ${v.impact} ${v.id}: ${v.help} (${v.nodes.length}x, e.g. ${v.nodes[0].target.join(' ')})`);
    }
    checks++;

    await page.screenshot({ path: `${SHOTS}/${vp.name}${path.replace(/\//g, '_') || '_home'}.png`, fullPage: true });
    await page.close();
  }

  // 404 page
  {
    const page = await ctx.newPage();
    const res = await page.goto(BASE + '/does-not-exist');
    ok(res.status() === 404, `${vp.name} 404`, `status ${res.status()}`);
    ok(await page.locator('h1', { hasText: 'Page not found' }).count() === 1, `${vp.name} 404`, 'missing 404 heading');
    for (const p of ['/m/nobody', '/events/nothing']) {
      const r = await page.goto(BASE + p);
      ok(r.status() === 404, `${vp.name} ${p}`, `status ${r.status()}`);
    }
    await page.close();
  }

  // Mobile menu and skip link
  if (vp.name === 'phone') {
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    const nav = page.locator('#nav');
    ok(!(await nav.isVisible()), 'phone menu', 'menu visible before opening');
    await page.click('.menu-btn');
    ok(await nav.isVisible(), 'phone menu', 'menu did not open');
    ok((await page.getAttribute('.menu-btn', 'aria-expanded')) === 'true', 'phone menu', 'aria-expanded not true');
    await page.keyboard.press('Escape');
    ok(!(await nav.isVisible()), 'phone menu', 'Escape did not close the menu');
    ok(await page.evaluate(() => document.activeElement?.classList.contains('menu-btn')), 'phone menu', 'focus not returned to the menu button');
    await page.click('.menu-btn');
    await page.click('#nav >> text=Events');
    await page.waitForURL('**/events');
    ok(!(await nav.isVisible()), 'phone menu', 'menu stayed open after navigating');
    await page.goto(BASE + '/');
    await page.keyboard.press('Tab');
    ok((await page.evaluate(() => document.activeElement?.textContent)) === 'Skip to content', 'skip link', 'first Tab does not reach the skip link');
    await page.close();
  }

  // Forms through the browser
  if (vp.name === 'desktop') {
    const page = await ctx.newPage();
    await page.goto(BASE + '/contact');
    await page.click('form button[type="submit"]');
    ok(await page.locator('[aria-invalid="true"]').count() === 3, 'contact form', 'expected 3 invalid fields on empty submit');
    ok(await page.evaluate(() => document.activeElement?.getAttribute('name')) === 'name', 'contact form', 'focus not moved to first invalid field');
    await page.fill('[name=name]', 'Test Person');
    await page.fill('[name=email]', 'test@example.com');
    await page.selectOption('[name=topic]', 'Event collaboration');
    await page.fill('[name=message]', 'Hello, this is an automated test message.');
    await page.click('form button[type="submit"]');
    await page.waitForSelector('.sent', { timeout: 10000 }).catch(() => {});
    ok(await page.locator('.sent h3', { hasText: 'Message sent' }).count() === 1, 'contact form', 'no success message after valid submit');

    await page.goto(BASE + '/contact?topic=partnership');
    ok((await page.inputValue('[name=topic]')) === 'Partnership or sponsorship', 'contact form', 'partnership topic not preselected');

    await page.goto(BASE + '/join');
    await page.click('form button[type="submit"]');
    ok(await page.locator('.field-err').count() === 5, 'join form', `expected 5 errors on empty submit, got ${await page.locator('.field-err').count()}`);
    await page.fill('[name=name]', 'Test Student');
    await page.fill('[name=email]', 'student@example.com');
    await page.fill('[name=phone]', 'abc');
    await page.fill('[name=major]', 'Electrical Engineering');
    await page.selectOption('[name=year]', 'Second year');
    await page.check('input[name=ieeeMember][value="Not sure"]');
    await page.check('input[name=interests][value="Robotics"]');
    await page.click('form button[type="submit"]');
    ok(await page.locator('#f-phone-err').count() === 1, 'join form', 'bad phone not flagged');
    await page.fill('[name=phone]', '+962 79 123 4567');
    await page.click('form button[type="submit"]');
    await page.waitForSelector('.sent', { timeout: 10000 }).catch(() => {});
    ok(await page.locator('.sent h3', { hasText: 'Request received' }).count() === 1, 'join form', 'no success message after valid submit');
    await page.close();
  }
  await ctx.close();
}

// API directly
async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}
{
  const ip = { 'X-Forwarded-For': '203.0.113.7' };
  let r = await post('/api/contact', 'not json', ip);
  ok(r.status === 400, 'api', `invalid JSON -> ${r.status}`);
  r = await fetch(BASE + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
  ok(r.status === 415, 'api', `wrong content type -> ${r.status}`);
  r = await post('/api/contact', { name: 'x'.repeat(20000) }, ip);
  ok(r.status === 413, 'api', `oversized body -> ${r.status}`);
  r = await post('/api/contact', { website: 'spam.example', name: 'Bot' }, ip);
  ok(r.status === 200 && r.body?.ok, 'api', `honeypot -> ${r.status}`);
  r = await post('/api/contact', { name: 'A', email: 'bad', topic: 'Nope', message: 'short' }, { 'X-Forwarded-For': '203.0.113.8' });
  ok(r.status === 400 && Object.keys(r.body?.errors ?? {}).length === 4, 'api', `invalid fields -> ${r.status} ${JSON.stringify(r.body)}`);
  r = await post('/api/join', { name: 'Ali', email: 'a@b.co', major: 'EE', year: 'Graduate', ieeeMember: 'Yes', interests: ['Robotics', 'Hacking'] }, { 'X-Forwarded-For': '203.0.113.9' });
  ok(r.status === 200, 'api', `valid join -> ${r.status} ${JSON.stringify(r.body)}`);
  r = await fetch(BASE + '/api/contact');
  ok(r.status === 405, 'api', `GET -> ${r.status}`);
  const valid = { name: 'Rate Test', email: 'r@example.com', topic: 'General question', message: 'Testing the rate limit.' };
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await post('/api/contact', valid, { 'X-Forwarded-For': '198.51.100.1' })).status);
  ok(statuses.slice(0, 5).every(s => s === 200) && statuses[5] === 429, 'api', `rate limit statuses ${statuses}`);
}

// Redirects and security headers
for (const [from, to] of [['/about', '/chapter'], ['/officers', '/team'], ['/membership', '/join']]) {
  const r = await fetch(BASE + from, { redirect: 'manual' });
  ok(r.status === 308 && r.headers.get('location')?.endsWith(to), 'redirect', `${from} -> ${r.status} ${r.headers.get('location')}`);
}
{
  const r = await fetch(BASE + '/');
  for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy']) ok(r.headers.has(h), 'headers', `missing ${h}`);
  ok(!r.headers.has('x-powered-by'), 'headers', 'x-powered-by is exposed');
}

// Static extras
for (const [p, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml'], ['/opengraph-image', 'image/png'], ['/icon.svg', 'image/svg']]) {
  const r = await fetch(BASE + p);
  ok(r.status === 200 && (r.headers.get('content-type') ?? '').includes(type), 'static', `${p} -> ${r.status} ${r.headers.get('content-type')}`);
}
for (const m of members) {
  const r = await fetch(`${BASE}/m/${m.slug}/contact.vcf`);
  const text = await r.text();
  ok(r.status === 200 && text.startsWith('BEGIN:VCARD') && text.includes(`FN:${m.nameEn}`), 'vcard', `${m.slug}: ${r.status}`);
  ok((r.headers.get('content-type') ?? '').startsWith('text/vcard'), 'vcard', `content-type ${r.headers.get('content-type')}`);
}

await browser.close();
console.log(`${checks} checks, ${failures.length} failures`);
for (const f of failures) console.log(' ✗ ' + f);
process.exit(failures.length ? 1 : 0);
