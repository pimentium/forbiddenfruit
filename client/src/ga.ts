const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

let ready = false;

function gtag(..._args: unknown[]) {
  // gtag.js expects the `arguments` object itself, not an array
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/** Loads Google Analytics 4 when VITE_GA_MEASUREMENT_ID was set at build time; does nothing otherwise. */
export function initAnalytics() {
  if (ready || !MEASUREMENT_ID || !/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) return;
  ready = true;
  window.dataLayer = window.dataLayer || [];
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
  gtag('js', new Date());
  // Page views are sent manually because this is a single-page app.
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

/** Sends a page view. Debug parameters (`secret`, `debug`) are removed so the secret never reaches Google. */
export function trackPageView(pathAndQuery: string, title: string) {
  if (!ready) return;
  // Router paths exclude the base path the app may be served under (BASE_PATH), so add it back.
  const url = new URL(import.meta.env.BASE_URL.replace(/\/$/, '') + pathAndQuery, location.origin);
  url.searchParams.delete('secret');
  url.searchParams.delete('debug');
  gtag('event', 'page_view', { page_location: url.toString(), page_path: url.pathname + url.search, page_title: title });
}
