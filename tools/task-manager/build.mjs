// Builds the two files to paste into the Apps Script editor: dist/Code.gs (Config.gs + Code.gs) and dist/Index.html.
// Run after changing anything in src/: npm run tasks:build   (a test fails if dist/ is out of date)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = f => readFileSync(new URL(`src/${f}`, import.meta.url), 'utf8');
export function build() {
  const banner = '// GENERATED from tools/task-manager/src/ by `npm run tasks:build`. Edit the source files, not this one.\n\n';
  return { 'Code.gs': banner + src('Config.gs') + '\n' + src('Code.gs'), 'Index.html': src('Index.html') };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
  for (const [name, text] of Object.entries(build())) writeFileSync(new URL(`dist/${name}`, import.meta.url), text);
  console.log('Built tools/task-manager/dist/Code.gs and dist/Index.html');
}
