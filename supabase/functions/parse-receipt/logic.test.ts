import categoriesData from '../../../src/data/categories.json';

import {
  CATEGORY_IDS,
  SYSTEM_PROMPT,
  estimateUsd,
  monthKey,
  parseAiReceipt,
  validateRequest,
} from './logic';

describe('esquema', () => {
  it('usa las mismas categorías que la app', () => {
    expect([...CATEGORY_IDS].sort()).toEqual(categoriesData.categories.map((c) => c.id).sort());
  });

  it('el prompt de sistema alcanza el mínimo cacheable (512 tokens ≈ 2.000 caracteres)', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(2500);
  });
});

describe('validateRequest', () => {
  const image = 'A'.repeat(2000);
  it('acepta una imagen en base64', () => {
    expect(validateRequest({ image, mediaType: 'image/jpeg' })).toEqual({
      image,
      mediaType: 'image/jpeg',
    });
  });

  it.each([
    [null, 'invalid_body'],
    [{}, 'invalid_image'],
    [{ image: 'abc' }, 'invalid_image'],
    [{ image: 'A'.repeat(1500) + '<script>' }, 'invalid_image'],
    [{ image: 'A'.repeat(2_000_001) }, 'image_too_large'],
    [{ image, mediaType: 'image/gif' }, 'invalid_media_type'],
  ])('rechaza %#', (body, error) => {
    expect(validateRequest(body)).toEqual({ error });
  });
});

describe('parseAiReceipt', () => {
  it('limpia y valida la respuesta', () => {
    const parsed = parseAiReceipt({
      m: 'Líder',
      r: '76.134.941-4',
      d: '2026-10-28',
      fo: '123456',
      t: 4535,
      ds: -500,
      l: [
        {
          x: 'LECHE ENT COLUN 1L',
          n: 'Leche entera',
          b: 'Colún',
          q: 1,
          u: 'l',
          p: 1090,
          c: 'lacteos',
          f: true,
          s: 'pantry',
          k: 0.95,
        },
        {
          x: 'PLATANO KG',
          n: 'Plátano',
          b: null,
          q: 1.1204,
          u: 'kg',
          p: 1445,
          c: 'frutas',
          f: true,
          s: 'pantry',
          k: 2,
        },
        { x: '???', n: '', p: 100 },
        { x: 'RARO', n: 'Algo', q: -1, u: 'cajas', p: 2500, c: 'inventada', s: 'techo' },
      ],
    });
    expect(parsed).toMatchObject({ m: 'Líder', d: '2026-10-28', t: 4535, ds: 500 });
    expect(parsed?.l).toHaveLength(3);
    expect(parsed?.l[1]).toMatchObject({ q: 1.12, k: 1 });
    expect(parsed?.l[2]).toMatchObject({ q: 1, u: 'un', c: 'otros', s: 'fridge', f: true, k: 0.5 });
  });

  it('descarta fechas mal formadas y totales imposibles', () => {
    expect(parseAiReceipt({ d: '28/10/2026', t: 0, l: [] })).toMatchObject({
      d: null,
      t: null,
      ds: 0,
    });
  });

  it('rechaza respuestas sin líneas', () => {
    expect(parseAiReceipt({})).toBeNull();
    expect(parseAiReceipt('hola')).toBeNull();
  });
});

describe('costos y cuotas', () => {
  it('estima el costo en dólares', () => {
    // 3.000 de entrada, 700 de salida, 1.500 leídos de caché.
    const usd = estimateUsd('claude-haiku-5-5', {
      input_tokens: 3000,
      output_tokens: 700,
      cache_read_input_tokens: 1500,
    });
    expect(usd).toBeCloseTo(0.000665, 6);
  });

  it('agrupa por mes en hora de Chile', () => {
    expect(monthKey(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
    expect(monthKey(new Date('2026-11-01T04:00:00Z'))).toBe('2026-11');
  });
});
