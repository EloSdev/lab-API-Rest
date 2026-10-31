# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A course lab (Lemoncode "Frontend moderno", Module 05 · API REST). The full assignment is in `docs/enunciado.txt` (Spanish) — read it before doing lab work; it defines required deliverables (O1–O5), optional tasks (P1–P5) and challenges (D1–D3), plus the expected `README.md` content. Reference theory lives in `docs/repo_info/concepts/` (REST intro + endpoint design); upstream course repo URL is in `docs/repo_info/url_repo.txt`.

The student must be able to explain every request, so prefer clear, explicit code over clever abstractions. The assignment lists common AI mistakes to avoid (e.g. `mode: "no-cors"`, reading JSON on a 204, not checking `response.ok`, treating `AbortError` as a real error, `forEach(async …)`, `as Hotel` instead of validation) — don't introduce them.

Two independent npm projects, no root package, no tests, no linter:

- `hotels-server/` — Express 5 + TypeScript REST API, run with `tsx`.
- `client/` — Vanilla TypeScript + Vite front end (no framework).

## Commands

```powershell
# Server (port 3000, tsx watch — restarts on any file save)
cd hotels-server; npm install; npm run dev

# Server with CORS enabled (PowerShell)
$env:USE_CORS="yes"; npm run dev

# Client dev server (Vite, port 5173 — cross-origin to the API)
cd client; npm install; npm run dev

# Client production build: tsc type-check + vite build, then postbuild copies dist into hotels-server/front
cd client; npm run build
```

Type-check only: `npx tsc` in `client/` (`noEmit`). The server has no build/typecheck script; use `npx tsc --noEmit` in `hotels-server/`.

`client`'s `postbuild` uses `cp -r`, a POSIX command — it may fail under npm's default Windows shell (cmd.exe). `hotels-server/front/assets/` also accumulates old hashed bundles because nothing cleans it.

## Server architecture (`hotels-server/src`)

- `index.ts` — all routes inline: `GET/POST /api/hotels`, `GET/PUT/DELETE /api/hotels/:id`, `GET /api/cities`. Every response is wrapped as `{ data: ... }`; errors as `{ error: { code, message } }` with 500.
- `middleware.ts` — `checkContentTypeJSON` mounted on `/api`: returns **406** unless the `Accept` header is *exactly* `application/json` (so axios's default `application/json, text/plain, */*` fails too).
- `config.ts` — `USE_CORS=yes` env var and port 3000.
- `data-layer/` — in-memory repositories (`HotelRepository` backed by a `Map`, `CityReppository` [sic] backed by an array) seeded from `mock-data.ts`. **Data resets on every restart**, including tsx-watch restarts on save. New hotel IDs are `crypto.randomUUID()`.

Middleware order matters and is intentionally "wrong" for the lab:
1. `morgan` → `express.json()` → Accept check on `/api` → then static/CORS.
2. Because the Accept check runs **before** `cors()`, CORS preflight `OPTIONS` requests (which don't send `Accept: application/json`) get 406 — this is challenge D1.
3. With `USE_CORS=yes`, static files are served from `public/` (hotel thumbnails) and `cors()` is applied to `/api`; without it, static files come from `front/` (the built client), so the client is served same-origin at `http://localhost:3000`.

Deliberate deviations from REST theory (students must discover and handle them, and D1 asks to fix them):
- `GET /api/hotels/:id` for a missing ID returns **200 with `{}`** (`res.json({ data: undefined })`), not 404.
- `PUT`/`DELETE` on missing IDs don't 404 either; `DELETE` always returns 204 with no body.
- No input validation on `POST` (D1 asks for 400 with `{ error: { code, message, field } }`).

The server `Hotel` type has ~30 fields; the client is expected to model only the fields it uses (`id, name, city, lowRate, highRate`).

## Client (`client/src`)

Currently the Vite starter (`main.ts` renders into `#app`, `action.ts` wires a button). The lab adds `hotels.api.ts` (generic `request<T>` over `fetch` + CRUD functions) and buttons in `main.ts`. The API base URL should come from `VITE_API_BASE` in `client/.env` (e.g. `http://localhost:3000/api`). TS config uses `verbatimModuleSyntax` and `allowImportingTsExtensions` — imports use explicit `.ts` extensions and `import type` for types.

## Deliverable constraints

- Neither `node_modules` nor `dist` may be committed; `hotels-server` has no `.gitignore` yet (one must be created before the first commit). This folder is not yet a git repo.
- Root `README.md` (not yet created) must contain the O1 status-code table, answers to the 📝 questions, screenshots (in `docs/` or `screenshots/`), a task checklist, and an "AI log" (Bitácora de IA) with at least 3 prompt/result/correction entries.
