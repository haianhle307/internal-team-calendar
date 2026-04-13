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

  void year;

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
