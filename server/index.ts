import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { getApp, getCountryPricing, getDebugInfo, getRates, getRawSearch, isCountry, searchApps } from './appstore.js';
import { STOREFRONTS } from './storefronts.js';

const app = express();

app.get('/api/countries', (_req, res) => {
  res.json(STOREFRONTS);
});

app.get('/api/rates', async (_req, res) => {
  try {
    res.json(await getRates());
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// Debug options only work together with a valid `secret`: `raw` exposes upstream data, `nocache` skips the cache.
const DEBUG_SECRET = process.env.DEBUG_SECRET ?? 'forbiddenfruit';
const DEBUG_OPTIONS = ['raw', 'nocache'];

function debugOptions(req: express.Request): string[] {
  if (req.query.secret !== DEBUG_SECRET) return [];
  return String(req.query.debug ?? '').split(',').filter((o) => DEBUG_OPTIONS.includes(o));
}

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const debug = debugOptions(req);
  if (!q) return void res.json({ debug, results: [] });
  try {
    res.json({ debug, results: await searchApps(q, 'us', debug.includes('nocache')) });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

app.get('/api/search/debug', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!debugOptions(req).includes('raw')) return void res.status(403).json({ error: 'Forbidden' });
  if (!q) return void res.status(400).json({ error: 'Missing query' });
  res.json(await getRawSearch(q));
});

app.get('/api/app/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return void res.status(400).json({ error: 'Invalid app id' });
  try {
    const found = await getApp(req.params.id, debugOptions(req).includes('nocache'));
    if (!found) return void res.status(404).json({ error: 'App not found' });
    res.json(found);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

app.get('/api/app/:id/pricing', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return void res.status(400).json({ error: 'Invalid app id' });
  const countries = [...new Set(String(req.query.countries ?? '').split(',').filter(isCountry))].slice(0, 30);
  const debug = debugOptions(req);
  const fresh = debug.includes('nocache');
  res.json({ debug, pricing: await Promise.all(countries.map((c) => getCountryPricing(id, c, fresh))) });
});

app.get('/api/app/:id/debug', async (req, res) => {
  const { id } = req.params;
  const country = String(req.query.country ?? '');
  const debug = debugOptions(req);
  if (!debug.includes('raw')) return void res.status(403).json({ error: 'Forbidden' });
  if (!/^\d+$/.test(id) || !isCountry(country)) return void res.status(400).json({ error: 'Invalid app id or country' });
  try {
    res.json(await getDebugInfo(id, country, debug.includes('nocache')));
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
