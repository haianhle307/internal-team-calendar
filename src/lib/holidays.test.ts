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
