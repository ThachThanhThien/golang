import { NavLink, Link } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { GoLogo } from './GoLogo';

const links = [
  { path: '/', label: 'Home', icon: 'M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8', end: true },
  {
    path: '/roadmap',
    label: 'Roadmap',
    icon: 'M9 4.5 3 7v12.5l6-2.5 6 2.5 6-2.5V4.5l-6 2.5-6-2.5Zm0 0v12.5m6-10v12.5',
    end: false,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-4H4v4ZM14 8h6V4h-6v4Z',
    end: false,
  },
  { path: '/bookmarks', label: 'Bookmarks', icon: 'M6 4h12v16l-6-4-6 4V4Z', end: false },
];

export function Navbar() {
  const { isDark, toggle } = useTheme();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-ink-50/85 backdrop-blur-xl dark:border-ink-800/80 dark:bg-ink-950/85">
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-4 sm:px-6" aria-label="Main">
          <Link to="/" className="focusable group mr-1 flex shrink-0 items-center gap-2.5 rounded-xl py-1">
            <GoLogo className="h-8 w-8 text-brand-500 transition duration-500 group-hover:scale-110" />
            <span className="text-base font-extrabold text-ink-900 dark:text-white">
              Learn <span className="gradient-text">Go</span>
            </span>
          </Link>

          {/* Desktop links; on mobile these live in the bottom bar instead. */}
          <div className="ml-3 hidden flex-1 items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `focusable rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="flex-1 md:hidden" />

          <Link to="/search" className="btn-icon" aria-label="Search lessons" title="Search lessons">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={toggle}
            className="btn-icon"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title="Toggle theme"
          >
            {isDark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      {/*
        Mobile navigation. The four destinations fit the bottom-bar limit of five,
        and each keeps an icon + label so the target is discoverable.
      */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-ink-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-ink-800 dark:bg-ink-950/95"
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.end}
              className={({ isActive }) =>
                `focusable relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] font-semibold transition ${
                  isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-500 dark:text-ink-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="gradient-rule absolute top-0 h-0.5 w-8 rounded-b-full" />
                  )}
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {link.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
