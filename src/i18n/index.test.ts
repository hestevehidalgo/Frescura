import { interpolate, joinList, t, tn } from './index';

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

describe('tn y joinList', () => {
  it('elige singular o plural', () => {
    expect(tn('toasts.added', 1)).toBe('Agregaste 1 producto');
    expect(tn('toasts.added', 3)).toBe('Agregaste 3 productos');
    expect(tn('toasts.added', 0)).toBe('Agregaste 0 productos');
  });

  it('une listas en español', () => {
    expect(joinList(['palta'])).toBe('palta');
    expect(joinList(['palta', 'tomate'])).toBe('palta y tomate');
    expect(joinList(['palta', 'tomate', 'lechuga'])).toBe('palta, tomate y lechuga');
  });
});
