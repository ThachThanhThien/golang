// GitHub Pages has no SPA fallback: a deep link or refresh at /<repo>/lesson/foo
// would return a 404 because no such file exists. Serving a 404.html that is a copy
// of index.html makes Pages boot the app for any unknown path, and React Router then
// handles the route client-side. Runs automatically after `npm run build` (postbuild).
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = resolve(root, 'dist', 'index.html');
const notFound = resolve(root, 'dist', '404.html');

if (!existsSync(index)) {
  console.error('copy-404: dist/index.html not found — run `vite build` first.');
  process.exit(1);
}

copyFileSync(index, notFound);
console.log('copy-404: wrote dist/404.html (SPA fallback for GitHub Pages)');
