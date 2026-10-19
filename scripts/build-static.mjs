// Builds the static backup copy of the site into out/ (hosted separately from Vercel, e.g. on Render).
// Same pages and design; differences: no API routes (forms insert straight into Supabase, see components/Forms.tsx),
// no server headers, and the game and old-name aliases are written as plain files.
// Usage: STATIC_EXPORT=1 with NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_FORMS_DIRECT=1, NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (and NEXT_PUBLIC_NOINDEX=1) set, then: node scripts/build-static.mjs
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const api = join(root, 'app/api'), parked = join(root, '.api-parked');
const env = { ...process.env, STATIC_EXPORT: '1', NEXT_PUBLIC_FORMS_DIRECT: process.env.NEXT_PUBLIC_FORMS_DIRECT ?? '1' };
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
  if (!env[k]) throw new Error(`${k} is required for the static build (the forms post to Supabase directly).`);
}

// API routes can't be exported; park them for the duration of the build.
if (existsSync(parked)) throw new Error('.api-parked exists: a previous static build was interrupted. Move it back to app/api first.');
renameSync(api, parked);
try {
  execSync('npx next build', { cwd: root, env, stdio: 'inherit' });
} finally {
  renameSync(parked, api);
}

const out = join(root, 'out');
mkdirSync(join(out, 'projects/pid-duel'), { recursive: true });
copyFileSync(join(root, 'public/games/pid-duel.html'), join(out, 'projects/pid-duel/index.html'));

const { ALIASES } = await import(join(root, 'next.config.ts')).catch(() => ({ ALIASES: [
  { source: '/about', destination: '/chapter' }, { source: '/officers', destination: '/team' }, { source: '/membership', destination: '/join' },
] }));
for (const { source, destination } of ALIASES) {
  const to = destination + '/';
  mkdirSync(join(out, source), { recursive: true });
  writeFileSync(join(out, source, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Moved</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><a href="${to}">Continue</a>\n`);
}
console.log('Static site ready in out/');
