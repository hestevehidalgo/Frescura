import { dailyLimitUsd, overDailyLimit, startOfUtcDay } from './spend';

it('startOfUtcDay', () => {
  expect(startOfUtcDay(new Date('2026-11-04T22:15:00-03:00'))).toBe('2026-11-05T00:00:00.000Z');
});

it('dailyLimitUsd usa 0,25 si la variable falta o es inválida', () => {
  expect(dailyLimitUsd(undefined)).toBe(0.25);
  expect(dailyLimitUsd('abc')).toBe(0.25);
  expect(dailyLimitUsd('-1')).toBe(0.25);
  expect(dailyLimitUsd('1.5')).toBe(1.5);
});

describe('overDailyLimit', () => {
  const client = (data: unknown, error: unknown = null) => ({
    rpc: jest.fn(async () => ({ data, error })),
  });

  it('frena cuando el gasto de hoy llega al tope', async () => {
    expect(await overDailyLimit(client('0.1'), 0.25)).toBe(false);
    expect(await overDailyLimit(client(0.25), 0.25)).toBe(true);
  });

  it('frena por precaución si no se puede consultar', async () => {
    expect(await overDailyLimit(client(null, { message: 'x' }), 0.25)).toBe(true);
  });
});
