// Backend tests: run the real Code.gs against the in-memory Google mock. Run: npm run tasks:test
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { loadApp } from './gas-mock.mjs';

const srcDir = new URL('../src/', import.meta.url);
let app, adminCode, admin;

function codeFromLog() {
  const line = app.ctx.__log.find(l => l.startsWith('Admin sign-in code: '));
  return line.split(': ')[1];
}
const throwsCode = (fn, code) => assert.throws(fn, e => e.message === code || e.message.startsWith(code), `expected ${code}`);

beforeEach(() => {
  app = loadApp({ srcDir });
  app.call('setupFirstAdmin');
  adminCode = codeFromLog();
  const info = app.call('api_publicInfo');
  admin = app.call('api_login', info.members[0].id, adminCode);
});

describe('setup and schema', () => {
  it('creates every tab with its columns and default settings', () => {
    for (const name of ['Tasks', 'Members', 'Comments', 'Activity', 'Settings']) assert.ok(app.ss.getSheetByName(name), name);
    const boot = app.call('api_bootstrap', admin.token);
    assert.deepEqual(boot.statuses, ['todo', 'doing', 'review', 'done']);
    assert.ok(boot.settings.teams.length >= 5);
    assert.equal(boot.me.admin, true);
  });

  it('adds columns missing from an older sheet and keeps columns people added', () => {
    const tasks = app.ss.getSheetByName('Tasks');
    tasks.set(1, 30, 'Our notes'); // a human-added column far to the right
    app.cache.clear();
    const t = app.call('api_saveTask', admin.token, { title: 'Keep my column' });
    const row = tasks.data[1];
    tasks.set(2, 30, 'kept');
    app.call('api_saveTask', admin.token, { id: t.id, status: 'doing' });
    assert.equal(tasks.data[1][29], 'kept');
    assert.ok(row.length > 0);
  });

  it('still works when people reorder the columns in the sheet', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Reordered', priority: 'high' });
    const sh = app.ss.getSheetByName('Tasks');
    sh.data = sh.data.map(r => { const c = r.slice(); [c[1], c[4]] = [c[4], c[1]]; return c; }); // swap Title and Priority
    const again = app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id);
    assert.equal(again.title, 'Reordered');
    assert.equal(again.priority, 'high');
  });
});

describe('sign-in', () => {
  it('rejects a wrong code and locks after five tries', () => {
    const id = admin.me.id;
    for (let i = 0; i < 5; i++) throwsCode(() => app.call('api_login', id, 'WRONG-CODE'), 'BAD_CODE');
    throwsCode(() => app.call('api_login', id, adminCode), 'LOCKED');
  });

  it('accepts codes typed in lower case or without the dash', () => {
    const plain = adminCode.replace('-', '').toLowerCase();
    assert.ok(app.call('api_login', admin.me.id, plain).token);
  });

  it('rejects missing, tampered and expired tokens', () => {
    throwsCode(() => app.call('api_bootstrap', ''), 'AUTH');
    const parts = admin.token.split('|');
    throwsCode(() => app.call('api_bootstrap', [parts[0], parts[1], parts[2], '0'.repeat(64)].join('|')), 'AUTH');
    throwsCode(() => app.call('api_bootstrap', [parts[0], '1', parts[2], parts[3]].join('|')), 'AUTH');
  });

  it('signs a member out everywhere when their code is reset', () => {
    const { member, code } = app.call('api_saveMember', admin.token, { name: 'Lina Omar', email: 'lina@example.com' });
    const lina = app.call('api_login', member.id, code);
    app.call('api_resetCode', admin.token, member.id, false);
    throwsCode(() => app.call('api_bootstrap', lina.token), 'AUTH');
  });

  it('lets a member change their own code', () => {
    const { token } = app.call('api_changeCode', admin.token, adminCode, 'my-new-code-1');
    assert.ok(app.call('api_bootstrap', token).me);
    assert.ok(app.call('api_login', admin.me.id, 'MYNEWCODE1').token);
    throwsCode(() => app.call('api_changeCode', token, 'wrong', 'whatever123'), 'BAD_CODE');
  });

  it('never stores the code itself', () => {
    const flat = JSON.stringify(app.ss.getSheetByName('Members').data);
    assert.ok(!flat.includes(adminCode) && !flat.includes(adminCode.replace('-', '')));
  });
});

describe('members (admin)', () => {
  it('creates members with a code and emails it when asked', () => {
    const r = app.call('api_saveMember', admin.token, { name: 'Omar Ali', email: 'Omar@Example.com', role: 'Events', team: 'Events', sendCode: true });
    assert.match(r.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(r.member.email, 'omar@example.com');
    assert.equal(app.mail.at(-1).to, 'omar@example.com');
    assert.ok(app.mail.at(-1).htmlBody.includes(r.code));
  });

  it('stops non-admins and protects the admin from removing themselves', () => {
    const { member, code } = app.call('api_saveMember', admin.token, { name: 'Sara' });
    const sara = app.call('api_login', member.id, code);
    throwsCode(() => app.call('api_saveMember', sara.token, { name: 'Hacker' }), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveMember', admin.token, { id: admin.me.id, name: 'Me', admin: false }), 'BAD_INPUT:self');
    throwsCode(() => app.call('api_saveMember', admin.token, { name: 'Dup', email: 'x@y.co' }) && app.call('api_saveMember', admin.token, { name: 'Dup2', email: 'X@y.co' }), 'BAD_INPUT:email-taken');
  });

  it('hides other members\' emails from non-admins and drops deactivated members from sign-in', () => {
    const a = app.call('api_saveMember', admin.token, { name: 'Ali', email: 'ali@example.com' });
    const b = app.call('api_saveMember', admin.token, { name: 'Huda', email: 'huda@example.com' });
    const huda = app.call('api_login', b.member.id, b.code);
    const seen = app.call('api_bootstrap', huda.token).members.find(m => m.id === a.member.id);
    assert.equal(seen.email, '');
    app.call('api_saveMember', admin.token, { id: a.member.id, name: 'Ali', active: false });
    assert.ok(!app.call('api_publicInfo').members.some(m => m.id === a.member.id));
  });
});

describe('tasks', () => {
  it('creates, patches and completes a task, recording each change', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Design the IEEE Day poster', team: 'Design', due: '2026-11-20', priority: 'high' });
    assert.equal(t.id, 'T-0001');
    assert.equal(t.status, 'todo');
    const moved = app.call('api_saveTask', admin.token, { id: t.id, status: 'done' });
    assert.ok(moved.completedAt);
    assert.equal(moved.title, 'Design the IEEE Day poster'); // untouched fields stay
    const back = app.call('api_saveTask', admin.token, { id: t.id, status: 'review' });
    assert.equal(back.completedAt, '');
    const detail = app.call('api_taskDetail', admin.token, t.id);
    assert.ok(detail.activity.some(a => a.action === 'created'));
    assert.ok(detail.activity.some(a => a.details.includes('status: todo → done')));
  });

  it('validates input', () => {
    throwsCode(() => app.call('api_saveTask', admin.token, { title: '' }), 'BAD_INPUT:title');
    throwsCode(() => app.call('api_saveTask', admin.token, { title: 'x', status: 'nope' }), 'BAD_INPUT:status');
    throwsCode(() => app.call('api_saveTask', admin.token, { title: 'x', due: '20/11/2026' }), 'BAD_INPUT:due');
    throwsCode(() => app.call('api_saveTask', admin.token, { title: 'x', assignees: ['M-9999'] }), 'BAD_INPUT:assignees');
    throwsCode(() => app.call('api_saveTask', admin.token, { id: 'T-4040', title: 'x' }), 'NOT_FOUND');
  });

  it('keeps edits by two people to different fields (patches, not overwrites)', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Shared' });
    app.call('api_saveTask', admin.token, { id: t.id, due: '2026-12-01' });
    const after = app.call('api_saveTask', admin.token, { id: t.id, priority: 'urgent' });
    assert.equal(after.due, '2026-12-01');
    assert.equal(after.priority, 'urgent');
  });

  it('stores formula-like text as plain text', () => {
    const t = app.call('api_saveTask', admin.token, { title: '=IMPORTXML("http://evil")', description: '+1 call' });
    const again = app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id);
    assert.equal(again.title, '=IMPORTXML("http://evil")');
    assert.equal(again.description, '+1 call');
  });

  it('reads a due date that someone typed into the sheet by hand', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Typed date' });
    const sh = app.ss.getSheetByName('Tasks');
    const col = sh.data[0].indexOf('Due');
    sh.data[1][col] = new Date('2026-11-25T00:00:00+03:00');
    assert.equal(app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id).due, '2026-11-25');
  });

  it('emails new assignees and keeps names readable in the sheet', () => {
    const { member } = app.call('api_saveMember', admin.token, { name: 'Tala Samhan', email: 'tala@example.com' });
    const before = app.mail.length;
    const t = app.call('api_saveTask', admin.token, { title: 'Minutes', assignees: [member.id, admin.me.id] });
    assert.equal(app.mail.length, before + 1);
    assert.equal(app.mail.at(-1).to, 'tala@example.com');
    const sh = app.ss.getSheetByName('Tasks');
    assert.equal(sh.data[1][sh.data[0].indexOf('AssigneeNames')], 'Tala Samhan, Admin');
    app.call('api_saveTask', admin.token, { id: t.id, title: 'Minutes v2' });
    assert.equal(app.mail.length, before + 1); // no new email for unrelated edits
  });

  it('keeps checklists and labels', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Workshop', labels: ['PLC', 'lab'], checklist: [{ t: 'Book lab', d: true }, { t: 'Order kits', d: false }, { t: ' ' }] });
    assert.deepEqual(t.labels, ['PLC', 'lab']);
    assert.deepEqual(t.checklist, [{ t: 'Book lab', d: true }, { t: 'Order kits', d: false }]);
  });

  it('returns only changes since the last sync', () => {
    const a = app.call('api_saveTask', admin.token, { title: 'A' });
    const since = app.call('api_bootstrap', admin.token).serverTime;
    const until = Date.now() + 5; while (Date.now() < until) {} // make the next timestamp later
    app.call('api_saveTask', admin.token, { title: 'B' });
    const ch = app.call('api_changes', admin.token, since);
    assert.deepEqual(ch.tasks.map(t => t.title), ['B']);
    assert.ok(!ch.tasks.some(t => t.id === a.id));
  });

  it('lets only the creator or an admin archive, and only admins delete (with comments)', () => {
    const { member, code } = app.call('api_saveMember', admin.token, { name: 'Raneem' });
    const raneem = app.call('api_login', member.id, code);
    const t = app.call('api_saveTask', admin.token, { title: 'Admin task' });
    throwsCode(() => app.call('api_archiveTask', raneem.token, t.id, true), 'FORBIDDEN');
    app.call('api_addComment', raneem.token, t.id, 'On it');
    assert.equal(app.call('api_archiveTask', admin.token, t.id, true).archived, true);
    assert.ok(!app.call('api_bootstrap', admin.token).tasks.some(x => x.id === t.id));
    throwsCode(() => app.call('api_deleteTask', raneem.token, t.id), 'FORBIDDEN');
    app.call('api_deleteTask', admin.token, t.id);
    assert.equal(app.call('api_taskDetail', admin.token, t.id).comments.length, 0);
  });
});

describe('comments', () => {
  it('adds comments, counts them and notifies the others on the task', () => {
    const { member } = app.call('api_saveMember', admin.token, { name: 'Shahed', email: 'shahed@example.com' });
    const t = app.call('api_saveTask', admin.token, { title: 'Reel', assignees: [member.id] });
    const before = app.mail.length;
    const c = app.call('api_addComment', admin.token, t.id, 'Draft is in the Drive <b>folder</b>');
    assert.equal(c.author, 'Admin');
    assert.equal(app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id).comments, 1);
    assert.equal(app.mail.length, before + 1);
    assert.ok(app.mail.at(-1).htmlBody.includes('&lt;b&gt;folder&lt;/b&gt;'));
    throwsCode(() => app.call('api_addComment', admin.token, t.id, '   '), 'BAD_INPUT:text');
  });
});

describe('settings and reminders', () => {
  it('saves teams and turns the daily reminder on and off', () => {
    const s = app.call('api_saveSettings', admin.token, { teams: ['Core', 'Media', ''], digest: true, digestHour: 9 });
    assert.deepEqual(s.teams, ['Core', 'Media']);
    assert.equal(app.triggers.length, 1);
    assert.equal(app.triggers[0].hour, 9);
    app.call('api_saveSettings', admin.token, { teams: ['Core'], digest: false, digestHour: 9 });
    assert.equal(app.triggers.length, 0);
  });

  it('emails each member only their overdue and soon-due open tasks', () => {
    const { member } = app.call('api_saveMember', admin.token, { name: 'Ahmed', email: 'ahmed@example.com' });
    app.call('api_saveTask', admin.token, { title: 'Late one', due: '2020-01-01', assignees: [member.id] });
    app.call('api_saveTask', admin.token, { title: 'Far away', due: '2099-01-01', assignees: [member.id] });
    app.call('api_saveTask', admin.token, { title: 'Done late', due: '2020-01-01', status: 'done', assignees: [member.id] });
    const before = app.mail.length;
    app.call('dailyDigest');
    const sent = app.mail.slice(before);
    assert.equal(sent.length, 1);
    assert.ok(sent[0].htmlBody.includes('Late one') && !sent[0].htmlBody.includes('Far away') && !sent[0].htmlBody.includes('Done late'));
  });
});

describe('paste-ready build', () => {
  it('dist/ matches src/ (run npm run tasks:build)', async () => {
    const { readFileSync } = await import('node:fs');
    const { build } = await import('../build.mjs');
    for (const [name, text] of Object.entries(build())) {
      assert.equal(readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8'), text, `dist/${name} is out of date: npm run tasks:build`);
    }
  });
});

describe('sheet quirks', () => {
  it('ignores empty rows whose checkboxes read FALSE and writes new rows right under the data', () => {
    const T = app.ss.getSheetByName('Tasks'), M = app.ss.getSheetByName('Members');
    const head = sh => sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const tcol = c => head(T).indexOf(c) + 1, mcol = c => head(M).indexOf(c) + 1;
    // What a sheet with checkbox columns looks like: every empty row holds FALSE in those columns.
    for (let r = 2; r <= 1000; r++) ['Blocked', 'Archived'].forEach(c => T.set(r, tcol(c), false));
    for (let r = M.getLastRow() + 1; r <= 1000; r++) ['Admin', 'Active', 'Notify'].forEach(c => M.set(r, mcol(c), false));
    app.ctx.resetMemo_('Tasks'); app.ctx.resetMemo_('Members');
    const boot = app.call('api_bootstrap', admin.token);
    assert.equal(boot.tasks.length, 0, 'no phantom tasks');
    assert.equal(boot.members.length, 1, 'no phantom members');
    const t = app.call('api_saveTask', admin.token, { title: 'First real task', assignees: [admin.me.id], labels: ['x'], checklist: [{ t: 'step' }] });
    assert.equal(t.id, 'T-0001');
    assert.equal(T.getRange(2, tcol('ID')).getValue(), 'T-0001', 'written on row 2, not after row 1000');
    const m = app.call('api_saveMember', admin.token, { name: 'New Member' });
    assert.equal(M.getRange(3, mcol('Name')).getValue(), 'New Member');
    assert.equal(app.call('api_bootstrap', admin.token).tasks.length, 1);
    assert.ok(m.code);
  });
});

describe('two people editing the same task at once', () => {
  let lina, t;
  beforeEach(() => {
    const r = app.call('api_saveMember', admin.token, { name: 'Lina', admin: true }); // two admins editing the same task
    lina = app.call('api_login', r.member.id, r.code);
    t = app.call('api_saveTask', admin.token, { title: 'Poster', assignees: [admin.me.id], labels: ['design'],
      checklist: [{ t: 'Draft', d: false }, { t: 'Print', d: false }] });
  });
  const get = () => app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id);

  it('merges checklist changes: one ticks an item while the other adds one', () => {
    app.call('api_saveTask', admin.token, { id: t.id, checklist: [{ t: 'Draft', d: true }, { t: 'Print', d: false }], base: { checklist: t.checklist } });
    app.call('api_saveTask', lina.token, { id: t.id, checklist: [...t.checklist, { t: 'Share', d: false }], base: { checklist: t.checklist } });
    assert.deepEqual(get().checklist, [{ t: 'Draft', d: true }, { t: 'Print', d: false }, { t: 'Share', d: false }]);
  });

  it('merges a removed item with a tick on another', () => {
    app.call('api_saveTask', admin.token, { id: t.id, checklist: [{ t: 'Print', d: false }], base: { checklist: t.checklist } });
    app.call('api_saveTask', lina.token, { id: t.id, checklist: [{ t: 'Draft', d: false }, { t: 'Print', d: true }], base: { checklist: t.checklist } });
    assert.deepEqual(get().checklist, [{ t: 'Print', d: true }]);
  });

  it('merges assignees and labels', () => {
    app.call('api_saveTask', admin.token, { id: t.id, assignees: [admin.me.id, lina.me.id], base: { assignees: t.assignees } });
    app.call('api_saveTask', lina.token, { id: t.id, assignees: [], labels: ['design', 'urgent'], base: { assignees: t.assignees, labels: t.labels } });
    assert.deepEqual(get().assignees, [lina.me.id]);
    assert.deepEqual(get().labels, ['design', 'urgent']);
  });

  it('refuses to overwrite a field someone else changed, and accepts it once the editor has seen it', () => {
    app.call('api_saveTask', admin.token, { id: t.id, title: 'Poster v2', base: { title: 'Poster' } });
    throwsCode(() => app.call('api_saveTask', lina.token, { id: t.id, title: 'Poster final', due: '2026-12-01', base: { title: 'Poster', due: '' } }), 'CONFLICT:title');
    assert.equal(get().title, 'Poster v2');
    assert.equal(get().due, '', 'nothing from the refused save is written');
    app.call('api_saveTask', lina.token, { id: t.id, title: 'Poster final', base: { title: 'Poster v2' } });
    assert.equal(get().title, 'Poster final');
  });

  it('does not complain when both made the same change, or when only other fields changed', () => {
    app.call('api_saveTask', admin.token, { id: t.id, status: 'doing', base: { status: 'todo' } });
    app.call('api_saveTask', lina.token, { id: t.id, status: 'doing', base: { status: 'todo' } });
    app.call('api_saveTask', lina.token, { id: t.id, priority: 'high', base: { priority: 'medium' } });
    assert.equal(get().status, 'doing');
    assert.equal(get().priority, 'high');
  });
});

describe('server-side protection', () => {
  it('checks admin rights on the server, not only by hiding buttons', () => {
    const r = app.call('api_saveMember', admin.token, { name: 'Sami' });
    const sami = app.call('api_login', r.member.id, r.code);
    throwsCode(() => app.call('api_saveMember', sami.token, { name: 'Sneaky' }), 'FORBIDDEN');
    throwsCode(() => app.call('api_resetCode', sami.token, admin.me.id, false), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveSettings', sami.token, { teams: ['X'] }), 'FORBIDDEN');
    const tk = app.call('api_saveTask', admin.token, { title: 'Admin task' });
    throwsCode(() => app.call('api_deleteTask', sami.token, tk.id), 'FORBIDDEN');
    throwsCode(() => app.call('api_bootstrap', 'not-a-token'), 'AUTH');
  });

  it('locks a name for 6 hours after 15 wrong codes, even when spread over 15-minute windows', () => {
    const id = admin.me.id;
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 5; i++) throwsCode(() => app.call('api_login', id, 'WRONG1'), 'BAD_CODE');
      throwsCode(() => app.call('api_login', id, adminCode), 'LOCKED');
      app.cache.delete('fail:' + id); // the 15-minute lock expires
    }
    throwsCode(() => app.call('api_login', id, adminCode), 'LOCKED');
    app.cache.delete('fail6h:' + id);
    assert.ok(app.call('api_login', id, adminCode).token);
  });
});

describe('emails', () => {
  it('are branded, in English, escape what people typed, link to the task and include a plain-text copy', () => {
    const r = app.call('api_saveMember', admin.token, { name: 'Rana Odeh', email: 'rana@example.com' });
    app.mail.length = 0;
    const t = app.call('api_saveTask', admin.token, { title: 'Poster <b>v2</b>', description: 'Line 1\nLine 2', priority: 'urgent',
      due: '2026-12-01', team: 'Design', assignees: [r.member.id], checklist: [{ t: 'Draft', d: true }, { t: 'Print', d: false }] });
    const m = app.mail.at(-1);
    assert.equal(m.to, 'rana@example.com');
    assert.equal(m.subject, 'New task: Poster <b>v2</b>');
    assert.ok(m.htmlBody.includes('dir="ltr"') && m.htmlBody.includes('ies-hu-logo.png'), 'logo and left-to-right layout');
    assert.ok(!/background:/.test(m.htmlBody), 'colours use background-color: the shorthand is dropped by some mail apps');
    assert.ok(m.htmlBody.includes('Hi Rana') && m.htmlBody.includes('Urgent') && m.htmlBody.includes('1 December 2026'));
    assert.ok(m.htmlBody.includes('1 of 2 done') && m.htmlBody.includes('Line 1<br>Line 2'));
    assert.ok(m.htmlBody.includes('Poster &lt;b&gt;v2&lt;/b&gt;') && !m.htmlBody.includes('<b>v2</b>'), 'typed HTML is escaped');
    assert.ok(m.htmlBody.includes('/exec#task=' + t.id), 'button opens the task');
    assert.ok(m.body.includes('Poster <b>v2</b>') && !m.body.includes('<td'), 'plain-text copy');
  });

  it('emails you about a task you assigned to yourself, worded for you', () => {
    app.call('api_saveMember', admin.token, { id: admin.me.id, name: admin.me.name, email: 'me@example.com', admin: true, active: true });
    app.mail.length = 0;
    app.call('api_saveTask', admin.token, { title: 'Mine', assignees: [admin.me.id] });
    assert.equal(app.mail.length, 1);
    assert.equal(app.mail[0].to, 'me@example.com');
    assert.ok(app.mail[0].htmlBody.includes('you assigned yourself'));
  });
});

describe('attachments', () => {
  const b64 = s => Buffer.from(s).toString('base64');
  it('saves files to a Drive folder next to the sheet, shares them by link and lists them on the task', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Poster' });
    const a = app.call('api_uploadAttachment', admin.token, t.id, { name: 'poster.png', type: 'image/png', data: b64('PNGDATA') });
    const b = app.call('api_uploadAttachment', admin.token, t.id, { name: 'quote.pdf', type: 'application/pdf', data: b64('%PDF') });
    const file = app.drive.files.get(app.drive.files.size && [...app.drive.files.keys()][0]);
    assert.equal(file.folder.name, 'IES HU Tasks — attachments');
    assert.equal(file.folder.parent, app.sheetFolder, 'folder sits next to the sheet');
    assert.deepEqual(file.sharing, ['ANYONE_WITH_LINK', 'VIEW']);
    assert.equal(Buffer.from(file.bytes.map(x => x & 255)).toString(), 'PNGDATA');
    assert.ok(a.thumb.includes('thumbnail?id=') && !b.thumb, 'images get a thumbnail, other files do not');
    const det = app.call('api_taskDetail', admin.token, t.id);
    assert.deepEqual(det.attachments.map(x => x.name), ['poster.png', 'quote.pdf']);
    assert.equal(det.attachments[0].size, 7);
    assert.equal(app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id).attachments, 2);
    assert.ok(det.activity.some(x => x.action === 'attached' && x.details === 'quote.pdf'));
    app.call('api_uploadAttachment', admin.token, t.id, { name: 'x.txt', type: 'text/plain', data: b64('x') });
    assert.equal(new Set([...app.drive.files.values()].map(f => f.folder.id)).size, 1, 'one folder, reused');
  });

  it('rejects bad, empty and too large files, and unknown tasks', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'T' });
    throwsCode(() => app.call('api_uploadAttachment', admin.token, t.id, { name: 'a', type: 'text/plain', data: '' }), 'BAD_INPUT:file');
    throwsCode(() => app.call('api_uploadAttachment', admin.token, t.id, { name: 'a', type: 'text/plain', data: '***' }), 'BAD_INPUT:file');
    throwsCode(() => app.call('api_uploadAttachment', admin.token, t.id, { name: 'big', type: 'text/plain', data: Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64') }), 'BAD_INPUT:file-size');
    throwsCode(() => app.call('api_uploadAttachment', admin.token, 'T-9999', { name: 'a', type: 'text/plain', data: b64('a') }), 'NOT_FOUND');
    throwsCode(() => app.call('api_uploadAttachment', 'bad-token', t.id, { name: 'a', type: 'text/plain', data: b64('a') }), 'AUTH');
    assert.equal(app.drive.files.size, 0);
  });

  it('cleans file names and stores formula-like names as text', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'T' });
    const a = app.call('api_uploadAttachment', admin.token, t.id, { name: '=HYPERLINK("x")/../a?.png', type: 'weird type', data: b64('a') });
    assert.equal(a.name, '=HYPERLINK(_x_)_.._a_.png');
    assert.equal(a.type, 'application/octet-stream');
    assert.equal(app.call('api_taskDetail', admin.token, t.id).attachments[0].name, a.name);
  });

  it('lets only the uploader or an admin remove a file, and trashes it in Drive', () => {
    const r = app.call('api_saveMember', admin.token, { name: 'Omar' });
    const omar = app.call('api_login', r.member.id, r.code);
    const t = app.call('api_saveTask', admin.token, { title: 'Hall booking' });
    const mine = app.call('api_uploadAttachment', omar.token, t.id, { name: 'form.pdf', type: 'application/pdf', data: b64('1') });
    const adminFile = app.call('api_uploadAttachment', admin.token, t.id, { name: 'admin.pdf', type: 'application/pdf', data: b64('2') });
    throwsCode(() => app.call('api_removeAttachment', omar.token, adminFile.id), 'FORBIDDEN');
    app.call('api_removeAttachment', omar.token, mine.id);
    assert.deepEqual(app.call('api_taskDetail', omar.token, t.id).attachments.map(a => a.name), ['admin.pdf']);
    assert.ok([...app.drive.files.values()].find(f => f.name === 'form.pdf').trashed);
    app.call('api_removeAttachment', admin.token, adminFile.id);
    assert.equal(app.call('api_taskDetail', omar.token, t.id).attachments.length, 0);
  });

  it('trashes a deleted task\'s files too', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Gone' });
    app.call('api_uploadAttachment', admin.token, t.id, { name: 'a.png', type: 'image/png', data: b64('a') });
    app.call('api_deleteTask', admin.token, t.id);
    assert.ok([...app.drive.files.values()].every(f => f.trashed));
    assert.equal(app.ss.getSheetByName('Attachments').getLastRow(), 1);
  });
});

describe('served page', () => {
  it('has no "//" inside code or styles (Google cuts the line there, as if a comment started)', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync(new URL('../dist/Index.html', import.meta.url), 'utf8');
    const parts = [...html.matchAll(/<(script|style)>([\s\S]*?)<\/\1>/g)].map(m => m[2]);
    const bad = [];
    parts.forEach(code => code.split('\n').forEach((line, i) => {
      for (let j = line.indexOf('//'); j >= 0; j = line.indexOf('//', j + 2)) {
        if (j > 0 && !/\s/.test(line[j - 1])) bad.push(`line ${i + 1}: …${line.slice(Math.max(0, j - 30), j + 10)}…`);
      }
    }));
    assert.deepEqual(bad, [], 'only comments may contain //; write URLs and base64 so they do not (see LOGO in Index.html)');
  });
});

describe('admins write tasks, members work on them', () => {
  let rana, t;
  beforeEach(() => {
    const r = app.call('api_saveMember', admin.token, { name: 'Rana' });
    rana = app.call('api_login', r.member.id, r.code);
    t = app.call('api_saveTask', admin.token, { title: 'Book the hall', assignees: [r.member.id], checklist: [{ t: 'Call', d: false }, { t: 'Pay', d: false }] });
  });
  it('lets a member move a task and tick its steps', () => {
    app.call('api_saveTask', rana.token, { id: t.id, status: 'doing', base: { status: 'todo' } });
    app.call('api_saveTask', rana.token, { id: t.id, checklist: [{ t: 'Call', d: true }, { t: 'Pay', d: false }], base: { checklist: t.checklist } });
    const now = app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id);
    assert.equal(now.status, 'doing');
    assert.deepEqual(now.checklist, [{ t: 'Call', d: true }, { t: 'Pay', d: false }]);
  });
  it('refuses everything else from a member, on the server', () => {
    throwsCode(() => app.call('api_saveTask', rana.token, { title: 'My own task' }), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveTask', rana.token, { id: t.id, title: 'Renamed' }), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveTask', rana.token, { id: t.id, assignees: [] }), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveTask', rana.token, { id: t.id, checklist: [{ t: 'Call', d: true }] }), 'FORBIDDEN');
    throwsCode(() => app.call('api_saveTask', rana.token, { id: t.id, checklist: [{ t: 'Call', d: false }, { t: 'Pay', d: false }, { t: 'Extra', d: false }] }), 'FORBIDDEN');
    throwsCode(() => app.call('api_archiveTask', rana.token, t.id, true), 'FORBIDDEN');
    assert.equal(app.call('api_bootstrap', admin.token).tasks.find(x => x.id === t.id).title, 'Book the hall');
  });
  it('still lets a member comment and attach files', () => {
    app.call('api_addComment', rana.token, t.id, 'Called them, waiting for the price');
    app.call('api_uploadAttachment', rana.token, t.id, { name: 'price.pdf', type: 'application/pdf', data: Buffer.from('%PDF').toString('base64') });
    const det = app.call('api_taskDetail', rana.token, t.id);
    assert.equal(det.comments.length, 1);
    assert.equal(det.attachments.length, 1);
  });
});

describe('welcome email', () => {
  it('carries the code and a guide, with an extra part for admins', () => {
    const r = app.call('api_saveMember', admin.token, { name: 'Mona Saleh', email: 'mona@example.com', sendCode: true });
    const m = app.mail.at(-1);
    assert.equal(m.to, 'mona@example.com');
    assert.equal(m.subject, 'Welcome, Mona! Your sign-in code for IES HU Tasks');
    assert.ok(m.htmlBody.includes(r.code) && m.body.includes(r.code));
    assert.ok(m.htmlBody.includes('How tasks work') && !m.htmlBody.includes('As an admin'));
    app.call('api_saveMember', admin.token, { id: r.member.id, name: 'Mona Saleh', email: 'mona@example.com', admin: true, active: true });
    app.call('api_resetCode', admin.token, r.member.id, true);
    assert.ok(app.mail.at(-1).htmlBody.includes('As an admin'));
  });
});

describe('stage emails', () => {
  it('tells the task writer when someone sends it for review or marks it done, not about their own moves', () => {
    app.call('api_saveMember', admin.token, { id: admin.me.id, name: admin.me.name, email: 'chair@example.com', admin: true, active: true });
    const r = app.call('api_saveMember', admin.token, { name: 'Lana', email: 'lana@example.com' });
    const lana = app.call('api_login', r.member.id, r.code);
    const t = app.call('api_saveTask', admin.token, { title: 'Banner', assignees: [r.member.id] });
    app.mail.length = 0;
    app.call('api_saveTask', lana.token, { id: t.id, status: 'doing', base: { status: 'todo' } });
    assert.equal(app.mail.length, 0, 'starting a task sends nothing');
    app.call('api_saveTask', lana.token, { id: t.id, status: 'review', base: { status: 'doing' } });
    assert.equal(app.mail.at(-1).to, 'chair@example.com');
    assert.equal(app.mail.at(-1).subject, 'Ready for review: Banner');
    app.call('api_saveTask', admin.token, { id: t.id, status: 'done', base: { status: 'review' } });
    assert.equal(app.mail.length, 1, 'the writer is not emailed about their own move');
  });
});

describe('projects and the event template', () => {
  it('creates an event with the template tasks, each due relative to the event date', () => {
    const r = app.call('api_saveProject', admin.token, { name: 'IEEE Day 2027', date: '2027-10-20', applyTemplate: true });
    assert.equal(r.project.name, 'IEEE Day 2027');
    assert.ok(r.tasks.length >= 10);
    const hall = r.tasks.find(t => t.title.includes('حجز القاعة'));
    assert.equal(hall.due, '2027-09-29', '21 days before');
    assert.equal(hall.team, 'Events');
    assert.ok(r.tasks.every(t => t.project === r.project.id && t.status === 'todo'));
    const boot = app.call('api_bootstrap', admin.token);
    assert.equal(boot.projects.length, 1);
    assert.equal(boot.tasks.filter(t => t.project === r.project.id).length, r.tasks.length);
  });
  it('uses the template the admins wrote, skips bad lines, and lets tasks join or leave a project', () => {
    app.call('api_saveSettings', admin.token, { teams: ['Design'], digest: false, digestHour: 8, eventTemplate: '-2 | Poster | Design\nnot a line\n+1 | Photos' });
    const r = app.call('api_saveProject', admin.token, { name: 'Workshop', date: '2027-01-10', applyTemplate: true });
    assert.deepEqual(r.tasks.map(t => [t.title, t.due, t.team]), [['Poster', '2027-01-08', 'Design'], ['Photos', '2027-01-11', '']]);
    const t = app.call('api_saveTask', admin.token, { title: 'Loose task' });
    assert.equal(app.call('api_saveTask', admin.token, { id: t.id, project: r.project.id }).project, r.project.id);
    throwsCode(() => app.call('api_saveTask', admin.token, { id: t.id, project: 'P-999' }), 'BAD_INPUT:project');
    assert.equal(app.call('api_saveTask', admin.token, { id: t.id, project: '' }).project, '');
  });
  it('is for admins only', () => {
    const m = app.call('api_saveMember', admin.token, { name: 'Basel' });
    const basel = app.call('api_login', m.member.id, m.code);
    throwsCode(() => app.call('api_saveProject', basel.token, { name: 'Mine' }), 'FORBIDDEN');
    const p = app.call('api_saveProject', admin.token, { name: 'Event' }).project;
    const t = app.call('api_saveTask', admin.token, { title: 'T' });
    throwsCode(() => app.call('api_saveTask', basel.token, { id: t.id, project: p.id }), 'FORBIDDEN');
  });
});

describe('repeating tasks', () => {
  it('makes the next one when a weekly task is done, with steps unticked and the same people', () => {
    const m = app.call('api_saveMember', admin.token, { name: 'Dana' });
    const t = app.call('api_saveTask', admin.token, { title: 'Weekly minutes', due: '2026-11-05', repeat: 'weekly', assignees: [m.member.id], checklist: [{ t: 'Write', d: false }] });
    app.call('api_saveTask', admin.token, { id: t.id, checklist: [{ t: 'Write', d: true }] });
    const done = app.call('api_saveTask', admin.token, { id: t.id, status: 'done' });
    assert.ok(done.spawned);
    assert.equal(done.spawned.due, '2026-11-12');
    assert.equal(done.spawned.status, 'todo');
    assert.deepEqual(done.spawned.checklist, [{ t: 'Write', d: false }]);
    assert.deepEqual(done.spawned.assignees, [m.member.id]);
    assert.equal(done.spawned.repeat, 'weekly');
    const again = app.call('api_saveTask', admin.token, { id: t.id, title: 'Weekly minutes (edited)' });
    assert.equal(again.spawned, null, 'only the move to done repeats');
  });
  it('repeats monthly, keeping the end of the month sane', () => {
    const t = app.call('api_saveTask', admin.token, { title: 'Monthly report', due: '2027-01-31', repeat: 'monthly' });
    assert.equal(app.call('api_saveTask', admin.token, { id: t.id, status: 'done' }).spawned.due, '2027-02-28');
    throwsCode(() => app.call('api_saveTask', admin.token, { title: 'x', repeat: 'daily' }), 'BAD_INPUT:repeat');
  });
});

describe('mentions and the inbox', () => {
  let rami, sara, t;
  beforeEach(() => {
    app.call('api_saveMember', admin.token, { id: admin.me.id, name: admin.me.name, email: 'admin@example.com', admin: true, active: true });
    const a = app.call('api_saveMember', admin.token, { name: 'Rami Khaled', email: 'rami@example.com' });
    const b = app.call('api_saveMember', admin.token, { name: 'Sara Odeh', email: 'sara@example.com' });
    rami = app.call('api_login', a.member.id, a.code); sara = app.call('api_login', b.member.id, b.code);
    t = app.call('api_saveTask', admin.token, { title: 'Stage setup', assignees: [rami.me.id] });
  });
  it('emails whoever is @mentioned, once, even if they are not on the task', () => {
    app.mail.length = 0;
    app.call('api_addComment', rami.token, t.id, 'Need help here @sara, and @Admin please check');
    const to = app.mail.map(m => [m.to, m.subject.split(':')[0]]);
    assert.deepEqual(to.sort(), [['admin@example.com', 'Rami Khaled mentioned you'], ['sara@example.com', 'Rami Khaled mentioned you']]);
  });
  it('lists what others did on my tasks and mentions of me, not my own actions', () => {
    app.call('api_saveTask', rami.token, { id: t.id, status: 'doing', base: { status: 'todo' } });
    app.call('api_addComment', rami.token, t.id, 'Started. @Sara can you bring the cables?');
    app.call('api_addComment', admin.token, t.id, 'Thanks');
    const inboxAdmin = app.call('api_bootstrap', admin.token).inbox;
    assert.deepEqual(inboxAdmin.map(i => i.action).sort(), ['commented', 'updated']);
    assert.ok(inboxAdmin.every(i => i.actor === 'Rami Khaled' && i.title === 'Stage setup'));
    const inboxSara = app.call('api_bootstrap', sara.token).inbox;
    assert.equal(inboxSara.length, 1, 'only the mention: the task is not hers');
    const inboxRami = app.call('api_bootstrap', rami.token).inbox;
    assert.ok(inboxRami.some(i => i.actor === 'Admin' && i.action === 'commented') && !inboxRami.some(i => i.actor === 'Rami Khaled'));
  });
});

describe('calendar feed', () => {
  it('gives each member a private iCal link with their open tasks that have a due date', () => {
    const m = app.call('api_saveMember', admin.token, { name: 'Hiba' });
    const hiba = app.call('api_login', m.member.id, m.code);
    app.call('api_saveTask', admin.token, { title: 'Print, cut; deliver', due: '2026-12-03', assignees: [m.member.id], description: 'Line 1\nLine 2' });
    app.call('api_saveTask', admin.token, { title: 'Not hers', due: '2026-12-04' });
    app.call('api_saveTask', admin.token, { title: 'No date', assignees: [m.member.id] });
    const { url } = app.call('api_feedUrl', hiba.token);
    const token = decodeURIComponent(url.split('feed=')[1]);
    const out = app.ctx.doGet({ parameter: { feed: token } });
    assert.equal(out.mime, 'text/calendar');
    const ics = out.getContent();
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
    assert.ok(ics.includes('DTSTART;VALUE=DATE:20261203') && ics.includes('DTEND;VALUE=DATE:20261204'));
    assert.ok(ics.includes('SUMMARY:Print\\, cut\\; deliver') && ics.includes('Line 1\\nLine 2'));
    const bad = app.ctx.doGet({ parameter: { feed: m.member.id + '.wrong' } }).getContent();
    assert.ok(!bad.includes('BEGIN:VEVENT'), 'a guessed link shows nothing');
  });
});
