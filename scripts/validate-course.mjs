// Validates the whole course before build/ship:
//   - 24 lessons (8/8/8), 24 quizzes, 24 manifest entries, all cross-consistent
//   - front-matter matches file path, level, and sequential order 1..24
//   - every required H1 section present, exactly 5 tags, >= 5 flash cards
//   - Example 1/2/3 and Easy/Medium/Challenging present
//   - code fences only use go | bash | json | text
//   - quiz schema valid per question type; all five types used across the course
// Exits non-zero on any error.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, buildManifest } from './generate-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'public', 'content');
const quizDir = join(root, 'public', 'quizzes');
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ALLOWED_FENCES = new Set(['go', 'bash', 'json', 'text']);
const REQUIRED_H1 = [
  'Learning Objectives',
  'Why It Matters',
  'Concept Explanation',
  'Key Terminology',
  'Options and Trade-offs',
  'Worked Example',
  'Real World Analogy',
  'Examples',
  'Common Mistakes',
  'Best Practices',
  'Summary',
  'Flash Cards',
  'Exercises',
  'Further Reading',
];
const QUESTION_TYPES = ['single-choice', 'multiple-choice', 'fill-blank', 'ordering', 'match-pair'];

const errors = [];
const err = (m) => errors.push(m);

// ---- Collect lessons + front-matter ----------------------------------------
const lessons = [];
for (const level of LEVELS) {
  const dir = join(contentDir, level);
  const files = readdirSync(dir).filter((n) => n.endsWith('.md'));
  for (const f of files) {
    const path = join(dir, f);
    const md = readFileSync(path, 'utf8');
    let meta;
    try {
      meta = parseFrontMatter(md, `${level}/${f}`);
    } catch (e) {
      err(e.message);
      continue;
    }
    lessons.push({ level, file: f, path, md, meta });
  }
}

// ---- Count / distribution --------------------------------------------------
if (lessons.length !== 24) err(`expected 24 lessons, found ${lessons.length}`);
for (const level of LEVELS) {
  const n = lessons.filter((l) => l.level === level).length;
  if (n !== 8) err(`expected 8 ${level} lessons, found ${n}`);
}

// ---- Per-lesson checks -----------------------------------------------------
const orders = new Set();
for (const { level, file, md, meta } of lessons) {
  const label = `${level}/${file}`;
  const order = Number(meta.order);

  // front-matter presence
  for (const key of ['id', 'slug', 'title', 'level', 'order', 'duration', 'summary']) {
    if (meta[key] === undefined || meta[key] === '') err(`${label}: missing front-matter '${key}'`);
  }
  // id matches order
  const expectedId = `lesson-${String(order).padStart(2, '0')}`;
  if (meta.id !== expectedId) err(`${label}: id '${meta.id}' should be '${expectedId}' for order ${order}`);
  // slug matches filename
  if (`${meta.slug}.md` !== file) err(`${label}: slug '${meta.slug}' does not match filename`);
  // level matches directory
  if (meta.level !== level) err(`${label}: level '${meta.level}' does not match directory '${level}'`);
  // order range + uniqueness
  if (!(order >= 1 && order <= 24)) err(`${label}: order ${order} out of range 1..24`);
  if (orders.has(order)) err(`${label}: duplicate order ${order}`);
  orders.add(order);
  // exactly 5 tags
  if (!Array.isArray(meta.tags) || meta.tags.length !== 5)
    err(`${label}: expected exactly 5 tags, found ${meta.tags?.length ?? 0}`);
  // duration numeric
  if (!Number.isFinite(Number(meta.duration)) || Number(meta.duration) <= 0)
    err(`${label}: duration must be a positive number`);

  // required H1 sections, in order
  const h1s = [...md.matchAll(/^# (.+)$/gm)].map((m) => m[1].trim());
  let idx = 0;
  for (const section of REQUIRED_H1) {
    const at = h1s.indexOf(section, idx);
    if (at === -1) err(`${label}: missing or out-of-order H1 section '${section}'`);
    else idx = at + 1;
  }

  // flash cards >= 5 (Q:/A: pairs)
  const fcBlock = md.split('# Flash Cards')[1]?.split('\n# ')[0] ?? '';
  const qCount = (fcBlock.match(/^Q:/gm) || []).length;
  const aCount = (fcBlock.match(/^A:/gm) || []).length;
  if (qCount < 5) err(`${label}: expected >= 5 flash cards, found ${qCount}`);
  if (qCount !== aCount) err(`${label}: flash card Q/A mismatch (${qCount} Q vs ${aCount} A)`);

  // Examples subsections
  for (const n of [1, 2, 3]) {
    if (!new RegExp(`^## Example ${n}\\b`, 'm').test(md))
      err(`${label}: missing '## Example ${n}'`);
  }
  // Exercise tiers
  for (const tier of ['Easy', 'Medium', 'Challenging']) {
    if (!new RegExp(`^### ${tier}\\b`, 'm').test(md)) err(`${label}: missing '### ${tier}' exercise`);
  }

  // code fences only in allowed languages
  let inCode = false;
  for (const line of md.split('\n')) {
    const fence = line.match(/^```(.*)$/);
    if (!fence) continue;
    if (!inCode) {
      const lang = fence[1].trim();
      if (!ALLOWED_FENCES.has(lang))
        err(`${label}: disallowed code fence language '${lang || '(none)'}'`);
      inCode = true;
    } else {
      inCode = false;
    }
  }
  if (inCode) err(`${label}: unterminated code fence`);
}

// ---- Manifest cross-check --------------------------------------------------
let manifest = [];
try {
  manifest = buildManifest();
} catch (e) {
  err(`manifest generation failed: ${e.message}`);
}
if (manifest.length !== 24) err(`manifest should have 24 entries, has ${manifest.length}`);
manifest.forEach((entry, i) => {
  if (entry.order !== i + 1) err(`manifest not ordered: entry ${i} has order ${entry.order}`);
  const p = join(contentDir, entry.file);
  if (!existsSync(p)) err(`manifest entry ${entry.id} points to missing file ${entry.file}`);
});
const manifestOnDisk = join(contentDir, 'course-manifest.json');
if (existsSync(manifestOnDisk)) {
  const disk = JSON.parse(readFileSync(manifestOnDisk, 'utf8'));
  if (JSON.stringify(disk) !== JSON.stringify(manifest))
    err(`course-manifest.json is stale — run 'npm run manifest' to regenerate`);
} else {
  err(`course-manifest.json missing — run 'npm run manifest'`);
}

// ---- Quiz checks -----------------------------------------------------------
const quizFiles = readdirSync(quizDir).filter((n) => n.endsWith('.json'));
if (quizFiles.length !== 24) err(`expected 24 quizzes, found ${quizFiles.length}`);
const typesSeen = new Set();

for (let n = 1; n <= 24; n++) {
  const id = String(n).padStart(2, '0');
  const file = `lesson-${id}.json`;
  const path = join(quizDir, file);
  if (!existsSync(path)) {
    err(`missing quiz ${file}`);
    continue;
  }
  let quiz;
  try {
    quiz = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  if (quiz.id !== `quiz-lesson-${id}`) err(`${file}: id should be 'quiz-lesson-${id}'`);
  if (quiz.lessonId !== `lesson-${id}`) err(`${file}: lessonId should be 'lesson-${id}'`);
  if (quiz.passingScore !== 60) err(`${file}: passingScore should be 60`);
  if (!Array.isArray(quiz.questions) || quiz.questions.length < 5 || quiz.questions.length > 6)
    err(`${file}: expected 5-6 questions, found ${quiz.questions?.length ?? 0}`);

  for (const q of quiz.questions || []) {
    const ql = `${file} q '${q.id}'`;
    if (!q.id || !q.type || !q.prompt) err(`${ql}: missing id/type/prompt`);
    if (!q.explanation) err(`${ql}: missing explanation`);
    if (!QUESTION_TYPES.includes(q.type)) err(`${ql}: unknown type '${q.type}'`);
    typesSeen.add(q.type);

    if (q.type === 'single-choice') {
      const ids = (q.options || []).map((o) => o.id);
      if (ids.length < 2) err(`${ql}: single-choice needs >= 2 options`);
      if (!ids.includes(q.answer)) err(`${ql}: answer '${q.answer}' not among options`);
    } else if (q.type === 'multiple-choice') {
      const ids = (q.options || []).map((o) => o.id);
      if (!Array.isArray(q.answer) || q.answer.length < 1) err(`${ql}: multiple-choice needs answer array`);
      for (const a of q.answer || []) if (!ids.includes(a)) err(`${ql}: answer '${a}' not among options`);
    } else if (q.type === 'fill-blank') {
      if (!Array.isArray(q.answer) || q.answer.length < 1)
        err(`${ql}: fill-blank needs a non-empty answer array`);
    } else if (q.type === 'ordering') {
      const ids = (q.items || []).map((o) => o.id);
      if (ids.length < 2) err(`${ql}: ordering needs >= 2 items`);
      if (!Array.isArray(q.answer) || q.answer.length !== ids.length)
        err(`${ql}: ordering answer must permute all items`);
      else {
        const sortedA = [...q.answer].sort().join(',');
        const sortedI = [...ids].sort().join(',');
        if (sortedA !== sortedI) err(`${ql}: ordering answer is not a permutation of item ids`);
      }
    } else if (q.type === 'match-pair') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) err(`${ql}: match-pair needs >= 2 pairs`);
      for (const p of q.pairs || []) if (!p.left || !p.right) err(`${ql}: pair missing left/right`);
    }
  }
}
for (const t of QUESTION_TYPES) if (!typesSeen.has(t)) err(`no quiz uses question type '${t}'`);

// ---- Report ----------------------------------------------------------------
if (errors.length) {
  console.error(`\n✗ validate-course: ${errors.length} problem(s):\n`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ validate-course: 24 lessons (8/8/8), 24 quizzes, manifest consistent, all sections/tags/fences/schema valid`,
);
