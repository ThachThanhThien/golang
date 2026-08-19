import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './shared/components/Navbar';
import { Footer } from './shared/components/Footer';
import { ScrollManager } from './shared/components/ScrollManager';

// Lazy-loaded routes (mirrors Angular's loadComponent per route).
const Home = lazy(() => import('./features/home/Home').then((m) => ({ default: m.Home })));
const Roadmap = lazy(() => import('./features/roadmap/Roadmap').then((m) => ({ default: m.Roadmap })));
const Dashboard = lazy(() =>
  import('./features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const Bookmarks = lazy(() =>
  import('./features/bookmarks/Bookmarks').then((m) => ({ default: m.Bookmarks })),
);
const SearchPage = lazy(() =>
  import('./features/search/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const LessonPage = lazy(() =>
  import('./features/lesson/LessonPage').then((m) => ({ default: m.LessonPage })),
);
const QuizPage = lazy(() => import('./features/quiz/QuizPage').then((m) => ({ default: m.QuizPage })));

// Vite's BASE_URL is "/" in dev and "/<repo>/" on GitHub Pages. React Router wants a
// basename without a trailing slash, so normalize it and keep the router aligned with base.
const ROUTER_BASENAME = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-xl bg-ink-200 dark:bg-ink-800" />
        <div className="h-4 w-2/3 rounded bg-ink-200 dark:bg-ink-800" />
        <div className="h-40 w-full rounded-2xl bg-ink-200 dark:bg-ink-800" />
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <ScrollManager />
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="focusable sr-only rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>

        <Navbar />

        {/* pb-20 keeps content clear of the fixed mobile bottom nav. */}
        <main id="main" className="flex-1 pb-20 md:pb-0">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/lesson/:slug" element={<LessonPage />} />
              <Route path="/lesson/:slug/quiz" element={<QuizPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
