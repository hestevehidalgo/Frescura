# Costos de Frescura

Meta del proyecto: **US$0 fijo al mes** y **menos de US$0,01 por boleta**.

## Costos fijos

| Servicio                                                | Plan                                                                       | Costo                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| Supabase (servidor)                                     | Gratis: 2 proyectos, 500 MB de base, 50.000 usuarios activos al mes        | US$0                      |
| Expo / EAS (compilar la app)                            | Gratis: unas 15 compilaciones de Android al mes, en cola de baja prioridad | US$0                      |
| GitHub + GitHub Pages (código y política de privacidad) | Gratis (repositorio público)                                               | US$0                      |
| Google Play (cuenta de desarrollador)                   | Pago único                                                                 | US$25 una vez             |
| Apple (cuenta de desarrollador, solo para iOS)          | Anual                                                                      | US$99 al año (todavía no) |

Ojo con Supabase gratis: **el proyecto se pausa si pasa 7 días sin uso**. Con personas usando la
app no pasa; si se pausa, se reactiva desde el panel con un clic.

## Costo por uso (IA: Claude Haiku 5.5)

Precios: US$0,10 por millón de tokens de entrada, US$0,50 por millón de salida y US$0,01 por
millón leídos del caché.

| Acción                                                         | Entrada                                  | Salida        | Costo estimado           |
| -------------------------------------------------------------- | ---------------------------------------- | ------------- | ------------------------ |
| Escanear una boleta (foto, ~20 productos)                      | ~2.000 tokens (imagen) + prompt en caché | ~1.000 tokens | **≈ US$0,0007**          |
| Receta nueva con IA                                            | ~100 tokens + prompt en caché            | ~400 tokens   | **≈ US$0,0002**          |
| Receta del caché compartido                                    | 0                                        | 0             | **US$0**                 |
| Recetas del recetario, estadísticas, avisos, códigos de barras | —                                        | —             | **US$0** (en el celular) |

La salida cuesta 5 veces más que la entrada, por eso las respuestas usan claves cortas, sin
explicaciones y sin razonamiento.

### Costo real medido

> Pendiente: se completa después de escanear boletas reales (fase 2, set de evaluación).
> Para obtenerlo: Supabase → **SQL Editor** → pega `scripts/cost-report.sql` → **Run**.

| Mes | Boletas | US$ promedio por boleta | Recetas IA | US$ promedio por receta | Total |
| --- | ------- | ----------------------- | ---------- | ----------------------- | ----- |
|     |         |                         |            |                         |       |

## Proyección mensual

Supuestos: una persona típica escanea 8 boletas y pide 2 recetas con IA al mes. El máximo del
plan gratis es 30 boletas y 5 recetas.

| Usuarios activos | Típico    | Máximo (todos usan toda su cuota) |
| ---------------- | --------- | --------------------------------- |
| 100              | ≈ US$0,60 | ≈ US$2,20                         |
| 1.000            | ≈ US$6    | ≈ US$22                           |
| 10.000           | ≈ US$60   | ≈ US$220                          |

Con el tope actual (US$5 al mes en Anthropic y US$0,25 al día en el servidor) alcanza para unos
**800 usuarios típicos**. Pasado eso, el servicio de IA se frena ese día y la app sigue
funcionando a mano. Antes de llegar ahí hay que activar la versión pagada o subir los topes.

## Protecciones contra gastos inesperados

1. **Límite mensual en la consola de Anthropic: US$5.** Si se llega, la IA deja de responder
   hasta el mes siguiente. (Console → Settings → Limits.)
2. **Freno diario en el servidor: US$0,25** (variable `DAILY_LIMIT_USD`). Si un día se gasta eso,
   las funciones dejan de llamar a la IA hasta el día siguiente (UTC).
3. **Cuota por persona:** 30 escaneos y 5 recetas con IA al mes (variables
   `SCAN_MONTHLY_LIMIT` y `RECIPE_MONTHLY_LIMIT`).
4. **Límite por minuto:** 3 llamadas por persona.
5. **Caché:** la misma boleta no se lee dos veces y la misma receta se paga una sola vez.
6. **Filtro antes de gastar:** la foto se valida (tamaño y formato) antes de llamar a la IA.

## Palancas si crece

En orden, de la más barata a la más cara de implementar:

1. **Diccionario compartido de líneas:** si una línea de boleta ("LECHE ENT COLUN 1L") ya la vio
   otra persona, no se manda a la IA. Puede bajar la salida a la mitad.
2. **OCR en el celular + solo texto** (necesita development build): la imagen deja de viajar; la
   entrada baja de ~2.000 a ~600 tokens.
3. **Quitar el texto original de cada línea** de la respuesta (`x`): ahorra ~15 % de la salida.
4. **Versión pagada** (por ejemplo $1.990 al mes): escaneos ilimitados con un costo de ~US$0,02
   por persona al mes, muy por debajo del precio.
5. **Supabase Pro (US$25 al mes)** solo si se pasan los 50.000 usuarios activos o los 500 MB.
