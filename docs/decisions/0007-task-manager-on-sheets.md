# 0007 · The team task manager runs on Google Apps Script with a Google Sheet as its database

**Context.** The committee needs a shared task manager: assignments, due dates, comments, reminders. The chapter wanted
the data in its Google Drive, where officers already work and can read, filter and export it without the app. It must
cost nothing, survive hand-overs and not depend on a service that may close or change pricing.

**Decision.** A Google Apps Script web app bound to a spreadsheet (`tools/task-manager/`). The sheet is the database
(one tab per table, columns found by header name, missing columns recreated). The script runs as the deploying account
and is open to anyone with the link; members sign in with personal codes managed by admins (salted SHA-256 hashes,
HMAC-signed tokens, lockout after five failures), so members need no Google account or OAuth consent. Writes run under
a script lock and tasks are saved as patches. The UI is one HTML file with no libraries. A Node mock of the Apps Script
services runs the real backend in tests and in a local preview; CI runs those tests.

**Consequences.** No hosting, no bills, data visible in Drive. Apps Script quotas (≈100 notification emails a day on a
consumer account, a few seconds per call) are far above a student committee's needs. Calls take ~1 s, so the UI
updates optimistically and syncs every 45 s. Installation and updates need a copy-paste into the Apps Script editor and
a redeploy (documented step by step). The sheet and script belong to whoever created them: ownership must move to the
chapter account (handover checklist).
