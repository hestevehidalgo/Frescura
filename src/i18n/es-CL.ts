// Textos de la interfaz en español de Chile (tuteo).
// Para abrir otro país se agrega un archivo con las mismas claves.

export const esCL = {
  tabs: {
    home: 'Inicio',
    scan: 'Escanear',
    recipes: 'Recetas',
    summary: 'Resumen',
  },
  settings: {
    title: 'Ajustes',
    open: 'Abrir ajustes',
    comingSoon: 'Aquí vas a elegir la hora del aviso diario, tus básicos de despensa y tu dieta.',
  },
  home: {
    emptyTitle: 'Tu refri está vacío (por ahora)',
    emptyBody: 'Escanea tu primera boleta o agrega lo que compraste en la feria.',
  },
  scan: {
    emptyTitle: 'Escanea tu boleta',
    emptyBody: 'Saca una foto y cargamos toda la compra en segundos. Muy pronto.',
  },
  recipes: {
    emptyTitle: '¿Qué cocino hoy?',
    emptyBody: 'Te vamos a sugerir recetas con lo que vence primero.',
  },
  summary: {
    emptyTitle: 'Tu resumen del mes',
    emptyBody: 'Aquí vas a ver cuánta plata salvaste y cuánta comida aprovechaste.',
  },
  common: {
    soon: 'Muy pronto',
  },
} as const;

export type Messages = typeof esCL;
