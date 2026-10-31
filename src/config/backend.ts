// Conexión al backend (Supabase). Los valores vienen del archivo .env del computador, que no se
// sube a git. La clave "publishable" es pública por diseño: la protege Row Level Security.

export const BACKEND = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
};

export function isBackendConfigured(): boolean {
  // http solo se acepta en el computador propio (Supabase local o pruebas).
  const secure = BACKEND.url.startsWith('https://') || BACKEND.url.startsWith('http://localhost');
  return secure && BACKEND.publishableKey.length > 20;
}
