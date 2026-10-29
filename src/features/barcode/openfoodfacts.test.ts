import { categoryFromTags, lookupBarcode, matchCatalog, resetRateLimit } from './openfoodfacts';

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = async (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, headers: init.headers });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { impl, calls };
}

beforeEach(() => resetRateLimit());

describe('lookupBarcode', () => {
  it('lee nombre, marca y categoría, e identifica la app', async () => {
    const { impl, calls } = fakeFetch(200, {
      status: 1,
      product: {
        product_name: 'Whole milk',
        product_name_es: 'Leche entera',
        brands: 'Colún, Otra',
        categories_tags: ['en:dairies', 'en:milks'],
      },
    });
    const result = await lookupBarcode('7802920000000', impl, 10_000);
    expect(result).toEqual({
      status: 'found',
      product: { name: 'Leche entera', brand: 'Colún', categoryId: 'lacteos' },
    });
    expect(calls[0]?.url).toContain('/api/v2/product/7802920000000.json');
    expect(calls[0]?.headers['User-Agent']).toMatch(/^Frescura\/0\.1 \(/);
  });

  it('producto desconocido', async () => {
    expect(await lookupBarcode('7800000000001', fakeFetch(404, {}).impl, 10_000)).toEqual({
      status: 'not_found',
    });
    resetRateLimit();
    expect(
      await lookupBarcode('7800000000001', fakeFetch(200, { status: 0 }).impl, 10_000),
    ).toEqual({
      status: 'not_found',
    });
  });

  it('sin conexión', async () => {
    const failing = async () => {
      throw new Error('Network request failed');
    };
    expect(await lookupBarcode('7800000000001', failing, 10_000)).toEqual({ status: 'offline' });
  });

  it('respeta el límite de consultas por minuto', async () => {
    const { impl, calls } = fakeFetch(404, {});
    await lookupBarcode('7800000000001', impl, 10_000);
    expect(await lookupBarcode('7800000000002', impl, 11_000)).toEqual({ status: 'rate_limited' });
    expect(calls).toHaveLength(1);
    await lookupBarcode('7800000000002', impl, 15_000);
    expect(calls).toHaveLength(2);
  });

  it('no consulta códigos inválidos', async () => {
    const { impl, calls } = fakeFetch(200, {});
    expect(await lookupBarcode('abc', impl, 10_000)).toEqual({ status: 'not_found' });
    expect(calls).toHaveLength(0);
  });
});

describe('categorías y catálogo', () => {
  it('traduce etiquetas de categoría', () => {
    expect(categoryFromTags(['en:dairies', 'en:cheeses'])).toBe('quesos');
    expect(categoryFromTags(['en:something'])).toBeNull();
  });

  it('reconoce productos del catálogo por el nombre', () => {
    expect(matchCatalog('Leche entera Colún 1L')?.id).toBe('leche-larga-vida');
    expect(matchCatalog('Yogur batido frutilla')?.id).toBe('yogur');
    expect(matchCatalog('Galletas de chocolate')?.id).toBe('galletas');
    expect(matchCatalog('Producto rarísimo')).toBeNull();
  });
});
