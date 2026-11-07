# Forbidden Fruit

Compare App Store prices across countries. Search for an iOS or macOS app, open it, pick one or more countries, and get a table with one column per country and one row for the app price plus one row per in-app purchase. Prices can be shown in each country's local currency or converted to a single currency.

## Features

- Search iOS and macOS apps (results in two columns), with an optional "name must match the query" filter.
- App page with app price and in-app purchases per country, ratings and a link to the App Store page for each country.
- Currency conversion (USD and EUR listed first) using daily exchange rates.
- Shareable URLs: selected countries and currency live in the query string.
- Light, dark or system theme.
- Hidden debug options (raw upstream data, cache bypass), protected by a secret.

## How it works

- App search, price, rating and review count come from Apple's public iTunes Search/Lookup API.
- **In-app purchases are scraped** from the App Store product page (`apps.apple.com/<country>/app/id<id>?l=en-GB`), which embeds them as JSON. This is unofficial and may break if Apple changes the page. The page lists only about 10 purchases per app.
- Exchange rates come from [open.er-api.com](https://open.er-api.com) (no key required).
- Responses are cached in memory for one hour.

## Requirements

Node.js 20 or newer.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express server on port 3001.

## Production

```bash
npm ci
npm run build      # builds the client into client/dist
npm start          # serves the API and client/dist on PORT (default 3001)
```

Put a reverse proxy with HTTPS (Caddy, nginx) in front of it.

### Docker

```bash
docker build -t forbiddenfruit .
docker run --rm -p 127.0.0.1:3001:3001 -e DEBUG_SECRET=change-me forbiddenfruit
```

The image runs as a non-root user and works with a read-only root file system.

To serve the app under a URL prefix (for example behind a reverse proxy at `https://example.com/forbiddenfruit/`), pass the prefix at **build** time. It is baked into the client (asset URLs, router base, API calls):

```bash
docker build --build-arg BASE_PATH=/forbiddenfruit/ -t forbiddenfruit .
```

The proxy must strip the prefix before passing requests on (`proxy_pass http://127.0.0.1:3001/;` with a trailing slash), and redirect `/forbiddenfruit` to `/forbiddenfruit/`. Without `BASE_PATH` the app is served from the root. The same variable works for `npm run build`.

Google Analytics in the image: add `--build-arg VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` (the `.env` file is not copied into the image, see `.dockerignore`).

| Environment variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `3001` |
| `DEBUG_SECRET` | Secret that enables the debug URL options. **Set your own.** | `forbiddenfruit` |
| `SCRAPE_USER_AGENT` | User agent used to fetch App Store pages | desktop Safari |

## Google Analytics (optional)

Set a GA4 measurement ID when building the client; without it no analytics code is included:

```bash
cp .env.example .env        # then set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
npm run build
```

The ID is baked in at build time (it is public by nature), so rebuild after changing it. Page views are sent on page changes and when the search query changes, but not when countries or currency are toggled. The `secret` and `debug` URL parameters are removed from what is sent to Google. The app does not show a cookie-consent banner; add one if your audience requires it.

## URL parameters

| Page | Parameter | Meaning |
|---|---|---|
| `/` | `q` | Search query |
| `/` | `match=name` | Only show apps whose name contains every query word |
| `/app/:id` | `countries` | Comma-separated lowercase country codes, e.g. `us,de,jp` |
| `/app/:id` | `currency` | `local` or an ISO currency code, e.g. `EUR` |
| any | `secret`, `debug` | Debug options (`raw`, `nocache`, comma-separated). Ignored unless `secret` matches `DEBUG_SECRET`. |

Example: `/app/570060128?countries=us,de,jp&currency=EUR&secret=…&debug=raw,nocache`

## Project layout

```
server/            Express API (TypeScript, run with tsx)
  index.ts         routes, debug option handling, static file serving
  appstore.ts      iTunes API calls, App Store page scraping, price parsing, caching, exchange rates
  storefronts.ts   list of App Store country codes
client/            React + Vite frontend
  src/SearchPage.tsx, AppPage.tsx   the two pages
  src/rows.ts      matching of in-app purchases across countries
```

## Limitations

- Scraping Apple's pages is unofficial and against Apple's terms; heavy use from one IP may be rate-limited or blocked.
- Same-named purchases (e.g. several subscription tiers) are matched across countries by price order, which is a heuristic and can misalign when countries list different items.
- Converted prices use market exchange rates, not Apple's price tiers.
