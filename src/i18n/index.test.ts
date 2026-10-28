import { interpolate, t } from './index';

describe('t', () => {
  it('devuelve el texto de una clave anidada', () => {
    expect(t('tabs.home')).toBe('Inicio');
  });

  it('devuelve la clave si no existe', () => {
    // @ts-expect-error clave inexistente a propósito
    expect(t('no.existe')).toBe('no.existe');
  });
});

describe('interpolate', () => {
  it('reemplaza los marcadores con los parámetros', () => {
    expect(interpolate('{n} cosas vencen pronto', { n: 3 })).toBe('3 cosas vencen pronto');
  });

  it('deja intactos los marcadores sin parámetro', () => {
    expect(interpolate('Hola {nombre}', {})).toBe('Hola {nombre}');
  });
});
