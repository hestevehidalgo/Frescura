import {
  LOCATIONS,
  allCategories,
  allProducts,
  genericProduct,
  getCatalogProduct,
  quickProducts,
  searchCatalog,
  type DayRange,
} from './catalog';

function isValidRange(range: DayRange | undefined): boolean {
  return range === undefined || (range[0] > 0 && range[0] <= range[1]);
}

describe('catálogo', () => {
  it('tiene ids únicos', () => {
    const ids = allProducts().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(allProducts().map((p) => [p.id, p] as const))('%s tiene datos válidos', (_id, p) => {
    expect(['un', 'kg', 'g', 'l', 'ml']).toContain(p.unit);
    expect(LOCATIONS).toContain(p.storage);
    // Siempre hay una vida útil para su lugar habitual.
    expect(p[p.storage]).toBeDefined();
    for (const key of ['pantry', 'fridge', 'freezer', 'pantryOpened', 'fridgeOpened'] as const) {
      expect(isValidRange(p[key])).toBe(true);
    }
    expect(isValidRange(p.thawed)).toBe(true);
    if (p.ripeness) {
      expect(isValidRange(p.ripeness.range)).toBe(true);
    }
  });

  it('las categorías tienen rangos válidos', () => {
    for (const c of allCategories()) {
      for (const key of ['pantry', 'fridge', 'freezer', 'pantryOpened', 'fridgeOpened'] as const) {
        expect(isValidRange(c[key])).toBe(true);
      }
      expect(c[c.storage]).toBeDefined();
    }
  });

  it('carnes, pollo, pescados y sobras son de alto riesgo', () => {
    for (const id of ['carne-molida', 'pollo-trozos', 'pescado-fresco', 'mariscos', 'sobras']) {
      const p = getCatalogProduct(id);
      expect(p?.risk).toBe('high');
      expect(p?.dateType).toBe('use_by');
    }
  });

  it('incluye productos chilenos', () => {
    for (const id of [
      'palta',
      'marraqueta',
      'hallulla',
      'pan-amasado',
      'quesillo',
      'queso-fresco',
    ]) {
      expect(getCatalogProduct(id)).toBeDefined();
    }
    for (const id of ['manjar', 'longaniza', 'pebre', 'porotos-granados', 'zapallo-italiano']) {
      expect(getCatalogProduct(id)).toBeDefined();
    }
  });

  it('los abarrotes no avisan por defecto', () => {
    expect(getCatalogProduct('arroz')?.longLife).toBe(true);
    expect(getCatalogProduct('fideos')?.longLife).toBe(true);
    expect(getCatalogProduct('leche-fresca')?.longLife).toBe(false);
  });

  it('la grilla rápida tiene lo más común de la feria', () => {
    const ids = quickProducts().map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['palta', 'tomate', 'lechuga', 'cebolla', 'papa']));
    expect(ids.length).toBeGreaterThanOrEqual(12);
  });

  it('crea productos genéricos desde una categoría', () => {
    const p = genericProduct('custom-1', 'Quinoa', 'abarrotes', 'kg');
    expect(p.name).toBe('Quinoa');
    expect(p.pantry).toEqual([180, 365]);
    expect(p.longLife).toBe(true);
  });
});

describe('searchCatalog', () => {
  it('encuentra sin tildes ni mayúsculas', () => {
    expect(searchCatalog('PLATANO')[0]?.id).toBe('platano');
    expect(searchCatalog('platano')[0]?.id).toBe('platano');
  });

  it('busca por alias', () => {
    expect(searchCatalog('pechuga')[0]?.id).toBe('pollo-trozos');
    expect(searchCatalog('aguacate')[0]?.id).toBe('palta');
  });

  it('prioriza lo que empieza con el texto', () => {
    const ids = searchCatalog('leche').map((p) => p.id);
    expect(ids[0]).toBe('leche-larga-vida');
    expect(ids).toContain('leche-fresca');
  });

  it('busca por palabras internas', () => {
    expect(searchCatalog('italiano')[0]?.id).toBe('zapallo-italiano');
  });

  it('devuelve vacío sin texto', () => {
    expect(searchCatalog('  ')).toEqual([]);
  });
});
