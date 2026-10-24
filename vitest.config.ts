import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests: fast checks of the site's logic and of the content files (no browser, no server).
// The end-to-end checks of the running site are in tests/e2e.mjs.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
