import { ripeFromStage, ripenessErrorKey, ripenessNote, supportsRipenessPhoto } from './ripeness';

jest.mock('@/lib/supabase', () => ({ getSignedInSupabase: jest.fn() }));

it('solo frutas y verduras donde la madurez importa', () => {
  expect(supportsRipenessPhoto('palta')).toBe(true);
  expect(supportsRipenessPhoto('platano')).toBe(true);
  expect(supportsRipenessPhoto('pollo-entero')).toBe(false);
  expect(supportsRipenessPhoto('leche-fresca')).toBe(false);
});

it('la etapa decide la respuesta a "¿Madura?"', () => {
  expect(ripeFromStage({ s: 'maduro', d: 0, k: 0.9 })).toBe(true);
  expect(ripeFromStage({ s: 'muy_maduro', d: 0, k: 0.9 })).toBe(true);
  expect(ripeFromStage({ s: 'pinton', d: 2, k: 0.9 })).toBe(false);
  expect(ripeFromStage({ s: 'verde', d: 4, k: 0.9 })).toBe(false);
  // Si no se reconoce, no se cambia lo que había.
  expect(ripeFromStage({ s: 'no_reconocido', d: 0, k: 0.2 })).toBeNull();
});

it('texto para mostrar, con aviso si la IA no está segura', () => {
  expect(ripenessNote({ s: 'pinton', d: 2, k: 0.8 })).toBe('Pintón: lista en 2 días aprox.');
  expect(ripenessNote({ s: 'verde', d: 0, k: 0.8 })).toBe('Verde: le falta 1 día aprox.');
  expect(ripenessNote({ s: 'verde', d: 4, k: 0.8 })).toBe('Verde: le faltan unos 4 días.');
  expect(ripenessNote({ s: 'maduro', d: 0, k: 0.3 })).toBe(
    'Madura: lista para comer. (estimación poco segura)',
  );
});

it('errores', () => {
  expect(ripenessErrorKey('quota')).toBe('ripeness.errors.quota');
  expect(ripenessErrorKey('ai_failed')).toBe('ripeness.errors.failed');
});
