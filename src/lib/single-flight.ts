// Evita que un botón ejecute dos veces lo mismo por un doble toque: mientras la primera ejecución
// no termina, las siguientes se ignoran.

import { useState } from 'react';

export function createSingleFlight() {
  let running = false;
  return async function once<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (running) {
      return undefined;
    }
    running = true;
    try {
      return await task();
    } finally {
      running = false;
    }
  };
}

/** Versión para pantallas: `const once = useSingleFlight(); onPress={() => once(guardar)}`. */
export function useSingleFlight() {
  // useState con valor inicial perezoso: se crea una sola vez y no cambia entre renders.
  const [once] = useState(createSingleFlight);
  return once;
}
