export type Holiday = { date: string; name: string };
export type CountryCode = 'VN' | 'ZA';

type NagerHoliday = { date: string; localName: string; name: string };

export async function fetchHolidays(year: number, country: CountryCode): Promise<Holiday[]> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
    if (!res.ok) return [];
    const data = (await res.json()) as NagerHoliday[];
    return data.map((h) => ({ date: h.date, name: h.name }));
  } catch {
    return [];
  }
}
