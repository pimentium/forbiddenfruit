import { STOREFRONTS } from './storefronts.js';

export type Platform = 'iOS' | 'macOS';

export interface AppSummary {
  id: string;
  name: string;
  artist: string;
  icon: string;
  platform: Platform;
  category: string;
  rating?: number;
  ratingCount?: number;
}

export interface Purchase {
  name: string;
  price: string;
  /** Numeric amount in the storefront currency, when it could be parsed. */
  value?: number;
}

export interface CountryPricing {
  country: string;
  available: boolean;
  error?: string;
  currency?: string;
  appPrice?: string;
  appPriceValue?: number;
  /** Storefront-specific product page, rating and review count. */
  url?: string;
  rating?: number;
  ratingCount?: number;
  purchases: Purchase[];
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
// An iPhone user agent makes apps.apple.com answer with a redirect to itms-appss:// and no HTML, so the page is
// fetched as desktop Safari unless SCRAPE_USER_AGENT says otherwise.
const SCRAPE_UA = process.env.SCRAPE_USER_AGENT ?? UA;

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 60 * 60 * 1000;

/** `fresh` skips the cached value but still stores the new one. */
async function cached<T>(key: string, load: () => Promise<T>, fresh = false): Promise<T> {
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function toSummary(r: any): AppSummary {
  return {
    id: String(r.trackId),
    name: r.trackName,
    artist: r.artistName,
    icon: r.artworkUrl100 ?? r.artworkUrl512 ?? r.artworkUrl60,
    platform: r.kind === 'mac-software' ? 'macOS' : 'iOS',
    category: r.primaryGenreName,
    rating: r.averageUserRating,
    ratingCount: r.userRatingCount,
  };
}

/** Adds l=en-GB so the App Store page opens in English whatever the storefront. */
function englishUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set('l', 'en-GB');
  return u.toString();
}

export function isCountry(c: string): boolean {
  return STOREFRONTS.includes(c);
}

const SEARCH_ENTITIES = { ios: 'software', mac: 'macSoftware' } as const;

const searchUrl = (term: string, entity: string, country: string) =>
  `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=25&country=${country}`;

export async function searchApps(term: string, country = 'us', fresh = false): Promise<AppSummary[]> {
  return cached(`search:${country}:${term.toLowerCase()}`, async () => {
    const [ios, mac] = await Promise.all(
      Object.values(SEARCH_ENTITIES).map((entity) => getJson(searchUrl(term, entity, country))),
    );
    // The macSoftware query also returns iOS apps that run on Apple Silicon Macs; those are already in the iOS list.
    return [...ios.results, ...mac.results.filter((r: any) => r.kind === 'mac-software')]
      .filter((r: any) => r.trackId)
      .map(toSummary);
  }, fresh);
}

/** The upstream search requests (links open the original results) and their unprocessed responses, fetched fresh. */
export async function getRawSearch(term: string, country = 'us') {
  const urls = Object.fromEntries(Object.entries(SEARCH_ENTITIES).map(([k, e]) => [k, searchUrl(term, e, country)]));
  const entries = await Promise.all(
    Object.entries(urls).map(async ([k, u]) => [k, await getJson(u).catch((e: Error) => ({ error: e.message }))] as const),
  );
  return { urls, responses: Object.fromEntries(entries) };
}

async function lookup(id: string, country: string, fresh = false): Promise<any | null> {
  return cached(`lookup:${country}:${id}`, async () => {
    const data = await getJson(`https://itunes.apple.com/lookup?id=${id}&country=${country}`);
    return data.results?.[0] ?? null;
  }, fresh);
}

/** Finds app metadata, trying the US storefront first and then a few others. */
export async function getApp(id: string, fresh = false): Promise<(AppSummary & { description: string; url: string }) | null> {
  for (const c of ['us', 'gb', 'de', 'jp']) {
    const r = await lookup(id, c, fresh);
    if (r) return { ...toSummary(r), description: r.description ?? '', url: r.trackViewUrl };
  }
  return null;
}

/** Parses a localised price such as "1.299,00 €", "¥9,900" or "Rp 15.000" using the currency's decimal places. */
export function parsePrice(text: string, currency: string): number | undefined {
  const m = text.replace(/[^\d.,]/g, '');
  if (!/\d/.test(m)) return undefined;
  let decimals = 2;
  try {
    decimals = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {}
  const sep = Math.max(m.lastIndexOf('.'), m.lastIndexOf(','));
  const hasFraction = decimals > 0 && sep >= 0 && m.length - sep - 1 <= decimals;
  const whole = (hasFraction ? m.slice(0, sep) : m).replace(/\D/g, '');
  return Number(`${whole || 0}.${hasFraction ? m.slice(sep + 1) : 0}`);
}

let rates: { at: number; value: Record<string, number> } | null = null;

/** Exchange rates with USD as the base currency (open.er-api.com, refreshed daily). */
export async function getRates(): Promise<Record<string, number>> {
  if (rates && Date.now() - rates.at < 24 * 3600 * 1000) return rates.value;
  const data = await getJson('https://open.er-api.com/v6/latest/USD');
  if (data.result !== 'success') throw new Error('Could not load exchange rates');
  rates = { at: Date.now(), value: data.rates };
  return rates.value;
}

/** The raw "In-App Purchases" section of the App Store page's embedded JSON (undefined if the app has none). */
async function scrapeSection(id: string, country: string, fresh = false): Promise<any> {
  return cached(`iap:${country}:${id}`, async () => {
    // ?l=en-GB keeps item labels in English regardless of storefront, so rows can be matched across countries.
    const res = await fetch(`https://apps.apple.com/${country}/app/id${id}?l=en-GB`, {
      headers: { 'User-Agent': SCRAPE_UA, 'Accept-Language': 'en-GB,en;q=0.9' },
    });
    if (!res.ok) throw new Error(`App Store page HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
    if (!m) throw new Error('App Store page layout not recognised');
    const page = JSON.parse(m[1]).data?.[0]?.data;
    return page?.shelfMapping?.information?.items?.find((i: any) => i.title === 'In-App Purchases') ?? null;
  }, fresh);
}

function toPurchases(section: any): Purchase[] {
  return (section?.items ?? [])
    .filter((i: any) => i.$kind === 'textPair')
    .map((i: any) => ({ name: i.leadingText, price: i.trailingText }));
}

/** Raw upstream data for one app in one country, for debugging. */
export async function getDebugInfo(id: string, country: string, fresh = false) {
  const [lookupResult, section] = await Promise.all([
    lookup(id, country, fresh),
    scrapeSection(id, country, fresh).catch((e: Error) => ({ error: e.message })),
  ]);
  return {
    pageUrl: `https://apps.apple.com/${country}/app/id${id}?l=en-GB`,
    parsed: lookupResult ? toPurchases(section).map((p) => ({ ...p, value: parsePrice(p.price, lookupResult.currency) })) : [],
    inAppPurchasesSection: section,
    lookupUrl: `https://itunes.apple.com/lookup?id=${id}&country=${country}`,
    lookup: lookupResult,
  };
}

export async function getCountryPricing(id: string, country: string, fresh = false): Promise<CountryPricing> {
  try {
    const meta = await lookup(id, country, fresh);
    if (!meta) return { country, available: false, purchases: [] };
    const purchases = await scrapeSection(id, country, fresh).then(toPurchases).catch(() => null);
    return {
      country,
      available: true,
      currency: meta.currency,
      appPrice: meta.price === 0 ? 'Free' : (meta.formattedPrice ?? String(meta.price)),
      appPriceValue: meta.price,
      url: englishUrl(meta.trackViewUrl),
      rating: meta.averageUserRating,
      ratingCount: meta.userRatingCount,
      purchases: (purchases ?? []).map((p) => ({ ...p, value: parsePrice(p.price, meta.currency) })),
      ...(purchases === null && { error: 'Could not load in-app purchases' }),
    };
  } catch (e) {
    return { country, available: false, purchases: [], error: (e as Error).message };
  }
}
