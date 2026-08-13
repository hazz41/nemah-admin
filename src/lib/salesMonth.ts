/**
 * Derives the calendar month a sale belongs to, in Nemah's business timezone
 * rather than whatever timezone the admin's browser happens to be in.
 *
 * Must stay byte-identical with `foods/src/utils/salesMonth.ts` and
 * `restaurant-dashboard/src/lib/salesMonth.ts` — all three derive
 * `monthlySales` doc ids (`{storeId}_{month}`) independently, and a
 * disagreement here means the admin queries a month key no merchant ever wrote.
 *
 * Jordan sits at UTC+3 year-round (daylight saving abolished in 2022), so a
 * fixed offset is exact and needs no `Intl` timezone data.
 */

/** Jordan is UTC+3 with no daylight saving (abolished 2022). */
const SALES_UTC_OFFSET_MINUTES = 3 * 60;

export interface SalesMonth {
  /** "YYYY-MM", the key used in monthlySales doc ids. */
  month: string;
  year: number;
  /** 0-11, matching Date#getMonth. */
  monthIndex: number;
}

export function salesMonthOf(date: Date): SalesMonth {
  const shifted = new Date(date.getTime() + SALES_UTC_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const monthIndex = shifted.getUTCMonth();
  return { month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`, year, monthIndex };
}

export function currentSalesMonth(): SalesMonth {
  return salesMonthOf(new Date());
}
