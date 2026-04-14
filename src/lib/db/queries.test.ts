import { describe, it, expect } from 'vitest';

describe('getDaysOffForRange (requires live Neon)', () => {
  it('returns entries that overlap the range', async () => {
    const { db } = await import('./client');
    const { daysOff } = await import('./schema');
    const { getDaysOffForRange } = await import('./queries');

    await db.delete(daysOff);
    await db.insert(daysOff).values([
      { name: 'Alice', startDate: '2026-04-10', endDate: '2026-04-12' },
      { name: 'Bob',   startDate: '2026-05-01', endDate: '2026-05-01' },
    ]);
    const rows = await getDaysOffForRange('2026-04-01', '2026-04-30');
    expect(rows.map((r) => r.name)).toEqual(['Alice']);

    await db.delete(daysOff);
  });
});
