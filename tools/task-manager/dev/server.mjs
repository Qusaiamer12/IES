// Local preview of the task manager: serves src/Index.html with a stand-in for google.script.run that calls the real
// Code.gs running on the in-memory Google mock. Usage: npm run tasks:dev  (then open http://localhost:4300)
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { loadApp } from './gas-mock.mjs';

const srcDir = new URL('../src/', import.meta.url);

/** Starts the preview. `seed` adds sample members and tasks. Returns { server, app, adminCode, url }. */
export function startDevServer({ port = 4300, seed = true } = {}) {
  const app = loadApp({ srcDir });
  app.call('setupFirstAdmin');
  const adminCode = app.ctx.__log.find(l => l.startsWith('Admin sign-in code: ')).split(': ')[1];
  const admin = app.call('api_login', app.call('api_publicInfo').members[0].id, adminCode);
  const extra = {};
  if (seed) {
    const people = [['Noor Naser', 'Chair', 'Core Team'], ['Tala Samhan', 'Secretary', 'Core Team'], ['Hala Rawashdeh', 'Designer', 'Design'], ['Ahmed Alhunity', 'Event Coordinator', 'Events']];
    const ids = people.map(([name, role, team]) => {
      const r = app.call('api_saveMember', admin.token, { name, role, team, email: name.split(' ')[0].toLowerCase() + '@example.com' });
      extra[name] = r.code;
      return r.member.id;
    });
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    [
      { title: 'Design the IEEE Day HU poster', team: 'Design', priority: 'high', due: day(2), assignees: [ids[2]], status: 'doing', checklist: [{ t: 'Draft', d: true }, { t: 'Review with chair', d: false }] },
      { title: 'Book the hall for the PLC workshop', team: 'Events', priority: 'urgent', due: day(-1), assignees: [ids[3]] },
      { title: 'Write the meeting minutes', team: 'Core Team', due: day(0), assignees: [ids[1]], labels: ['weekly'] },
      { title: 'Plan the industry visit', team: 'Events', priority: 'medium', due: day(9), assignees: [ids[0], ids[3]], status: 'review' },
      { title: 'Publish the Jordan IEEE Day recap', team: 'Social Media', priority: 'low', status: 'done' },
    ].forEach(t => app.call('api_saveTask', admin.token, t));
  }
  const shim = `<meta name="viewport" content="width=device-width, initial-scale=1"><script>
  (function () {
    function runner(ok, ko) {
      return new Proxy({}, { get: function (_, k) {
        if (k === 'withSuccessHandler') return function (f) { return runner(f, ko); };
        if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          fetch('/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: k, args: args }) })
            .then(function (r) { return r.json(); })
            .then(function (r) { if (r.ok) ok && ok(r.value); else ko && ko(new Error(r.message)); })
            .catch(function (e) { ko && ko(e); });
        };
      } });
    }
    window.google = { script: { run: runner(null, null), url: { getLocation: function (cb) { cb({ hash: location.hash.slice(1) }); } } } };
  })();
  </script>`;
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/rpc') {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => {
        const { fn, args } = JSON.parse(body);
        let out;
        try { out = { ok: true, value: app.call(fn, ...args) }; } catch (e) { out = { ok: false, message: e.message }; }
        setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out ?? null)); }, 60);
      });
      return;
    }
    if (req.url === '/' || req.url.startsWith('/?') || req.url.startsWith('/#')) {
      const html = readFileSync(new URL('Index.html', srcDir), 'utf8').replace('<head>', '<head>' + shim);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404); res.end();
  });
  server.listen(port);
  return { server, app, adminCode, codes: extra, url: `http://localhost:${port}` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url, adminCode, codes } = startDevServer();
  console.log(`Task manager preview: ${url}\nAdmin code: ${adminCode}\nOther members: ${JSON.stringify(codes)}`);
}
