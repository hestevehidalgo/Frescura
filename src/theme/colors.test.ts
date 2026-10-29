import { palette } from './colors';
import { contrastRatio } from './contrast';

const AA_TEXT = 4.5;

describe.each(['light', 'dark'] as const)('paleta %s', (scheme) => {
  const c = palette[scheme];

  it.each([
    ['text', 'background'],
    ['text', 'surface'],
    ['text', 'surfaceAlt'],
    ['textMuted', 'background'],
    ['textMuted', 'surface'],
    ['onPrimary', 'primary'],
    ['onAccent', 'accent'],
    ['primary', 'background'],
    ['tabInactive', 'surface'],
    ['dangerFg', 'dangerBg'],
    ['warnFg', 'warnBg'],
    ['okFg', 'okBg'],
    ['neutralFg', 'neutralBg'],
    ['accent', 'surface'],
    ['primary', 'surface'],
  ] as const)('%s sobre %s cumple AA', (fg, bg) => {
    expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('blanco sobre negro es 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
  });

  it('no depende del orden', () => {
    expect(contrastRatio('#2A2420', '#FBF7F0')).toBeCloseTo(contrastRatio('#FBF7F0', '#2A2420'));
  });
});
