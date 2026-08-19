export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

/** A single entry in course-manifest.json. */
export interface LessonMeta {
  id: string;
  slug: string;
  title: string;
  level: LessonLevel;
  order: number;
  /** Estimated reading time in minutes. */
  duration: number;
  /** Path to the markdown file, relative to /content. */
  file: string;
  /** Optional short description shown on cards. */
  summary?: string;
  tags?: string[];
}

/** A heading extracted from lesson markdown, used to build the table of contents. */
export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

/** A fully loaded lesson: metadata plus rendered-ready markdown body. */
export interface Lesson {
  meta: LessonMeta;
  /** Raw markdown with front-matter stripped. */
  content: string;
  toc: TocEntry[];
}

export const LEVELS: LessonLevel[] = ['beginner', 'intermediate', 'advanced'];

export const LEVEL_LABELS: Record<LessonLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const LEVEL_BLURBS: Record<LessonLevel, string> = {
  beginner:
    'Go from zero — what the language is and why it exists, installing the toolchain, then the core building blocks: variables and types, functions, control flow, slices and maps, structs and methods, and how packages and modules organize a program.',
  intermediate:
    'The ideas that make Go distinctive — interfaces and composition, errors as values, then its headline feature: concurrency with goroutines, channels, and the sync toolkit. Rounded out with testing, generics, and a tour of the standard library.',
  advanced:
    'Production Go — context and cancellation, building HTTP services, the memory model and performance, profiling with pprof, reflection and struct tags, modules and distribution, and running services in production, ending in a concurrent CLI capstone.',
};

/** Badge utility class per level; defined in index.css. */
export const LEVEL_BADGES: Record<LessonLevel, string> = {
  beginner: 'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced: 'badge-advanced',
};

/** Gradient stops for each level's accent bar — a distinct hue per difficulty. */
export const LEVEL_ACCENTS: Record<LessonLevel, string> = {
  beginner: 'from-emerald-400 to-teal-500',
  intermediate: 'from-amber-400 to-orange-500',
  advanced: 'from-violet-400 to-purple-600',
};
