import { formatDecimal, formatQuantity, isUnit, parseDecimal, quantityStep } from './quantity';

describe('parseDecimal', () => {
  it.each([
    ['1,234', 1.234],
    ['2', 2],
    ['0,5', 0.5],
    ['1.5', 1.5],
    [' 3 ', 3],
  ])('"%s" → %d', (text, value) => {
    expect(parseDecimal(text)).toBe(value);
  });

  it.each(['', 'abc', '1,2,3', '-1', '1.234,5'])('rechaza "%s"', (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});

describe('formato', () => {
  it('usa coma decimal', () => {
    expect(formatDecimal(1.5)).toBe('1,5');
    expect(formatDecimal(2)).toBe('2');
    expect(formatDecimal(1 / 3)).toBe('0,33');
    expect(formatQuantity(1.234, 'kg')).toBe('1,23 kg');
    expect(formatQuantity(6, 'un')).toBe('6 un');
  });

  it('reconoce unidades y pasos', () => {
    expect(isUnit('kg')).toBe(true);
    expect(isUnit('kilo')).toBe(false);
    expect(quantityStep('kg')).toBe(0.25);
    expect(quantityStep('un')).toBe(1);
  });
});
