# Publicar la versión web de Frescura (gratis)

## Qué conviene usar

**Cloudflare Pages, plan gratis.** Costo: **$0** (ancho de banda ilimitado y 500 publicaciones al
mes). Se conecta con GitHub: cada vez que se sube código nuevo, la página se actualiza sola.

¿Por qué no GitHub Pages (donde va la política de privacidad)? Porque la base de datos de la
versión web necesita unos encabezados especiales (`public/_headers`) y GitHub Pages no permite
ponerlos. Cloudflare Pages y Netlify sí.

**Opcional:** un dominio propio como `frescura.cl` cuesta unos $10.000 al año en NIC Chile. Sin
dominio, la dirección es gratis y queda como `frescura.pages.dev`.

## Qué funciona y qué no en la web

| Funciona                                                       | No funciona (solo en la app del celular) |
| -------------------------------------------------------------- | ---------------------------------------- |
| Agregar productos, vencimientos, recetas, Resumen              | Avisos (notificaciones)                  |
| Escanear boletas eligiendo una foto del computador             | Cámara para códigos de barras            |
| Recetas con IA y madurez con foto (si el servidor está activo) | Respaldo en archivo                      |

Los datos de la web quedan guardados **en ese navegador**, separados de los del celular.

## Paso a paso (20 minutos, una sola vez)

1. Crea una cuenta gratis en <https://dash.cloudflare.com/sign-up>.
2. En el panel: **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Autoriza GitHub y elige el repositorio **frescura**.
4. Configuración de la compilación:
   - **Framework preset:** None
   - **Build command:** `npm ci && npm run build:web`
   - **Build output directory:** `dist`
5. En **Environment variables** agrega estas tres (las dos últimas son las de tu archivo `.env`):
   - `NODE_VERSION` = `22`
   - `EXPO_PUBLIC_SUPABASE_URL` = `https://hhnsyuahofyowhihoakm.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_KEY` = tu clave `sb_publishable_...`
     La clave publishable es pública por diseño. La de Anthropic **nunca** va aquí.
6. Toca **Save and Deploy**. Toma de 3 a 5 minutos. Al terminar te da una dirección como
   `https://frescura.pages.dev`.
7. Ábrela en el navegador: tiene que aparecer el logo y después la bienvenida.

Si la compilación falla, mándame el texto rojo del registro ("build log").
