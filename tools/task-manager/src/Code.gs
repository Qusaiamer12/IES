/**
 * IES HU Tasks — the team's task manager. Google Apps Script backend; all data lives in the Google Sheet CONFIG.SHEET_ID.
 *
 * How it fits together
 *   - doGet() serves Index.html (the whole UI). The UI calls the api_* functions below with google.script.run.
 *   - Every api_* function except login takes the session token first and checks it (withUser_).
 *   - The spreadsheet is the database: one tab per table (SCHEMA). Columns are found by their header name, so people may
 *     reorder columns or add their own; missing columns are added automatically (ensureSchema_).
 *   - Writes run under a script lock, so two people saving at the same moment cannot overwrite each other's rows.
 *   - Tasks are updated with patches (only the fields that changed), so two people editing different fields both win.
 *
 * Deployed as a web app that runs as the account that deployed it, open to anyone with the link; members sign in with
 * a personal code that an admin gives them (no Google sign-in or permission screens for members).
 */

// ------------------------------------------------------------------------------------------------ data model

const SCHEMA = {
  Tasks: ['ID', 'Title', 'Description', 'Status', 'Priority', 'Team', 'Assignees', 'AssigneeNames', 'Due', 'Labels',
    'Checklist', 'Blocked', 'CreatedBy', 'CreatedAt', 'UpdatedAt', 'CompletedAt', 'Archived'],
  Members: ['ID', 'Name', 'Email', 'Role', 'Team', 'Admin', 'Active', 'Notify', 'CodeSalt', 'CodeHash', 'CreatedAt'],
  Comments: ['ID', 'TaskID', 'AuthorID', 'AuthorName', 'Text', 'CreatedAt'],
  Activity: ['Time', 'ActorID', 'ActorName', 'TaskID', 'Action', 'Details'],
  Settings: ['Key', 'Value', 'Notes'],
  Attachments: ['ID', 'TaskID', 'Name', 'Type', 'Size', 'FileID', 'Url', 'UploaderID', 'UploaderName', 'CreatedAt'],
};
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // per file; bigger files go to Drive by hand and their link in the description
const BOOL_COLUMNS = ['Blocked', 'Archived', 'Admin', 'Active', 'Notify'];
const STATUSES = ['todo', 'doing', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DEFAULT_SETTINGS = [
  ['teams', 'Core Team, Membership, Public Relations, Events, Social Media, Design', 'Comma-separated list shown in the app'],
  ['digest', false, 'TRUE: email each member their due and overdue tasks every morning'],
  ['digestHour', 8, 'Hour of the daily reminder (0-23, in the time zone of Config.gs)'],
];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

// ------------------------------------------------------------------------------------------------ web app

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setFaviconUrl(CONFIG.FAVICON_URL);
}

// ------------------------------------------------------------------------------------------------ public API

/** Before sign-in: the app name and who can sign in (names only). */
function api_publicInfo() {
  return {
    appName: CONFIG.APP_NAME,
    members: table_('Members').items
      .filter(m => bool_(m.Active) && m.CodeHash)
      .map(m => ({ id: m.ID, name: m.Name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Wrong codes lock a name: 5 in a row lock it for 15 minutes, 15 within 6 hours lock it for 6 hours. The counters are
 * read and written under the script lock, so attempts sent in parallel can't slip past them.
 */
function api_login(memberId, code) {
  const id = str_(memberId).slice(0, 20);
  return withLock_(() => {
    const cache = CacheService.getScriptCache();
    const shortKey = 'fail:' + id, longKey = 'fail6h:' + id;
    const fails = Number(cache.get(shortKey) || 0), daily = Number(cache.get(longKey) || 0);
    if (fails >= 5 || daily >= 15) throw new Error('LOCKED');
    const m = table_('Members').items.find(x => x.ID === id && bool_(x.Active));
    if (!m || !m.CodeHash || codeHash_(m.CodeSalt, code) !== m.CodeHash) {
      cache.put(shortKey, String(fails + 1), 900);
      cache.put(longKey, String(daily + 1), 21600);
      throw new Error('BAD_CODE');
    }
    cache.remove(shortKey); cache.remove(longKey);
    return { token: makeToken_(m), me: memberView_(m, m) };
  });
}

/** Everything the app needs after sign-in. */
function api_bootstrap(token) {
  return withUser_(token, me => ({
    me: memberView_(me, me),
    members: membersFor_(me),
    tasks: tasksView_(),
    settings: settingsView_(),
    statuses: STATUSES,
    priorities: PRIORITIES,
    serverTime: iso_(),
  }));
}

/** Tasks changed since `since` (an ISO time from an earlier call), plus the current member list. */
function api_changes(token, since) {
  return withUser_(token, me => ({
    tasks: tasksView_().filter(t => !since || t.updatedAt > since),
    archivedIds: table_('Tasks').items.filter(t => bool_(t.Archived) && (!since || t.UpdatedAt > since)).map(t => t.ID),
    members: membersFor_(me),
    serverTime: iso_(),
  }));
}

/** Creates a task (no id) or updates the given fields of one (with id). Returns the saved task. */
function api_saveTask(token, patch) {
  return withUser_(token, me => withLock_(() => {
    const T = table_('Tasks', true);
    const now = iso_();
    const existing = patch && patch.id ? T.items.find(t => t.ID === patch.id) : null;
    if (patch && patch.id && !existing) throw new Error('NOT_FOUND');
    if (!bool_(me.Admin)) checkMemberPatch_(patch || {}, existing);
    if (existing && patch.base) patch = rebasePatch_(patch, taskView_(existing));
    const fields = cleanTaskPatch_(patch || {}, !existing);
    const rec = existing ? Object.assign({}, existing) : {
      ID: nextId_(T.items, 'T-'), Status: 'todo', Priority: 'medium', Blocked: false, Archived: false,
      CreatedBy: me.ID, CreatedAt: now,
    };
    const before = existing ? taskView_(existing) : null;
    Object.keys(fields).forEach(k => { rec[k] = fields[k]; });
    if (fields.Assignees !== undefined) rec.AssigneeNames = namesOf_(fields.Assignees).join(', ');
    if (fields.Status !== undefined) {
      if (fields.Status === 'done' && (!before || before.status !== 'done')) rec.CompletedAt = now;
      if (fields.Status !== 'done') rec.CompletedAt = '';
    }
    rec.UpdatedAt = now;
    writeRecord_('Tasks', rec, existing);
    const after = taskView_(rec);
    logTaskChanges_(me, before, after);
    notifyAssigned_(me, before, after);
    return Object.assign(after, { comments: commentCount_(after.id), attachments: table_('Attachments').items.filter(a => a.TaskID === after.id).length });
  }));
}

/** Archive (or restore) a task. The creator or an admin. */
function api_archiveTask(token, id, archived) {
  return withUser_(token, me => withLock_(() => {
    const t = table_('Tasks', true).items.find(x => x.ID === id);
    if (!t) throw new Error('NOT_FOUND');
    if (!bool_(me.Admin) && t.CreatedBy !== me.ID) throw new Error('FORBIDDEN');
    const rec = Object.assign({}, t, { Archived: !!archived, UpdatedAt: iso_() });
    writeRecord_('Tasks', rec, t);
    log_(me, id, archived ? 'archived' : 'restored', '');
    return taskView_(rec);
  }));
}

/** Delete a task and its comments for good. Admins only; archiving is the normal way to remove a task. */
function api_deleteTask(token, id) {
  return withUser_(token, me => withLock_(() => {
    requireAdmin_(me);
    const T = table_('Tasks', true);
    const t = T.items.find(x => x.ID === id);
    if (!t) throw new Error('NOT_FOUND');
    T.sh.deleteRow(t._row);
    const C = table_('Comments', true);
    C.items.filter(c => c.TaskID === id).map(c => c._row).sort((a, b) => b - a).forEach(r => C.sh.deleteRow(r));
    const A = table_('Attachments', true);
    A.items.filter(a => a.TaskID === id).sort((a, b) => b._row - a._row).forEach(a => { trashFile_(a.FileID); A.sh.deleteRow(a._row); });
    resetMemo_('Tasks'); resetMemo_('Comments'); resetMemo_('Attachments');
    log_(me, id, 'deleted', t.Title);
    return { id: id };
  }));
}

/** Comments and history of one task. */
function api_taskDetail(token, id) {
  return withUser_(token, () => ({
    comments: table_('Comments').items.filter(c => c.TaskID === id).map(commentView_)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    activity: table_('Activity').items.filter(a => a.TaskID === id)
      .map(a => ({ time: a.Time, actor: a.ActorName, action: a.Action, details: a.Details }))
      .sort((a, b) => b.time.localeCompare(a.time)).slice(0, 60),
    attachments: table_('Attachments').items.filter(a => a.TaskID === id).map(attachmentView_)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));
}

// ------------------------------------------------------------------------------------------------ attachments

/**
 * Saves a file (sent from the browser as base64) to the attachments folder in Drive and lists it on the task.
 * `file`: { name, type, data }. Files are viewable by anyone with the link; the links are only shown inside the app.
 */
function api_uploadAttachment(token, taskId, file) {
  return withUser_(token, me => {
    const task = table_('Tasks').items.find(x => x.ID === taskId);
    if (!task) throw new Error('NOT_FOUND');
    const name = str_(file && file.name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 150) || 'file';
    const type = /^[\w.+-]+\/[\w.+-]+$/.test(str_(file && file.type)) ? str_(file.type) : 'application/octet-stream';
    const data = str_(file && file.data);
    if (!data || data.length > Math.ceil(MAX_UPLOAD_BYTES / 3) * 4 + 4) throw new Error(data ? 'BAD_INPUT:file-size' : 'BAD_INPUT:file');
    let bytes;
    try { bytes = Utilities.base64Decode(data); } catch (e) { throw new Error('BAD_INPUT:file'); }
    if (!bytes.length) throw new Error('BAD_INPUT:file');
    if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('BAD_INPUT:file-size');
    // The Drive upload is the slow part: do it before taking the lock, then record it under the lock.
    const df = attachmentsFolder_().createFile(Utilities.newBlob(bytes, type, name));
    df.setDescription(`${taskId} · ${task.Title} · ${me.Name}`);
    try { df.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { console.warn('could not share', e); }
    return withLock_(() => {
      const A = table_('Attachments', true);
      const a = { ID: nextId_(A.items, 'A-'), TaskID: taskId, Name: name, Type: type, Size: bytes.length, FileID: df.getId(),
        Url: df.getUrl(), UploaderID: me.ID, UploaderName: me.Name, CreatedAt: iso_() };
      writeRecord_('Attachments', a, null);
      const T = table_('Tasks', true), cur = T.items.find(x => x.ID === taskId);
      if (cur) writeRecord_('Tasks', Object.assign({}, cur, { UpdatedAt: a.CreatedAt }), cur);
      log_(me, taskId, 'attached', name);
      return attachmentView_(a);
    });
  });
}

/** Removes an attachment (the uploader or an admin). The Drive file goes to the trash, so it can still be recovered. */
function api_removeAttachment(token, id) {
  return withUser_(token, me => withLock_(() => {
    const A = table_('Attachments', true), a = A.items.find(x => x.ID === id);
    if (!a) throw new Error('NOT_FOUND');
    if (!bool_(me.Admin) && a.UploaderID !== me.ID) throw new Error('FORBIDDEN');
    trashFile_(a.FileID);
    A.sh.deleteRow(a._row);
    resetMemo_('Attachments');
    log_(me, a.TaskID, 'removed attachment', a.Name);
    return { id: id, taskId: a.TaskID };
  }));
}

function attachmentView_(a) {
  const type = str_(a.Type), fileId = str_(a.FileID);
  return {
    id: a.ID, taskId: a.TaskID, name: str_(a.Name), type: type, size: Number(a.Size) || 0, url: str_(a.Url),
    thumb: /^image\//.test(type) && fileId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w480' : '',
    by: str_(a.UploaderName), byId: str_(a.UploaderID), createdAt: str_(a.CreatedAt),
  };
}

/** The Drive folder for attachments, next to the sheet. Created on first use and remembered. */
function attachmentsFolder_() {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('attachmentsFolder');
  if (saved) { try { const f = DriveApp.getFolderById(saved); if (!f.isTrashed()) return f; } catch (e) { /* deleted: make a new one */ } }
  let parent;
  try { const it = DriveApp.getFileById(ss_().getId()).getParents(); parent = it.hasNext() ? it.next() : DriveApp.getRootFolder(); }
  catch (e) { parent = DriveApp.getRootFolder(); }
  const folder = parent.createFolder(CONFIG.APP_NAME + ' — attachments');
  props.setProperty('attachmentsFolder', folder.getId());
  return folder;
}

function trashFile_(fileId) { try { if (fileId) DriveApp.getFileById(fileId).setTrashed(true); } catch (e) { console.warn('could not trash', fileId, e); } }

function api_addComment(token, taskId, text) {
  return withUser_(token, me => withLock_(() => {
    const body = str_(text).trim();
    if (!body || body.length > 2000) throw new Error('BAD_INPUT:text');
    const T = table_('Tasks', true);
    const t = T.items.find(x => x.ID === taskId);
    if (!t) throw new Error('NOT_FOUND');
    const C = table_('Comments', true);
    const c = { ID: nextId_(C.items, 'C-'), TaskID: taskId, AuthorID: me.ID, AuthorName: me.Name, Text: body, CreatedAt: iso_() };
    writeRecord_('Comments', c, null);
    writeRecord_('Tasks', Object.assign({}, t, { UpdatedAt: c.CreatedAt }), t);
    log_(me, taskId, 'commented', body.slice(0, 120));
    const to = split_(t.Assignees).concat([t.CreatedBy]).filter(id => id !== me.ID);
    const view = taskView_(t);
    notify_(to, m => ({
      subject: `${me.Name} علّق على: ${t.Title}`,
      preheader: body.slice(0, 90),
      heading: 'تعليق جديد على مهمة',
      intro: `أهلًا ${esc_(firstName_(m.Name))}، <b>${esc_(me.Name)}</b> كتب تعليق على مهمة إلك:`,
      body: `<div dir="auto" style="margin:0 0 14px;padding:12px 16px;border-radius:12px;background:#FFF8E6;border-right:4px solid #FFC21A;font-size:15px;line-height:1.7;color:#2E3A59">${esc_(body).replace(/\n/g, '<br>')}</div>` + taskCardHtml_(view, true),
      button: { label: 'افتح المهمة ورد', taskId: t.ID },
    }));
    return commentView_(c);
  }));
}

/** Members change their own sign-in code. */
function api_changeCode(token, current, next) {
  return withUser_(token, me => withLock_(() => {
    if (codeHash_(me.CodeSalt, current) !== me.CodeHash) throw new Error('BAD_CODE');
    const n = normCode_(next);
    if (n.length < 6 || n.length > 32) throw new Error('BAD_INPUT:code');
    const M = table_('Members', true);
    const m = M.items.find(x => x.ID === me.ID);
    const salt = salt_();
    const rec = Object.assign({}, m, { CodeSalt: salt, CodeHash: codeHash_(salt, n) });
    writeRecord_('Members', rec, m);
    return { token: makeToken_(rec) };
  }));
}

/** Change your own email-notification preference. */
function api_setNotify(token, notify) {
  return withUser_(token, me => withLock_(() => {
    const m = table_('Members', true).items.find(x => x.ID === me.ID);
    writeRecord_('Members', Object.assign({}, m, { Notify: !!notify }), m);
    return { notify: !!notify };
  }));
}

// ------------------------------------------------------------------------------------------------ admin API

/** Create (no id) or update a member. A new member gets a sign-in code, returned once. */
function api_saveMember(token, input) {
  return withUser_(token, me => withLock_(() => {
    requireAdmin_(me);
    const M = table_('Members', true);
    const existing = input && input.id ? M.items.find(m => m.ID === input.id) : null;
    if (input && input.id && !existing) throw new Error('NOT_FOUND');
    const name = str_(input.name).trim();
    const email = str_(input.email).trim().toLowerCase();
    if (!name || name.length > 80) throw new Error('BAD_INPUT:name');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('BAD_INPUT:email');
    if (email && M.items.some(m => m.Email && String(m.Email).toLowerCase() === email && (!existing || m.ID !== existing.ID))) {
      throw new Error('BAD_INPUT:email-taken');
    }
    const admin = !!input.admin, active = input.active !== false;
    if (existing && existing.ID === me.ID && (!admin || !active)) throw new Error('BAD_INPUT:self');
    let code = null;
    const rec = existing ? Object.assign({}, existing) : { ID: nextId_(M.items, 'M-'), CreatedAt: iso_() };
    Object.assign(rec, {
      Name: name, Email: email, Role: str_(input.role).trim().slice(0, 60), Team: str_(input.team).trim().slice(0, 60),
      Admin: admin, Active: active, Notify: input.notify !== false,
    });
    if (!existing) {
      code = newCode_();
      rec.CodeSalt = salt_();
      rec.CodeHash = codeHash_(rec.CodeSalt, code);
    }
    writeRecord_('Members', rec, existing);
    if (existing && !active) log_(me, '', 'member deactivated', name);
    if (!existing) log_(me, '', 'member added', name);
    if (code && input.sendCode && email) sendCode_(rec, code);
    return { member: memberView_(rec, me), code: code };
  }));
}

/** Give a member a new sign-in code (signs them out everywhere). Returned once; optionally emailed. */
function api_resetCode(token, memberId, sendByEmail) {
  return withUser_(token, me => withLock_(() => {
    requireAdmin_(me);
    const M = table_('Members', true);
    const m = M.items.find(x => x.ID === memberId);
    if (!m) throw new Error('NOT_FOUND');
    const code = newCode_();
    const salt = salt_();
    const rec = Object.assign({}, m, { CodeSalt: salt, CodeHash: codeHash_(salt, code) });
    writeRecord_('Members', rec, m);
    log_(me, '', 'code reset', m.Name);
    if (sendByEmail && rec.Email) sendCode_(rec, code);
    return { code: code };
  }));
}

function api_saveSettings(token, input) {
  return withUser_(token, me => withLock_(() => {
    requireAdmin_(me);
    const teams = (Array.isArray(input.teams) ? input.teams : []).map(t => str_(t).trim()).filter(Boolean).slice(0, 30);
    const hour = Math.max(0, Math.min(23, Number(input.digestHour) || 8));
    setSetting_('teams', teams.join(', '));
    setSetting_('digest', !!input.digest);
    setSetting_('digestHour', hour);
    installDigest_(!!input.digest, hour);
    return settingsView_();
  }));
}

// ------------------------------------------------------------------------------------------------ reminders

/** Runs every morning when reminders are on: emails each member their overdue tasks and those due within 2 days. */
function dailyDigest() {
  const today = today_();
  const soon = addDays_(today, 2);
  const open = table_('Tasks').items.filter(t => !bool_(t.Archived) && t.Status !== 'done' && t.Due && t.Due <= soon);
  table_('Members').items.filter(m => bool_(m.Active) && bool_(m.Notify) && m.Email).forEach(m => {
    const mine = open.filter(t => split_(t.Assignees).indexOf(m.ID) >= 0).sort((a, b) => a.Due.localeCompare(b.Due));
    if (!mine.length) return;
    const late = mine.filter(t => t.Due < today).length;
    sendMail_(m.Email, {
      subject: late ? `عندك ${countTasks_(late)} متأخرة` : `مهامك القريبة: ${countTasks_(mine.length)}`,
      preheader: mine.map(t => t.Title).slice(0, 3).join(' · '),
      heading: 'مهامك لليوم',
      intro: `صباح الخير ${esc_(firstName_(m.Name))}، هاي المهام اللي موعدها قرّب أو فات:`,
      body: mine.map(t => taskCardHtml_(taskView_(t), true)).join('<div style="height:8px"></div>'),
      button: { label: 'افتح مهامي' },
    });
  });
}

function installDigest_(enable, hour) {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyDigest').forEach(t => ScriptApp.deleteTrigger(t));
  if (enable) ScriptApp.newTrigger('dailyDigest').timeBased().atHour(hour).everyDays(1).inTimezone(CONFIG.TIME_ZONE).create();
}

// ------------------------------------------------------------------------------------------------ setup helpers (run from the editor)

/**
 * First installation only, for a brand-new spreadsheet with no admin: creates an admin and writes their sign-in code
 * to the execution log (View → Logs). Edit the name and email below, select setupFirstAdmin, press Run.
 */
function setupFirstAdmin() {
  const name = 'Admin', email = '';
  const M = table_('Members', true);
  if (M.items.some(m => bool_(m.Admin) && m.CodeHash)) throw new Error('An admin already exists. Ask them to reset your code.');
  const code = newCode_();
  const salt = salt_();
  writeRecord_('Members', { ID: nextId_(M.items, 'M-'), Name: name, Email: email, Role: '', Team: '', Admin: true, Active: true,
    Notify: true, CodeSalt: salt, CodeHash: codeHash_(salt, code), CreatedAt: iso_() }, null);
  Logger.log('Admin sign-in code: ' + code);
}

// ------------------------------------------------------------------------------------------------ views

function taskView_(t) {
  return {
    id: t.ID, title: str_(t.Title), description: str_(t.Description), status: STATUSES.indexOf(t.Status) >= 0 ? t.Status : 'todo',
    priority: PRIORITIES.indexOf(t.Priority) >= 0 ? t.Priority : 'medium', team: str_(t.Team), assignees: split_(t.Assignees),
    due: str_(t.Due), labels: split_(t.Labels), checklist: parseChecklist_(t.Checklist), blocked: bool_(t.Blocked),
    createdBy: str_(t.CreatedBy), createdAt: str_(t.CreatedAt), updatedAt: str_(t.UpdatedAt), completedAt: str_(t.CompletedAt),
    archived: bool_(t.Archived),
  };
}

function tasksView_() {
  const counts = {};
  table_('Comments').items.forEach(c => { counts[c.TaskID] = (counts[c.TaskID] || 0) + 1; });
  const files = {};
  table_('Attachments').items.forEach(a => { files[a.TaskID] = (files[a.TaskID] || 0) + 1; });
  return table_('Tasks').items.filter(t => !bool_(t.Archived))
    .map(t => Object.assign(taskView_(t), { comments: counts[t.ID] || 0, attachments: files[t.ID] || 0 }));
}

function memberView_(m, viewer) {
  const full = bool_(viewer.Admin) || viewer.ID === m.ID;
  return {
    id: m.ID, name: str_(m.Name), role: str_(m.Role), team: str_(m.Team), admin: bool_(m.Admin), active: bool_(m.Active),
    email: full ? str_(m.Email) : '', notify: full ? bool_(m.Notify) : false, hasCode: !!m.CodeHash,
  };
}

function membersFor_(viewer) {
  return table_('Members').items.filter(m => bool_(viewer.Admin) || bool_(m.Active)).map(m => memberView_(m, viewer));
}

function commentView_(c) {
  return { id: c.ID, taskId: c.TaskID, authorId: c.AuthorID, author: str_(c.AuthorName), text: str_(c.Text), createdAt: str_(c.CreatedAt) };
}

function settingsView_() {
  return {
    teams: split_(getSetting_('teams')),
    digest: bool_(getSetting_('digest')),
    digestHour: Number(getSetting_('digestHour')) || 8,
    appName: CONFIG.APP_NAME,
    appUrl: appUrl_(),
    sheetUrl: ss_().getUrl(),
  };
}

// ------------------------------------------------------------------------------------------------ validation

/**
 * Admins write tasks; members work on them. A member may move a task to another stage and tick its steps, and nothing
 * else here (comments and attachments have their own calls). Everything else is refused on the server, not only hidden.
 */
function checkMemberPatch_(patch, existing) {
  if (!existing) throw new Error('FORBIDDEN');
  Object.keys(patch).forEach(k => { if (['id', 'base', 'status', 'checklist'].indexOf(k) < 0) throw new Error('FORBIDDEN'); });
  if (patch.checklist !== undefined) {
    // Same steps, same order: only the ticks may differ from what the member started from.
    const texts = l => (Array.isArray(l) ? l : []).map(i => str_(i && i.t).trim()).join('\n');
    const from = patch.base && patch.base.checklist !== undefined ? patch.base.checklist : taskView_(existing).checklist;
    if (texts(patch.checklist) !== texts(from)) throw new Error('FORBIDDEN');
  }
}

/**
 * Two people editing the same task at once. `patch.base` holds the values the editor started from. Fields nobody else
 * touched since then are saved as they are. Lists (checklist, assignees, labels) are merged: the editor's additions,
 * removals and ticks are applied to the current list, so both people's changes survive. A plain field (title, due…)
 * that someone else changed to a different value is refused with CONFLICT:<fields>, so nothing is overwritten unseen.
 */
function rebasePatch_(patch, cur) {
  const base = patch.base, out = {}, conflicts = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  Object.keys(patch).forEach(k => {
    if (k === 'base') return;
    out[k] = patch[k];
    if (k === 'id' || !Object.prototype.hasOwnProperty.call(base, k) || !(k in cur)) return;
    if (same(cur[k], base[k]) || same(cur[k], patch[k])) return; // nobody else changed it, or same result
    if (k === 'checklist') out[k] = mergeChecklist_(base[k], patch[k], cur[k]);
    else if (k === 'assignees' || k === 'labels') out[k] = mergeSet_(base[k], patch[k], cur[k]);
    else conflicts.push(k);
  });
  if (conflicts.length) throw new Error('CONFLICT:' + conflicts.join(','));
  return out;
}

function mergeSet_(base, mine, cur) {
  base = (base || []).map(String); mine = (mine || []).map(String);
  const removed = base.filter(x => mine.indexOf(x) < 0), added = mine.filter(x => base.indexOf(x) < 0);
  const out = (cur || []).filter(x => removed.indexOf(x) < 0);
  added.forEach(x => { if (out.indexOf(x) < 0) out.push(x); });
  return out;
}

/** Checklist items are matched by their text: added, removed and ticked items are applied to the current list. */
function mergeChecklist_(base, mine, cur) {
  const norm = l => (Array.isArray(l) ? l : []).map(i => ({ t: str_(i && i.t).trim(), d: !!(i && i.d) })).filter(i => i.t);
  base = norm(base); mine = norm(mine); cur = norm(cur);
  const find = (l, t) => l.filter(i => i.t === t)[0];
  const removed = base.filter(i => !find(mine, i.t)).map(i => i.t);
  const ticks = {};
  mine.forEach(i => { const b = find(base, i.t); if (b && b.d !== i.d) ticks[i.t] = i.d; });
  const out = cur.filter(i => removed.indexOf(i.t) < 0)
    .map(i => (Object.prototype.hasOwnProperty.call(ticks, i.t) ? { t: i.t, d: ticks[i.t] } : i));
  mine.forEach(i => { if (!find(base, i.t) && !find(out, i.t)) out.push(i); });
  return out;
}

function cleanTaskPatch_(p, isNew) {
  const out = {};
  const has = k => Object.prototype.hasOwnProperty.call(p, k);
  if (isNew || has('title')) {
    const v = str_(p.title).trim();
    if (!v || v.length > 200) throw new Error('BAD_INPUT:title');
    out.Title = v;
  }
  if (has('description')) {
    const v = str_(p.description);
    if (v.length > 5000) throw new Error('BAD_INPUT:description');
    out.Description = v;
  }
  if (has('status')) {
    if (STATUSES.indexOf(p.status) < 0) throw new Error('BAD_INPUT:status');
    out.Status = p.status;
  }
  if (has('priority')) {
    if (PRIORITIES.indexOf(p.priority) < 0) throw new Error('BAD_INPUT:priority');
    out.Priority = p.priority;
  }
  if (has('team')) out.Team = str_(p.team).trim().slice(0, 60);
  if (has('assignees')) {
    const ids = table_('Members').items.filter(m => bool_(m.Active)).map(m => m.ID);
    const list = (Array.isArray(p.assignees) ? p.assignees : []).map(String);
    if (list.some(id => ids.indexOf(id) < 0)) throw new Error('BAD_INPUT:assignees');
    out.Assignees = list.filter((id, i) => list.indexOf(id) === i).join(',');
  }
  if (has('due')) {
    const v = str_(p.due);
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('BAD_INPUT:due');
    out.Due = v;
  }
  if (has('labels')) {
    const list = (Array.isArray(p.labels) ? p.labels : []).map(l => str_(l).trim().replace(/,/g, ' ')).filter(Boolean);
    if (list.length > 10 || list.some(l => l.length > 30)) throw new Error('BAD_INPUT:labels');
    out.Labels = list.join(',');
  }
  if (has('checklist')) {
    const list = Array.isArray(p.checklist) ? p.checklist : [];
    if (list.length > 50) throw new Error('BAD_INPUT:checklist');
    out.Checklist = JSON.stringify(list.map(i => ({ t: str_(i && i.t).trim().slice(0, 200), d: !!(i && i.d) })).filter(i => i.t));
  }
  if (has('blocked')) out.Blocked = !!p.blocked;
  return out;
}

// ------------------------------------------------------------------------------------------------ activity and notifications

function logTaskChanges_(me, before, after) {
  if (!before) return log_(me, after.id, 'created', after.title);
  const changes = [];
  if (before.title !== after.title) changes.push('title');
  if (before.status !== after.status) changes.push(`status: ${before.status} → ${after.status}`);
  if (before.priority !== after.priority) changes.push(`priority: ${before.priority} → ${after.priority}`);
  if (before.due !== after.due) changes.push(`due: ${before.due || '—'} → ${after.due || '—'}`);
  if (before.team !== after.team) changes.push(`team: ${before.team || '—'} → ${after.team || '—'}`);
  if (before.assignees.join() !== after.assignees.join()) changes.push('assignees: ' + (namesOf_(after.assignees).join(', ') || '—'));
  if (before.blocked !== after.blocked) changes.push(after.blocked ? 'blocked' : 'unblocked');
  if (before.description !== after.description) changes.push('description');
  if (JSON.stringify(before.checklist) !== JSON.stringify(after.checklist)) {
    changes.push(`checklist ${after.checklist.filter(i => i.d).length}/${after.checklist.length}`);
  }
  if (before.labels.join() !== after.labels.join()) changes.push('labels');
  if (changes.length) log_(me, after.id, 'updated', changes.join(' · '));
}

function notifyAssigned_(me, before, after) {
  // Everyone newly assigned gets an email, including someone who assigned themselves (a reminder in their inbox).
  const added = after.assignees.filter(id => !before || before.assignees.indexOf(id) < 0);
  if (!added.length) return;
  notify_(added, m => ({
    subject: `مهمة جديدة: ${after.title}`,
    preheader: `${m.ID === me.ID ? 'كلّفت حالك بمهمة' : me.Name + ' كلّفك بمهمة'}${after.due ? ' · الموعد ' + dayText_(after.due) : ''}`,
    heading: 'عندك مهمة جديدة',
    intro: m.ID === me.ID
      ? `أهلًا ${esc_(firstName_(m.Name))}، كلّفت حالك بهاي المهمة. هاي نسخة عشان تضل قدامك:`
      : `أهلًا ${esc_(firstName_(m.Name))}، <b>${esc_(me.Name)}</b> كلّفك بهاي المهمة:`,
    body: taskCardHtml_(after),
    button: { label: 'افتح المهمة', taskId: after.id },
  }));
}

/** Sends one email per member, built for that member by `build(member)`. Inactive, opted-out or email-less members are skipped. */
function notify_(memberIds, build) {
  const members = table_('Members').items;
  memberIds.filter((id, i) => memberIds.indexOf(id) === i).forEach(id => {
    const m = members.find(x => x.ID === id);
    if (m && bool_(m.Active) && bool_(m.Notify) && m.Email) sendMail_(m.Email, build(m));
  });
}

function sendCode_(m, code) {
  sendMail_(m.Email, {
    subject: `رمز الدخول إلى ${CONFIG.APP_NAME}`,
    preheader: 'الرمز الخاص فيك لبرنامج مهام الفريق',
    heading: 'رمز الدخول تبعك',
    intro: `أهلًا ${esc_(firstName_(m.Name))}، هاد رمزك لبرنامج مهام الفريق:`,
    body: `<div dir="ltr" style="margin:8px 0 18px;padding:16px;border:2px dashed #FFC21A;border-radius:12px;background:#FFFBEB;text-align:center;font:700 26px/1.2 'Courier New',monospace;letter-spacing:3px;color:#0B1530">${esc_(code)}</div>` +
      `<p style="margin:0 0 6px;font-size:15px;line-height:1.7;color:#4A5468">افتح البرنامج، اختار اسمك واكتب الرمز. الأحرف الكبيرة والصغيرة نفس الإشي.</p>` +
      `<p style="margin:0;font-size:15px;line-height:1.7;color:#4A5468">بتقدر تغيّره من القائمة بعد ما تدخل. لا تبعته لحدا.</p>`,
    button: { label: 'افتح البرنامج' },
  });
}

// ------------------------------------------------------------------------------------------------ email design

const MONTHS_AR_ = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const PRIORITY_AR_ = { low: ['منخفضة', '#6B7385'], medium: ['متوسطة', '#1449D6'], high: ['عالية', '#E2570B'], urgent: ['عاجلة', '#C0262D'] };
const STATUS_AR_ = { todo: 'للتنفيذ', doing: 'قيد التنفيذ', review: 'مراجعة', done: 'منجز' };

function firstName_(name) { return str_(name).trim().split(/\s+/)[0] || ''; }

/** "13 تشرين الثاني 2026" */
function dayText_(day) {
  const p = str_(day).split('-').map(Number);
  return p.length === 3 && p[1] ? `${p[2]} ${MONTHS_AR_[p[1] - 1]} ${p[0]}` : str_(day);
}

/** "اليوم" · "بكرة" · "بعد 5 أيام" · "متأخرة يومين" */
function dueWhen_(day) {
  const n = Math.round((Date.parse(day + 'T12:00:00Z') - Date.parse(today_() + 'T12:00:00Z')) / 864e5);
  const days = k => (k === 1 ? 'يوم' : k === 2 ? 'يومين' : k <= 10 ? `${k} أيام` : `${k} يوم`);
  if (isNaN(n)) return { text: '', color: '#4A5468' };
  if (n < 0) return { text: `متأخرة ${days(-n)}`, color: '#C0262D' };
  if (n === 0) return { text: 'اليوم', color: '#A84306' };
  if (n === 1) return { text: 'بكرة', color: '#A84306' };
  return { text: `بعد ${days(n)}`, color: '#13795B' };
}

function countTasks_(n) { return n === 1 ? 'مهمة وحدة' : n === 2 ? 'مهمتين' : n <= 10 ? `${n} مهام` : `${n} مهمة`; }

function pill_(text, color) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color}1A;color:${color};font-size:13px;font-weight:700">${esc_(text)}</span>`;
}

/** The task as a card: title, then due date, priority, team, people, steps and description. `t` is a taskView_. */
function taskCardHtml_(t, compact) {
  const prio = PRIORITY_AR_[t.priority] || PRIORITY_AR_.medium;
  const row = (label, value) => `<tr><td style="padding:5px 0;width:96px;color:#6B7385;font-size:14px;vertical-align:top">${label}</td><td style="padding:5px 0;font-size:15px;color:#0B1530">${value}</td></tr>`;
  const rows = [];
  if (t.due) { const w = dueWhen_(t.due); rows.push(row('الموعد', `${esc_(dayText_(t.due))} ${w.text ? '&nbsp;' + pill_(w.text, w.color) : ''}`)); }
  rows.push(row('الأولوية', pill_(prio[0], prio[1])));
  if (!compact) rows.push(row('الحالة', esc_(STATUS_AR_[t.status] || t.status)));
  if (t.team) rows.push(row('اللجنة', esc_(t.team)));
  if (!compact && t.assignees.length) rows.push(row('المسؤولين', esc_(namesOf_(t.assignees).join('، '))));
  if (!compact && t.checklist.length) rows.push(row('الخطوات', `${t.checklist.filter(i => i.d).length} من ${t.checklist.length} خلصت`));
  if (!compact && t.labels.length) rows.push(row('وسوم', t.labels.map(l => pill_(l, '#4A5468')).join(' ')));
  const desc = !compact && t.description
    ? `<div dir="auto" style="margin-top:12px;padding-top:12px;border-top:1px solid #E6E9F0;font-size:15px;line-height:1.7;color:#2E3A59">${esc_(t.description).replace(/\n/g, '<br>')}</div>` : '';
  return `<div style="margin:0 0 6px;border:1px solid #E6E9F0;border-right:5px solid ${prio[1]};border-radius:12px;background:#FAFBFD;padding:14px 16px">` +
    `<div dir="auto" style="font-size:18px;font-weight:700;color:#0B1530;margin-bottom:8px">${esc_(t.title)}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows.join('')}</table>${desc}</div>`;
}

/** Wraps content in the chapter's email layout. Inline styles and tables only, so it looks the same in Gmail, Outlook and phones. */
function emailHtml_(o) {
  const url = appUrl_();
  const href = url ? url + (o.button && o.button.taskId ? '#task=' + encodeURIComponent(o.button.taskId) : '') : '';
  const button = o.button && href
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="border-radius:999px;background:#0B1530"><a href="${esc_(href)}" style="display:inline-block;padding:13px 28px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px">${esc_(o.button.label)} ←</a></td></tr></table>` : '';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc_(o.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#EEF1F6">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc_(o.preheader || '')}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1F6"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl" style="max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;font-family:Tahoma,'Segoe UI',Arial,sans-serif;text-align:right">` +
    `<tr><td align="center" style="padding:22px 24px 16px"><img src="${esc_(CONFIG.LOGO_URL)}" width="210" alt="IEEE IES · HU Student Branch Chapter" style="display:block;width:210px;max-width:70%;height:auto;border:0"></td></tr>` +
    `<tr><td style="padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td width="55%" style="height:5px;line-height:5px;font-size:0;background:#0B1530">&nbsp;</td><td width="20%" style="height:5px;line-height:5px;font-size:0;background:#FFC21A">&nbsp;</td><td width="25%" style="height:5px;line-height:5px;font-size:0;background:#FF6B1A">&nbsp;</td>` +
    `</tr></table></td></tr>` +
    `<tr><td style="padding:26px 28px 8px">` +
    `<h1 style="margin:0 0 10px;font-size:22px;line-height:1.4;color:#0B1530">${esc_(o.heading)}</h1>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4A5468">${o.intro || ''}</p>` +
    `${o.body || ''}${button}</td></tr>` +
    `<tr><td style="padding:18px 28px 24px;border-top:1px solid #EEF1F6;font-size:12px;line-height:1.7;color:#6B7385">` +
    `وصلك هاد الإيميل من <b>${esc_(CONFIG.APP_NAME)}</b>، برنامج مهام فريق IEEE IES بالجامعة الهاشمية.` +
    `${o.noOptOut ? '' : '<br>لإيقاف هاي الإيميلات: افتح البرنامج ← القائمة ← إشعارات الإيميل.'}</td></tr>` +
    `</table></td></tr></table></body></html>`;
}

/** Plain-text copy of the same email, for mail apps that don't show HTML. */
function emailText_(o) {
  const strip = h => str_(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h1)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  const url = appUrl_();
  return [o.heading, strip(o.intro), strip(o.body), url ? url + (o.button && o.button.taskId ? '#task=' + o.button.taskId : '') : '', '— ' + CONFIG.APP_NAME + ' · IEEE IES HU']
    .filter(Boolean).join('\n\n');
}

/** `o`: { subject, preheader, heading, intro (html), body (html), button: { label, taskId? } }. Never throws. */
function sendMail_(to, o) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({ to: to, subject: o.subject, name: 'IEEE IES HU · ' + CONFIG.APP_NAME, body: emailText_(o), htmlBody: emailHtml_(o) });
  } catch (e) {
    console.error('mail failed', e); // never block saving because of email
  }
}

function log_(me, taskId, action, details) {
  writeRecord_('Activity', { Time: iso_(), ActorID: me.ID, ActorName: me.Name, TaskID: taskId, Action: action, Details: str_(details).slice(0, 500) }, null);
}

// ------------------------------------------------------------------------------------------------ auth

function withUser_(token, fn) {
  const me = verifyToken_(token);
  return fn(me);
}

function requireAdmin_(me) {
  if (!bool_(me.Admin)) throw new Error('FORBIDDEN');
}

function makeToken_(m) {
  const payload = [m.ID, Date.now() + CONFIG.SESSION_DAYS * 864e5, String(m.CodeHash).slice(0, 12)].join('|');
  return payload + '|' + hmac_(payload);
}

/** A token is "memberId|expiry|codeHashPrefix|signature". Resetting a member's code signs them out everywhere. */
function verifyToken_(token) {
  const parts = str_(token).split('|');
  if (parts.length !== 4) throw new Error('AUTH');
  const payload = parts.slice(0, 3).join('|');
  if (hmac_(payload) !== parts[3] || Number(parts[1]) < Date.now()) throw new Error('AUTH');
  const m = table_('Members').items.find(x => x.ID === parts[0]);
  if (!m || !bool_(m.Active) || String(m.CodeHash).slice(0, 12) !== parts[2]) throw new Error('AUTH');
  return m;
}

function codeHash_(salt, code) { return sha256_(salt + ':' + normCode_(code)); }
function normCode_(c) { return str_(c).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function salt_() { return Utilities.getUuid().replace(/-/g, ''); }

function newCode_() {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid(), Utilities.Charset.UTF_8);
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[(bytes[i] & 255) % CODE_ALPHABET.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}

function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('TOKEN_SECRET', s); }
  return s;
}

function hex_(bytes) { return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function sha256_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
function hmac_(s) { return hex_(Utilities.computeHmacSha256Signature(s, secret_(), Utilities.Charset.UTF_8)); }

// ------------------------------------------------------------------------------------------------ spreadsheet as a database

// Per-execution cache. Apps Script starts every call with fresh globals, so this never goes stale between calls.
var MEMO_ = {};

function ss_() {
  if (!MEMO_.ss) MEMO_.ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return MEMO_.ss;
}
function resetMemo_(name) { delete MEMO_['t:' + name]; }

/** Reads a tab into objects keyed by column name. `fresh` re-reads it (use inside the lock before writing). */
function table_(name, fresh) {
  const key = 't:' + name;
  if (MEMO_[key] && !fresh) return MEMO_[key];
  ensureSchema_();
  const sh = ss_().getSheetByName(name);
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const rows = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  const keyCol = header.indexOf(SCHEMA[name][0]);
  const items = [];
  let used = 1; // last row holding real content; unticked checkboxes (FALSE) in empty rows don't count
  rows.forEach((r, i) => {
    if (r.some(v => v !== '' && v !== null && v !== false)) used = i + 2;
    // Skip blank rows and rows without an id (empty rows whose checkbox columns read FALSE, notes typed by hand).
    if (keyCol >= 0 ? isBlank_(r[keyCol]) : r.every(isBlank_)) return;
    const o = { _row: i + 2, _raw: r };
    SCHEMA[name].forEach(c => { const j = header.indexOf(c); o[c] = j < 0 ? '' : cell_(r[j]); });
    items.push(o);
  });
  return (MEMO_[key] = { sh: sh, header: header, items: items, used: used });
}

function isBlank_(v) { return v === '' || v === null || v === undefined || v === false; }

/** Writes one record (insert when `existing` is null). Unknown columns people added to the sheet are preserved. */
function writeRecord_(name, rec, existing) {
  const T = table_(name);
  const row = existing ? existing._raw.slice() : T.header.map(() => '');
  SCHEMA[name].forEach(c => {
    const j = T.header.indexOf(c);
    if (j >= 0 && rec[c] !== undefined) row[j] = toCell_(rec[c]);
  });
  if (existing) {
    T.sh.getRange(existing._row, 1, 1, row.length).setValues([row]);
    const i = T.items.indexOf(existing);
    T.items[i] = Object.assign({}, rec, { _row: existing._row, _raw: row });
  } else {
    // Write right under the data, not after the last row Sheets counts: empty rows with checkboxes read as FALSE and
    // would push new records to the bottom of the sheet, outside the formatted rows.
    const r = T.used + 1;
    if (r > T.sh.getMaxRows()) T.sh.insertRowsAfter(T.sh.getMaxRows(), 100);
    T.sh.getRange(r, 1, 1, row.length).setValues([row]);
    T.used = r;
    T.items.push(Object.assign({}, rec, { _row: r, _raw: row }));
  }
}

/** Creates missing tabs and columns, and formats them. Cached, so it costs nothing on most calls. */
function ensureSchema_() {
  if (MEMO_.schemaOk) return;
  const cache = CacheService.getScriptCache();
  const cacheKey = 'schema-v2:' + ss_().getId(); // bump when SCHEMA changes, so existing sheets get new tabs/columns
  if (cache.get(cacheKey)) { MEMO_.schemaOk = true; return; }
  const ss = ss_();
  Object.keys(SCHEMA).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const used = header.filter(Boolean).length;
    const missing = SCHEMA[name].filter(c => header.indexOf(c) < 0);
    if (missing.length) sh.getRange(1, used + 1, 1, missing.length).setValues([missing]);
    const width = used + missing.length;
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#0B1530').setFontColor('#FFFFFF');
    const full = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
    const rows = Math.max(sh.getMaxRows() - 1, 1);
    full.forEach((h, i) => {
      const col = sh.getRange(2, i + 1, rows, 1);
      if (BOOL_COLUMNS.indexOf(h) >= 0) col.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      else if (h !== 'Value') col.setNumberFormat('@'); // keep dates, ids and codes as text
    });
    if (name === 'Tasks') {
      const status = full.indexOf('Status') + 1, prio = full.indexOf('Priority') + 1;
      sh.getRange(2, status, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
      sh.getRange(2, prio, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PRIORITIES, true).build());
    }
    if (name === 'Members') {
      // The code columns are hashes, not codes; hide them so nobody worries about them.
      ['CodeSalt', 'CodeHash'].forEach(c => { const j = full.indexOf(c); if (j >= 0) sh.hideColumns(j + 1); });
    }
  });
  const settings = ss.getSheetByName('Settings');
  const keys = settings.getLastRow() > 1 ? settings.getRange(2, 1, settings.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
  DEFAULT_SETTINGS.filter(s => keys.indexOf(s[0]) < 0).forEach(s => settings.appendRow(s));
  cache.put(cacheKey, '1', 21600);
  MEMO_.schemaOk = true;
}

function getSetting_(key) {
  const s = table_('Settings').items.find(x => x.Key === key);
  return s ? s.Value : (DEFAULT_SETTINGS.find(d => d[0] === key) || [])[1];
}

function setSetting_(key, value) {
  const S = table_('Settings', true);
  const s = S.items.find(x => x.Key === key);
  writeRecord_('Settings', Object.assign({}, s || { Key: key, Notes: '' }, { Value: value }), s || null);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function nextId_(items, prefix) {
  const max = items.reduce((n, x) => {
    const m = /^[A-Z]+-(\d+)$/.exec(String(x.ID));
    return m ? Math.max(n, Number(m[1])) : n;
  }, 0);
  return prefix + String(max + 1).padStart(4, '0');
}

// ------------------------------------------------------------------------------------------------ small helpers

function cell_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    // Someone typed a date into the sheet by hand: keep calendar dates as YYYY-MM-DD, times as ISO.
    const day = Utilities.formatDate(v, CONFIG.TIME_ZONE, 'yyyy-MM-dd');
    const time = Utilities.formatDate(v, CONFIG.TIME_ZONE, 'HH:mm:ss');
    return time === '00:00:00' ? day : v.toISOString();
  }
  // A cell written as text by toCell_ may come back with its protective apostrophe.
  if (typeof v === 'string' && /^'[=+\-@]/.test(v)) return v.slice(1);
  return v;
}

/** Text that starts like a formula is stored as text, so nobody can run spreadsheet formulas through the app. */
function toCell_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function bool_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function str_(v) { return v === null || v === undefined ? '' : String(v); }
function split_(v) { return str_(v).split(',').map(s => s.trim()).filter(Boolean); }
function iso_() { return new Date().toISOString(); }
function today_() { return Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd'); }
function addDays_(day, n) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function esc_(s) { return str_(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function namesOf_(ids) {
  const list = Array.isArray(ids) ? ids : split_(ids);
  const members = table_('Members').items;
  return list.map(id => (members.find(m => m.ID === id) || {}).Name).filter(Boolean);
}
function parseChecklist_(v) {
  try { const a = JSON.parse(str_(v) || '[]'); return Array.isArray(a) ? a.map(i => ({ t: str_(i.t), d: !!i.d })) : []; } catch (e) { return []; }
}
function commentCount_(taskId) { return table_('Comments').items.filter(c => c.TaskID === taskId).length; }
/** The web app's /exec address. Remembered from web requests, because time triggers (the daily reminder) may get the /dev one. */
function appUrl_() {
  let u = '';
  try { u = ScriptApp.getService().getUrl() || ''; } catch (e) { /* not deployed */ }
  const props = PropertiesService.getScriptProperties();
  if (/\/exec$/.test(u)) { if (props.getProperty('appUrl') !== u) props.setProperty('appUrl', u); return u; }
  return props.getProperty('appUrl') || u;
}
