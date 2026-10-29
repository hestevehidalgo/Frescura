import {
  addDays,
  atLocalTime,
  daysBetween,
  formatDate,
  formatDayMonth,
  formatShort,
  isIsoDate,
  makeDate,
  minDate,
  startOfWeek,
  todayLocal,
} from './dates';

describe('fechas sin hora', () => {
  it('valida fechas reales', () => {
    expect(isIsoDate('2026-11-12')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('12/11/2026')).toBe(false);
    expect(makeDate(2028, 2, 29)).toBe('2028-02-29');
    expect(makeDate(2027, 2, 29)).toBeNull();
  });

  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('cuenta días entre fechas', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
  });

  it('no pierde un día con el cambio de horario de Chile', () => {
    // En 2026 Chile adelanta la hora el 6 de septiembre y la atrasa el 5 de abril.
    expect(addDays('2026-09-05', 1)).toBe('2026-09-06');
    expect(addDays('2026-09-05', 2)).toBe('2026-09-07');
    expect(daysBetween('2026-04-04', '2026-04-06')).toBe(2);
  });

  it('elige la fecha más temprana', () => {
    expect(minDate('2026-11-12', '2026-11-03')).toBe('2026-11-03');
  });

  it('la semana parte el lunes', () => {
    expect(startOfWeek('2026-10-28')).toBe('2026-10-26'); // miércoles
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26'); // domingo
    expect(startOfWeek('2026-10-26')).toBe('2026-10-26'); // lunes
  });
});

describe('hoy y horas locales', () => {
  it('usa la zona horaria del celular (America/Santiago en los tests)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Santiago');
    // 02:30 UTC del 29 de octubre todavía es 28 de octubre en Chile (UTC-3).
    expect(todayLocal(new Date('2026-10-29T02:30:00Z'))).toBe('2026-10-28');
  });

  it('las 18:30 locales quedan bien antes y después del cambio de horario', () => {
    expect(atLocalTime('2026-09-05', 18, 30).toISOString()).toBe('2026-09-05T22:30:00.000Z');
    expect(atLocalTime('2026-09-07', 18, 30).toISOString()).toBe('2026-09-07T21:30:00.000Z');
    expect(atLocalTime('2026-04-06', 18, 30).toISOString()).toBe('2026-04-06T22:30:00.000Z');
  });
});

describe('formatos chilenos', () => {
  it('día-mes-año', () => {
    expect(formatDate('2026-11-05')).toBe('05/11/2026');
    expect(formatDayMonth('2026-11-05')).toBe('05/11');
    expect(formatShort('2026-11-05')).toBe('5 nov');
  });
});
