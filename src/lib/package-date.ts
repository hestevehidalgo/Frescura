// Lee la fecha impresa en un envase chileno, ya sea escrita a mano por el usuario o (más adelante)
// leída por OCR. Sin IA y sin costo.
//
// Formatos: 12/11/26, 12-11-2026, 12.11.26, 12 NOV 26, 12NOV2026, 2026-11-12, 11/2026,
// con o sin palabras como VENC, F.V., VENCE, EXP, CONSUMIR ANTES DE, CONSUMIR PREFERENTEMENTE ANTES DE.

import { addDays, makeDate, monthIndexFromShortName, type IsoDate } from './dates';
import { stripAccents } from './text';

export type PackageDateKind = 'use_by' | 'best_before';
export type PackageDate = { date: IsoDate; kind: PackageDateKind | null };

const BEST_BEFORE = /(PREFERENTEMENTE|PREF\.?|BEST BEFORE|CONSUMIR ANTES)/;
const USE_BY =
  /(VENC\w*|VENCE|(?<![A-Z])F\.?\s?V\.?(?![A-Z])|FECHA DE VENCIMIENTO|EXP\w*|CADUCA\w*|VTO)/;
const PRODUCTION = /(ELAB\w*|(?<![A-Z])F\.?\s?E\.?(?![A-Z])|FAB\w*|PROD\w*|ENVAS\w*)/;

type Candidate = { date: IsoDate; index: number };

function fullYear(text: string): number {
  const n = Number(text);
  return text.length === 2 ? 2000 + n : n;
}

function lastDayOfMonth(year: number, month: number): IsoDate | null {
  const first = makeDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1);
  return first ? addDays(first, -1) : null;
}

function plausible(date: IsoDate | null): date is IsoDate {
  return date !== null && date >= '2000-01-01' && date <= '2099-12-31';
}

function findCandidates(text: string, today: IsoDate): Candidate[] {
  const found: Candidate[] = [];
  const push = (date: IsoDate | null, index: number) => {
    if (plausible(date)) {
      found.push({ date, index });
    }
  };

  // 2026-11-12
  for (const m of text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    push(makeDate(Number(m[1]), Number(m[2]), Number(m[3])), m.index);
  }
  // 12/11/26, 12-11-2026, 12.11.26
  for (const m of text.matchAll(/\b(\d{1,2})\s?[-/.]\s?(\d{1,2})\s?[-/.]\s?(\d{4}|\d{2})\b/g)) {
    push(makeDate(fullYear(m[3] ?? ''), Number(m[2]), Number(m[1])), m.index);
  }
  // 12 NOV 26, 12NOV2026, 12-NOV-26
  for (const m of text.matchAll(
    /\b(\d{1,2})\s?[-/.]?\s?([A-Z]{3})[A-Z]*\.?\s?[-/.]?\s?(\d{4}|\d{2})\b/g,
  )) {
    const month = monthIndexFromShortName(m[2] ?? '');
    if (month) {
      push(makeDate(fullYear(m[3] ?? ''), month, Number(m[1])), m.index);
    }
  }
  // 11/2026 o NOV 2026: se usa el último día del mes.
  for (const m of text.matchAll(/(?<![\d/.-])(\d{1,2})\s?[/.-]\s?(20\d{2})\b/g)) {
    const month = Number(m[1]);
    if (month >= 1 && month <= 12) {
      push(lastDayOfMonth(Number(m[2]), month), m.index);
    }
  }
  for (const m of text.matchAll(/(?<!\d\s?)\b([A-Z]{3})[A-Z]*\.?\s?(20\d{2})\b/g)) {
    const month = monthIndexFromShortName(m[1] ?? '');
    if (month) {
      push(lastDayOfMonth(Number(m[2]), month), m.index);
    }
  }
  // 12/11 sin año: este año, o el próximo si ya pasó hace más de dos meses.
  if (found.length === 0) {
    for (const m of text.matchAll(/\b(\d{1,2})\s?[/.-]\s?(\d{1,2})\b(?!\s?[/.-]\s?\d)/g)) {
      const year = Number(today.slice(0, 4));
      const date = makeDate(year, Number(m[2]), Number(m[1]));
      if (date) {
        push(
          date < addDays(today, -60) ? makeDate(year + 1, Number(m[2]), Number(m[1])) : date,
          m.index,
        );
      }
    }
  }
  return found;
}

/** Palabra clave que termina más cerca antes de la posición `index` (en las 40 letras previas). */
function keywordBefore(
  text: string,
  index: number,
): 'use_by' | 'best_before' | 'production' | null {
  const before = text.slice(Math.max(0, index - 40), index);
  const lastMatch = (re: RegExp) => {
    let last = -1;
    for (const m of before.matchAll(new RegExp(re.source, 'g'))) {
      last = m.index + m[0].length;
    }
    return last;
  };
  const positions = [
    ['best_before', lastMatch(BEST_BEFORE)],
    ['use_by', lastMatch(USE_BY)],
    ['production', lastMatch(PRODUCTION)],
  ] as const;
  const best = positions.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] === -1 ? null : best[0];
}

export function parsePackageDate(raw: string, today: IsoDate): PackageDate | null {
  const text = stripAccents(raw).toUpperCase().replace(/\s+/g, ' ');
  const candidates = findCandidates(text, today);
  if (candidates.length === 0) {
    return null;
  }
  const labeled = candidates.map((c) => ({ ...c, label: keywordBefore(text, c.index) }));
  const expiry = labeled.filter((c) => c.label === 'use_by' || c.label === 'best_before');
  if (expiry.length > 0) {
    const chosen = expiry.reduce((a, b) => (b.date > a.date ? b : a));
    return { date: chosen.date, kind: chosen.label as PackageDateKind };
  }
  // Sin palabra clave: se descarta la fecha de elaboración y se usa la más lejana.
  const rest = labeled.filter((c) => c.label !== 'production');
  if (rest.length === 0) {
    return null;
  }
  return { date: rest.reduce((a, b) => (b.date > a.date ? b : a)).date, kind: null };
}
