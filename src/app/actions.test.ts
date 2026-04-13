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
