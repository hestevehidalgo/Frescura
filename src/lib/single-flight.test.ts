import { createSingleFlight } from './single-flight';

it('ignora un segundo toque mientras el primero no termina', async () => {
  const once = createSingleFlight();
  let calls = 0;
  const task = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 'listo';
  };
  const [a, b] = await Promise.all([once(task), once(task)]);
  expect([a, b]).toEqual(['listo', undefined]);
  expect(calls).toBe(1);
  // Terminada la primera, se puede volver a usar.
  expect(await once(task)).toBe('listo');
  expect(calls).toBe(2);
});

it('se libera aunque la tarea falle', async () => {
  const once = createSingleFlight();
  await expect(once(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
  expect(await once(async () => 1)).toBe(1);
});
