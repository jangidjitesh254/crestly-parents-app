/** Date helpers — the API speaks YYYY-MM-DD strings exclusively. */

export function todayIso(): string {
  return toIso(new Date());
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, delta: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + delta);
  return toIso(d);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

export function weekdayLong(iso: string): string {
  return WEEKDAYS_LONG[fromIso(iso).getDay()] ?? "";
}

export function monthYearUpper(iso: string): string {
  const d = fromIso(iso);
  return `${MONTHS[d.getMonth()]?.toUpperCase()} ${d.getFullYear()}`;
}

export function dayPad(iso: string): string {
  return String(fromIso(iso).getDate()).padStart(2, "0");
}

export function monthShort(iso: string): string {
  return MONTHS[fromIso(iso).getMonth()] ?? "";
}

/**
 * Academic-year boundary, India convention: April → start of new AY.
 * 2026 means AY 2026-27 covering 2026-04-01 → 2027-03-31.
 */
export function currentAcademicYear(): number {
  const d = new Date();
  const month = d.getMonth() + 1;
  return month >= 4 ? d.getFullYear() : d.getFullYear() - 1;
}

export function academicYearLabel(ay: number): string {
  const next2 = String((ay + 1) % 100).padStart(2, "0");
  return `AY ${ay}-${next2}`;
}

/** Current school session label, e.g. "2026-27" (no "AY " prefix). */
export function currentSessionLabel(): string {
  const ay = currentAcademicYear();
  return `${ay}-${String((ay + 1) % 100).padStart(2, "0")}`;
}

/** Whole-years age from an ISO DOB, or null if the date is missing/invalid. */
export function ageFromDob(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const dob = fromIso(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** ISO DOB → "25 Apr 2019" (em-dash when absent). */
export function formatDob(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = fromIso(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatLong(iso: string): string {
  const d = fromIso(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatBreadcrumbDate(iso: string): string {
  const d = fromIso(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShort(iso: string): string {
  const d = fromIso(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthLabel(year: number, month1: number): string {
  return `${MONTHS[month1 - 1]} ${year}`;
}

export function isFuture(iso: string): boolean {
  return iso > todayIso();
}
