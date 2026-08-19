import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Restores scroll on navigation (mirrors Angular's scrollPositionRestoration +
 * anchorScrolling): jump to top on a path change, or scroll to the hash target
 * when there is one — retrying briefly since lesson content loads async and its
 * heading ids only appear after render.
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer: number | undefined;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 30) timer = window.setTimeout(tryScroll, 100);
    };
    tryScroll();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname, hash]);

  return null;
}
