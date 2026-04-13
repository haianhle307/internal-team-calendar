import { parseMonthParam, buildMonthGrid } from '@/lib/dates';
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
