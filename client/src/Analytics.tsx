import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageView } from './ga';

initAnalytics();

/** Reports a page view when the page or the search query changes (not for country or currency toggles). */
export function Analytics() {
  const { pathname, search } = useLocation();
  const query = new URLSearchParams(search).get('q') ?? '';

  useEffect(() => {
    // Wait briefly so pages can set their title (the app name arrives after a fetch).
    const timer = setTimeout(() => trackPageView(pathname + (query ? `?q=${encodeURIComponent(query)}` : ''), document.title), 800);
    return () => clearTimeout(timer);
  }, [pathname, query]);

  return null;
}
