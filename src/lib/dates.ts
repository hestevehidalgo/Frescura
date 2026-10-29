// Fechas sin hora ("2026-11-12"), siempre en la zona horaria del celular.
// La aritmética se hace en UTC para que el cambio de horario no corra un día.

export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function makeDate(year: number, month: number, day: number): IsoDate | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE.exec(value);
  return m !== null && makeDate(Number(m[1]), Number(m[2]), Number(m[3])) === value;
}

function parts(date: IsoDate): [number, number, number] {
  const m = ISO_DATE.exec(date);
  if (!m) {
    throw new Error(`Fecha inválida: ${date}`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toUtcMs(date: IsoDate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): IsoDate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Día de hoy según el reloj y la zona horaria del celular. */
export function todayLocal(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + Math.round(days) * 86_400_000);
}

/** Días desde `from` hasta `to` (positivo si `to` es posterior). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/** Lunes de la semana de `date` (en Chile la semana parte el lunes). */
export function startOfWeek(date: IsoDate): IsoDate {
  const weekday = new Date(toUtcMs(date)).getUTCDay(); // 0 = domingo
  return addDays(date, -((weekday + 6) % 7));
}

/** Momento local (con hora) de un día: respeta el horario de verano del celular. */
export function atLocalTime(date: IsoDate, hour: number, minute: number): Date {
  const [y, m, d] = parts(date);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/** "12/11/2026" */
export function formatDate(date: IsoDate): string {
  const [y, m, d] = parts(date);
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

/** "12/11" */
export function formatDayMonth(date: IsoDate): string {
  const [, m, d] = parts(date);
  return `${pad2(d)}/${pad2(m)}`;
}

/** "12 nov" */
export function formatShort(date: IsoDate): string {
  const [, m, d] = parts(date);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function monthIndexFromShortName(name: string): number | null {
  const index = MONTHS_SHORT.indexOf(
    name.slice(0, 3).toLowerCase() as (typeof MONTHS_SHORT)[number],
  );
  return index === -1 ? null : index + 1;
}
