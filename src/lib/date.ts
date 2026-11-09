const TZ = "Asia/Jakarta";

export interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

export function getJakartaToday(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m, d };
}

export const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

export const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function parseMonthKey(key: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
}

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** <0 bila a sebelum b, 0 sama, >0 setelah. */
export function compareMonth(a: { y: number; m: number }, b: { y: number; m: number }) {
  return a.y * 12 + a.m - (b.y * 12 + b.m);
}

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Hari dalam seminggu untuk tanggal 1 (0 = Senin ... 6 = Minggu). */
export function firstWeekdayMonday(y: number, m: number) {
  const sundayFirst = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return (sundayFirst + 6) % 7;
}

export function isoToJakartaDate(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso.slice(0, 10);
  const { y, m, d } = getJakartaToday(t);
  return dateKey(y, m, d);
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const monthName = (m: number) => MONTH_NAMES[m - 1];

export function formatDateID(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${monthName(m)} ${y}`;
}

