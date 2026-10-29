# Frescura: convenciones del proyecto

App móvil (iOS y Android) que lee boletas de supermercado chilenas, estima vencimientos, avisa a
tiempo y sugiere recetas con lo que vence primero. El documento de producto completo es `SPEC.md`.
Las decisiones tomadas y su motivo están en `docs/decisiones.md`: léelo antes de cambiar algo
estructural y agrega una entrada cuando decidas algo nuevo.

El dueño del proyecto es estudiante de ingeniería, no desarrollador experto. Explica en español
cada paso que tenga que hacer él, sin asumir conocimientos previos.

## Comandos

```bash
npm run check          # typecheck + lint + formato + tests: debe pasar antes de cada commit
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm test               # jest
npm run format         # prettier --write
npx expo install <pkg> # SIEMPRE en vez de npm install <pkg>: elige la versión compatible con el SDK
npx expo start         # servidor de desarrollo
```

## Forma de trabajo

- Una fase a la vez (sección 17 de `SPEC.md`). Al cerrar cada una: `npm run check` en verde,
  commit con mensaje claro y guía paso a paso para probarla en el iPhone del dueño.
- No pasar a la siguiente fase sin su visto bueno.
- Si una decisión cambia bastante el costo o la complejidad, preguntar. Si no, decidir y anotarla
  en `docs/decisiones.md`.
- Entre "más completo" y "más simple y barato", elegir lo simple y barato.
- Cada dependencia nueva se justifica en una línea en `docs/decisiones.md`.

## Código

- Código en inglés (variables, archivos, funciones). Interfaz, documentación y comentarios
  importantes en español de Chile.
- TypeScript estricto con `noUncheckedIndexedAccess`. Nada de `any`.
- Rutas en `src/app/` (Expo Router). Lo que no es pantalla va fuera de `src/app/`:
  `src/features/<feature>`, `src/lib`, `src/db`, `src/components`, `src/theme`, `src/i18n`.
- El nombre de la app vive solo en `src/config/app.ts`.
- Todo texto visible sale de `src/i18n/es-CL.ts` mediante `t('clave')`. Nunca texto suelto en
  pantallas.
- Colores solo desde `src/theme` (`useThemeColors()`), con modo claro y oscuro. Todo texto nuevo
  debe cumplir contraste AA; agrega el par a `src/theme/colors.test.ts`.
- Accesibilidad: áreas táctiles de al menos `MIN_TOUCH` (44 pt), `accessibilityLabel` en botones
  con solo ícono, y estados con color + ícono + texto (nunca solo color).
- Tests junto al archivo: `algo.ts` → `algo.test.ts`. La lógica va en funciones puras (sin React)
  para poder probarla. El SQL se prueba con una base real en memoria: `createMigratedDb()` de
  `src/db/test-db.ts`.
- Los datos viven en SQLite (`src/db`). Las pantallas leen con los hooks de
  `src/features/inventory/store.ts` y, después de escribir, llaman a `notifyInventoryChanged()`.
- Migraciones: nunca editar una ya publicada; agregar una nueva al final de `src/db/migrations.ts`.

## Expo (SDK 58)

- Expo cambia mucho entre versiones: antes de usar una API de Expo o React Native, revisa la
  documentación de la versión instalada (`https://docs.expo.dev/versions/v58.0.0/`) o
  `https://docs.expo.dev/llms.txt`. No confíes en la memoria.
- Las carpetas `ios/` y `android/` se generan solas (Continuous Native Generation): nunca se
  editan a mano. La configuración nativa va en `app.config.ts` y plugins.
- Mientras no exista development build, la app debe seguir funcionando en Expo Go. Un módulo
  nativo que no esté en Expo Go (por ejemplo OCR) va detrás de una interfaz con alternativa manual.

## Chile

- Montos en pesos chilenos como enteros, sin decimales. `$1.290` son mil doscientos noventa pesos,
  nunca 1,29. Los kilos usan coma decimal (`1,234 KG`). Cubrir siempre con tests.
- Fechas de vencimiento sin hora. Toda lógica de "hoy" usa la zona horaria del dispositivo
  (America/Santiago por defecto). La semana parte el lunes. Probar el cambio de horario.

## Seguridad alimentaria

- Carnes, pollo, pescados, mariscos y comida cocinada usan siempre el criterio más conservador.
  La app nunca dice que algo de alto riesgo vencido "todavía se puede comer".
- Nunca alargar automáticamente la vida útil de carnes, pescados, mariscos, lácteos frescos ni
  comida cocinada.
- Junto a cada fecha estimada: "Fecha estimada. Revisa siempre la fecha del envase, el olor y el
  aspecto".

## Reglas de costo (meta: US$0 fijo al mes y menos de US$0,01 por boleta)

1. **La IA es el último recurso.** Lo que se pueda resolver en el dispositivo, con una tabla o con
   un caché, se resuelve así.
2. **Local-first.** El inventario vive en el celular (SQLite). No hay servidor con datos del
   usuario.
3. **Notificaciones locales**, programadas en el dispositivo. Sin servidor de push.
4. **Un solo backend serverless en plan gratuito** (Supabase), solo para: esconder la clave de la
   API de IA, controlar cuotas y abuso, y alojar el diccionario compartido de productos.
5. **El modelo más barato que cumpla:** hoy `claude-haiku-5-5`. El nombre del modelo va en una
   variable de entorno, detrás de una interfaz `AiProvider`.
6. **Texto antes que imagen.** OCR en el dispositivo y envío de solo texto. La imagen solo si el OCR
   falla: en escala de grises, recortada y a la resolución mínima que mantenga la precisión.
7. **Pocos tokens de salida:** salida estructurada (JSON Schema) con claves cortas, sin
   explicaciones y `max_tokens` ajustado. Con Haiku 5.5: razonamiento desactivado
   (`thinking: {type: "disabled"}`, permitido con esfuerzo `high` o menor) y esfuerzo `low`, porque
   el razonamiento se cobra como salida. **No enviar `temperature`, `top_p` ni `top_k`:** Haiku 5.5
   los rechaza.
8. **Nunca pagar dos veces por lo mismo.** Caché por boleta (huella: RUT emisor + folio), por línea
   (diccionario compartido, coincidencia exacta normalizada) y por receta (conjunto de
   ingredientes + filtros).
9. **Prompt caching** para el prompt de sistema fijo (mínimo cacheable en Haiku 5.5: 512 tokens).
10. **El trabajo pesado se hace una vez**, durante el desarrollo: la tabla de vida útil y el
    recetario se generan y revisan antes, y quedan como JSON dentro de la app.
11. **Topes duros:** límite de gasto de US$5 al mes en la consola de Anthropic, cuota por usuario
    (30 escaneos y 5 recetas con IA al mes en el plan gratis) y límite de solicitudes por minuto.
12. **Filtro gratuito antes de gastar:** el texto del OCR debe contener TOTAL, BOLETA o RUT, o
    varias líneas terminadas en precio. Si no, no se llama a la IA.
13. **Registrar el costo de cada llamada** (modelo, tokens de entrada, salida y caché, USD
    estimado) en `ai_usage`. Nunca el contenido de la boleta.
14. **Los tests automáticos nunca llaman a la API real ni gastan plata.**

## Secretos

- Nunca escribir claves de API en el código ni en commits. Usar `.env` (ignorado por git) y
  documentar cada variable en `.env.example`.
- La clave de Anthropic vive solo en los secretos del backend. Nunca viaja en la app.
- Cuando haga falta una cuenta o una clave, detenerse y explicarle al dueño exactamente qué hacer y
  dónde.
