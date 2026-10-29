import { formatClp, parseClp } from './money';

describe('formatClp', () => {
  it.each([
    [0, '$0'],
    [990, '$990'],
    [1290, '$1.290'],
    [12400, '$12.400'],
    [1234567, '$1.234.567'],
    [-500, '-$500'],
  ])('%d → %s', (amount, text) => {
    expect(formatClp(amount)).toBe(text);
  });
});

describe('parseClp', () => {
  it.each([
    ['$1.290', 1290],
    ['1.290', 1290],
    ['1290', 1290],
    ['$ 12.400', 12400],
    ['$1.234.567', 1234567],
    ['-$990', -990],
    ['$-990', -990],
    ['-990', -990],
  ])('"%s" → %d', (text, amount) => {
    expect(parseClp(text)).toBe(amount);
  });

  it.each(['1,29', '$1.29', '12.40', 'abc', '', '$', '1.2345'])('rechaza "%s"', (text) => {
    expect(parseClp(text)).toBeNull();
  });

  it('nunca interpreta el punto como decimal', () => {
    expect(parseClp('1.290')).not.toBe(1.29);
  });
});
