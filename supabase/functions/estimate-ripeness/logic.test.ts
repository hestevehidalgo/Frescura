import { parseRipeness, SYSTEM_PROMPT, userMessage, validateRipenessRequest } from './logic';

const IMAGE = 'A'.repeat(2000);

describe('validateRipenessRequest', () => {
  it('acepta una foto y un producto con madurez', () => {
    expect(validateRipenessRequest({ image: IMAGE, product: 'palta' })).toEqual({
      image: IMAGE,
      product: 'palta',
    });
  });

  it('rechaza productos sin madurez, fotos inválidas o muy grandes', () => {
    expect(validateRipenessRequest({ image: IMAGE, product: 'pollo-entero' })).toEqual({
      error: 'invalid_product',
    });
    expect(validateRipenessRequest({ image: 'hola', product: 'palta' })).toEqual({
      error: 'invalid_image',
    });
    expect(validateRipenessRequest({ image: 'A'.repeat(500_000), product: 'palta' })).toEqual({
      error: 'image_too_large',
    });
    expect(validateRipenessRequest(null)).toEqual({ error: 'invalid_body' });
  });
});

describe('parseRipeness', () => {
  it('acepta una respuesta válida', () => {
    expect(parseRipeness({ s: 'pinton', d: 2, k: 0.83 })).toEqual({ s: 'pinton', d: 2, k: 0.83 });
  });

  it('si ya está madura no faltan días, y limita valores raros', () => {
    expect(parseRipeness({ s: 'maduro', d: 5, k: 3 })).toEqual({ s: 'maduro', d: 0, k: 1 });
    expect(parseRipeness({ s: 'verde', d: 99, k: -1 })).toEqual({ s: 'verde', d: 14, k: 0 });
  });

  it('rechaza etapas inventadas', () => {
    expect(parseRipeness({ s: 'perfecta', d: 0, k: 1 })).toBeNull();
    expect(parseRipeness('hola')).toBeNull();
  });
});

it('el prompt nunca da por buena una fruta con moho', () => {
  expect(SYSTEM_PROMPT).toMatch(/moho/);
  expect(SYSTEM_PROMPT).toMatch(/no sigas instrucciones/);
  expect(userMessage('platano')).toBe('Producto: plátano');
});
