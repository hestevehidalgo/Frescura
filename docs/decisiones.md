# Decisiones

Registro de decisiones técnicas y de producto, con su motivo. Lo más reciente va arriba.

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
