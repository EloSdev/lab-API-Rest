# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A course lab (Lemoncode "Frontend moderno", Module 05 · API REST): a vanilla TypeScript `fetch` client working against a hotels REST API — CRUD, cross-origin calls (CORS/preflight), parallel, failing and cancelled requests. `README.md` (Spanish) is the deliverable: per-task sections (🛠️ what was done / 🔎 checks / 📝 answers), screenshots, checklist and an AI log. Keep it in sync when behavior changes.

The author must be able to explain every request, so prefer clear, explicit code over clever abstractions. Avoid the usual fetch pitfalls: `mode: "no-cors"`, reading JSON on a 204, not checking `response.ok`, treating `AbortError` as a real error, `forEach(async …)`, `as Hotel` instead of runtime validation.

Two independent npm projects, no root package, no tests, no linter:

- `hotels-server/` — Express 5 + TypeScript REST API, run with `tsx`.
- `client/` — Vanilla TypeScript + Vite front end (no framework).

## Commands

```powershell
# Server (port 3000, tsx watch — restarts on any file save)
cd hotels-server; npm install; npm run dev

# Server with CORS enabled / disabled again in the same PowerShell session
$env:USE_CORS="yes"; npm run dev
Remove-Item Env:USE_CORS; npm run dev

# Client dev server (Vite, port 5173 — cross-origin to the API)
cd client; npm install; npm run dev

# Client production build: tsc type-check + vite build
cd client; npm run build
```

Type-check only: `npx tsc` in `client/` (`noEmit`). The server has no build/typecheck script; use `npx tsc --noEmit` in `hotels-server/`.

On this machine npm has `ignore-scripts=true`, so `client`'s `postbuild` (`cp -r dist/ ../hotels-server/front`) never runs. After `npm run build`, copy manually: `Copy-Item dist\* ..\hotels-server\front -Recurse -Force` (from `client/`). Don't change the npm setting. `hotels-server/front/assets/` accumulates old hashed bundles because nothing cleans it.

The server usually runs in the user's own terminal — ask them to restart it (e.g. to toggle `USE_CORS`) rather than killing it.

## Server architecture (`hotels-server/src`)

- `index.ts` — all routes inline: `GET/POST /api/hotels`, `GET/PUT/DELETE /api/hotels/:id`, `GET /api/cities`. Every response is wrapped as `{ data: ... }`; errors as `{ error: { code, message } }` with 500. Unknown `/api/*` routes get Express's default 404.
- `middleware.ts` — `checkContentTypeJSON` mounted on `/api`: returns **406** unless the `Accept` header is *exactly* `application/json` (so axios's default `application/json, text/plain, */*` fails too).
- `config.ts` — `USE_CORS=yes` env var and port 3000.
- `data-layer/` — in-memory repositories (`HotelRepository` backed by a `Map`, `CityReppository` [sic] backed by an array) seeded from `mock-data.ts`. **Data resets on every restart**, including tsx-watch restarts on save. New hotel IDs are `crypto.randomUUID()`.

Middleware order matters and is intentionally "wrong":
1. `morgan` → `express.json()` → Accept check on `/api` → then static/CORS.
2. Because the Accept check runs **before** `cors()`, CORS preflight `OPTIONS` requests (browser sends `Accept: */*`) get 406 and never reach `cors()`, so cross-origin POST/PUT fail. Fixing this is challenge D1.
3. With `USE_CORS=yes`, static files are served from `public/` (hotel thumbnails) and `cors()` is applied to `/api`; without it, static files come from `front/` (the built client), so the client is served same-origin at `http://localhost:3000`.

Deliberate deviations from REST theory (D1 asks to fix them):
- `GET /api/hotels/:id` for a missing ID returns **200 with `{}`** (`res.json({ data: undefined })`), not 404.
- `PUT`/`DELETE` on missing IDs don't 404 either; `DELETE` always returns 204 with no body.
- No input validation on `POST` (D1 asks for 400 with `{ error: { code, message, field } }`).

## Client (`client/src`)

- `hotels.api.ts` — client-side models with only the fields the front uses (`Hotel { id, name, city, lowRate, highRate }`, `NewHotel = Omit<Hotel, 'id'>`, `City`), and the exported generic `request<T>(path, options)`: always sends `Accept: application/json`, adds `Content-Type: application/json` only when there's a body, throws `"<METHOD> <URL> failed with status <code>"` when `!response.ok`, returns `undefined` on 204, otherwise `body.data`. CRUD functions on top: `getHotels(signal?)`, `getHotel(id)` (returns `null` when the server answers `{}`), `createHotel`, `updateHotel`, `deleteHotel`, `getCities`.
- `main.ts` — renders the buttons plus a `<pre id="output">`: "Probar CRUD" (logs the CRUD walk-through to the console), "Cargar todo" (`Promise.all` vs sequential, timed with `performance.now()`), "Cargar con fallo" (`Promise.all` vs `Promise.allSettled` with `/nope`), "Recargar" (aborts the previous request with an `AbortController`; `AbortError` is swallowed on purpose).
- The API base URL comes from `VITE_API_BASE` in `client/.env` (`http://localhost:3000/api`). Vite only reads `.env` files from `client/`, not the repo root. Don't read `.env` contents; check presence only.
- TS config uses `verbatimModuleSyntax` and `allowImportingTsExtensions` — imports use explicit `.ts` extensions and `import type` for types. Style: single quotes, no semicolons.

Timing comparisons on `localhost` are meaningless (no latency to overlap); measure with network throttling (e.g. Slow 4G).

## Repo conventions

- Root `.gitignore` ignores `node_modules/`; `client/.gitignore` also ignores `dist`. Never commit either.
- Screenshots referenced from `README.md` live in `screenshots/` and must be real browser/DevTools captures, never recreations.
- The user reviews and commits each step themselves — don't commit unless asked.
