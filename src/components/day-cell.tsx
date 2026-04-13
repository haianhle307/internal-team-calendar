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
