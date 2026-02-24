// Utilities for working with Hijri (Islamic) calendar in the browser using Intl.
// Uses Umm al-Qura calendar for consistency.

export type HijriParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-30
};

const HIJRI_LOCALE = "en-u-ca-islamic-umalqura";

const hijriPartsFormatter = new Intl.DateTimeFormat(HIJRI_LOCALE, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function getHijriParts(date: Date): HijriParts {
  const parts = hijriPartsFormatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    // Fallback: should never happen, but avoid crashing.
    return { year: 0, month: 0, day: 0 };
  }

  return { year, month, day };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diffDays(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function isSameHijriMonth(a: HijriParts, b: HijriParts): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isSameHijriDay(a: HijriParts, b: HijriParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Given a pivot Gregorian date (any date), returns all Gregorian dates that belong to the pivot's Hijri month.
 * This is used to render a Hijri month grid with correct Gregorian mapping.
 */
export function getHijriMonthGregorianDays(pivotGregorianDate: Date): {
  hijriMonth: { year: number; month: number };
  firstGregorianDate: Date;
  days: Array<{ hijriDay: number; gregorianDate: Date }>;
} {
  const pivot = startOfDay(pivotGregorianDate);
  const pivotHijri = getHijriParts(pivot);

  // Walk backwards until we leave the Hijri month.
  let cursor = pivot;
  while (true) {
    const prev = addDays(cursor, -1);
    const prevHijri = getHijriParts(prev);
    if (!isSameHijriMonth(prevHijri, pivotHijri)) break;
    cursor = prev;
  }

  const firstGregorianDate = cursor;

  // Walk forward collecting all days in the Hijri month.
  const days: Array<{ hijriDay: number; gregorianDate: Date }> = [];
  let forward = firstGregorianDate;
  while (true) {
    const h = getHijriParts(forward);
    if (!isSameHijriMonth(h, pivotHijri)) break;
    days.push({ hijriDay: h.day, gregorianDate: forward });
    forward = addDays(forward, 1);
  }

  return {
    hijriMonth: { year: pivotHijri.year, month: pivotHijri.month },
    firstGregorianDate,
    days,
  };
}

/**
 * Finds the next Gregorian date (including today) that matches the provided Hijri month/day.
 * Scans forward up to `maxScanDays`.
 */
export function findNextHijriOccurrence(options: {
  from: Date;
  hijriMonth: number;
  hijriDay: number;
  maxScanDays?: number;
}): Date | null {
  const from = startOfDay(options.from);
  const max = options.maxScanDays ?? 370;

  for (let i = 0; i <= max; i++) {
    const d = addDays(from, i);
    const h = getHijriParts(d);
    if (h.month === options.hijriMonth && h.day === options.hijriDay) return d;
  }

  return null;
}
