# Security Report — internal-team-calendar

**Date:** 2026-04-14
**Scope:** source tree, dependencies, Next.js config, server actions, DB layer
**Commit:** `76f0d10` (main)

## Summary

| Severity | Count | Area |
|---|---|---|
| Critical | 1 | No auth on server actions / DB (data integrity) |
| High | 1 | `deleteDayOff` name-confirmation bypassable |
| Moderate | 3 | Missing security headers; unvalidated external API; dev-dep CVE |
| Low | 3 | UUID not enforced on `id`; silent holiday fetch failures; no rate limit |

No SQL injection, XSS, or secret-leak vectors found. Production dependencies are clean.

---

## Critical

### C1. Server actions have no authentication or authorization
**Files:** `src/app/actions.ts`, `src/lib/db/schema.ts`

`createDayOff` and `deleteDayOff` are `'use server'` actions with Zod validation but **no auth check**. The `days_off` table has no `user_id`/owner column and no row-level security. Any visitor who can load the page — or call the action endpoint directly — can create or delete any record.

**Impact:** full read/write/delete of the entire calendar by anonymous users. For an "internal team" tool exposed on the public internet via Vercel, this is the dominant risk.

**Fix:** add authentication (Vercel's built-in auth, NextAuth, or a middleware-enforced SSO gate) and gate both server actions on a verified session before any DB call. Add an `owner_id` column if per-user isolation is desired.

---

## High

### H1. `deleteDayOff` confirmation is client-trusted and bypassable
**File:** `src/components/day-off-popover.tsx`, `src/app/actions.ts`

The popover passes `expectedName: entry.name` from client state to the server action. The server compares `confirmName === expectedName` — both values are attacker-controlled, so sending `{ id, confirmName: "x", expectedName: "x" }` deletes any record by UUID.

**Fix:** look up the record server-side and compare `confirmName` against the DB's actual `name`. Do not accept `expectedName` from the client.

```ts
const row = await db.select().from(daysOff).where(eq(daysOff.id, id)).limit(1);
if (!row[0] || row[0].name.trim() !== confirmName.trim()) throw new Error('…');
```

---

## Moderate

### M1. No HTTP security headers configured
**File:** `next.config.ts`

The Next.js config is an empty stub. There is no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy, and no `serverActions.allowedOrigins` restriction.

**Fix:** add a `headers()` block (or a `routes.cacheControl`-style config in `vercel.ts`) setting at minimum:
- `Content-Security-Policy` (tight default-src)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

Set `experimental.serverActions.allowedOrigins` to the production domain(s).

### M2. External holiday API response not runtime-validated
**File:** `src/lib/holidays.ts`

`fetchHolidays` calls `https://date.nager.at/api/v3/PublicHolidays/…` and casts the JSON response to `NagerHoliday[]` with no Zod parse. If the upstream schema drifts or is compromised, malformed/malicious data flows straight into the UI. Failures are silently swallowed to `[]` with no logging.

**Fix:** parse the response with a Zod schema; log (at least `console.error`) on failure so drift is visible.

### M3. Dev-dependency CVE — esbuild ≤ 0.24.2 (GHSA-67mh-4wv8-2f99)
**Source:** `pnpm audit` (1 moderate, 0 high, 0 critical across 636 deps)

`drizzle-kit > @esbuild-kit/esm-loader > @esbuild-kit/core-utils > esbuild@0.18.20` has permissive CORS on its dev server, letting any website read dev-server responses if a developer is running it while browsing a malicious page. **Dev-only**, not a production-runtime risk.

**Fix:** upgrade `drizzle-kit` to a version whose transitive `esbuild` is ≥ 0.25.0, or add a `pnpm.overrides` pin:
```json
"pnpm": { "overrides": { "esbuild": ">=0.25.0" } }
```

---

## Low

### L1. `deleteDayOff` accepts any string as `id`
`deleteDayOff` schema validates `id` as a plain non-empty string rather than a UUID. Not exploitable on its own (Drizzle parameterizes the query) but enables wasted DB round-trips from garbage input.

**Fix:** `z.string().uuid()`.

### L2. Silent failures in `fetchHolidays`
Network errors and non-OK responses both return `[]` with no logging — production holiday outages will be invisible.

**Fix:** `console.error` on catch and on `!res.ok`.

### L3. No rate limiting on server actions
With no auth (C1), there is also no per-IP / per-user rate limit on `createDayOff` / `deleteDayOff`. A loop can fill or wipe the table.

**Fix:** add a rate limiter (e.g. `@upstash/ratelimit` via Vercel KV/Upstash, or Vercel BotID) keyed on IP until auth lands.

---

## What's already good

- **SQL injection:** safe. All DB writes go through Drizzle parameterized methods; no raw SQL.
- **XSS:** no `dangerouslySetInnerHTML`, `eval`, or direct `innerHTML` writes anywhere in `src/`.
- **Secrets:** `.gitignore` correctly excludes `.env*` while allowing `.env*.example`. `DATABASE_URL` is checked at startup and throws if missing.
- **DB integrity:** `days_off_range_ok` Postgres CHECK constraint enforces `end_date >= start_date` as defense-in-depth beyond Zod.
- **Server-action CSRF:** Next.js provides built-in same-origin checks for server actions (tighten further via `allowedOrigins` — see M1).
- **Production dependencies:** 0 high, 0 critical vulnerabilities in 636 scanned deps.

---

## Recommended order of remediation

1. **C1** — gate the app behind auth. Everything else is secondary until this is fixed.
2. **H1** — server-side name lookup in `deleteDayOff`.
3. **M1** — security headers in `next.config.ts` / `vercel.ts`.
4. **M3** — pin `esbuild ≥ 0.25.0` via pnpm override.
5. **M2, L1, L2, L3** — hardening pass.
