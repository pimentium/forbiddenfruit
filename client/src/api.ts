export interface AppSummary {
  id: string;
  name: string;
  artist: string;
  icon: string;
  platform: 'iOS' | 'macOS';
  category: string;
  rating?: number;
  ratingCount?: number;
}

export interface AppDetails extends AppSummary {
  description: string;
  url: string;
}

export interface Purchase {
  name: string;
  price: string;
  value?: number;
}

export interface CountryPricing {
  country: string;
  available: boolean;
  error?: string;
  currency?: string;
  appPrice?: string;
  appPriceValue?: number;
  url?: string;
  rating?: number;
  ratingCount?: number;
  purchases: Purchase[];
}

// The app may be served under a prefix (Vite `base`, e.g. /forbiddenfruit/); API URLs below start with /api.
const apiBase = import.meta.env.BASE_URL.replace(/\/$/, '');

async function get<T>(url: string): Promise<T> {
  const res = await fetch(apiBase + url);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
  return res.json();
}

/** Debug query parameters (`secret` + `debug` option list) forwarded from the page URL; the server validates them. */
export interface DebugParams {
  secret?: string;
  debug?: string;
}

const debugQuery = (d: DebugParams) =>
  d.secret ? `&secret=${encodeURIComponent(d.secret)}&debug=${encodeURIComponent(d.debug ?? '')}` : '';

export const getApp = (id: string, d: DebugParams) => get<AppDetails>(`/api/app/${id}?${debugQuery(d).slice(1)}`);
export const getCountries = () => get<string[]>('/api/countries');
export const getRates = () => get<Record<string, number>>('/api/rates');
export const getPricing = (id: string, countries: string[], d: DebugParams) =>
  get<{ debug: string[]; pricing: CountryPricing[] }>(`/api/app/${id}/pricing?countries=${countries.join(',')}${debugQuery(d)}`);
export const getDebug = (id: string, country: string, d: DebugParams) =>
  get<unknown>(`/api/app/${id}/debug?country=${country}${debugQuery(d)}`);

export const searchApps = (q: string, d: DebugParams) =>
  get<{ debug: string[]; results: AppSummary[] }>(`/api/search?q=${encodeURIComponent(q)}${debugQuery(d)}`);
export const getSearchDebug = (q: string, d: DebugParams) =>
  get<unknown>(`/api/search/debug?q=${encodeURIComponent(q)}${debugQuery(d)}`);
