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
