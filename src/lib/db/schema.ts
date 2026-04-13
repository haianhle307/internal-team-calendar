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
