import { parsePackageDate } from './package-date';

const TODAY = '2026-10-29';

describe('parsePackageDate', () => {
  it.each([
    ['12/11/26', '2026-11-12'],
    ['12-11-2026', '2026-11-12'],
    ['12.11.26', '2026-11-12'],
    ['1/2/27', '2027-02-01'],
    ['12 NOV 26', '2026-11-12'],
    ['12NOV2026', '2026-11-12'],
    ['12-nov-26', '2026-11-12'],
    ['12 noviembre 2026', '2026-11-12'],
    ['2026-11-12', '2026-11-12'],
    ['12 / 11 / 26', '2026-11-12'],
  ])('"%s" → %s', (text, date) => {
    expect(parsePackageDate(text, TODAY)?.date).toBe(date);
  });

  it('mes y año: usa el último día del mes', () => {
    expect(parsePackageDate('11/2026', TODAY)?.date).toBe('2026-11-30');
    expect(parsePackageDate('FV: FEB 2027', TODAY)?.date).toBe('2027-02-28');
  });

  it('día y mes sin año', () => {
    expect(parsePackageDate('15/11', TODAY)?.date).toBe('2026-11-15');
    expect(parsePackageDate('05/01', TODAY)?.date).toBe('2027-01-05');
  });

  it('reconoce el tipo de fecha', () => {
    expect(parsePackageDate('VENC 12.11.26', TODAY)).toEqual({
      date: '2026-11-12',
      kind: 'use_by',
    });
    expect(parsePackageDate('F.V. 12/11/26', TODAY)?.kind).toBe('use_by');
    expect(parsePackageDate('Consumir preferentemente antes de: 12/11/2026', TODAY)).toEqual({
      date: '2026-11-12',
      kind: 'best_before',
    });
    expect(parsePackageDate('CONSUMIR ANTES DE 12/11/2026', TODAY)?.kind).toBe('best_before');
    expect(parsePackageDate('12/11/26', TODAY)?.kind).toBeNull();
  });

  it('descarta la fecha de elaboración', () => {
    expect(parsePackageDate('ELAB 01/10/26 VENC 12/11/26', TODAY)?.date).toBe('2026-11-12');
    expect(parsePackageDate('F.E. 01/10/26 F.V. 12/11/26', TODAY)?.date).toBe('2026-11-12');
    expect(parsePackageDate('ELAB 01/10/26', TODAY)).toBeNull();
  });

  it('sin palabra clave, usa la fecha más lejana', () => {
    expect(parsePackageDate('01/10/26 12/11/26', TODAY)?.date).toBe('2026-11-12');
  });

  it('ignora horas y códigos de lote', () => {
    expect(parsePackageDate('VENC 12/11/26 14:32 L2301', TODAY)?.date).toBe('2026-11-12');
  });

  it.each(['', 'LOTE 123', '32/13/26', 'hola', '1.290'])('rechaza "%s"', (text) => {
    expect(parsePackageDate(text, TODAY)).toBeNull();
  });
});
