import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppDetails, CountryPricing, getApp, getCountries, getDebug, getPricing, getRates } from './api';
import { buildRows } from './rows';
import { DebugModal } from './DebugModal';
import { useTitle } from './useTitle';

const LOCAL = 'local';
const TOP_CURRENCIES = ['USD', 'EUR'];

const stored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function format(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (c: string) => {
  try {
    return regionNames.of(c.toUpperCase()) ?? c.toUpperCase();
  } catch {
    return c.toUpperCase();
  }
};

export function AppPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const [debugView, setDebugView] = useState<{ country: string; data?: unknown; error?: string } | null>(null);
  const [debugOptions, setDebugOptions] = useState<string[]>([]);
  const [app, setApp] = useState<AppDetails | null>(null);
  useTitle(app?.name);
  const [error, setError] = useState('');
  const [all, setAll] = useState<string[]>([]);
  const [pricing, setPricing] = useState<CountryPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  // The URL is the source of truth (so result links can be shared); localStorage only supplies defaults.
  const countriesParam = search.get('countries') ?? stored('pref.countries') ?? 'us';
  const currency = search.get('currency') ?? stored('pref.currency') ?? LOCAL;
  const selected = useMemo(() => countriesParam.split(',').filter((c) => /^[a-z]{2}$/.test(c)), [countriesParam]);
  const secret = search.get('secret') ?? undefined;
  const debug = search.get('debug') ?? undefined;
  const debugParams = useMemo(() => ({ secret, debug }), [secret, debug]);

  const update = (patch: Record<string, string>) =>
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) next.set(k, v);
      return next;
    }, { replace: true });
  const setSelected = (list: string[]) => update({ countries: list.join(',') });
  const setCurrency = (c: string) => update({ currency: c });

  // Put the effective choices into the URL and remember them for next time.
  useEffect(() => {
    if (!search.has('countries') || !search.has('currency')) update({ countries: countriesParam, currency });
    try {
      localStorage.setItem('pref.countries', countriesParam);
      localStorage.setItem('pref.currency', currency);
    } catch {}
  }, [countriesParam, currency]);

  const openDebug = (country: string) => {
    setDebugView({ country });
    getDebug(id, country, debugParams)
      .then((data) => setDebugView({ country, data }))
      .catch((e) => setDebugView({ country, error: e.message }));
  };

  useEffect(() => {
    getApp(id, debugParams).then(setApp).catch((e) => setError(e.message));
    getCountries().then(setAll).catch(() => {});
    getRates().then(setRates).catch(() => {});
  }, [id, debugParams]);

  useEffect(() => {
    if (!selected.length) return void setPricing([]);
    let stale = false;
    setLoading(true);
    getPricing(id, selected, debugParams)
      .then((r) => {
        if (stale) return;
        setPricing(r.pricing);
        setDebugOptions(r.debug);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [id, selected, debugParams]);

  const options = useMemo(
    () => all.map((c) => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name)),
    [all],
  );
  const rows = useMemo(() => buildRows(pricing), [pricing]);
  const byCountry = useMemo(() => new Map(pricing.map((p) => [p.country, p])), [pricing]);
  const ordered = selected.filter((c) => byCountry.has(c));

  const converting = currency !== LOCAL && rates?.[currency] != null;
  /** Shows the converted amount with the original price beneath it, or just the original price. */
  const show = (original: string, value: number | undefined, from: string | undefined) => {
    if (!converting || !value || !from || !rates![from]) return original;
    const converted = (value / rates![from]) * rates![currency];
    return (
      <>
        {format(converted, currency)}
        {from !== currency && <div className="muted small">{original}</div>}
      </>
    );
  };

  const add = (code: string) => code && !selected.includes(code) && setSelected([...selected, code]);
  const remove = (code: string) => setSelected(selected.filter((c) => c !== code));

  if (error && !app) return <main><Link to="/">← Back</Link><p className="error">{error}</p></main>;
  if (!app) return <main><p className="muted">Loading…</p></main>;

  return (
    <main className="wide">
      <Link to="/" onClick={(e) => { if (history.length > 1) { e.preventDefault(); navigate(-1); } }}>
        ← Back to results
      </Link>
      <header className="app-head">
        <img src={app.icon} alt="" width={96} height={96} />
        <div>
          <h1>{app.name}</h1>
          <div className="muted">
            {app.artist} · {app.category} · <span className={`badge ${app.platform === 'macOS' ? 'mac' : ''}`}>{app.platform}</span>
          </div>
        </div>
      </header>

      <section className="picker">
        <label>
          Add country{' '}
          <select value="" onChange={(e) => add(e.target.value)}>
            <option value="">Select a country…</option>
            {options.map((o) => (
              <option key={o.code} value={o.code} disabled={selected.includes(o.code)}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="currency">
          Show prices in{' '}
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!rates}>
            <option value={LOCAL}>Local currency</option>
            {rates && (
              <>
                {TOP_CURRENCIES.filter((c) => rates[c]).map((c) => <option key={c} value={c}>{c}</option>)}
                <option disabled>──────</option>
                {Object.keys(rates).filter((c) => !TOP_CURRENCIES.includes(c)).sort().map((c) => <option key={c} value={c}>{c}</option>)}
              </>
            )}
          </select>
        </label>
        <div className="chips">
          {selected.map((c) => (
            <button key={c} className="chip" onClick={() => remove(c)} title="Remove">
              {countryName(c)} ✕
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading prices…</p>}
      {!selected.length && <p className="muted">Pick one or more countries to see prices.</p>}

      {ordered.length > 0 && (
        <div className={`table-wrap ${loading ? 'dim' : ''}`}>
          <table>
            <thead>
              <tr>
                <th></th>
                {ordered.map((c) => (
                  <th key={c}>
                    {countryName(c)}
                    <div className="muted small">{byCountry.get(c)!.currency ?? ''}</div>
                    {(() => {
                      const p = byCountry.get(c)!;
                      return p.available && p.url ? (
                        <div className="small">
                          <a href={p.url} target="_blank" rel="noreferrer">App Store ↗</a>
                          {p.rating ? <div className="muted">★ {p.rating.toFixed(1)} · {compact.format(p.ratingCount ?? 0)} ratings</div> : <div className="muted">No ratings</div>}
                        </div>
                      ) : null;
                    })()}
                    {debugOptions.includes('raw') && <button className="debug-btn" onClick={() => openDebug(c)}>Raw data</button>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="app-row">
                <th>App price</th>
                {ordered.map((c) => {
                  const p = byCountry.get(c)!;
                  return <td key={c}>{p.available ? show(p.appPrice!, p.appPriceValue, p.currency) : <span className="muted">Not available</span>}</td>;
                })}
              </tr>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th>{r.label}</th>
                  {ordered.map((c) => (
                    <td key={c}>{r.prices[c] ? show(r.prices[c].price, r.prices[c].value, byCountry.get(c)!.currency) : <span className="muted">—</span>}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <th colSpan={ordered.length + 1} className="muted">No in-app purchases listed.</th>
                </tr>
              )}
            </tbody>
          </table>
          {pricing.some((p) => p.error) && (
            <p className="error small">
              {pricing.filter((p) => p.error).map((p) => `${countryName(p.country)}: ${p.error}`).join(' · ')}
            </p>
          )}
          <p className="muted small">
            In-app purchases come from the App Store product page, which lists only the most prominent items. A dash
            means that item is not listed in that country.
          </p>
        </div>
      )}
      {debugView && (
        <DebugModal
          title={`Raw purchases data – ${countryName(debugView.country)}`}
          data={debugView.data}
          error={debugView.error}
          onClose={() => setDebugView(null)}
        />
      )}
    </main>
  );
}
