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
