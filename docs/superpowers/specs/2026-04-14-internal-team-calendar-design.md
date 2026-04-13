# Internal Team Calendar — Design

**Date:** 2026-04-14
**Status:** Approved

## Purpose

A simple shared webapp for an internal team to book days off and view public
holidays for Vietnam and South Africa on a single month calendar. Trust-based,
no authentication.

## Non-goals

- Authentication, roles, or per-user accounts
- Approval workflows or manager sign-off
- Notifications, email, or integrations (Slack, Google Calendar, etc.)
- Reporting, leave balances, or PTO accounting
- Recurring entries
- Timezone handling beyond a single project-wide assumption

## Scope (v1)

1. Month-grid calendar at `/`, prev/next/today navigation
2. Add a day off: name + date range (start/end) + optional note
3. Delete a day off (requires re-typing the entry's name to confirm)
4. Always show Vietnam and South Africa public holidays, color-coded
5. Public, no login, anyone with the URL can read and write

## Architecture

- **Framework:** Next.js 16 App Router, TypeScript
- **UI:** Tailwind CSS + shadcn/ui primitives (dialog, popover, button, calendar, toast)
- **Hosting:** Vercel (Fluid Compute, Node.js 24 LTS)
- **Database:** Neon Postgres, provisioned through the Vercel Marketplace
- **DB client:** `@neondatabase/serverless` with Drizzle ORM for schema and migrations
- **Mutations:** Next.js Server Actions (no separate REST API surface)
- **Holiday source:** [Nager.Date](https://date.nager.at) public API:
  `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{VN|ZA}`
  Fetched server-side inside a Server Component / Route Handler using
  `fetch(url, { next: { revalidate: 86400 } })` so the response is cached for
  24 hours via Next's data cache.
- **Proxy/middleware:** Not needed in v1. If added later, use `proxy.ts` (Next 16).

### Request flow

1. User hits `/` → Server Component renders for the current month.
2. Server Component queries `days_off` for rows overlapping the visible range
   and calls the Nager.Date fetch helpers for VN and ZA (both years if the
   month straddles a year boundary).
3. Client Component renders the month grid, dialogs, and popovers.
4. Add/Delete go through Server Actions that mutate Postgres and call
   `revalidatePath('/')`.

## Data model

Single Postgres table:

```sql
create table days_off (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  note        text,
  created_at  timestamptz not null default now(),
  constraint days_off_range_ok check (end_date >= start_date)
);

create index days_off_start_idx on days_off (start_date);
create index days_off_end_idx   on days_off (end_date);
```

- Single-day entries use `start_date = end_date`.
- Holidays are **not** stored; they come from Nager.Date at render time.
- Month-range query:
  `select * from days_off where start_date <= :month_end and end_date >= :month_start order by start_date, name;`

## UI

Single page at `/`.

### Header

- App title: "Internal Team Calendar"
- Month label (e.g. "April 2026") with prev / next chevrons and a "Today" button
- "Add day off" button (opens the Add dialog)

### Month grid

- 7 columns (Mon–Sun), 5–6 rows depending on month
- Each cell shows the day number and a stack of chips:
  - **Day off chip:** neutral background, person's name (truncated with
    ellipsis past ~12 chars); clickable
  - **Vietnam holiday chip:** red background, holiday name; non-clickable
  - **South Africa holiday chip:** green background, holiday name; non-clickable
- Today's cell is visually highlighted
- Multi-day days-off render a chip on every day in the range (simplest v1;
  spanning bars can come later)

### Add dialog

- Field: **Name** (required, text)
- Field: **Start date** (required, shadcn calendar picker)
- Field: **End date** (required, defaults to start date)
- Field: **Note** (optional, short textarea)
- Submit → server action → dialog closes, toast confirms, grid revalidates
- Basic client-side validation: name non-empty, end >= start

### Day-off detail popover

- Opens on click of a day-off chip
- Shows: name, date range, note (if any), created timestamp
- **Delete** button reveals a confirmation input: user must retype the exact
  name on the entry before the delete button enables. Submit → server action.

### Empty / loading / error states

- First load: skeleton month grid
- Mutation errors: toast with the error message; dialog stays open
- Holiday fetch failure: calendar still renders with a muted banner
  ("Couldn't load holidays") and an inline retry link

### Mobile

- Same grid; cells shrink. If a cell has more than N chips, collapse overflow
  into a "+X more" badge that opens a popover listing all entries for that day.

## Color coding

- Day-off chip: `bg-muted text-foreground`
- Vietnam holiday: `bg-red-100 text-red-900` (dark: `bg-red-900/40 text-red-100`)
- South Africa holiday: `bg-emerald-100 text-emerald-900`
  (dark: `bg-emerald-900/40 text-emerald-100`)

## Error handling

- Server Actions return `{ ok: true } | { ok: false, error: string }`; the
  client surfaces errors via toast and leaves the dialog open.
- DB connection failures bubble up as a 500 rendered by the nearest
  `error.tsx` boundary with a retry link.
- Holiday API failures are caught in the fetch helper; the page still renders.

## Testing

- **Unit:** date-range overlap helper, month-grid date math, name-confirm
  matcher
- **Integration (Vitest + pg):** server actions against a Neon branch —
  create, delete (happy path + wrong-name rejection), month-range query
- **E2E (Playwright, optional v1):** add a day off, see it on the grid,
  delete it with name confirmation

## Deployment

- New repo at `~/internal-team-calendar`, pushed to GitHub
- Vercel project linked via `vercel link`
- Neon Postgres added via Vercel Marketplace; `DATABASE_URL` pulled via
  `vercel env pull`
- Drizzle migration run against Neon before first deploy
- Preview deploys on PRs; production on `main`

## Open questions (deferred past v1)

- Timezone (assume project-wide single TZ; revisit if team spans more)
- Editing an existing entry (v1 is delete + re-add)
- Multi-day entries as spanning bars instead of per-day chips
- Export to iCal
