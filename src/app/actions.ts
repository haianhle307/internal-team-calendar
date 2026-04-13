'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { daysOff } from '@/lib/db/schema';

const CreateInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(280).nullable().optional(),
}).refine((v) => v.endDate >= v.startDate, { message: 'End date must be on or after start date', path: ['endDate'] });

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createDayOff(input: unknown): Promise<ActionResult> {
  const parsed = CreateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  await db.insert(daysOff).values({
    name: v.name,
    startDate: v.startDate,
    endDate: v.endDate,
    note: v.note ?? null,
  });
  revalidatePath('/');
  return { ok: true };
}

const DeleteInput = z.object({
  id: z.string().min(1),
  confirmName: z.string(),
  expectedName: z.string(),
});

export async function deleteDayOff(input: unknown): Promise<ActionResult> {
  const parsed = DeleteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid delete request' };
  const { id, confirmName, expectedName } = parsed.data;
  if (confirmName.trim() !== expectedName.trim()) {
    return { ok: false, error: 'Confirmation name does not match' };
  }
  await db.delete(daysOff).where(eq(daysOff.id, id));
  revalidatePath('/');
  return { ok: true };
}
