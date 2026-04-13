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
