import { useEffect } from 'react';

export const SITE_NAME = 'Forbidden Fruit';

/** Sets the tab title to "<page> – Forbidden Fruit" (just the site name when there is no page title). */
export function useTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} – ${SITE_NAME}` : SITE_NAME;
  }, [page]);
}
