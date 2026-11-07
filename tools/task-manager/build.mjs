// Builds the task manager's generated files. Run after changing anything in src/ or deploy.json: npm run tasks:build
// (a test fails if they are out of date)
//   dist/Code.gs, dist/Index.html  the two files to paste into the Apps Script editor (Config.gs + Code.gs, Index.html)
//   public/tasks/index.html        the same UI served from the website (ies-hu.vercel.app/tasks). It talks to the
//                                  deployment in deploy.json through doPost, instead of google.script.run.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const here = new URL('./', import.meta.url);
const src = f => readFileSync(new URL(`src/${f}`, here), 'utf8');
const deploy = () => JSON.parse(readFileSync(new URL('deploy.json', here), 'utf8'));

// google.script.run and google.script.url for a page that is not served by Apps Script: each call is a POST of
// {fn, args} to the web app. text/plain keeps it a "simple" request (no CORS preflight); no cookies are sent, so the
// Google accounts signed in on the device don't matter. Reads are retried once if the network drops.
const SHIM = `<script>
(function () {
  var API = window.TASKS_API, READS = { api_publicInfo: 1, api_bootstrap: 1, api_changes: 1, api_taskDetail: 1 };
  function post(fn, args, tries) {
    return fetch(API, { method: 'POST', redirect: 'follow', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: fn, args: args }) })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var r; try { r = JSON.parse(text); } catch (e) { throw new Error('Server unavailable, try again in a minute'); }
        if (!r.ok) throw Object.assign(new Error(r.message), { server: true });
        return r.value;
      })
      .catch(function (e) {
        if (!e.server && READS[fn] && tries > 0) return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return post(fn, args, tries - 1); });
        throw e;
      });
  }
  function runner(ok, ko) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return runner(f, ko); };
      if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };
      return function () {
        post(String(k), Array.prototype.slice.call(arguments), 1)
          .then(function (v) { if (ok) ok(v); }, function (e) { if (ko) ko(e); });
      };
    } });
  }
  window.google = { script: { run: runner(null, null), url: { getLocation: function (cb) { cb({ hash: location.hash.slice(1), parameter: {} }); } } } };
})();
</script>
`;

/** The website copy of the UI. `apiUrl` defaults to the deployment in deploy.json (the local preview passes its own). */
export function sitePage(apiUrl) {
  const webAppUrl = apiUrl || deploy().webAppUrl;
  if (!apiUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(webAppUrl)) throw new Error('deploy.json: webAppUrl must be a /exec address');
  const head = [
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="robots" content="noindex, nofollow">',
    '<meta name="theme-color" content="#0B1530">',
    '<link rel="icon" href="/icon-192.png">',
    '<link rel="apple-touch-icon" href="/icon-192.png">',
    '<link rel="preconnect" href="https://script.google.com">',
    `<script>window.TASKS_API = ${JSON.stringify(webAppUrl)};</script>`,
  ].join('\n') + '\n' + SHIM;
  const html = src('Index.html');
  if (!html.includes('<base target="_top">\n')) throw new Error('Index.html: expected <base target="_top"> in <head>');
  return '<!-- GENERATED from tools/task-manager/src/Index.html by `npm run tasks:build`. Edit the source, not this file. -->\n'
    + html.replace('<base target="_top">\n', '<base target="_top">\n' + head);
}

export function build() {
  const banner = '// GENERATED from tools/task-manager/src/ by `npm run tasks:build`. Edit the source files, not this one.\n\n';
  return { 'Code.gs': banner + src('Config.gs') + '\n' + src('Code.gs'), 'Index.html': src('Index.html') };
}
export const SITE_PAGE = new URL('../../public/tasks/index.html', here);

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(new URL('dist/', here), { recursive: true });
  for (const [name, text] of Object.entries(build())) writeFileSync(new URL(`dist/${name}`, here), text);
  mkdirSync(new URL('./', SITE_PAGE), { recursive: true });
  writeFileSync(SITE_PAGE, sitePage());
  console.log('Built tools/task-manager/dist/Code.gs, dist/Index.html and public/tasks/index.html');
}
