// content/schemas/*.schema.json give editors autocomplete, hover docs and red squiggles for content files.
// They are generated from lib/content/schema.ts; this test fails when they are out of date.
// Regenerate with: npm run content:schemas
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CONTENT_FILES } from '@/lib/content/schema';

const update = process.env.UPDATE_SCHEMAS === '1';

describe('editor schemas', () => {
  for (const [file, schema] of Object.entries(CONTENT_FILES)) {
    const path = new URL(`../../content/schemas/${file.replace('.json', '.schema.json')}`, import.meta.url);
    it(`${file} schema is up to date`, () => {
      const json = JSON.stringify(z.toJSONSchema(schema, { io: 'input', target: 'draft-07' }), null, 2) + '\n';
      if (update) writeFileSync(path, json);
      let current = '';
      try { current = readFileSync(path, 'utf8'); } catch {}
      expect(current, `Run "npm run content:schemas" to regenerate ${path.pathname}`).toBe(json);
    });
  }
});
