import { z } from "zod";

export type Holiday = { date: string; name: string };
export type CountryCode = "VN" | "ZA";

const nagerHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string(),
});
const nagerResponseSchema = z.array(nagerHolidaySchema);

export async function fetchHolidays(year: number, country: CountryCode): Promise<Holiday[]> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
    if (!res.ok) {
      console.error(`fetchHolidays: ${url} returned ${res.status}`);
      return [];
    }
    const json = await res.json();
    const parsed = nagerResponseSchema.safeParse(json);
    if (!parsed.success) {
      console.error(`fetchHolidays: schema mismatch for ${url}`, parsed.error.issues);
      return [];
    }
    return parsed.data.map((h) => ({ date: h.date, name: h.name }));
  } catch (err) {
    console.error(`fetchHolidays: request failed for ${url}`, err);
    return [];
  }
}
