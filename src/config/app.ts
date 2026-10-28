// Único lugar donde se define la identidad de la app.
// app.config.ts también lee este archivo, así que cambiar el nombre aquí
// lo cambia en la pantalla de inicio del celular y dentro de la app.

export const APP_CONFIG = {
  name: 'Frescura',
  slug: 'frescura',
  scheme: 'frescura',
  bundleId: 'com.hestevehidalgo.frescura',
  locale: 'es-CL',
  timeZone: 'America/Santiago',
} as const;
