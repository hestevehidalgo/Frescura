# Prompt para Claude Code: app anti-desperdicio de comida

Oct 28, 2026 · @Henri

## 1. Tu rol y cómo vas a trabajar

Eres el ingeniero principal de este proyecto: vas a construir una app móvil que lee boletas de supermercado chilenas, estima cuándo vence cada alimento, avisa a tiempo y sugiere recetas con lo que está por vencer. Yo soy estudiante de ingeniería, no desarrollador experto: explícame en español cada paso que tenga que hacer yo, sin asumir conocimientos previos.

Reglas de trabajo:

1. Lee este documento completo antes de escribir una línea de código.
2. Verifica en documentación oficial todo lo que pueda haber cambiado: versiones de Expo, React Native y librerías; nombres y precios actuales de los modelos de IA (docs.claude.com); límites de los planes gratuitos de cada servicio. No confíes en tu memoria para precios ni límites.
3. Si algo de este documento está desactualizado, es técnicamente inviable o existe una alternativa claramente más barata o simple, dímelo antes de implementar, con tu recomendación.
4. Antes de programar, entrégame un plan por fases (sección 17) y espera mi aprobación.
5. Trabaja una fase a la vez. Al cerrar cada una: typecheck, lint y tests en verde; commit con mensaje claro; y una guía paso a paso para probarla en mi celular.
6. Crea al inicio un `CLAUDE.md` con las convenciones del proyecto y las reglas de costo de la sección 3, para que se respeten en sesiones futuras.
7. Nunca escribas claves de API en el código ni en commits. Usa `.env` (ignorado por git) y un `.env.example`. Cuando necesites que yo cree una cuenta o una clave, detente y dime exactamente qué hacer y dónde.
8. Prefiere lo simple: menos dependencias, menos servicios, menos código. Cada dependencia nueva se justifica en una línea.
9. Código en inglés (variables, archivos, funciones). Interfaz, documentación y comentarios importantes en español de Chile.
10. Si una decisión cambia bastante el costo o la complejidad, pregúntame. Si no, decide tú y regístrala en `docs/decisiones.md` con el motivo.

## 2. Visión del producto

La app evita que la gente bote comida (y plata) porque se le olvidó lo que tenía en el refri. Nombre provisional: **Frescura** (configurable en un solo lugar del código).

**El problema real.** La gente compra, guarda y se olvida. Las apps de inventario existentes fracasan porque cargar productos a mano es tedioso y el inventario queda desactualizado en una semana. Nuestra ventaja: una foto de la boleta carga toda la compra en segundos, y la app pide confirmaciones de un toque para mantenerse al día.

**Usuario objetivo.** Personas en Chile que hacen compras de supermercado semanales o quincenales: estudiantes que viven solos o en depto compartido, parejas jóvenes y familias. Usan el celular para todo, tienen poco tiempo y no quieren llenar formularios.

**Promesa en una frase.** "Saca una foto a tu boleta y nunca más botes comida sin darte cuenta."

**Las cuatro cosas que la app debe hacer excelente:**

1. Convertir una foto de boleta en una lista de alimentos correcta, editable en menos de 30 segundos.
2. Estimar una fecha de vencimiento razonable para cada alimento y dejar claro si es estimada o real.
3. Avisar en el momento justo, sin ser molesta: un resumen diario, no diez notificaciones.
4. Responder "¿qué cocino hoy?" priorizando lo que vence primero.

**Principio de diseño.** Cada interacción debe costar un toque o un gesto. Si una función exige escribir, busca la forma de que no lo exija.

## 3. Principio rector: costo mínimo

Meta: **costo fijo de US$0 al mes** hasta los primeros \~1.000 usuarios, y **costo variable bajo US$0,01 por boleta** (ideal bajo US$0,003 cuando el caché madure). Mide ambos desde el primer día. Estas reglas van tal cual al `CLAUDE.md`:

1. **La IA es el último recurso.** Todo lo que se pueda resolver en el dispositivo, con una tabla o con un caché, se resuelve así. Ver la escalera de costos (sección 5).
2. **Local-first.** El inventario vive en el celular (SQLite). En el MVP no hay servidor que guarde datos del usuario: cero costo de almacenamiento y la app funciona sin internet.
3. **Notificaciones locales**, programadas en el dispositivo. Sin servidor de push.
4. **Un solo backend serverless en plan gratuito**, solo para: esconder la clave de la API de IA, controlar cuotas y abuso, y alojar el diccionario compartido de productos. Nada más.
5. **El modelo más barato que cumpla.** Usa el modelo más económico de Anthropic que pase el set de pruebas (hoy, la familia Haiku). El nombre del modelo va en una variable de entorno, detrás de una interfaz `AiProvider`, para cambiar de modelo o proveedor sin tocar la app.
6. **Texto antes que imagen.** OCR gratuito en el dispositivo y envío de solo texto a la IA. La imagen se envía únicamente si el OCR falla, y en ese caso va en escala de grises, recortada y reducida a la resolución mínima que mantenga la precisión (mídela).
7. **Pocos tokens de salida**, que cuestan varias veces más que los de entrada: JSON compacto con claves cortas, sin explicaciones, `max_tokens` ajustado y temperatura 0.
8. **Nunca pagar dos veces por lo mismo.** Caché por boleta (hash de imagen + folio), por línea de boleta (diccionario compartido) y por receta (conjunto de ingredientes).
9. **Prompt caching** para el prompt de sistema fijo, si supera el mínimo cacheable del modelo (verifícalo).
10. **El trabajo pesado se hace una vez, en lote.** La tabla de vida útil y el recetario base se generan durante el desarrollo con la Batch API (más barata), se revisan y quedan como JSON dentro de la app.
11. **Topes duros.** Límite de gasto mensual en la consola de Anthropic (propónme un monto), cuota por usuario (por ejemplo 30 escaneos al mes en el plan gratis) y límite de solicitudes por minuto en el backend.
12. **Filtro gratuito antes de gastar.** Antes de llamar a la IA, el dispositivo verifica que la foto parezca una boleta: el texto del OCR debe contener palabras como TOTAL, BOLETA o RUT, o varias líneas terminadas en precio. Si no, no se llama.
13. **Registra el costo de cada llamada** (modelo, tokens de entrada, salida y caché, USD estimado) en una tabla `ai_usage`, y crea un script que muestre el costo promedio por boleta, por usuario y por día.
14. **Cuentas de tienda.** Google Play cobra un pago único y Apple una suscripción anual (verifica montos actuales). El MVP apunta a Android primero; iOS cuando el producto esté validado, salvo que yo te diga otra cosa.

## 4. Stack técnico y arquitectura

Todo lo posible ocurre en el celular; el backend es una capa delgada y gratuita que solo protege la clave de IA, aplica cuotas y comparte el diccionario de productos.

&#91;embedded content: arquitectura · celular, backend y la IA como último recurso\]

Fotos, inventario, avisos y recetas viven en el celular; el backend solo valida cuotas, consulta el diccionario y, como último recurso, llama a la IA.

| Capa | Elección | Por qué |
| --- | --- | --- |
| App | Expo (React Native) + TypeScript estricto + Expo Router | Un solo código para Android e iOS, herramientas gratuitas |
| Base local | `expo-sqlite` con migraciones versionadas (Drizzle ORM si no complica) | Local-first, offline, sin costo |
| Estado de UI | Zustand o el estado de React; los datos se leen de SQLite | Simple, pocas dependencias |
| Captura | Escáner de documentos nativo (ML Kit Document Scanner en Android, VisionKit en iOS) mediante un plugin | Recorta y mejora la foto gratis, sube la precisión del OCR |
| OCR | ML Kit Text Recognition en el dispositivo | Gratis, offline, la foto no sale del celular |
| Códigos de barras | Lector de la cámara (expo-camera o ML Kit) | Gratis |
| Notificaciones | `expo-notifications` locales | Sin servidor |
| Backend | Supabase plan gratuito: Edge Functions + Postgres + autenticación anónima | Todo en un lugar. Alternativa a evaluar: Cloudflare Workers + D1 |
| IA | API de Anthropic, modelo barato configurable, llamada solo desde el backend | La clave nunca viaja en la app |
| Builds | EAS Build plan gratuito o build local con Android Studio | Sin costo |
| Errores | Sentry plan gratuito (opcional) | Ver fallas reales en producción |

Detalles que debes resolver y explicarme:

- El OCR y el escáner son módulos nativos: no corren en Expo Go y requieren un *development build*. Explícame cómo instalarlo en mi celular Android.
- Verifica las condiciones del plan gratuito de Supabase (por ejemplo, si pausa proyectos inactivos) y propón cómo manejarlo.
- Autenticación anónima: el usuario entra sin correo ni contraseña; el ID anónimo sirve para cuotas. Deja preparada la opción de vincular un correo después.

Estructura sugerida del repositorio:

```
app/                      rutas (Expo Router)
src/features/             scan, inventory, recipes, stats, settings
src/db/                   esquema y migraciones SQLite
src/lib/                  ocr, receipt-parser, dates, money, notifications
src/data/                 shelf-life.json, recipes.json, catalog-seed.json
supabase/functions/       parse-receipt, generate-recipe
supabase/migrations/      tablas del diccionario, cuotas y costos
scripts/                  eval-receipts, cost-report, generate-seeds
tests/fixtures/receipts/  fotos y textos de boletas reales + resultado esperado
docs/                     decisiones.md, setup.md, privacidad.md
```

## 5. Escaneo de boletas: pipeline y escalera de costos

La boleta pasa por pasos gratuitos en el celular antes de tocar la IA, y a la IA solo llegan las líneas que nadie ha resuelto antes. Este es el principal mecanismo de ahorro de toda la app.

**Captura**

- Botón grande "Escanear boleta" en la pantalla principal.
- Escáner de documentos nativo: detección de bordes, recorte, corrección de perspectiva y contraste.
- Boletas largas: varias fotos de la misma boleta, unidas eliminando las líneas repetidas donde se traslapan.
- Importar desde la galería y desde PDF (boletas electrónicas por correo y compras online de supermercados).
- Consejos en pantalla: buena luz, boleta estirada, sin sombras. Avisar que el papel térmico se borra con el tiempo: conviene escanear el mismo día.

**Pipeline por boleta, en este orden**

1. OCR en el dispositivo: texto por línea con su confianza.
2. Filtro "¿es una boleta?" (regla 12 de la sección 3). Si falla, se pide otra foto, sin costo.
3. Redacción en el dispositivo: se eliminan números de tarjeta, RUT de personas, nombres de programas de puntos y cualquier dato personal antes de enviar nada.
4. Extracción determinística: supermercado (por RUT emisor o nombre), fecha, folio y total. Huella de la boleta = RUT emisor + folio (o hash del texto). Si ya se escaneó, se avisa y no se gasta de nuevo.
5. Pre-parseo de líneas candidatas: líneas que terminan en precio; cantidades (`2 X $990`); granel (`1,234 KG X $1.290`); descuentos (`DCTO`, `OFERTA`, montos negativos); y líneas que se ignoran (subtotal, IVA, vuelto, medios de pago).
6. Escalera de costos por línea, que se detiene en el primer peldaño que resuelve:
   1. Caché local de líneas que este usuario ya confirmó: US$0.
   2. Diccionario compartido en el backend, alias exacto normalizado (mayúsculas, sin tildes, espacios colapsados, por cadena): \~US$0.
   3. Coincidencia aproximada en el diccionario (trigramas con `pg_trgm`) sobre un umbral alto: \~US$0.
   4. IA en modo texto, UNA llamada por boleta con solo las líneas sin resolver: fracciones de centavo.
   5. IA con imagen, solo si el OCR salió ilegible (confianza baja o muy pocas líneas): el peldaño más caro, último recurso.
7. Validación gratuita: suma de líneas menos descuentos contra el total impreso. Si no cuadra, se marca "puede que falten productos" y se resaltan las zonas dudosas.
8. Pantalla de revisión (sección 13): el usuario corrige en segundos y confirma.
9. Aprendizaje: lo confirmado se guarda en la caché local. Sube al diccionario compartido cuando hay evidencia suficiente (por ejemplo, 3 usuarios distintos lo confirmaron, o la IA lo resolvió con confianza alta y nadie lo corrigió). Así el costo por boleta baja con cada usuario nuevo.

**Contrato con la IA (función `parse-receipt`)**

- Entrada: cadena de supermercado y líneas sin resolver con su índice. Ningún dato personal.
- Salida: JSON con claves cortas, validado con Zod. Por línea: `i` índice, `n` nombre canónico en español, `b` marca o null, `q` cantidad, `u` unidad (un, kg, g, l, ml), `c` categoría de una lista cerrada, `f` es alimento (true/false), `s` almacenamiento sugerido (refri, congelador, despensa), `k` confianza de 0 a 1.
- Usa salidas estructuradas o tool use con esquema JSON para que la respuesta siempre sea parseable. Máximo un reintento si falla la validación; si vuelve a fallar, el usuario completa a mano.
- El prompt de sistema incluye ejemplos reales de líneas abreviadas de boletas chilenas con su respuesta correcta. Por ejemplo: `LECHE ENT COLUN 1L` → Leche entera, Colún, 1 l, lácteos (despensa si es larga vida y está cerrada); `PLATANO KG` → Plátano, granel, frutas; `DET LIQ` → no es alimento.
- El precio no se le pide a la IA: sale del texto del OCR. La IA nunca inventa líneas que no estén en la entrada.
- Timeout, reintento con espera exponencial, idempotencia por huella de boleta, y un mensaje claro si la cuota se agotó (el usuario puede seguir agregando a mano).

## 6. Estimación de vencimientos

Cada alimento tiene una fecha y un origen visible: **real** (impresa en el envase), **estimada** (por tabla) o **ajustada** (por el usuario). La estimación es gratis: sale de una tabla local, nunca de una llamada a la IA en tiempo real.

**Tabla de vida útil (`shelf-life.json`)**

- Base: el dataset público FoodKeeper del USDA, con tiempos de conservación en despensa, refri y congelador, cerrado y abierto. Descárgalo, tradúcelo y adáptalo durante el desarrollo; verifica su licencia y cita la fuente dentro de la app.
- Llave: producto canónico o categoría × lugar (refri, congelador, despensa) × estado (cerrado, abierto, cocinado).
- Valor: rango en días (mínimo y máximo). Para avisar se usa el mínimo; en pantalla se muestra el rango.
- Agrega productos chilenos que no estén en la tabla: palta, marraqueta, hallulla, pan amasado, quesillo, queso fresco, manjar, longaniza, pebre casero, entre otros.
- Lo que la tabla no cubra lo completa la IA una sola vez, en lote, y se revisa a mano antes de incluirlo.

**Reglas de cálculo**

- Fecha de compra = fecha de la boleta, no la del escaneo.
- Vencimiento estimado = fecha de compra + días mínimos según producto, lugar y estado.
- "Lo abrí": se recalcula con la vida útil de abierto y gana la fecha más temprana entre la del envase y la de abierto. Ejemplo: la leche larga vida dura meses cerrada y pocos días abierta.
- "Lo congelé": se aplica la vida útil de congelador. Al descongelar, vida útil corta y advertencia de no volver a congelar.
- Se distinguen "fecha de vencimiento" (seguridad) y "consumir preferentemente antes de" (calidad). Para carnes, pollo, pescados y mariscos frescos, la app nunca sugiere consumir después de la fecha.
- Productos muy variables (palta, plátano, tomate, pan): pregunta opcional de un toque al confirmar, como "¿La palta estaba madura?" (Sí / No), que ajusta el cálculo.
- Productos de larga duración (arroz, fideos, conservas, aceite) van a Despensa sin alertas por defecto, configurable.

**Fecha real del envase**

- Botón "Escanear fecha" en cada producto: OCR en el dispositivo y un parser de formatos chilenos (`12/11/26`, `12-11-2026`, `12 NOV 26`, `VENC 12.11.26`, "CONSUMIR ANTES DE…"). Sin costo de IA.
- La fecha real siempre reemplaza a la estimada.

**Aprendizaje personal, sin IA**

- Si el usuario marca "Se echó a perder antes", se guarda un ajuste para ese producto (por ejemplo, vida útil × 0,8 para ese usuario).
- Si lo consume en buen estado después de la fecha estimada, se ajusta hacia arriba con más cautela y solo en categorías de bajo riesgo.
- Nunca se alarga automáticamente la vida útil de carnes, pescados, mariscos, lácteos frescos ni comida cocinada.

## 7. Inventario: al día con mínimo esfuerzo

La principal razón por la que la gente abandona estas apps es que el inventario deja de reflejar el refri real, así que actualizarlo debe costar un gesto.

- **Vista principal por urgencia:** Vence hoy, Próximos 3 días, Esta semana, Más adelante. Cada estado tiene color, ícono y texto; nunca solo color (accesibilidad).
- **Filtros por lugar:** Refri, Congelador, Despensa.
- **Gestos:** deslizar a la derecha = "Me lo comí"; a la izquierda = "Lo boté", con motivo opcional de un toque (se echó a perder, no me gustó, sobró). Mantener presionado abre el menú: lo abrí, lo congelé, cambiar fecha, cambiar lugar, editar, dividir.
- **Cantidades parciales:** "Usé la mitad" o "Usé 1 de 6" con un selector rápido. Nunca exigir precisión.
- **Deshacer:** aviso con "Deshacer" durante 5 segundos tras cualquier acción.
- **Cierre del ciclo:** cuando algo vence, la app pregunta "¿Qué pasó con el yogur?" con tres botones: Me lo comí, Lo congelé, Lo boté. Si no hay respuesta en unos días, se archiva como "sin información" y no cuenta como botado.
- **Acciones masivas:** selección múltiple y "Ya se consumió todo lo de la compra del 12/10".
- **Lotes:** si se compra de nuevo algo que ya existe, se agrupa por producto y se muestra cada lote con su fecha; se sugiere usar primero el más antiguo.
- **Búsqueda instantánea**, local.
- **Historial de compras:** boletas escaneadas con supermercado, fecha y total; al tocar una, sus productos.
- **Campos de cada producto:** nombre, cantidad y unidad, lugar, precio pagado, fecha de compra, vencimiento y su origen, estado, notas opcionales.

## 8. Notificaciones locales

Una notificación diaria útil vale más que diez molestas: la app manda un solo resumen al día, y solo si hay algo urgente.

- **Resumen diario** a la hora que elija el usuario (por defecto 18:30, antes de cocinar). Ejemplo: "3 cosas vencen pronto: pollo (mañana), yogur y espinaca. Ver recetas →".
- Si no hay nada por vencer, no se envía nada.
- **Aviso extra opcional** en la mañana, solo para productos de alto riesgo (carnes, pescados, mariscos) que vencen ese día.
- **Botones en la notificación:** "Ver recetas" y, cuando es un solo producto, "Me lo comí" o "Lo boté" sin abrir la app.
- **Límite de iOS:** solo permite 64 notificaciones locales programadas por app. Programa únicamente los próximos 7 a 14 resúmenes y reprograma cada vez que se abre la app o cambia el inventario. Evalúa una tarea en segundo plano para refrescar.
- **Permiso en contexto:** se pide después del primer escaneo ("¿Te aviso antes de que algo venza?"), nunca al abrir la app por primera vez. Android 13 o superior exige permiso explícito.
- Nunca notificar de noche (horario silencioso configurable).
- **Configuración:** hora del resumen, días de anticipación (1, 2 o 3), categorías que avisan y un interruptor para apagar todo.
- **Tono:** breve, cercano, sin culpas. Se puede usar humor chileno suave.

## 9. Recetas con lo que está por vencer

Las recetas salen de un recetario local y un ranking que corre en el celular, gratis; la IA solo inventa recetas cuando el usuario lo pide y ninguna receta local sirve.

**Recetario base (`recipes.json`)**

- Entre 200 y 300 recetas simples y caseras, con fuerte presencia chilena: cazuela, charquicán, porotos granados, tortilla de verduras, budín de zapallo italiano, pastel de choclo, ensalada chilena, sopaipillas, panqueques, queque de plátano, arroz graneado, guiso de zapallo, cremas de verduras, entre otras. Más recetas rápidas universales.
- Se generan una vez con la Batch API, se revisan y se guardan como JSON en la app.
- Cada receta tiene: título, porciones, tiempo, dificultad, ingredientes enlazados al catálogo de productos con cantidad, pasos cortos, etiquetas (vegetariana, vegana, sin gluten, sin lactosa, económica, una olla) y equipamiento (horno, microondas, sartén, olla).

**Ranking local**

- Puntaje = urgencia de los ingredientes por vencer que usa (más peso a los que vencen antes) + proporción de ingredientes que ya tienes − penalización por ingredientes faltantes.
- Básicos de despensa configurables como "siempre tengo": sal, aceite, azúcar, harina, ajo, especias, etc.
- Cada tarjeta muestra "Usa 3 cosas que vencen pronto" y la lista de lo que falta.
- Filtros: tiempo máximo, dificultad, dieta, equipamiento y porciones. Las restricciones y alergias del usuario filtran siempre.
- "Cociné esta receta" descuenta los ingredientes del inventario, con confirmación rápida de cantidades.

**Recetas con IA, solo bajo demanda**

- Botón "Inventar una receta con lo que tengo", visible cuando ninguna receta local supera un puntaje mínimo.
- Cuota pequeña (por ejemplo, 5 al mes en el plan gratis).
- Caché por conjunto ordenado de ingredientes + filtros: si alguien ya pidió esa combinación, se reutiliza sin costo.
- Salida JSON con el mismo formato del recetario. Las recetas bien evaluadas por usuarios se suman al recetario compartido.
- El prompt exige prácticas seguras: pollo y cerdo bien cocidos, nada de conservas caseras, respetar alergias declaradas.

## 10. Ingreso sin boleta

Mucha comida en Chile se compra donde no hay boleta útil (la feria, la verdulería, el almacén), así que agregar a mano tiene que ser tan rápido como escanear.

- **Agregar rápido:** grilla de íconos de lo más común en la feria (palta, tomate, lechuga, cebolla, papa, zapallo italiano, limón, plátano, manzana, naranja, etc.). Un toque suma 1; mantener presionado permite elegir cantidad o kilos. Precio opcional.
- **Autocompletado** desde el catálogo local mientras se escribe.
- **Código de barras del producto:** se lee en el dispositivo. El nombre sale del catálogo propio; si no existe, se consulta Open Food Facts (base abierta y gratuita; respeta su política de uso e identifica la app). El resultado se guarda en el diccionario compartido para no volver a consultarlo.
- **Sobras y comida cocinada:** "Guardé sobras de cazuela" crea un producto con la vida útil de comida cocinada.
- **Repetir compra:** desde el historial, "Agregar de nuevo" carga los mismos productos con fechas nuevas.
- **Voz (fase posterior):** se usa el dictado del teclado del sistema, que es gratis. Un parser local entiende frases como "1 kilo de tomates, 2 paltas y una lechuga"; solo si no entiende, se usa la IA en modo texto.

## 11. Estadísticas y motivación

Como la boleta trae el precio de cada producto, la app puede mostrar en pesos cuánto se botó y cuánto se salvó: esa cifra concreta es la que cambia hábitos. Todo se calcula en el dispositivo, sin IA.

- **Plata botada este mes** (suma del precio de lo marcado como "Lo boté", proporcional a la cantidad) y **plata salvada** (lo que se consumió estando por vencer o se cocinó con una receta sugerida).
- **Resumen mensual:** porcentaje de comida aprovechada, gasto por categoría y por supermercado, y comparación con el mes anterior.
- **Consejos por reglas locales**, no por IA. Ejemplos: "Botas la mitad de la lechuga: compra media"; "Compras pan cada 3 días y botas un tercio: congela la mitad al llegar".
- **Rachas:** semanas seguidas sin botar comida. Pocos logros y bien pensados; nada de gamificación invasiva.
- **Compartir** el resumen como imagen ("Este mes salvé $12.400 en comida"), que además sirve para crecer sin pagar publicidad.
- **Historial de precios** por producto y supermercado ("La leche te costó $1.090 en una cadena y $1.190 en otra").

## 12. Modelo de datos

Los datos del usuario viven en SQLite dentro del celular; el backend solo guarda conocimiento compartido y anónimo (diccionario, códigos de barras, recetas) más cuotas y costos. Propón el esquema final a partir de esto:

| Tabla | Dónde | Campos clave |
| --- | --- | --- |
| `inventory_items` | Celular | id, product\_id, display\_name, quantity, unit, location (refri, congelador, despensa), price\_clp, purchased\_at, expires\_at, expiry\_source (impresa, estimada, usuario), date\_type (vencimiento, preferente), opened\_at, frozen\_at, status (activo, consumido, botado, sin información), discard\_reason, receipt\_id, timestamps |
| `item_events` | Celular | id, item\_id, type (agregado, abierto, congelado, consumido, botado, editado), quantity\_delta, at. Base de estadísticas y de "Deshacer" |
| `receipts` | Celular | id, chain, issuer\_rut, folio, purchased\_at, total\_clp, fingerprint, scanned\_at, local\_image\_uri (opcional) |
| `products` | Celular | id, canonical\_name, category, default\_storage, shelf\_life\_key, barcode |
| `line_cache` | Celular | chain, normalized\_line, product\_id, confirmed\_at |
| `shelf_life_adjustments` | Celular | product\_id, factor |
| `recipes`, `recipe_ingredients` | Celular | Del JSON base más las generadas que el usuario guardó |
| `settings` | Celular | hora del resumen, días de anticipación, básicos de despensa, dieta, alergias, personas en el hogar |
| `line_aliases` | Backend | chain, normalized\_line, product\_id, confirmations, source (ia, usuario), confidence |
| `catalog_products` | Backend | Productos canónicos compartidos |
| `barcodes` | Backend | ean, product\_id, source |
| `generated_recipes` | Backend | ingredients\_hash, filters\_hash, recipe\_json, rating |
| `quotas` | Backend | user\_id, month, scans\_used, recipes\_used |
| `ai_usage` | Backend | user\_id, function, model, input\_tokens, output\_tokens, cache\_tokens, usd\_estimated, created\_at |

Reglas del modelo:

- Montos en pesos chilenos como enteros (sin decimales).
- Fechas sin hora para vencimientos; toda lógica de "hoy" usa la zona horaria del dispositivo (America/Santiago por defecto).
- IDs UUID, migraciones versionadas y borrado lógico donde sirva para estadísticas.
- Row Level Security en todas las tablas del backend. La app nunca escribe directo en `line_aliases`: solo mediante las Edge Functions, que validan.
- Exportar e importar respaldo en JSON desde Ajustes (el usuario no pierde sus datos si cambia de celular).

## 13. Pantallas y UX

Cuatro pestañas (Inicio, Escanear, Recetas, Resumen) y Ajustes en el encabezado; el escaneo es el botón central y más visible.

1. **Bienvenida:** máximo 3 pantallas, todas saltables. Qué hace la app, hora del aviso diario, básicos de despensa y restricciones alimentarias (opcional). Sin registro.
2. **Inicio:** tarjeta "Hoy cocina con esto" (los 3 productos que vencen primero + una receta sugerida), lista por urgencia, filtros por lugar y botón "+" para agregar rápido.
3. **Escanear:** escáner de documentos, luego progreso con pasos legibles ("Leyendo la boleta…", "Reconociendo productos…") y después la revisión.
4. **Revisión de boleta**, la pantalla más importante. Meta: confirmar una boleta de 20 productos en menos de 30 segundos.
   - Cada fila: nombre, cantidad, lugar (chip), vencimiento estimado (chip editable) y precio.
   - Lo dudoso (baja confianza) se resalta; lo que no es alimento aparece ya excluido en una sección plegada "Excluidos", recuperable con un toque.
   - Aviso si la suma no cuadra con el total.
   - Botón final "Guardar 18 productos".
5. **Detalle de producto:** fechas y su origen, historial de eventos, acciones (abrí, congelé, escanear fecha, mover, editar).
6. **Recetas:** lista ordenada por puntaje con filtros; el detalle marca qué ingredientes tienes y cuáles faltan. Modo cocina con pasos grandes y pantalla siempre encendida.
7. **Resumen:** plata botada y salvada, porcentaje aprovechado, consejos y gráficos simples.
8. **Ajustes:** notificaciones, despensa, dieta y alergias, escaneos restantes del mes, exportar e importar, privacidad, y "Acerca de" con las fuentes de datos.

Estados que deben existir en cada pantalla: vacío ("Escanea tu primera boleta"), cargando, error con acción para reintentar, sin internet (los escaneos quedan en cola y se procesan al volver la conexión) y cuota agotada (se puede seguir agregando a mano).

Calidad visual y de uso:

- Diseño limpio y cálido, con identidad propia (no una plantilla genérica). Modo oscuro desde el inicio.
- Botones de al menos 44 puntos, tamaño de letra del sistema respetado, etiquetas para lector de pantalla y contraste suficiente.
- Vibración leve al confirmar gestos y animaciones sutiles.
- Arranque en menos de 2 segundos y listas virtualizadas para inventarios grandes.

## 14. Localización Chile

La app es chilena desde el primer día: idioma, formatos, supermercados y productos locales. Deja los textos en archivos de traducción para poder abrir otros países después.

- **Idioma:** español de Chile, tuteo, nombres locales (palta, choclo, porotos verdes, zapallo italiano, betarraga, frutilla, durazno, quesillo, marraqueta, hallulla, manjar, vienesas, longaniza).
- **Plata:** `$1.290`, punto como separador de miles y sin decimales. Al parsear boletas, `1.290` son mil doscientos noventa pesos, nunca 1,29. Los kilos usan coma decimal (`1,234 KG`). Este error es fácil de cometer: cubrirlo con tests.
- **Fechas:** formato día-mes-año; la semana parte el lunes.
- **Zona horaria:** America/Santiago, con cambio de horario. Las notificaciones programadas deben seguir saliendo a la hora correcta cuando cambia el horario (tests incluidos).
- **Cadenas a soportar y probar:** Líder, Express de Líder, Jumbo, Santa Isabel, Unimarc, Tottus, aCuenta, Alvi, Mayorista 10, OK Market y Oxxo. Cada una tiene formato y abreviaturas propias: identifícalas por RUT emisor o nombre y guarda reglas de parseo por cadena.
- **Timbre electrónico:** las boletas electrónicas traen un código PDF417 con RUT emisor, folio, fecha y monto total. Leerlo es gratis y sirve para detectar boletas duplicadas y la fecha exacta. Solo trae el primer ítem, así que no reemplaza al OCR.
- **IVA:** los precios lo incluyen; las líneas de IVA se ignoran.
- **Bolsas, propinas, donaciones** y redondeos que aparecen en la boleta: no son alimentos, se excluyen pero cuentan para cuadrar el total.

## 15. Privacidad, seguridad y seguridad alimentaria

La app sabe qué come una persona y dónde compra: eso se trata como información privada, y las fechas estimadas se presentan como orientación, nunca como garantía.

**Privacidad**

- La foto de la boleta no sale del celular, salvo en el peldaño de IA con imagen. Esto se informa la primera vez y se puede desactivar. Nunca se guarda en el servidor.
- Se eliminan datos personales antes de enviar cualquier texto (sección 5).
- El backend no guarda qué usuario compró qué: el diccionario compartido es anónimo, y `ai_usage` guarda métricas, nunca el contenido de las boletas. Nada de texto de boletas en los logs.
- Política de privacidad clara en español, formulario de seguridad de datos de Google Play y botón "Borrar todos mis datos" (local y backend). Si existen cuentas, borrarlas debe ser posible desde la app.
- Revisa la Ley 19.628 y la nueva Ley 21.719 de protección de datos personales de Chile, y la política de retención de datos de la API de Anthropic, y refleja lo que corresponda en la política de privacidad.

**Seguridad y protección del presupuesto**

- La clave de IA vive solo en los secretos del backend.
- Las Edge Functions validan la sesión anónima, el tamaño de la entrada (máximo de líneas y caracteres), la cuota mensual y un límite por minuto por usuario e IP.
- El endpoint no puede usarse como IA gratis para otra cosa: prompt fijo en el servidor, entrada estructurada, `max_tokens` fijo y salida validada contra el esquema.
- El texto de la boleta se trata como datos, nunca como instrucciones (protección contra prompt injection). La salida se valida y jamás se ejecuta.
- Límite de gasto en la consola de Anthropic y un aviso si el costo diario supera un umbral.
- Dependencias mínimas y auditoría con `npm audit` antes de cada versión.

**Seguridad alimentaria**

- Texto visible junto a cada fecha estimada: "Fecha estimada. Revisa siempre la fecha del envase, el olor y el aspecto".
- Carnes, pollo, pescados, mariscos y comida cocinada usan siempre el criterio más conservador. La app nunca dice que algo de alto riesgo vencido "todavía se puede comer".
- Los filtros de alergias ayudan, pero la app aclara que no garantiza la ausencia de alérgenos.
- Las fuentes de las tablas de conservación se citan en "Acerca de".

## 16. Calidad: pruebas y métricas

El modelo y la configuración de IA se eligen con datos: un set de boletas reales, un script que mide precisión y costo, y umbrales mínimos antes de publicar.

**Set de evaluación**

- En la fase 2 pídeme fotos de 20 a 30 boletas reales de distintas cadenas, con instrucciones para sacarlas bien y tapar datos personales.
- Para cada una, prepara el resultado esperado en JSON y ayúdame a revisarlo.

**Script `eval-receipts`**

- Corre el pipeline completo sobre el set y reporta: porcentaje de productos detectados, nombre y categoría correctos, lugar correcto, error en el total, tiempo y costo por boleta, y porcentaje de líneas resueltas en cada peldaño de la escalera.
- Antes de llamar a la API real muestra el costo estimado y pide confirmación.
- Compara al menos dos configuraciones (solo texto contra imagen, y dos modelos) y elige la más barata que cumpla los umbrales.
- Umbrales para publicar: 95% o más de productos detectados, 90% o más con nombre y categoría correctos, y costo promedio bajo la meta de la sección 3.

**Tests automáticos**

- Unitarios: parser de precios y cantidades en pesos, parser de fechas de envase, normalización de líneas, cálculo de vencimientos (abierto, congelado, ajustes personales), ranking de recetas, redacción de datos personales y programación de notificaciones (cambio de horario y límite de 64 en iOS).
- Integración de las Edge Functions con la IA simulada: los tests automáticos nunca llaman a la API real ni gastan plata.
- Checklist de pruebas manuales en el celular al cierre de cada fase.

**Métricas de producto** (pocas, anónimas, sin terceros si es posible): escaneos por usuario, porcentaje de productos corregidos en la revisión, porcentaje de productos con el ciclo cerrado (comido, congelado o botado) y retención semanal.

## 17. Plan por fases

Seis fases, de la más barata a la que gasta; la IA aparece recién en la fase 2, cuando la app ya es útil sin ella. No pases a la siguiente fase sin cumplir el criterio de aceptación y sin mi visto bueno.

1. **Fase 0. Preparación (US$0).** Repositorio, Expo + TypeScript, lint, formato, tests, `CLAUDE.md`, `docs/setup.md` y development build instalado en mi Android.
   - Criterio: abro la app en mi celular desde el development build y veo la navegación de 4 pestañas.
2. **Fase 1. Inventario local sin IA (US$0).** SQLite, agregar rápido, autocompletado, tabla de vida útil inicial, vista por urgencia, gestos y deshacer, resumen diario con notificaciones locales, escaneo de fecha del envase y código de barras con Open Food Facts.
   - Criterio: uso la app una semana sin boletas, recibo el resumen a la hora elegida y no se pierde nada al cerrar o reiniciar.
3. **Fase 2. Escaneo de boletas.** Escáner y OCR, filtro de boleta, redacción de datos personales, pre-parseo, Supabase con sesión anónima, función `parse-receipt`, diccionario compartido, cuotas, `ai_usage`, pantalla de revisión, validación del total, set de evaluación y script.
   - Criterio: umbrales de la sección 16 cumplidos y reporte de costo por boleta.
4. **Fase 3. Recetas.** Recetario base generado en lote y revisado, ranking, filtros, "Cociné esta receta" y recetas con IA bajo demanda, con caché y cuota.
   - Criterio: con un inventario de prueba, las 5 primeras recetas usan al menos 2 productos por vencer cada una.
5. **Fase 4. Estadísticas y pulido.** Plata botada y salvada, resumen mensual, consejos por reglas, compartir imagen, ingreso por voz, accesibilidad, modo oscuro, estados vacíos, de error y sin conexión, exportar e importar.
   - Criterio: checklist de accesibilidad y de estados completo, revisado en el celular.
6. **Fase 5. Publicación en Google Play.** Política de privacidad, ficha de la tienda (textos y capturas), formulario de seguridad de datos, límite de gasto activo y monitoreo de costos. Verifica los requisitos actuales de prueba cerrada para cuentas personales nuevas (exigen un mínimo de testers durante varios días) y prepárame un plan para conseguirlos.
   - Criterio: app en prueba cerrada con usuarios reales y costo por boleta dentro de la meta.

## 18. Fuera del MVP (no implementar todavía)

Estas ideas quedan para después; diseña la arquitectura para que agregarlas no obligue a reescribir, pero no las construyas ahora.

- **Hogar compartido:** varias personas con el mismo refri y sincronización en tiempo real. Candidata a primera función pagada.
- **Lista de compras inteligente:** lo que se terminó pasa a la lista, y la app avisa "ya tienes esto" antes de comprar repetido.
- **Widget** de pantalla de inicio con lo que vence pronto.
- **Versión iOS publicada** en la App Store.
- **Importación automática** de boletas de compras online desde el correo.
- **Planificador semanal de comidas** y comparador de precios entre supermercados con datos agregados.
- **Monetización freemium:** gratis con N escaneos al mes y recetas locales ilimitadas; premium (precio a validar, por ejemplo $1.990 al mes) con escaneos ilimitados, hogar compartido, recetas con IA y estadísticas avanzadas. Las cuotas deben estar diseñadas para que activar esto sea cambiar configuración. No implementes pagos en el MVP.

## 19. Entregables y reglas finales

Al terminar el MVP debo tener una app instalable, un backend desplegado y documentación que me permita mantenerla sin ayuda.

**Entregables**

- Repositorio con historial de commits limpio, uno o más por fase.
- App instalable en Android y backend desplegado en el plan gratuito.
- `docs/setup.md`: cómo levantar todo desde cero, paso a paso, para un principiante.
- `docs/costos.md`: costo real medido por boleta y por receta, proyección mensual para 100, 1.000 y 10.000 usuarios, y qué palancas bajan el costo si crece.
- `docs/decisiones.md`, `docs/privacidad.md` y una política de privacidad lista para publicar.
- Script de reporte de costos y script de evaluación de boletas.

**Tu primera respuesta**, antes de escribir código:

1. Resumen en 10 líneas de lo que entendiste.
2. Lo que verificaste (versiones, modelos, precios, límites) y qué cambia respecto a este documento.
3. Las preguntas que necesitas que responda, máximo 5.
4. Plan detallado de las fases 0 y 1.

Luego espera mi aprobación.

**Reglas para dudas**

- Entre "más completo" y "más simple y barato", elige lo simple y barato, y anótalo.
- Si te bloqueas, explícame el problema en palabras simples y propón dos opciones con su costo.
