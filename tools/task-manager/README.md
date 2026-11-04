# IES HU Tasks — the team's task manager

A task manager for the whole committee, built on **Google Apps Script** with a **Google Sheet as the database**.
Everything the team does in the app is a row in the sheet, in the chapter's Drive: tasks, comments, history.

| | |
|---|---|
| **Database** | Google Sheet *IES HU Tasks — database* in Drive → `IES 26-27` |
| **App** | The web app URL from the deployment (see below); bookmark it on your phone |
| **Code** | `src/` (edit here) → `dist/` (generated, paste-ready) |

## What it does

- **Board** with To do / In progress / Review / Done; drag cards between columns (desktop) or change the status in the task.
- **Tasks**: title, description, priority, team, several assignees, due date, labels, checklist, "blocked" flag.
- **Comments** and a full **history** on every task (who changed what, when).
- **List** (sortable), **My tasks** (overdue / today / this week / later), **Calendar** (by due date), **Dashboard**
  (open, overdue, due this week, done this week, workload per member, progress per team).
- **Filters** by text, team, person and priority. **Arabic / English**, right-to-left, works on phones.
- **Email**: when someone assigns you a task or comments on yours; optional **daily reminder** of overdue and soon-due tasks.
- **Team admin** (admins only): add members, give or reset sign-in codes, deactivate people, edit teams, reminders.
- Syncs every 45 seconds, so everyone sees the same board.

## Sign-in

Members choose their name and type a **personal code** (like `K7M2-9QXA`) that an admin gives them from the *Team*
page. No Google account or permission screens for members. Codes are stored only as salted hashes; five wrong tries
lock the account for 15 minutes; an admin resetting a code signs that person out everywhere. Members can change their
own code from the menu.

## Install (once, about two minutes)

1. Open the sheet *IES HU Tasks — database* → **Extensions → Apps Script**.
2. In the editor, open `Code.gs`, delete what's there, and paste the whole of
   [`dist/Code.gs`](dist/Code.gs) (open it, *Raw*, select all, copy).
3. Click **+ → HTML**, name it exactly `Index`, delete its content, and paste the whole of [`dist/Index.html`](dist/Index.html).
4. **Save** (💾). Then **Deploy → New deployment** → ⚙ **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
   - **Deploy** → **Authorize access** → choose your account. Google warns that it hasn't verified the app (it's your
     own script): **Advanced → Go to … (unsafe) → Allow**.
5. Copy the **Web app URL**. That's the app. Open it, choose your name, enter your code.
6. In the app, **Team** → give each member a code (*New code*), and send it to them privately. Add emails so they get
   notifications.

The account that deploys is the one that sends the notification emails and owns the reminders. Ideally deploy from the
chapter account (`ies.2026.hu@gmail.com`) — see *Ownership* below.

## Where it's installed today

- The script is **bound to the sheet** (open the sheet → *Extensions → Apps Script*). Its id is in
  [`.clasp.json`](.clasp.json); only people with edit access to the sheet can open it.
- The app's address is the **Web app URL** of the deployment *v1 — first release*: in the Apps Script editor,
  **Deploy → Manage deployments**, or `clasp list-deployments` (below). It stays the same across updates.
- Deployed from `qusaiamer191@gmail.com` (Nov 2026). Move it to the chapter account at handover (see *Ownership*).

## Update the app after a code change

1. Edit `src/`, then `npm run tasks:build` and `npm run tasks:test`.
2. Either paste the new `dist/Code.gs` and `dist/Index.html` into the editor and save, **or** push with
   [clasp](https://github.com/google/clasp) (Google's command-line tool) from this folder:
   ```bash
   npx @google/clasp@3.4.1 login          # once, with an account that can edit the sheet
   npx @google/clasp@3.4.1 push --force   # uploads src/ (Config.gs, Code.gs, Index.html, appsscript.json)
   ```
3. Publish a new version **on the same deployment**, so the URL stays the same:
   - editor: **Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy**, or
   - clasp: `npx @google/clasp@3.4.1 list-deployments`, then
     `npx @google/clasp@3.4.1 deploy -i <the v1 deployment id> -d "what changed"`.

   Don't use *New deployment* (or `deploy` without `-i`) for updates: it creates a new URL.
4. If the update adds a permission (a new entry in `oauthScopes`), the deploying account must open the app once and
   approve it again; until then the app answers *Access denied*.

## The sheet

| Tab | Holds |
|---|---|
| `Tasks` | One row per task. `Assignees` holds member ids; `AssigneeNames` is the readable copy. `Checklist` is JSON. |
| `Members` | Team members, roles, admin/active/notify. `CodeSalt`/`CodeHash` are hidden hashes, never codes. |
| `Comments` | One row per comment. |
| `Activity` | Every change: who did what, when (an audit trail). |
| `Settings` | `teams`, `digest`, `digestHour`. |

You can read, filter, chart and export the sheet freely. You may add your own columns or reorder them: the app finds
columns by their header name and keeps columns it doesn't know. Missing columns are recreated automatically. Don't
rename the header cells or the tab names. Archive tasks from the app rather than deleting rows.

## Ownership (important for future committees)

The sheet and the script belong to the account that created them. Before the creator graduates, transfer ownership of
the sheet to the chapter account (Drive → Share → Transfer ownership) and redeploy from that account, or at least add
the chapter account as an editor. See `docs/OPERATIONS.md` → yearly handover.

## For developers

```
src/Code.gs        backend: auth, data access, validation, notifications (runs on Google)
src/Config.gs      installation settings
src/Index.html     the whole UI (vanilla JS, no libraries)
src/appsscript.json manifest (time zone, V8, scopes, web app defaults) for clasp users
dist/              generated paste-ready files (npm run tasks:build); a test fails if out of date
dev/gas-mock.mjs   in-memory stand-in for SpreadsheetApp, LockService, Utilities, MailApp…
dev/server.mjs     local preview with a google.script.run stand-in: npm run tasks:dev → http://localhost:4300
dev/*.test.mjs     backend tests + browser tests (Playwright, axe): npm run tasks:test (also in CI)
```

Design notes: every write runs under `LockService`; task saves are *patches* (only changed fields) so two people
editing different fields both win; text that looks like a formula is stored as text; dates are stored as
`YYYY-MM-DD` text. Why Apps Script + Sheets: [ADR 0007](../../docs/decisions/0007-task-manager-on-sheets.md).

---

## بالعربي

**برنامج مهام للجنة كاملة، وكل البيانات بشيت على درايف الشعبة** (`IES 26-27` ← *IES HU Tasks — database*).

**شو فيه:**
- **لوحة:** للتنفيذ ← قيد التنفيذ ← مراجعة ← منجز، وبتسحب المهمة بين الأعمدة.
- **المهمة:** فيها مسؤولين، موعد، أولوية، لجنة، قائمة خطوات، تعليقات، وسجل لكل تغيير.
- **عروض ثانية:** قائمة، مهامي، تقويم، إحصائيات.
- **إيميلات:** إشعار لما حدا يكلّفك أو يعلّق على مهمتك، وتذكير يومي إذا شغّلته.
- **لغتين:** عربي وإنجليزي، وبيشتغل على الجوال.

**الدخول:** كل عضو بيختار اسمه وبيكتب رمز خاص فيه. المسؤول بيعطيه الرمز من صفحة **الفريق** ← **رمز جديد**. ما في داعي لحساب جوجل.

**التركيب (مرة وحدة، دقيقتين):**
1. افتح الشيت ← **Extensions ← Apps Script**.
2. **الملف الأول:** امسح محتوى `Code.gs` والصق محتوى [`dist/Code.gs`](dist/Code.gs) كامل.
3. **الملف الثاني:** **+ ← HTML**، سمّيه `Index`، والصق محتوى [`dist/Index.html`](dist/Index.html) كامل.
4. **احفظ**، وبعدين **Deploy ← New deployment ← Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
   - اضغط **Deploy** ثم **Authorize**.
5. **إذا طلع تحذير:** اضغط **Advanced ← Go to … ← Allow**. التحذير طبيعي، لأنه سكربتكم إنتو.
6. **انسخ رابط الـ Web app.** هاد هو البرنامج، فتحه واعمله bookmark.

**لما يتعدّل الكود:** الصق الملفين الجداد، وبعدين **Deploy ← Manage deployments ← ✏️ ← New version ← Deploy**. هيك الرابط ما بيتغيّر.
