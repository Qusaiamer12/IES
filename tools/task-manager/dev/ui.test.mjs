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
    await p.selectOption('[name="priority"]', 'high');
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
    await p.locator('.card').first().click();
    await p.waitForSelector('.drawer');
    assert.equal(await p.locator('[data-action="delete"]').count(), 0);
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
