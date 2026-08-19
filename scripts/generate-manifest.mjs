// Generates public/content/course-manifest.json from each lesson's YAML
// front-matter, so the manifest can never drift from the lessons. The manifest
// is the single source of truth the app loads at runtime.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'public', 'content');
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function stripQuotes(s) {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function parseFrontMatter(md, label) {
  if (!md.startsWith('---')) throw new Error(`${label}: missing front-matter`);
  const end = md.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${label}: unterminated front-matter`);
  const lines = md.slice(3, end).split('\n');
  const meta = { tags: [] };
  let inTags = false;
  for (const line of lines) {
    if (/^tags:\s*$/.test(line)) {
      inTags = true;
      continue;
    }
    const tag = line.match(/^\s+-\s+(.*)$/);
    if (inTags && tag) {
      meta.tags.push(stripQuotes(tag[1].trim()));
      continue;
    }
    inTags = false;
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv && kv[2] !== '') meta[kv[1]] = stripQuotes(kv[2].trim());
  }
  return meta;
}

export function buildManifest() {
  const entries = [];
  for (const level of LEVELS) {
    const dir = join(contentDir, level);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
      const md = readFileSync(join(dir, f), 'utf8');
      const m = parseFrontMatter(md, `${level}/${f}`);
      entries.push({
        id: m.id,
        slug: m.slug,
        title: m.title,
        level: m.level,
        order: Number(m.order),
        duration: Number(m.duration),
        file: `${level}/${m.slug}.md`,
        summary: m.summary,
        tags: m.tags,
      });
    }
  }
  entries.sort((a, b) => a.order - b.order);
  return entries;
}

// Run directly (not when imported by the validator).
if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = buildManifest();
  const out = join(contentDir, 'course-manifest.json');
  writeFileSync(out, JSON.stringify(entries, null, 2) + '\n');
  console.log(`generate-manifest: wrote ${entries.length} entries to course-manifest.json`);
}
