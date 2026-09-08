import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.PAGES_BASE_PATH ?? '';
if (!/^\/web-app-foundation\/(?:pr-[1-9][0-9]*\/)?$/.test(base)) {
  throw new Error(`unexpected Pages base path: ${base}`);
}

mkdirSync('dist', { recursive: true });
writeFileSync(
  'dist/index.html',
  `<!doctype html><meta charset="utf-8"><title>Pages candidate fixture</title><p>${base}</p>\n`,
);
