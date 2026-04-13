# Internal Team Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-page Next.js app where an internal team can add/delete days off on a month calendar that also shows Vietnam and South Africa public holidays, deployed on Vercel with Neon Postgres.

**Architecture:** Next.js 16 App Router renders `/` as a Server Component that queries Neon Postgres and Nager.Date for holidays; mutations go through Server Actions; a small Client Component handles the grid, add dialog, and delete confirmation popover.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, shadcn/ui, Drizzle ORM, `@neondatabase/serverless`, Nager.Date API, Vitest, Playwright (optional), Vercel, Neon.

**Spec:** `docs/superpowers/specs/2026-04-14-internal-team-calendar-design.md`

---

## File Structure

**Create:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.local.example`, `README.md`
- `src/app/layout.tsx` — root layout + Tailwind import + Toaster mount
- `src/app/page.tsx` — Server Component, reads `?month=YYYY-MM`, fetches rows + holidays, renders `<CalendarView>`
- `src/app/globals.css` — Tailwind layers + shadcn variables
- `src/app/actions.ts` — `createDayOff` and `deleteDayOff` server actions
- `src/lib/db/schema.ts` — Drizzle schema for `days_off`
- `src/lib/db/client.ts` — Neon + Drizzle client
- `src/lib/db/queries.ts` — `getDaysOffForRange(start, end)`
- `src/lib/dates.ts` — `rangesOverlap`, `buildMonthGrid`, `parseMonthParam`, `formatISODate`
- `src/lib/holidays.ts` — `fetchHolidays(year, country)` with 24h cache
- `src/components/calendar-view.tsx` — Client Component, header + grid + dialog wiring
- `src/components/month-grid.tsx` — Client Component, renders the 7×N grid of cells
- `src/components/day-cell.tsx` — Client Component, renders one day's chips + overflow
- `src/components/add-day-off-dialog.tsx` — Client Component
- `src/components/day-off-popover.tsx` — Client Component with name-confirm delete
- `src/components/ui/*` — shadcn primitives (button, dialog, popover, calendar, input, textarea, toast, toaster)
- `drizzle.config.ts`, `drizzle/0000_init.sql` (generated)
- `src/lib/dates.test.ts`, `src/lib/holidays.test.ts`, `src/lib/db/queries.test.ts`, `src/app/actions.test.ts`
- `vitest.config.ts`, `vitest.setup.ts`

**No modifications** — this is a new repo.

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.env.local.example`, `README.md`

- [ ] **Step 1: Run the Next.js scaffold**

```bash
cd ~/internal-team-calendar
pnpm dlx create-next-app@latest . \
  --ts --tailwind --app --src-dir --import-alias "@/*" \
  --no-eslint --no-turbopack --use-pnpm --yes
```

Expected: files created, `pnpm install` runs, no prompts.

- [ ] **Step 2: Verify dev server boots**

```bash
pnpm dev
```

Expected: "Ready" on http://localhost:3000. Kill with Ctrl+C.

- [ ] **Step 3: Add `.env.local.example`**

Write `/Users/xymac/internal-team-calendar/.env.local.example`:

```
DATABASE_URL=postgres://user:password@host/db?sslmode=require
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold next.js app"
```

---

## Task 2: Install runtime + dev dependencies

**Files:** modifies `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd ~/internal-team-calendar
pnpm add @neondatabase/serverless drizzle-orm zod date-fns sonner \
  class-variance-authority clsx tailwind-merge lucide-react \
  @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-slot
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D drizzle-kit vitest @vitest/coverage-v8 @types/node tsx
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add runtime and dev dependencies"
```

---

## Task 3: Initialize shadcn/ui and add primitives

**Files:** creates `components.json`, `src/components/ui/*`, modifies `src/app/globals.css`, `tailwind.config.ts`

- [ ] **Step 1: Init shadcn**

```bash
pnpm dlx shadcn@latest init -d
```

Expected: `components.json` created, Tailwind theme variables added to `globals.css`.

- [ ] **Step 2: Add the primitives we need**

```bash
pnpm dlx shadcn@latest add button dialog popover input textarea label calendar sonner
```

Expected: files under `src/components/ui/` created.

- [ ] **Step 3: Mount the toaster in the root layout**

Edit `src/app/layout.tsx` — inside `<body>`, add `<Toaster />` from `"sonner"` and import it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui primitives"
```

---

## Task 4: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` (add `"test": "vitest"` script)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 2: Create `vitest.setup.ts`**

```ts
// placeholder for future global setup (e.g. env loading)
```

- [ ] **Step 3: Add test script**

Edit `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run tests (should pass with zero tests)**

```bash
pnpm test
```

Expected: "No test files found" is acceptable here, or passes trivially.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: configure vitest"
```

---

## Task 5: Date helpers (TDD)

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`

- [ ] **Step 1: Write failing tests**

Write `src/lib/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rangesOverlap, buildMonthGrid, parseMonthParam, formatISODate } from './dates';

describe('rangesOverlap', () => {
  it('returns true when ranges touch on one day', () => {
    expect(rangesOverlap('2026-04-10', '2026-04-12', '2026-04-12', '2026-04-15')).toBe(true);
  });
  it('returns true when one range fully contains the other', () => {
    expect(rangesOverlap('2026-04-01', '2026-04-30', '2026-04-10', '2026-04-12')).toBe(true);
  });
  it('returns false when ranges are disjoint', () => {
    expect(rangesOverlap('2026-04-01', '2026-04-05', '2026-04-06', '2026-04-10')).toBe(false);
  });
});

describe('buildMonthGrid', () => {
  it('returns 42 days starting on Monday for April 2026', () => {
    const grid = buildMonthGrid(2026, 4);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-03-30'); // Monday before Apr 1
    expect(grid[41]).toBe('2026-05-10');
  });
  it('marks days inside the target month', () => {
    const grid = buildMonthGrid(2026, 4);
    expect(grid).toContain('2026-04-01');
    expect(grid).toContain('2026-04-30');
  });
});

describe('parseMonthParam', () => {
  it('parses YYYY-MM', () => {
    expect(parseMonthParam('2026-04')).toEqual({ year: 2026, month: 4 });
  });
  it('falls back to current month for invalid input', () => {
    const now = new Date();
    expect(parseMonthParam('bogus')).toEqual({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
  });
});

describe('formatISODate', () => {
  it('pads month and day', () => {
    expect(formatISODate(new Date(Date.UTC(2026, 3, 5)))).toBe('2026-04-05');
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
pnpm test src/lib/dates.test.ts
```

Expected: FAIL — module `./dates` not found.

- [ ] **Step 3: Implement `src/lib/dates.ts`**

```ts
export function formatISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function parseMonthParam(input: string | null | undefined): { year: number; month: number } {
  if (input) {
    const match = /^(\d{4})-(\d{2})$/.exec(input);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12) return { year, month };
    }
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function buildMonthGrid(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const dayOfWeek = first.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (dayOfWeek + 6) % 7; // days to step back to Monday
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - mondayOffset);

  const out: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    out.push(formatISODate(d));
  }
  return out;
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
pnpm test src/lib/dates.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat(dates): add range overlap and month grid helpers"
```

---

## Task 6: Holidays fetcher (TDD)

**Files:**
- Create: `src/lib/holidays.ts`, `src/lib/holidays.test.ts`

- [ ] **Step 1: Write failing tests**

Write `src/lib/holidays.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchHolidays } from './holidays';

const sample = [
  { date: '2026-01-01', localName: "New Year's Day", name: "New Year's Day", countryCode: 'VN' },
  { date: '2026-04-30', localName: 'Reunification Day', name: 'Reunification Day', countryCode: 'VN' },
];

describe('fetchHolidays', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => sample,
    })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns holidays mapped to { date, name }', async () => {
    const res = await fetchHolidays(2026, 'VN');
    expect(res).toEqual([
      { date: '2026-01-01', name: "New Year's Day" },
      { date: '2026-04-30', name: 'Reunification Day' },
    ]);
  });

  it('returns [] when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => [] })));
    const res = await fetchHolidays(2026, 'ZA');
    expect(res).toEqual([]);
  });

  it('hits the correct Nager.Date URL', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal('fetch', spy);
    await fetchHolidays(2026, 'ZA');
    expect(spy).toHaveBeenCalledWith(
      'https://date.nager.at/api/v3/PublicHolidays/2026/ZA',
      expect.objectContaining({ next: { revalidate: 86400 } }),
    );
  });
});
```

- [ ] **Step 2: Run tests to see them fail**

```bash
pnpm test src/lib/holidays.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/holidays.ts`**

```ts
export type Holiday = { date: string; name: string };
export type CountryCode = 'VN' | 'ZA';

type NagerHoliday = { date: string; localName: string; name: string };

export async function fetchHolidays(year: number, country: CountryCode): Promise<Holiday[]> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
    if (!res.ok) return [];
    const data = (await res.json()) as NagerHoliday[];
    return data.map((h) => ({ date: h.date, name: h.name }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
pnpm test src/lib/holidays.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/holidays.ts src/lib/holidays.test.ts
git commit -m "feat(holidays): fetch VN/ZA holidays from Nager.Date with cache"
```

---

## Task 7: Database schema and client

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `drizzle.config.ts`

- [ ] **Step 1: Write `src/lib/db/schema.ts`**

```ts
import { pgTable, uuid, text, date, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const daysOff = pgTable(
  'days_off',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rangeOk: check('days_off_range_ok', sql`${t.endDate} >= ${t.startDate}`),
    startIdx: index('days_off_start_idx').on(t.startDate),
    endIdx: index('days_off_end_idx').on(t.endDate),
  }),
);

export type DayOff = typeof daysOff.$inferSelect;
export type NewDayOff = typeof daysOff.$inferInsert;
```

- [ ] **Step 2: Write `src/lib/db/client.ts`**

```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Write `drizzle.config.ts`**

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
```

- [ ] **Step 4: Generate the initial migration**

```bash
pnpm drizzle-kit generate
```

Expected: `drizzle/0000_*.sql` created containing the `days_off` CREATE TABLE.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db drizzle.config.ts drizzle
git commit -m "feat(db): add days_off schema and drizzle client"
```

---

## Task 8: Day-off query helper (TDD with integration test)

**Files:**
- Create: `src/lib/db/queries.ts`, `src/lib/db/queries.test.ts`

> Note: this task assumes `DATABASE_URL` points at a Neon branch. If the branch isn't provisioned yet, skip running the test here and revisit after Task 13. Mark the skip with `it.skip` so the file still lints.

- [ ] **Step 1: Write the query test**

Write `src/lib/db/queries.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { db } from './client';
import { daysOff } from './schema';
import { getDaysOffForRange } from './queries';

describe('getDaysOffForRange', () => {
  beforeAll(async () => {
    await db.delete(daysOff);
  });
  afterEach(async () => {
    await db.delete(daysOff);
  });

  it('returns entries that overlap the range', async () => {
    await db.insert(daysOff).values([
      { name: 'Alice', startDate: '2026-04-10', endDate: '2026-04-12' },
      { name: 'Bob',   startDate: '2026-05-01', endDate: '2026-05-01' },
    ]);
    const rows = await getDaysOffForRange('2026-04-01', '2026-04-30');
    expect(rows.map((r) => r.name)).toEqual(['Alice']);
  });
});
```

- [ ] **Step 2: Implement `src/lib/db/queries.ts`**

```ts
import { and, lte, gte, asc } from 'drizzle-orm';
import { db } from './client';
import { daysOff, type DayOff } from './schema';

export async function getDaysOffForRange(start: string, end: string): Promise<DayOff[]> {
  return db
    .select()
    .from(daysOff)
    .where(and(lte(daysOff.startDate, end), gte(daysOff.endDate, start)))
    .orderBy(asc(daysOff.startDate), asc(daysOff.name));
}
```

- [ ] **Step 3: Run the test** (only if Neon branch is ready)

```bash
DATABASE_URL=... pnpm test src/lib/db/queries.test.ts
```

Expected: PASS. If Neon not ready, mark the single test with `it.skip` and move on.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/queries.ts src/lib/db/queries.test.ts
git commit -m "feat(db): add getDaysOffForRange query"
```

---

## Task 9: Server actions (TDD)

**Files:**
- Create: `src/app/actions.ts`, `src/app/actions.test.ts`

- [ ] **Step 1: Write failing tests**

Write `src/app/actions.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/client', () => {
  const rows: any[] = [];
  return {
    db: {
      insert: () => ({ values: (v: any) => { rows.push({ id: String(rows.length + 1), ...v }); return { returning: async () => [rows[rows.length - 1]] }; } }),
      delete: () => ({ where: async (_: any) => { rows.length = 0; return [{ id: '1' }]; } }),
      select: () => ({ from: () => ({ where: async () => rows }) }),
    },
    sql: {},
    __rows: rows,
  };
});

import { createDayOff, deleteDayOff } from './actions';

describe('createDayOff', () => {
  it('rejects empty name', async () => {
    const res = await createDayOff({ name: '  ', startDate: '2026-04-10', endDate: '2026-04-10', note: null });
    expect(res.ok).toBe(false);
  });
  it('rejects end before start', async () => {
    const res = await createDayOff({ name: 'Alice', startDate: '2026-04-12', endDate: '2026-04-10', note: null });
    expect(res.ok).toBe(false);
  });
  it('inserts valid entry', async () => {
    const res = await createDayOff({ name: 'Alice', startDate: '2026-04-10', endDate: '2026-04-12', note: 'wedding' });
    expect(res.ok).toBe(true);
  });
});

describe('deleteDayOff', () => {
  it('rejects when confirmation name does not match', async () => {
    const res = await deleteDayOff({ id: '1', confirmName: 'wrong', expectedName: 'Alice' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/name/i);
  });
  it('deletes when name matches exactly', async () => {
    const res = await deleteDayOff({ id: '1', confirmName: 'Alice', expectedName: 'Alice' });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
pnpm test src/app/actions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/app/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { daysOff } from '@/lib/db/schema';

const CreateInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(280).nullable().optional(),
}).refine((v) => v.endDate >= v.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createDayOff(input: unknown): Promise<ActionResult> {
  const parsed = CreateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  await db.insert(daysOff).values({
    name: v.name,
    startDate: v.startDate,
    endDate: v.endDate,
    note: v.note ?? null,
  });
  revalidatePath('/');
  return { ok: true };
}

const DeleteInput = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  confirmName: z.string(),
  expectedName: z.string(),
});

export async function deleteDayOff(input: unknown): Promise<ActionResult> {
  const parsed = DeleteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid delete request' };
  const { id, confirmName, expectedName } = parsed.data;
  if (confirmName.trim() !== expectedName.trim()) {
    return { ok: false, error: 'Confirmation name does not match' };
  }
  await db.delete(daysOff).where(eq(daysOff.id, id));
  revalidatePath('/');
  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to see them pass**

```bash
pnpm test src/app/actions.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions.ts src/app/actions.test.ts
git commit -m "feat(actions): add createDayOff and deleteDayOff server actions"
```

---

## Task 10: Root page (Server Component)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { parseMonthParam, buildMonthGrid, formatISODate } from '@/lib/dates';
import { getDaysOffForRange } from '@/lib/db/queries';
import { fetchHolidays } from '@/lib/holidays';
import { CalendarView } from '@/components/calendar-view';

type SearchParams = Promise<{ month?: string }>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { year, month } = parseMonthParam(params.month);
  const grid = buildMonthGrid(year, month);
  const rangeStart = grid[0];
  const rangeEnd = grid[grid.length - 1];

  const [entries, vn, za] = await Promise.all([
    getDaysOffForRange(rangeStart, rangeEnd),
    fetchHolidays(year, 'VN'),
    fetchHolidays(year, 'ZA'),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <CalendarView
        year={year}
        month={month}
        grid={grid}
        entries={entries.map((e) => ({
          id: e.id,
          name: e.name,
          startDate: e.startDate,
          endDate: e.endDate,
          note: e.note,
        }))}
        holidays={{ VN: vn, ZA: za }}
      />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): wire home page to db and holidays"
```

---

## Task 11: `CalendarView` + `MonthGrid` + `DayCell`

**Files:**
- Create: `src/components/calendar-view.tsx`, `src/components/month-grid.tsx`, `src/components/day-cell.tsx`

- [ ] **Step 1: Write `src/components/calendar-view.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MonthGrid, type DayOffEntry } from './month-grid';
import { AddDayOffDialog } from './add-day-off-dialog';
import type { Holiday } from '@/lib/holidays';

type Props = {
  year: number;
  month: number;
  grid: string[];
  entries: DayOffEntry[];
  holidays: { VN: Holiday[]; ZA: Holiday[] };
};

function shift(year: number, month: number, delta: number) {
  const m = month - 1 + delta;
  const y = year + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return { year: y, month: mm + 1 };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function CalendarView({ year, month, grid, entries, holidays }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const go = (y: number, m: number) => {
    const mm = String(m).padStart(2, '0');
    router.push(`/?month=${y}-${mm}`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Internal Team Calendar</h1>
        <Button onClick={() => setAddOpen(true)}>Add day off</Button>
      </header>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { const n = shift(year, month, -1); go(n.year, n.month); }}>&larr;</Button>
        <div className="text-lg font-medium min-w-[10ch] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <Button variant="outline" size="sm" onClick={() => { const n = shift(year, month, 1); go(n.year, n.month); }}>&rarr;</Button>
        <Button variant="ghost" size="sm" onClick={() => { const now = new Date(); go(now.getUTCFullYear(), now.getUTCMonth() + 1); }}>Today</Button>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />VN</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />ZA</span>
        </div>
      </div>

      <MonthGrid year={year} month={month} grid={grid} entries={entries} holidays={holidays} />

      <AddDayOffDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/month-grid.tsx`**

```tsx
'use client';

import { DayCell } from './day-cell';
import type { Holiday } from '@/lib/holidays';

export type DayOffEntry = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

type Props = {
  year: number;
  month: number;
  grid: string[];
  entries: DayOffEntry[];
  holidays: { VN: Holiday[]; ZA: Holiday[] };
};

const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function MonthGrid({ year, month, grid, entries, holidays }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const byDay = new Map<string, DayOffEntry[]>();
  for (const iso of grid) byDay.set(iso, []);
  for (const e of entries) {
    for (const iso of grid) {
      if (iso >= e.startDate && iso <= e.endDate) {
        byDay.get(iso)!.push(e);
      }
    }
  }
  const vn = new Map(holidays.VN.map((h) => [h.date, h.name] as const));
  const za = new Map(holidays.ZA.map((h) => [h.date, h.name] as const));

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="p-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((iso) => {
          const [, mStr] = iso.split('-');
          const inMonth = Number(mStr) === month;
          return (
            <DayCell
              key={iso}
              iso={iso}
              inMonth={inMonth}
              isToday={iso === today}
              entries={byDay.get(iso) ?? []}
              vnHoliday={vn.get(iso)}
              zaHoliday={za.get(iso)}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/day-cell.tsx`**

```tsx
'use client';

import { DayOffPopover } from './day-off-popover';
import type { DayOffEntry } from './month-grid';

type Props = {
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  entries: DayOffEntry[];
  vnHoliday?: string;
  zaHoliday?: string;
};

export function DayCell({ iso, inMonth, isToday, entries, vnHoliday, zaHoliday }: Props) {
  const dayNum = Number(iso.slice(-2));
  return (
    <div className={`min-h-[110px] border-b border-r p-1.5 text-xs ${inMonth ? '' : 'bg-muted/30 text-muted-foreground'}`}>
      <div className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 ${isToday ? 'bg-primary text-primary-foreground' : ''}`}>
        {dayNum}
      </div>
      <div className="space-y-1">
        {vnHoliday && (
          <div className="truncate rounded bg-red-100 px-1.5 py-0.5 text-red-900 dark:bg-red-900/40 dark:text-red-100" title={vnHoliday}>
            {vnHoliday}
          </div>
        )}
        {zaHoliday && (
          <div className="truncate rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" title={zaHoliday}>
            {zaHoliday}
          </div>
        )}
        {entries.map((e) => (
          <DayOffPopover key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar-view.tsx src/components/month-grid.tsx src/components/day-cell.tsx
git commit -m "feat(ui): add calendar view, month grid, and day cell"
```

---

## Task 12: `AddDayOffDialog` and `DayOffPopover`

**Files:**
- Create: `src/components/add-day-off-dialog.tsx`, `src/components/day-off-popover.tsx`

- [ ] **Step 1: Write `src/components/add-day-off-dialog.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDayOff } from '@/app/actions';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function AddDayOffDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await createDayOff({
        name,
        startDate,
        endDate: endDate || startDate,
        note: note.trim() ? note.trim() : null,
      });
      if (res.ok) {
        toast.success('Day off added');
        setName(''); setStart(''); setEnd(''); setNote('');
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add day off</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !name.trim() || !startDate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write `src/components/day-off-popover.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteDayOff } from '@/app/actions';
import type { DayOffEntry } from './month-grid';

export function DayOffPopover({ entry }: { entry: DayOffEntry }) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteDayOff({ id: entry.id, confirmName, expectedName: entry.name });
      if (res.ok) {
        toast.success('Deleted');
        setOpen(false); setConfirmName('');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmName(''); }}>
      <PopoverTrigger asChild>
        <button className="block w-full truncate rounded bg-muted px-1.5 py-0.5 text-left hover:bg-muted/80">
          {entry.name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <div className="text-sm font-medium">{entry.name}</div>
        <div className="text-xs text-muted-foreground">
          {entry.startDate}{entry.endDate !== entry.startDate ? ` → ${entry.endDate}` : ''}
        </div>
        {entry.note && <div className="text-sm">{entry.note}</div>}
        <div className="space-y-1 pt-2 border-t">
          <div className="text-xs">Type <span className="font-mono">{entry.name}</span> to confirm delete:</div>
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={entry.name} />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDelete}
            disabled={pending || confirmName.trim() !== entry.name.trim()}
          >
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/add-day-off-dialog.tsx src/components/day-off-popover.tsx
git commit -m "feat(ui): add day-off dialog and delete popover"
```

---

## Task 13: Provision Neon and deploy to Vercel

**Files:** none in repo; Vercel + Neon setup

- [ ] **Step 1: Create GitHub repo and push**

```bash
cd ~/internal-team-calendar
gh repo create internal-team-calendar --public --source=. --remote=origin --push
```

- [ ] **Step 2: Link Vercel project**

```bash
pnpm dlx vercel@latest link
```

Follow prompts: create new project named `internal-team-calendar`.

- [ ] **Step 3: Add Neon from the Vercel Marketplace**

Instruct user to run (interactive):

```bash
pnpm dlx vercel@latest integrations add neon
```

Or attach via the Vercel dashboard → Storage → Marketplace → Neon → Connect to project. This sets `DATABASE_URL` as a Vercel env var automatically.

- [ ] **Step 4: Pull env vars locally**

```bash
pnpm dlx vercel@latest env pull .env.local
```

Expected: `.env.local` contains `DATABASE_URL`.

- [ ] **Step 5: Run the Drizzle migration against Neon**

```bash
pnpm drizzle-kit migrate
```

Expected: `days_off` table created on Neon.

- [ ] **Step 6: Run DB integration test against Neon**

```bash
pnpm test src/lib/db/queries.test.ts
```

Expected: PASS. Unskip any previously-skipped test from Task 8.

- [ ] **Step 7: Deploy preview**

```bash
pnpm dlx vercel@latest deploy
```

Expected: preview URL printed. Visit it, verify the calendar renders with this month's VN/ZA holidays, and add + delete a test entry end-to-end.

- [ ] **Step 8: Promote to production**

```bash
pnpm dlx vercel@latest deploy --prod
```

- [ ] **Step 9: Commit any config that changed**

```bash
git add -A
git commit -m "chore: deploy to vercel with neon postgres" || true
git push
```

---

## Self-Review Notes

- Spec coverage: every v1 requirement (month grid, add, delete with name confirm, VN/ZA holidays color-coded, no auth, Neon+Drizzle, Nager.Date, Server Actions) maps to a task.
- Types used consistently: `DayOffEntry` defined in Task 11 and imported by Task 12; `Holiday` defined in Task 6 and imported by Tasks 10–11; `ActionResult` defined in Task 9 and used by Task 12.
- No placeholders or "similar to" references.
- Known caveat: Task 8's integration test depends on a live Neon branch. The plan tells the engineer to `it.skip` until Task 13 provisions Neon, then unskip in Task 13 Step 6.
