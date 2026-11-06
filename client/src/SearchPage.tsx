import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppSummary, getSearchDebug, searchApps } from './api';
import { DebugModal, DebugState } from './DebugModal';
import { useTitle } from './useTitle';

const normalize = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const secret = params.get('secret') ?? undefined;
  const debug = params.get('debug') ?? undefined;
  const debugParams = useMemo(() => ({ secret, debug }), [secret, debug]);
  const nameMatch = params.get('match') === 'name';
  useTitle(query || undefined);
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<AppSummary[] | null>(null);
  const [debugOptions, setDebugOptions] = useState<string[]>([]);
  const [rawView, setRawView] = useState<DebugState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return void setResults(null);
    let stale = false;
    setLoading(true);
    setError('');
    searchApps(query, debugParams)
      .then((r) => {
        if (stale) return;
        setResults(r.results);
        setDebugOptions(r.debug);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [query, debugParams]);

  const toggleNameMatch = (on: boolean) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (on) next.set('match', 'name');
      else next.delete('match');
      return next;
    }, { replace: true });

  // The API also returns "related" apps; this keeps only those whose name contains every word of the query.
  const shown = useMemo(() => {
    if (!results || !nameMatch) return results;
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return results.filter((a) => words.every((w) => normalize(a.name).includes(w)));
  }, [results, nameMatch, query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Keep the debug parameters when searching again.
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (input.trim()) next.set('q', input.trim());
      else next.delete('q');
      return next;
    });
  };

  const openRaw = () => {
    setRawView({});
    getSearchDebug(query, debugParams)
      .then((data) => setRawView({ data }))
      .catch((e) => setRawView({ error: e.message }));
  };

  const appLink = (id: string) => {
    const carry = new URLSearchParams();
    if (secret) carry.set('secret', secret);
    if (debug) carry.set('debug', debug);
    return carry.size ? `/app/${id}?${carry}` : `/app/${id}`;
  };

  const rawLinks = rawView?.data
    ? Object.entries((rawView.data as { urls: Record<string, string> }).urls).map(([k, url]) => ({
        label: `Original ${k === 'mac' ? 'macOS' : 'iOS'} search results`,
        url,
      }))
    : undefined;

  return (
    <main className="wide">
      <p className="muted">Search iOS and macOS apps, then compare prices and in-app purchases across countries.</p>
      <form className="search" onSubmit={submit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search apps…" autoFocus />
        <button type="submit">Search</button>
      </form>
      <label className="muted small">
        <input type="checkbox" checked={nameMatch} onChange={(e) => toggleNameMatch(e.target.checked)} /> Only show apps
        whose name matches the query
      </label>
      {loading && <p className="muted">Searching…</p>}
      {error && <p className="error">{error}</p>}
      {shown && !loading && shown.length === 0 && <p className="muted">No apps found for “{query}”{nameMatch && results?.length ? ' with a matching name' : ''}.</p>}
      {debugOptions.includes('raw') && query && (
        <p>
          <button className="debug-btn" onClick={openRaw}>Raw search results</button>
        </p>
      )}
      {shown && !loading && shown.length > 0 && (
        <div className="columns">
          {(['iOS', 'macOS'] as const).map((platform) => {
            const apps = shown.filter((a) => a.platform === platform);
            return (
              <section key={platform}>
                <h2>{platform}</h2>
                {apps.length === 0 && <p className="muted">No {platform} apps found.</p>}
                <ul className="results">
                  {apps.map((a) => (
                    <li key={a.id}>
                      <Link to={appLink(a.id)}>
                        <img src={a.icon} alt="" width={56} height={56} />
                        <div>
                          <strong>{a.name}</strong>
                          <div className="muted">
                            {a.artist} · {a.category}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {rawView && (
        <DebugModal
          title={`Raw search results – “${query}”`}
          data={rawView.data}
          error={rawView.error}
          links={rawLinks}
          onClose={() => setRawView(null)}
        />
      )}
    </main>
  );
}
