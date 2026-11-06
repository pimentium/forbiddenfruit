# Forbidden Fruit – notes for AI-assisted development

Web app: search iOS/macOS apps, then compare app price and in-app purchases (IAP) across countries in a table (one column per country, one row per purchase). See README.md for features, setup and env vars.

## Commands

- `npm run dev` – API (tsx watch, :3001) + Vite client (:5173, proxies `/api`).
- `npm run build` – build client to `client/dist`; `npm start` serves API + built client.
- `npx tsc -p .` – typecheck (server and client). There are no tests or linter yet; verify changes by typechecking and exercising the UI/API.

## Architecture

- `server/appstore.ts` is the core: iTunes search/lookup, App Store page scraping, price parsing, in-memory cache (1 h, `cached(key, load, fresh)`), exchange rates.
- `server/index.ts`: routes `/api/{countries,rates,search,search/debug,app/:id,app/:id/pricing,app/:id/debug}`, `debugOptions()`, static serving of `client/dist`.
- `client/src/AppPage.tsx` (table, country picker, currency conversion, debug popup), `SearchPage.tsx` (two-column results, name filter), `rows.ts` (cross-country row matching), `api.ts` (typed fetch helpers + `DebugParams`), `DebugModal.tsx`, `ThemeSwitcher.tsx`, `useTitle.ts`.

## Decisions and gotchas (learned the hard way)

- **IAP source:** the only source is scraping `apps.apple.com/<cc>/app/id<id>?l=en-GB`; the JSON in `<script id="serialized-server-data">` → `shelfMapping.information.items` entry titled `In-App Purchases` (`textPair` items with `leadingText`/`trailingText`). `l=en-GB` keeps names in English so rows match across countries. The page lists only ~10 IAPs.
- **Do not use an iPhone user agent** for scraping: Apple answers with a 301 to `itms-appss://` and an empty body. `SCRAPE_USER_AGENT` can override the default (desktop Safari). The `platform=` query param has no effect.
- **macOS search:** `entity=macSoftware` also returns iOS apps that run on Apple Silicon; only `kind === 'mac-software'` is kept for the macOS list (otherwise iOS apps appear twice).
- **No ad flag** exists in the iTunes API; the "name must match" filter (`match=name`, client-side) is the only way to hide loosely related results. Missing apps for a platform are usually real (e.g. Zwift has no Mac App Store app).
- **Row matching (`rows.ts`):** key = `name#n`, where n is the index among same-name items in that country sorted by numeric price; rows sorted by label. Heuristic; misaligns if countries list different items. Prices are parsed with `parsePrice(text, currency)` using the currency's decimal places.
- **Per-country data:** app URL (with `l=en-GB`), rating and rating count come from each country's lookup, not from a global value. App price shows "Free" when price is 0.
- **URL is the state:** `countries` and `currency` params drive the app page (localStorage only supplies defaults); `q`, `match` drive search. Debug params are carried from search to app pages.
- **Debug options** work only with a valid `secret` (env `DEBUG_SECRET`, default `forbiddenfruit`): `debug=raw` (raw data popups, links to original iTunes search URLs), `debug=nocache` (skip cache for that request). The server returns the active options (`debug` array in search/pricing responses) and the client shows UI based on that, never on the URL alone.
- **Theme:** `data-theme` attribute on `<html>`, set early by an inline script in `client/index.html` and by `ThemeSwitcher`; CSS variables in `styles.css`.
- Titles: `<page> – Forbidden Fruit` (query/app name first) via `useTitle`. The top header bar was removed on request.

## Conventions

- TypeScript strict, ES modules (`.js` suffix in server imports), React function components, plain CSS with variables, no UI/state libraries.
- Keep comments short and about *why*; match the surrounding code style.
- Don't add dependencies without a clear need.

## Ideas not done

- Show "No macOS app named X" note when the filter empties a column.
- Better cross-country matching of same-named IAPs; rate limiting for public deployment; Dockerfile; tests (parsePrice, buildRows are pure and easy to test).
- Logo proposal exists at `client/public/logo.svg` but is not used in the UI yet.
