// End-to-end tests of the task manager UI in a real browser, against the real Code.gs on the Google mock.
// Run: npm run tasks:test
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { chromium } from 'playwright';
import { startDevServer } from './server.mjs';

let dev, browser;
const PORT = 4311;

before(async () => {
  dev = startDevServer({ port: PORT, seed: true });
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  dev?.server.close();
});

async function page({ width = 1440, height = 900, lang } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } }); // axe needs pages from a context
  const p = await ctx.newPage();
  p.on('close', () => ctx.close().catch(() => {}));
  p.errors = [];
  p.on('pageerror', e => p.errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') p.errors.push(m.text()); });
  if (lang) await p.addInitScript(l => localStorage.setItem('ies-tasks-lang', l), lang);
  await p.goto(dev.url, { waitUntil: 'networkidle' });
  return p;
}

async function signIn(p, name = 'Admin', code = dev.adminCode) {
  await p.selectOption('#login-who', { label: name });
  await p.fill('#login-code', code);
  await p.click('#login-form [type=submit]');
  await p.waitForSelector('.topbar');
}

const column = (p, status) => p.locator(`.col[data-status="${status}"]`);

describe('task manager UI', () => {
  it('rejects a wrong code and signs in with the right one', async () => {
    const p = await page();
    await p.selectOption('#login-who', { label: 'Admin' });
    await p.fill('#login-code', 'WRONG-CODE');
    await p.click('#login-form [type=submit]');
    await p.waitForFunction(() => document.querySelector('#login-error').textContent.trim().length > 0);
    await p.fill('#login-code', dev.adminCode.toLowerCase());
    await p.click('#login-form [type=submit]');
    await p.waitForSelector('.board');
    assert.equal(await column(p, 'todo').locator('.card').count(), 2);
    assert.deepEqual(p.errors, []);
    await p.close();
  });

  it('creates a task with priority, assignee, due date and checklist', async () => {
    const p = await page();
    await signIn(p);
    await p.click('.top-actions [data-action="new"]');
    await p.fill('#d-title', 'Print the NFC cards');
    await p.click('[data-action="d-prio"][data-v="high"]');
    await p.fill('[name="due"]', '2026-12-01');
    await p.click('.person:has-text("Tala Samhan")');
    await p.fill('#cl-new', 'Collect photos');
    await p.press('#cl-new', 'Enter');
    await p.fill('#cl-new', 'Send to printer');
    await p.press('#cl-new', 'Enter');
    await p.click('[data-action="save-task"]');
    await p.waitForSelector('.drawer', { state: 'detached' });
    const card = column(p, 'todo').locator('.card', { hasText: 'Print the NFC cards' });
    await card.waitFor();
    assert.match(await card.textContent(), /0\/2/);
    const sheet = dev.app.ss.getSheetByName('Tasks');
    const row = sheet.data.find(r => r.includes('Print the NFC cards'));
    assert.ok(row.includes('Tala Samhan') && row.includes('2026-12-01') && row.includes('high'));
    await p.close();
  });

  it('moves a task by dragging it to another column and by editing its status', async () => {
    const p = await page();
    await signIn(p);
    const card = column(p, 'todo').locator('.card', { hasText: 'Write the meeting minutes' });
    await card.dragTo(column(p, 'doing'));
    await column(p, 'doing').locator('.card', { hasText: 'Write the meeting minutes' }).waitFor();
    await p.waitForTimeout(300);
    await column(p, 'doing').locator('.card', { hasText: 'Write the meeting minutes' }).click();
    await p.click('[data-action="d-status"][data-v="done"]');
    await p.click('[data-action="save-task"]');
    await column(p, 'done').locator('.card', { hasText: 'Write the meeting minutes' }).waitFor();
    const t = dev.app.call('api_bootstrap', dev.app.call('api_login', 'M-0001', dev.adminCode).token).tasks.find(x => x.title === 'Write the meeting minutes');
    assert.equal(t.status, 'done');
    assert.ok(t.completedAt);
    await p.close();
  });

  it('posts a comment and shows the history', async () => {
    const p = await page();
    await signIn(p);
    await p.locator('.card', { hasText: 'Plan the industry visit' }).click();
    await p.waitForSelector('#c-new');
    await p.fill('#c-new', 'Called the factory, waiting for a date.');
    await p.click('[data-action="post-comment"]');
    await p.locator('.comment', { hasText: 'Called the factory' }).waitFor();
    assert.ok(await p.locator('.activity li').count() >= 1);
    await p.keyboard.press('Escape');
    await p.waitForSelector('.drawer', { state: 'detached' });
    assert.match(await p.locator('.card', { hasText: 'Plan the industry visit' }).textContent(), /1/);
    await p.close();
  });

  it('warns before closing a task with unsaved changes', async () => {
    const p = await page();
    await signIn(p);
    await p.locator('.card', { hasText: 'Book the hall' }).click();
    await p.fill('[name="description"]', 'Room E-201, 20 seats');
    await p.click('.drawer-head [data-action="close-drawer"]');
    await p.waitForSelector('.modal');
    await p.click('.modal [data-action="close-modal"]');
    assert.equal(await p.locator('.drawer').count(), 1);
    await p.close();
  });

  it('filters, lists, groups my tasks, shows the calendar and the dashboard', async () => {
    const p = await page();
    await signIn(p);
    await p.fill('.search', 'poster');
    await p.waitForFunction(() => document.querySelectorAll('.card').length === 1);
    await p.click('[data-action="view"][data-view="list"]');
    await p.waitForSelector('table');
    assert.ok(await p.locator('tbody tr').count() >= 1);
    await p.fill('.search', '');
    await p.waitForFunction(() => document.querySelectorAll('tbody tr').length >= 4);
    await p.click('[data-action="view"][data-view="mine"]');
    await p.waitForSelector('.page-title');
    await p.click('[data-action="view"][data-view="calendar"]');
    await p.waitForSelector('.cal');
    assert.ok(await p.locator('.day button').count() >= 1);
    await p.click('[data-action="view"][data-view="dashboard"]');
    await p.waitForSelector('.kpis');
    assert.ok(Number(await p.locator('.kpi b').first().textContent()) >= 3);
    assert.deepEqual(p.errors, []);
    await p.close();
  });

  it('lets an admin add a member, see their code once, reset it and save settings', async () => {
    const p = await page();
    await signIn(p);
    await p.click('[data-action="view"][data-view="team"]');
    await p.click('.panel [data-action="member"]:not([data-id])');
    await p.fill('#member-form [name="name"]', 'Lina Omar');
    await p.fill('#member-form [name="email"]', 'lina@example.com');
    await p.click('#member-form [type=submit]');
    await p.waitForSelector('#code-box');
    const code = (await p.textContent('#code-box')).trim();
    assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await p.click('.modal [data-action="close-modal"]');
    await p.locator('tr', { hasText: 'Lina Omar' }).locator('[data-action="reset-code"]').click();
    await p.click('#confirm-yes');
    await p.waitForSelector('#code-box');
    assert.notEqual((await p.textContent('#code-box')).trim(), code);
    await p.click('.modal [data-action="close-modal"]');
    await p.fill('#settings-form [name="teams"]', 'Core Team\nEvents\nMedia');
    await p.check('#settings-form [name="digest"]');
    await p.click('#settings-form [type=submit]');
    await p.waitForFunction(() => document.querySelector('#toast').textContent.length > 0);
    assert.equal(dev.app.triggers.length, 1);
    await p.close();
  });

  it('hides admin tools from regular members', async () => {
    const p = await page();
    await signIn(p, 'Hala Rawashdeh', dev.codes['Hala Rawashdeh']);
    assert.equal(await p.locator('[data-view="team"]').count(), 0);
    assert.equal(await p.locator('[data-action="new"]').count(), 0, 'members do not write tasks');
    await p.locator('.card').first().click();
    await p.waitForSelector('.drawer');
    assert.equal(await p.locator('[data-action="delete"]').count(), 0);
    assert.equal(await p.locator('#d-title').count(), 0, 'no edit form for members');
    await p.close();
  });

  it('switches to English (left to right) and keeps the session after reload', async () => {
    const p = await page();
    await signIn(p);
    await p.click('[data-action="menu"]');
    await p.click('.menu [data-action="lang"]');
    await p.waitForFunction(() => document.documentElement.dir === 'ltr');
    assert.match(await p.textContent('.tabs'), /Board/);
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForSelector('.board');
    assert.equal(await p.evaluate(() => document.documentElement.lang), 'en');
    await p.click('[data-action="menu"]');
    await p.click('.menu [data-action="signout"]');
    await p.waitForSelector('#login-form');
    await p.close();
  });

  it('fits a phone screen', async () => {
    const p = await page({ width: 390, height: 844 });
    await signIn(p);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    await p.locator('.card').first().click();
    const w = await p.locator('.drawer').evaluate(el => el.getBoundingClientRect().width);
    assert.equal(Math.round(w), 390);
    await p.close();
  });

  it('has no serious accessibility problems on sign-in, board and task', async () => {
    const p = await page();
    const check = async where => {
      const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      assert.deepEqual(bad.map(v => `${where}: ${v.id} (${v.nodes.length})`), []);
    };
    await check('sign-in');
    await signIn(p);
    await check('board');
    await p.locator('.card').first().click();
    await p.waitForSelector('.drawer');
    await check('task');
    await p.close();
  });
});

describe('team scenarios', () => {
  const token = () => dev.app.call('api_login', 'M-0001', dev.adminCode).token;
  const ammanDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(d);
  const plusDays = (day, n) => { const x = new Date(day + 'T12:00:00+03:00'); x.setUTCDate(x.getUTCDate() + n); return x; };

  it('counts "done in the last 7 days" as today and the 6 days before it, in Amman time', async () => {
    dev.app.call('api_saveTask', token(), { title: 'Finished for the KPI test', status: 'done' });
    const today = ammanDate(new Date());
    const doneKpi = async at => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      await p.clock.setFixedTime(at);
      await p.addInitScript(() => localStorage.setItem('ies-tasks-lang', 'en'));
      await p.goto(dev.url, { waitUntil: 'networkidle' });
      await signIn(p);
      await p.click('[data-action="view"][data-view="dashboard"]');
      const n = Number(await p.locator('.kpi', { hasText: 'Done in the last 7 days' }).locator('b').textContent());
      await ctx.close();
      return n;
    };
    assert.ok(await doneKpi(plusDays(today, 6)) >= 1, 'still counted 6 days later');
    assert.equal(await doneKpi(plusDays(today, 7)), 0, 'not counted 7 days later (that would be 8 calendar days)');
  });

  it('tells the second editor when someone else changed the same field, without losing either edit', async () => {
    const t = dev.app.call('api_saveTask', token(), { title: 'Order the banners' });
    const second = dev.app.call('api_saveMember', token(), { name: 'Second Admin', admin: true });
    const a = await page(), b = await page();
    await signIn(a); await signIn(b, 'Second Admin', second.code);
    await a.locator('.card', { hasText: 'Order the banners' }).click();
    await b.locator('.card', { hasText: 'Order the banners' }).click();
    await a.fill('#d-title', 'Order the banners (3 sizes)');
    await a.click('[data-action="save-task"]');
    await a.waitForSelector('.drawer', { state: 'detached' });
    await b.fill('#d-title', 'Order the banners by Sunday');
    await b.click('[data-action="save-task"]');
    await b.waitForFunction(() => document.querySelector('#toast').textContent.includes('عضو ثاني'));
    assert.equal(await b.locator('#d-title').inputValue(), 'Order the banners by Sunday', 'B keeps what they typed');
    const now = () => dev.app.call('api_bootstrap', token()).tasks.find(x => x.id === t.id);
    assert.equal(now().title, 'Order the banners (3 sizes)', "A's save was not overwritten");
    await b.click('[data-action="save-task"]');
    await b.waitForSelector('.drawer', { state: 'detached' });
    assert.equal(now().title, 'Order the banners by Sunday', 'saving again keeps B, knowingly');
    assert.deepEqual(a.errors.concat(b.errors), []);
    await a.close(); await b.close();
  });

  it('works end to end on a phone: create, assign, sync to a teammate, move, comment, archive, with emails', async () => {
    const mailsBefore = dev.app.mail.length;
    const p = await page({ width: 390, height: 844 });
    const hala = await page();
    await signIn(p);
    await signIn(hala, 'Hala Rawashdeh', dev.codes['Hala Rawashdeh']);
    await p.click('.top-actions [data-action="new"]');
    await p.fill('#d-title', 'Design the workshop certificate');
    await p.click('.person:has-text("Hala Rawashdeh")');
    await p.click('[data-action="save-task"]');
    await p.waitForSelector('.drawer', { state: 'detached' });
    const assigned = dev.app.mail.slice(mailsBefore).find(m => m.to === 'hala@example.com');
    assert.ok(assigned && /Design the workshop certificate/.test(assigned.subject), 'Hala is emailed about the assignment');

    await hala.click('[data-action="sync"]');
    await hala.locator('.card', { hasText: 'Design the workshop certificate' }).waitFor();

    // One tap moves it on; on a phone the board shows one status at a time, with tabs.
    await p.locator('.card', { hasText: 'Design the workshop certificate' }).locator('[data-action="advance"]').click();
    await p.waitForFunction(() => document.querySelector('#toast').textContent.includes('قيد التنفيذ'));
    await p.click('[data-action="board-tab"][data-s="doing"]');
    const moved = p.locator('.col.on .card', { hasText: 'Design the workshop certificate' });
    await moved.waitFor();
    await p.waitForTimeout(300);
    assert.equal(dev.app.call('api_bootstrap', token()).tasks.find(x => x.title === 'Design the workshop certificate').status, 'doing');
    await moved.click();
    await p.waitForSelector('#c-new');
    await p.fill('#c-new', 'Use the new logo please');
    await p.click('[data-action="post-comment"]');
    await p.locator('.comment', { hasText: 'Use the new logo' }).waitFor();
    assert.ok(dev.app.mail.slice(mailsBefore).some(m => m.to === 'hala@example.com' && /commented/.test(m.subject)), 'Hala is emailed about the comment');

    await p.click('[data-action="archive"]');
    await p.click('#confirm-yes');
    await p.waitForSelector('.drawer', { state: 'detached' });
    assert.equal(await p.locator('.card', { hasText: 'Design the workshop certificate' }).count(), 0);
    await hala.click('[data-action="sync"]');
    await hala.waitForFunction(() => ![...document.querySelectorAll('.card')].some(c => c.textContent.includes('Design the workshop certificate')));
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    assert.deepEqual(p.errors.concat(hala.errors), []);
    await p.close(); await hala.close();
  });
});

describe('easier everyday use', () => {
  const token = () => dev.app.call('api_login', 'M-0001', dev.adminCode).token;
  const realErrors = p => p.errors.filter(e => !/Failed to load resource|ERR_|net::/.test(e));

  it('attaches files and photos to a task, shows them, counts them on the card and removes them', async () => {
    dev.app.call('api_saveTask', token(), { title: 'Collect sponsor quotes' });
    const p = await page();
    await signIn(p, 'Tala Samhan', dev.codes['Tala Samhan']);
    await p.click('[data-action="view"][data-view="board"]');
    await p.locator('.card', { hasText: 'Collect sponsor quotes' }).locator('.card-title').click();
    await p.setInputFiles('#file-in', [
      { name: 'quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') },
      { name: 'stage.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') },
    ]);
    await p.locator('.file-row:not(.busy)', { hasText: 'quote.pdf' }).waitFor();
    await p.locator('.thumb', { hasText: 'stage.png' }).waitFor();
    const t = dev.app.call('api_bootstrap', token()).tasks.find(x => x.title === 'Collect sponsor quotes');
    assert.equal(t.attachments, 2);
    await p.keyboard.press('Escape');
    await p.waitForSelector('.drawer', { state: 'detached' });
    assert.match(await p.locator('.card', { hasText: 'Collect sponsor quotes' }).textContent(), /2/);
    await p.locator('.card', { hasText: 'Collect sponsor quotes' }).locator('.card-title').click();
    await p.locator('.file-row', { hasText: 'quote.pdf' }).locator('[data-action="attach-remove"]').click();
    await p.click('#confirm-yes');
    await p.waitForFunction(() => !document.querySelector('#attach').textContent.includes('quote.pdf'));
    assert.equal(dev.app.call('api_taskDetail', token(), t.id).attachments.length, 1);
    assert.deepEqual(realErrors(p), []);
    await p.close();
  });

  it('makes a new task quick: my team by default, date and priority in one tap, steps and files kept without pressing Enter', async () => {
    dev.app.call('api_saveMember', token(), { id: 'M-0001', name: 'Admin', team: 'Core Team', admin: true, active: true });
    const p = await page({ width: 390, height: 844 });
    await signIn(p);
    await p.locator('.tip[role="note"]').waitFor();
    await p.click('[data-action="tip-ok"]');
    assert.equal(await p.locator('.tip[role="note"]').count(), 0);
    await p.click('.top-actions [data-action="new"]');
    await p.fill('#d-title', 'Prepare the welcome slides');
    assert.match(await p.locator('.people .person').first().textContent(), /Admin/, 'me first');
    await p.click('[data-action="d-due"]:has-text("بكرة")');
    await p.click('[data-action="d-prio"][data-v="urgent"]');
    await p.fill('#cl-new', 'Ask Noor for the agenda');
    await p.setInputFiles('#file-in', { name: 'agenda.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('doc') });
    await p.locator('.file-row', { hasText: 'agenda.docx' }).waitFor();
    await p.click('[data-action="save-task"]');
    await p.waitForSelector('.drawer', { state: 'detached' });
    await p.waitForFunction(() => document.querySelector('#toast').textContent.length > 0);
    await p.waitForTimeout(800);
    const t = dev.app.call('api_bootstrap', token()).tasks.find(x => x.title === 'Prepare the welcome slides');
    const tomorrow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Amman' })); tomorrow.setDate(tomorrow.getDate() + 1);
    assert.equal(t.due, new Intl.DateTimeFormat('en-CA').format(tomorrow));
    assert.equal(t.priority, 'urgent');
    assert.equal(t.team, 'Core Team');
    assert.deepEqual(t.checklist, [{ t: 'Ask Noor for the agenda', d: false }]);
    assert.equal(t.attachments, 1, 'the file chosen before saving was uploaded after');
    assert.deepEqual(realErrors(p), []);
    await p.close();
  });

  it('moves a task through every stage with one tap each', async () => {
    dev.app.call('api_saveTask', token(), { title: 'Print the badges' });
    const p = await page();
    await signIn(p);
    for (const [from, to] of [['todo', 'doing'], ['doing', 'review'], ['review', 'done']]) {
      await column(p, from).locator('.card', { hasText: 'Print the badges' }).locator('[data-action="advance"]').click();
      await column(p, to).locator('.card', { hasText: 'Print the badges' }).waitFor();
      await p.waitForTimeout(200);
    }
    assert.equal(await column(p, 'done').locator('.card', { hasText: 'Print the badges' }).locator('[data-action="advance"]').count(), 0);
    const t = dev.app.call('api_bootstrap', token()).tasks.find(x => x.title === 'Print the badges');
    assert.equal(t.status, 'done');
    assert.ok(t.completedAt);
    await p.close();
  });
});

describe('email notifications', () => {
  it('shows when my notifications are off and turns them back on in one tap', async () => {
    const r = dev.app.call('api_login', 'M-0001', dev.adminCode);
    const tala = dev.app.call('api_publicInfo').members.find(m => m.name === 'Tala Samhan');
    const p = await page();
    await signIn(p, 'Tala Samhan', dev.codes['Tala Samhan']);
    assert.equal(await p.locator('.tip', { hasText: '✉️' }).count(), 0, 'no banner while notifications are on');
    const tk = dev.app.call('api_login', tala.id, dev.codes['Tala Samhan']).token;
    dev.app.call('api_setNotify', tk, false);
    await p.click('[data-action="sync"]');
    const banner = p.locator('.tip', { hasText: '✉️' });
    await banner.waitFor();
    await banner.locator('[data-action="notify"]').click();
    await p.waitForFunction(() => document.querySelector('#toast').textContent.includes('tala@example.com'));
    await banner.waitFor({ state: 'detached' });
    assert.equal(dev.app.call('api_bootstrap', tk).me.notify, true);
    assert.ok(r.token);
    await p.close();
  });
});

describe('members read tasks and work on them', () => {
  const token = () => dev.app.call('api_login', 'M-0001', dev.adminCode).token;
  it('opens a readable task with one big button for the next stage and steps to tick', async () => {
    const hala = dev.app.call('api_publicInfo').members.find(m => m.name === 'Hala Rawashdeh');
    const t = dev.app.call('api_saveTask', token(), { title: 'Design the event banner', description: 'Size 2x1 m. Brief: https://example.com/brief',
      priority: 'high', due: '2026-12-01', team: 'Design', assignees: [hala.id], checklist: [{ t: 'Sketch', d: false }, { t: 'Final file', d: false }] });
    const p = await page({ width: 390, height: 844 });
    await signIn(p, 'Hala Rawashdeh', dev.codes['Hala Rawashdeh']);
    await p.locator('.card', { hasText: 'Design the event banner' }).locator('.card-title').click();
    await p.waitForSelector('#v-title');
    assert.equal(await p.locator('#v-title').textContent(), 'Design the event banner');
    assert.equal(await p.locator('.view-desc a[href="https://example.com/brief"]').count(), 1, 'links in the description open');
    assert.match(await p.locator('.facts').textContent(), /Hala Rawashdeh/);
    await p.click('.next-btn');
    await p.waitForFunction(() => document.querySelector('.view-chips').textContent.includes('قيد التنفيذ'));
    await p.click('.v-step:has-text("Sketch")');
    await p.waitForFunction(() => document.querySelector('.view-sec h3') && [...document.querySelectorAll('.view-sec h3')].some(h => h.textContent.includes('1 من 2')));
    await p.waitForTimeout(300);
    const now = dev.app.call('api_bootstrap', token()).tasks.find(x => x.id === t.id);
    assert.equal(now.status, 'doing');
    assert.deepEqual(now.checklist, [{ t: 'Sketch', d: true }, { t: 'Final file', d: false }]);
    assert.match(await p.locator('.next-btn').textContent(), /سلّمها للمراجعة/);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false);
    assert.deepEqual(p.errors, []);
    await p.close();
  });

  it('has no serious accessibility problems in the read view', async () => {
    const p = await page();
    await signIn(p, 'Hala Rawashdeh', dev.codes['Hala Rawashdeh']);
    await p.locator('.card .card-title').first().click();
    await p.waitForSelector('#v-title');
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = r.violations.filter(v => ['serious', 'critical'].includes(v.impact));
    assert.deepEqual(serious.map(v => v.id + ': ' + v.nodes.map(n => n.target.join(' ')).join(', ')), []);
    await p.close();
  });
});

describe('phone', () => {
  const token = () => dev.app.call('api_login', 'M-0001', dev.adminCode).token;
  const phone = () => page({ width: 390, height: 844 });
  it('opens members on My tasks, keeps fields at 16px and buttons finger-sized', async () => {
    const p = await phone();
    await signIn(p, 'Hala Rawashdeh', dev.codes['Hala Rawashdeh']);
    assert.equal(await p.locator('[data-action="view"][data-view="mine"]').getAttribute('aria-current'), 'page');
    const r = await p.evaluate(() => ({
      small: [...document.querySelectorAll('.adv, .tab, .icon-btn')].filter(e => e.getBoundingClientRect().height && e.getBoundingClientRect().height < 36).length,
      fonts: [...document.querySelectorAll('input, select, textarea')].filter(e => e.getBoundingClientRect().height && parseFloat(getComputedStyle(e).fontSize) < 16).length,
    }));
    assert.deepEqual(r, { small: 0, fonts: 0 });
    await p.close();
  });
  it('shows the list as cards and the calendar as dots with the day\'s tasks below', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(new Date());
    dev.app.call('api_saveTask', token(), { title: 'Due today on the calendar', due: today });
    const p = await phone();
    await signIn(p);
    await p.click('[data-action="view"][data-view="list"]');
    assert.equal(await p.locator('.table-wrap thead').isVisible(), false);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await p.click('[data-action="view"][data-view="calendar"]');
    await p.locator('.agenda .card', { hasText: 'Due today on the calendar' }).waitFor();
    assert.ok(await p.locator('.day.today .dots i').count() >= 1);
    await p.close();
  });
  it('lets you undo a move', async () => {
    dev.app.call('api_saveTask', token(), { title: 'Undo me' });
    const p = await page();
    await signIn(p);
    await column(p, 'todo').locator('.card', { hasText: 'Undo me' }).locator('[data-action="advance"]').click();
    await p.click('#toast [data-action="undo"]');
    await column(p, 'todo').locator('.card', { hasText: 'Undo me' }).waitFor();
    await p.waitForTimeout(400);
    assert.equal(dev.app.call('api_bootstrap', token()).tasks.find(x => x.title === 'Undo me').status, 'todo');
    await p.close();
  });
});
