# Fase 6: búsqueda y corrección de errores

Revisión del 4 de noviembre de 2026 (dos rondas). Para cada hallazgo: qué pasaba, por qué importa y cómo quedó.
Todos los arreglos tienen un test automático, salvo los visuales (revisados con capturas).

## Cómo se buscó

1. **Herramientas automáticas:** `expo-doctor` (compatibilidad con el SDK), `npm audit`
   (vulnerabilidades), TypeScript estricto, lint y los 499 tests.
2. **Revisión del código por áreas:** vencimientos, inventario, avisos, boletas, códigos de
   barras, recetas, estadísticas, respaldo, servidor y pantallas.
3. **Pruebas de pantallas** con un navegador automático: celular chico (320 × 568), modo claro y
   oscuro, nombres muy largos, 21 productos, precios inválidos, sin conexión y el flujo completo
   de "Borrar todos mis datos".

## Hallazgos corregidos

### Seguridad alimentaria

| #   | Qué pasaba                                                                                                                                                                                             | Arreglo                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1   | Un producto **descongelado se podía volver a congelar** con "Cambiar lugar → Congelador" (el botón "Lo congelé" sí estaba oculto).                                                                     | El servicio rechaza congelar algo descongelado y el menú ya no ofrece el congelador. |
| 2   | Un **atún en lata** leído por código de barras quedaba como "pescado" (dura 1 a 2 días) en vez de "conserva" (años), porque Open Food Facts le pone las dos etiquetas. Lo mismo con pescado congelado. | Las conservas y los congelados tienen prioridad.                                     |

### Datos y estadísticas

| #   | Qué pasaba                                                                                                                                                         | Arreglo                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 3   | El **ajuste personal de vida útil** aprendía de productos abiertos o congelados ("se echó a perder" después de abrirlo acortaba la duración del producto cerrado). | Solo aprende de productos que nunca se abrieron ni congelaron.        |
| 4   | Se aceptaban **precios negativos** ("-990") y montos absurdos (un error de tipeo de $12.900.000), que distorsionaban el resumen.                                   | Nuevo `parsePrice`: entre $0 y $2.000.000.                            |
| 5   | Un **precio inválido** (en rojo) se guardaba en silencio como "sin precio".                                                                                        | Mensaje "Revisa los precios en rojo" y el botón Guardar se desactiva. |
| 6   | Los productos agregados con **código de barras** no tenían precio (el dueño pidió precio siempre).                                                                 | Campo de precio en esa pantalla.                                      |
| 7   | Guardar una **boleta repetida** (la app avisa, pero se permite) fallaba con "Algo salió mal".                                                                      | Se guarda sin la huella repetida.                                     |

### Android

| #   | Qué pasaba                                                                                                                                  | Arreglo                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 8   | **"Elegir de la galería" no habría abierto en Android:** pedía el permiso de leer todas las fotos, que se bloqueó en la fase 5.             | Ya no pide permiso: el selector del sistema no lo necesita. |
| 9   | El **selector del respaldo** solo aceptaba archivos marcados como JSON; Android a veces los marca como archivo genérico y quedaban en gris. | Acepta cualquier archivo y revisa el contenido.             |
| 10  | Si el permiso de cámara se negó para siempre, el botón **"Permitir cámara" no hacía nada**.                                                 | Mensaje y botón para abrir los ajustes del celular.         |
| 11  | Al **sacar algo del congelador a la despensa**, la app lo dejaba en el refri.                                                               | Respeta el lugar elegido.                                   |

### Avisos

| #   | Qué pasaba                                                                     | Arreglo                 |
| --- | ------------------------------------------------------------------------------ | ----------------------- |
| 12  | El botón **"Ver recetas"** del aviso abría Inicio (quedó así desde la fase 1). | Abre Recetas.           |
| 13  | El último aviso tocado se **volvía a procesar cada vez que se abría la app**.  | Se marca como atendido. |

### Textos y pantallas

| #   | Qué pasaba                                                                                | Arreglo                                                                   |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 14  | Avisos con **género equivocado**: "Lechuga marcado como botado".                          | Frases neutras: "Anotamos Lechuga como «Lo boté»", "Congelaste Pan", etc. |
| 15  | Los **mensajes largos** se cortaban a 2 líneas y desaparecían en 5 segundos.              | Hasta 4 líneas y más tiempo si el texto es largo (máximo 12 s).           |
| 16  | En **celulares chicos**, el panel "Para guardar" tapaba casi toda la pantalla de Agregar. | La lista se ajusta al alto de la pantalla.                                |
| 17  | Después de **"Borrar todos mis datos"**, la bienvenida se podía abrir dos veces.          | Se cierra Ajustes y la bienvenida aparece una sola vez (probado).         |
| 18  | Dos colores escritos a mano (`#000`) fuera de la paleta del tema.                         | Nuevos colores `camera` y `shadow` en `src/theme`.                        |
| 19  | Un comentario decía "avisos de 14 días" cuando son 4 semanas.                             | Corregido.                                                                |

### Dependencias

| #   | Qué pasaba                                                                                                                                    | Arreglo                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 20  | 8 paquetes desactualizados respecto del SDK 58 (`react-native-safe-area-context` con versión menor distinta). Podía causar fallas en Expo Go. | `npx expo install --fix`; `expo-doctor`: 20/20 revisiones OK. |

## Segunda ronda (mismo día, por la tarde)

| #   | Qué pasaba                                                                                                                                                                                                           | Arreglo                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | **Doble toque en "Me lo comí" o "Lo boté"**: el producto se marcaba dos veces y el resumen contaba esa plata doble.                                                                                                  | El servicio rechaza acciones sobre productos ya cerrados y la pantalla ignora el segundo toque en silencio (sin tapar el "Deshacer"). También en "Seleccionar" y en "Cociné esta receta". |
| 22  | **Doble toque en botones que guardan o gastan**: dos recetas propias iguales, dos productos por código de barras, "Borrar receta" volvía atrás dos veces e **"Inventar receta" hacía dos llamadas pagadas a la IA**. | Herramienta común `useSingleFlight` en esos botones y en Escanear.                                                                                                                        |
| 23  | **La coma decimal en el dictado**: "1,5 kg de papas" se partía en dos productos ("1" y "5 kg de papas").                                                                                                             | La coma o el punto entre dos números se entiende como decimal.                                                                                                                            |
| 24  | **"Un kilo y medio"** se partía en dos por la "y".                                                                                                                                                                   | Se convierte en 1,5 antes de separar.                                                                                                                                                     |
| 25  | **Plural y singular en el catálogo**: "PALTAS HASS" o "Huevo" de una boleta no se reconocían y quedaban como fruta u otro genérico, sin su vida útil propia. "Zapallos italianos" caía en "zapallo".                 | El reconocimiento prueba singular y plural. Afecta a boletas, códigos de barras, dictado y recetas.                                                                                       |
| 26  | **Fecha de compra futura** en Editar, y "12/11" sin año interpretado como el año siguiente.                                                                                                                          | Nuevo `parsePurchaseDate`: nunca futura; sin año usa este año o el anterior.                                                                                                              |
| 27  | **Precio "$1.290.-"** (forma chilena común) no se aceptaba.                                                                                                                                                          | Se ignora el ".-" final.                                                                                                                                                                  |
| 28  | La tarjeta de **producto vencido de alto riesgo** (pollo, pescado) no mostraba la advertencia de seguridad que sí aparece en el detalle.                                                                             | Se muestra.                                                                                                                                                                               |
| 29  | **Horario silencioso de noche**: con el resumen a las 21:30 y silencio desde las 21:00, el aviso se movía a las 08:00 _del mismo día_, antes de la hora elegida.                                                     | Pasa a las 08:00 del día siguiente.                                                                                                                                                       |

### Encontrado, pero queda para mañana (son funciones, no errores)

- La revisión de boleta no deja **corregir cantidad ni precio** de una línea mal leída.
- El ranking a veces sugiere recetas sin el **ingrediente principal**.

Ambos están en `docs/comparacion-apps.md`, sección "Propuesta para mañana".

## Revisado y sin problemas

- Montos en pesos, coma decimal, fechas sin hora y cambio de horario: cubiertos por tests.
- Validación de entrada en las funciones del servidor (tamaño de la foto, ingredientes, límites).
- Todas las claves de texto dinámicas existen (equipamiento, alérgenos, meses, errores).
- Botones con solo ícono: todos tienen etiqueta para lector de pantalla.
- Modo oscuro en todas las pantallas.

## Pendiente (no es un error, pero conviene saberlo)

- **`npm audit`:** 5 avisos moderados en las herramientas de Expo (`glob`, `minimatch`). Corren en
  el computador al compilar, no llegan al celular. Se espera el parche de Expo.
- **Ranking de recetas:** a veces sugiere una receta a la que le falta el ingrediente principal
  (por ejemplo "Pescado a la plancha" si tienes lechuga y tomate pero no pescado). Funciona según
  las reglas, pero se podría penalizar más la falta de la proteína principal. Lo dejo a tu
  criterio.
- **Letra grande del sistema y VoiceOver/TalkBack:** solo se pueden probar en un celular real
  (lista en `docs/pruebas-fase-4.md`).
