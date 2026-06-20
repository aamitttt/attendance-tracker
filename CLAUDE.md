# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All backend commands run from `backend/`, frontend from `frontend/`.

```bash
# Backend (Node/Express + MongoDB, ESM)
npm install
cp .env.example .env        # defaults target a local mongod on :27017
npm run seed                # wipe + reseed: 3 teams, 10 users, ~2 weeks of data
npm start                   # API on :4000
npm run dev                 # same, with --watch reload
npm test                    # node:test runner (test/*.test.js)
node --test test/hours.test.js                       # single test file
node --test --test-name-pattern "missing checkout"   # single test by name

# Frontend (React + Vite)
npm install
npm run dev                 # :5173, proxies /api → :4000
npm run build               # production build (also the lint/typecheck gate)
```

There is no separate lint step; `npm run build` is what catches frontend breakage. Requires a
running MongoDB (a standalone `mongod` works — see the transaction note below).

## Architecture

Two independent apps: an Express/Mongoose JSON API (`backend/`) and a React SPA (`frontend/`)
that talks to it over `/api`. Three roles — **employee · manager · admin** — with access scoped
**server-side**.

### Backend invariants (read these before editing controllers)

- **Calendar days are `"YYYY-MM-DD"` UTC strings, not `Date`s.** Attendance, work logs, and leave
  all store a `day`/`startDay`/`endDay` string key. Range and overlap logic is plain string
  comparison (`$gte`/`$lte`). Only `checkIn`/`checkOut` are real `Date` instants. All day math
  lives in `utils/time.js` — use it, never hand-roll date arithmetic.

- **RBAC has a single source of truth: `utils/scope.js`.** Do not re-implement access checks in a
  controller. The pattern, used by every data endpoint:
  - List queries start their Mongo filter from `await userScopeFilter(actor)` (employee→self,
    manager→team, admin→`{}`).
  - A targeted `?user=<id>` read calls `assertCanAccessUser(actor, id)` first (throws 403).
  - Writes (work logs, attendance) call `assertCanWriteFor(actor, ownerId)` — owner-or-admin only.
  - Manager/admin-only routes are gated by `requireRole(...)` middleware in the route file.
  Together these mean a manager's query is *physically incapable* of returning another team's rows.

- **`authenticate` re-loads the user from the DB every request** rather than trusting the JWT body,
  so role/team changes and deactivations take effect immediately.

- **Validated query params land on `req.validatedQuery`, not `req.query`.** The `validate(schema,
  'query')` middleware writes there (Express's `req.query` is treated as read-only). Body
  validation replaces `req.body` in place.

- **Errors flow through `utils/ApiError.js` + the central handler.** Wrap async controllers in
  `asyncHandler`; throw `badRequest/forbidden/notFound/conflict/...`. `middleware/error.js` also
  maps Mongo `11000` → 409 and Mongoose `ValidationError` → 400. Don't `res.status().json()` errors
  manually.

- **Leave approval debits balance atomically and survives a standalone mongod.** Balance is changed
  with a conditional `findOneAndUpdate({ leaveBalance: { $gte: days } }, { $inc: -days })` so it can
  never go negative. This runs inside `withOptionalTransaction` (`utils/tx.js`), which uses a real
  transaction on a replica set and silently falls back to sessionless execution when transactions
  aren't supported.

- **Attendance integrity is enforced by a unique `{ user, day }` index** (no double check-in), and
  business rules live in `utils/hours.js`: `isLate` (configurable threshold) and `computeHours`,
  which caps a forgotten check-out at `STANDARD_DAY_HOURS` and flags `missingCheckout`. Thresholds
  come from `config/env.js` (`.env`).

Layering per resource: `routes/` (auth + validate + role guards) → `controllers/` (logic) →
`models/`. Zod schemas are centralized in `utils/validators.js`.

### Frontend

- `api/client.js` is a thin `fetch` wrapper that injects the JWT and throws an `Error` (with
  `.status`/`.details`) on non-2xx.
- `context/AuthContext.jsx` owns the session: stores the token in `localStorage`, bootstraps the
  user via `GET /auth/me` on load.
- `App.jsx`'s `Protected` gate mirrors server roles for navigation, but this is convenience only —
  the server enforces access regardless (defense in depth). Don't rely on client gating for
  security.
- Responsiveness is pure CSS in `styles.css` (no JS): the sidebar becomes a sticky top bar and
  tables scroll inside their card below ~760px.

## Notes

- Seed users all share password `Password123` (e.g. `admin@acme.test`, `maya@acme.test` manager,
  `eli@acme.test` employee). `npm run seed` is destructive — it clears all collections first.
- The README has the full API table, ER diagram (Mermaid), and the design trade-offs.
