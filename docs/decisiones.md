# Decisiones

Registro de decisiones técnicas y de producto, con su motivo. Lo más reciente va arriba.

## 2026-10-31 · Fase 2 (versión provisoria con foto)

### La foto va a la IA mientras no exista la versión instalada

El dueño eligió no pagar todavía la cuenta de Apple. Sin ella no hay OCR en el iPhone, así que la
foto de la boleta se envía a la IA (Claude Haiku 5.5 con imagen).

- **Costo estimado:** unos US$0,0005 a US$0,001 por boleta. La foto se reduce a 1.100 px de ancho
  en JPEG al 60 %. Se medirá con `scripts/cost-report.sql`.
- **Precios:** sin OCR, los lee la IA desde la imagen. Para detectar errores se cuadra la suma
  contra el total impreso.
- **Después:** con el development build se cambia a OCR en el celular + solo texto, como dice el
  plan original.
- **Privacidad:** la foto sale del celular solo para leerla y nunca se guarda en el servidor. La
  primera vez se pide aceptar un aviso.

### Backend: Supabase con sesión anónima, cuotas y registro de costos

- **Edge Function `parse-receipt`:** valida la sesión anónima y la imagen (tamaño y formato),
  limita a 3 llamadas por minuto y descuenta la cuota mensual (30 escaneos) de forma atómica en
  Postgres. Si la IA falla, devuelve la cuota.
- **Llamada a la IA:** salida estructurada, razonamiento apagado, esfuerzo bajo, prompt de
  sistema en caché y un reintento si la respuesta no se puede validar.
- **Registro:** guarda modelo, tokens y costo en `ai_usage`, sin el contenido de la boleta.
- **Tablas:** `quotas` y `ai_usage` tienen RLS activado sin políticas, así que nadie las toca
  desde la app.
- **Lógica:** el esquema, el prompt, la validación y el cálculo de costo viven en
  `supabase/functions/parse-receipt/logic.ts`, que comparten la función, la app y los tests.

### Validación de la respuesta sin Zod

El documento pedía Zod. La salida estructurada de la API ya garantiza la forma del JSON, y un
validador propio de 60 líneas (con tests) limpia los valores. Así no hay dependencia extra ni en
la función ni en la app.

### Diccionario compartido postergado

En la versión con foto, la IA lee la boleta entera de todas formas, así que el diccionario de
líneas no ahorra nada todavía. Se construye junto con el OCR, cuando el texto de cada línea se
pueda buscar antes de llamar a la IA.

### No pagar dos veces por la misma boleta

- **Antes de llamar a la IA:** la app calcula una huella de la foto y, si ya la leyó, no la
  manda.
- **Después:** con el RUT del emisor y el folio avisa si la boleta ya estaba guardada.

### Dependencias nuevas de la fase 2

- `expo-image-picker`: sacar la foto o elegirla de la galería (incluido en Expo Go).
- `expo-image-manipulator`: achicar la foto antes de mandarla, para pagar menos (incluido en
  Expo Go).
- `@supabase/supabase-js`: sesión anónima y llamada a la función. Es la vía documentada; la API
  REST de sesión anónima no está documentada.

### `npm audit` (31 oct 2026)

Con la actualización de parches de Expo desaparecieron los avisos altos. Quedan 12 moderados, todos
en herramientas de Expo que corren en el computador (`glob` y `minimatch` dentro de `@expo/cli` y
`@expo/config-plugins`), no en la app.

### Pendiente antes de publicar

- Activar CAPTCHA (Turnstile) para las sesiones anónimas: Supabase lo recomienda contra el
  abuso.
- Set de evaluación con 20 a 30 boletas reales y script `eval-receipts` (fase 2, parte 2).

## 2026-10-31 · Ajustes pedidos por el dueño

### Respuestas a las 30 preguntas

Ver `docs/ideas.md`. Cambios aplicados:

- **Resumen semanal en vez de diario.** La app no debe ser invasiva: un aviso el domingo a las
  10:00 (día y hora configurables), solo si algo vence en los próximos 7 días. Se quitó el aviso
  de la mañana y la opción de días de anticipación.
- **Botones visibles en vez de gestos.** Cada producto tiene botones ✓ (me lo comí) y 🗑 (lo
  boté). Se quitó el deslizar: el dueño no lo encontró evidente.
- **Agregar productos** pasó del botón flotante a un "+" en el encabezado, porque el botón
  flotante tapaba los botones de la lista.
- **Precio en cada producto** de "Para guardar".
- **Tono serio** en los mensajes.

### Barra de pestañas: Escanear, Inicio, Recetas, Resumen

El dueño pidió que Escanear no sobresalga: ahora es un círculo verde del mismo tamaño que los
otros íconos y va primero. La app sigue abriendo en Inicio (`initialRouteName: 'index'`).

## 2026-10-29 · Fase 1

### SQL directo con expo-sqlite, sin Drizzle

El plan proponía Drizzle "si no complica". Se descartó: obliga a agregar `drizzle-orm`,
`drizzle-kit` y un plugin de Babel para importar las migraciones. En cambio:

- Las migraciones son una lista de SQL en `src/db/migrations.ts`, con la versión en
  `PRAGMA user_version`.
- El acceso a datos pasa por una interfaz mínima (`src/db/db.ts`).
- Los tests usan el SQLite que ya trae Node (`node:sqlite`), así que **el SQL real se prueba sin
  celular y sin dependencias nuevas**.

### Lugares con códigos en inglés

En la base, los lugares se guardan como `fridge`, `freezer` y `pantry` (regla: código en inglés).
En pantalla se muestran como Refri, Congelador y Despensa.

### Tabla de vida útil: valores curados, pendientes de revisión

El servidor de FSIS bloquea la descarga automática de FoodKeeper ("Access Denied" a cualquier
programa). El catálogo (`src/data/catalog.json`, 142 productos) y sus categorías
(`src/data/categories.json`) se armaron con los rangos de las guías de FoodKeeper más estimaciones
propias para productos chilenos. Todo está marcado `"reviewed": false`.

Pendiente: que el dueño descargue `foodkeeper.json` desde su navegador para compararlo con la
tabla, y revisar a mano los productos chilenos.

### Escanear la fecha del envase: primero escribirla, después con la cámara

El OCR necesita un módulo nativo que no está en Expo Go, y en iPhone eso exige la cuenta de Apple.
Por ahora:

- La fecha se escribe como aparece en el envase ("12/11/26", "VENC 12.11.26", "12 NOV 26").
- La lee el mismo parser (`src/lib/package-date.ts`, con tests) que usará el OCR.
- Cuando exista el development build, solo falta conectar la cámara a ese parser.

### Avisos: se reprograman al abrir la app y al cambiar algo

- Se programan los próximos 14 días (máximo 28 avisos, bajo el límite de 64 de iOS).
- Se reprograman al abrir la app y cada vez que cambia el inventario o los ajustes.
- **No hay tarea en segundo plano por ahora.** Si alguien no abre la app en 14 días, los avisos
  se acaban (y probablemente ya no hay nada que avisar).
- Se reevalúa con el development build.
- Los botones "Me lo comí" y "Lo boté" del aviso se atienden al abrir la app si iOS no la deja
  correr en segundo plano (pasa en Expo Go).

### Open Food Facts desde el celular

- La consulta va directo desde el celular: no hay backend en la fase 1, y el límite de 15
  consultas por minuto es por IP, o sea por usuario.
- La app se identifica con `Frescura/0.1` y la URL del repositorio, sin correo personal.
- Se deja al menos 4 segundos entre consultas.
- Lo encontrado se guarda en la tabla `barcodes` del celular para no volver a consultarlo.
- Licencia ODbL: se cita en Ajustes → Acerca de. Si en la fase 2 esos datos pasan al diccionario
  compartido, esa parte del diccionario debe publicarse con la misma licencia.

### Lotes como filas separadas

Cada compra del mismo producto es una fila con su propia fecha. La que vence antes dice "Usa este
primero · 2 lotes". Es más simple que una lista agrupada y cumple el objetivo.

### Acción masiva por compra, en la fase 2

"Ya se consumió todo lo de la compra del 12/10" necesita boletas. En la fase 1 se puede
seleccionar varios productos y marcarlos de una vez.

### `metro.config.js` solo para la versión web

Agrega el archivo `.wasm` que usa expo-sqlite en el navegador. La versión web sirve para revisar
pantallas en pruebas automáticas; en el celular no cambia nada.

### Dependencias de la fase 1

**Ninguna nueva.** Se usaron módulos ya instalados en la fase 0: `expo-sqlite`, `expo-camera`,
`expo-notifications`, `expo-haptics`, `react-native-gesture-handler` y
`react-native-reanimated`. Se quitó `expo-localization`, que no hizo falta: la zona horaria sale
del reloj del celular.

## 2026-10-28 · Fase 0

### iOS y Android desde el inicio; se prueba primero en iPhone

El dueño tiene un iPhone 13 y un computador Windows, y quiere la app en cualquier dispositivo.
Expo produce ambas versiones desde el mismo código, así que no cuesta más desarrollar las dos.

- **Pruebas en iPhone:** con Expo Go (gratis) mientras la app no use módulos nativos propios.
- **Pruebas en Android:** emulador de Android Studio en el computador Windows (gratis).
- **Publicación:** se decide en la fase 5. Con cuenta de Apple, TestFlight permite probar con
  usuarios reales sin el requisito de Google Play de 12 testers durante 14 días.
- Cambia la regla 14 del documento original ("Android primero").

### Cuándo pagar la cuenta de Apple (US$99 al año)

Instalar en un iPhone una app con módulos nativos propios (OCR, por ejemplo) exige una cuenta de
desarrollador de Apple pagada. Desde Windows no hay alternativa gratis: la única opción sin pagar
requiere un Mac con Xcode. Se paga recién cuando se necesite el primer módulo nativo (escaneo de
fecha con OCR, fase 1), para no gastar antes de tiempo y para que el año pagado empiece cuando se
use.

### Presupuesto: unos $100.000 CLP

Con el dólar cerca de $960 (septiembre de 2026): Apple ≈ $95.000 al año, Google Play ≈ $24.000 una
vez y la IA con tope de US$5 al mes ≈ $4.800. No alcanza para todo el primer año. Prioridad: Apple
(necesaria para probar en el celular del dueño), luego la IA (en la práctica, centavos al mes) y
Google Play cuando se publique en Android.

### Expo SDK 58

Es la versión estable más reciente (15 de octubre de 2026): React Native 0.88, React 19.3. Requiere
Node 22.13 o superior.

### Rutas en `src/app/` en vez de `app/`

Es la convención de la plantilla oficial de SDK 58 y deja todo el código fuente bajo `src/`.

### Pestañas con `expo-router/tabs` (JavaScript) en vez de `NativeTabs`

Las pestañas nativas no permiten destacar el botón central de escanear, y el documento pide que
sea el más visible. Las de JavaScript sí, y además permiten poner Ajustes en el encabezado.

### Textos con una función `t()` propia, sin librería de traducción

Un archivo `src/i18n/es-CL.ts` con todas las claves y una función de 20 líneas con tipos, que
avisa en el typecheck si una clave no existe. Una librería como i18next no aporta nada mientras
haya un solo idioma.

### Modelo de IA: Claude Haiku 5.5, sin temperatura y sin razonamiento

Verificado en la documentación oficial (octubre 2026): US$0,10 por millón de tokens de entrada y
US$0,50 de salida, caché a US$0,01, y Batch API con 50 % de descuento. Haiku 5.5 rechaza
`temperature` (el documento pedía temperatura 0) y trae el razonamiento activado por defecto,
que se cobra como salida: se desactiva. La respuesta se controla con salida estructurada.
Estimación gruesa: unos US$0,0005 por boleta, 20 veces bajo la meta.

### Diccionario compartido simplificado (aprobado por el dueño)

Como el costo por boleta ya está muy bajo la meta, la fase 2 parte con coincidencia exacta
normalizada. La coincidencia aproximada (trigramas con `pg_trgm`) y las reglas de promoción con
varias confirmaciones se agregan solo si el set de evaluación muestra que hacen falta.

### Tablas y recetario base sin Batch API

La tabla de vida útil parte de FoodKeeper del USDA (dominio público, CC0, y ya viene en español).
Los productos chilenos y el recetario los redacta Claude durante el desarrollo y los revisa el
dueño. Costo de API: cero.

### Tope de gasto de IA: US$5 al mes (aprobado por el dueño)

Con la estimación actual alcanza para unas 10.000 boletas al mes.

### Dependencias de la fase 0

Todas son módulos oficiales de Expo incluidos en Expo Go, para que la app funcione sin
development build:

- `expo-router`: navegación por archivos (viene en la plantilla).
- `@expo/vector-icons`: íconos (Ionicons) en iOS, Android y web.
- `expo-sqlite`, `expo-camera`, `expo-notifications`, `expo-haptics`, `expo-localization`:
  instalados ahora porque los usa la fase 1 (base local, cámara y códigos de barras, avisos,
  vibración y zona horaria).
- Desarrollo: `jest` + `jest-expo` (tests), `eslint` + `eslint-config-expo` (lint), `prettier`
  (formato).

Se quitaron de la plantilla: `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-device`,
`expo-web-browser` y `expo-image`, que no se usan.

### `npm audit` al cierre de la fase 0

8 avisos en dependencias de producción (3 altos, 5 bajos), todos dentro de las herramientas de
Expo (`@expo/cli`, `@expo/config` y sus dependencias `deepmerge` y `zod`). Son herramientas que
corren en el computador al compilar, no código que llegue al celular. La "solución" que propone
npm es bajar a Expo SDK 51, lo que no tiene sentido: se espera el parche de Expo y se revisa de
nuevo antes de cada versión publicada. Cuando el backend use Zod (fase 2), se instalará una
versión sin el problema.

### Saltos de línea LF en todos los sistemas (`.gitattributes`)

Git para Windows convierte por defecto los saltos de línea a CRLF al descargar, y Prettier
(que espera LF) marcaba los 28 archivos del proyecto como mal formateados en el computador del
dueño. `.gitattributes` fija LF para todos los archivos de texto en cualquier sistema.
