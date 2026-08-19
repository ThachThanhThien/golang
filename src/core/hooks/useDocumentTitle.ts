import { useEffect } from 'react';

/** Sets document.title while mounted (mirrors Angular's route `title`). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
