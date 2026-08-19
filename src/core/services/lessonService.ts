import type { Lesson, LessonMeta, TocEntry } from '../models/lesson';
import { assetUrl } from './asset';

/**
 * Fetches lesson markdown files, strips YAML front-matter, and builds a table
 * of contents from the headings. Results are cached by slug.
 */
const cache = new Map<string, Lesson>();

export async function loadLesson(meta: LessonMeta): Promise<Lesson> {
  const cached = cache.get(meta.slug);
  if (cached) return cached;

  const res = await fetch(assetUrl(`content/${meta.file}`));
  if (!res.ok) throw new Error(`Failed to load lesson: ${meta.file}`);
  const raw = await res.text();

  const content = stripFrontMatter(raw);
  const toc = buildToc(content);
  const lesson: Lesson = { meta, content, toc };
  cache.set(meta.slug, lesson);
  return lesson;
}

/** Removes a leading `--- ... ---` YAML block if present. */
function stripFrontMatter(raw: string): string {
  const match = /^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw);
  return match ? raw.slice(match[0].length).trimStart() : raw;
}

/** Builds TOC entries from `#`/`##`/`###` headings, skipping fenced code blocks. */
function buildToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    if (!m) continue;

    const level = m[1].length;
    const text = m[2].replace(/[#*`]/g, '').trim();
    const id = slugify(text, seen);
    entries.push({ id, text, level });
  }
  return entries;
}

/** Mirrors the id generation used for rendered headings so anchors line up. */
export function slugify(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}
