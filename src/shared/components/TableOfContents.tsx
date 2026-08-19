import { Link, useLocation } from 'react-router-dom';
import type { TocEntry } from '../../core/models/lesson';

export function TableOfContents({ entries }: { entries: TocEntry[] }) {
  const { pathname } = useLocation();
  if (!entries.length) return null;

  return (
    <nav className="text-sm" aria-label="On this page">
      <p className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink-400 uppercase">
        <span className="gradient-rule h-0.5 w-3 shrink-0" />
        On this page
      </p>
      <ul className="space-y-0.5 border-l-2 border-ink-200 dark:border-ink-800">
        {entries.map((entry) => (
          <li key={entry.id}>
            {/* Keep the current path and only change the hash, so clicking a TOC
                entry scrolls in place rather than navigating away. */}
            <Link
              to={{ pathname, hash: `#${entry.id}` }}
              className={`focusable -ml-0.5 block border-l-2 border-transparent py-1.5 font-medium text-ink-500 transition hover:border-brand-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300 ${
                entry.level === 1 ? 'pl-4' : entry.level === 2 ? 'pl-6' : 'pl-8'
              }`}
            >
              {entry.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
