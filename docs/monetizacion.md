# Lanzamiento y monetización de Frescura

Noviembre de 2026. Complementa a `docs/marketing.md` (mercado y difusión) y a `docs/costos.md`
(costos de operación). Las proyecciones salen de `scripts/proyecciones.py`: cambia los supuestos y
vuelve a correrlo con `python3 scripts/proyecciones.py`.

## 1. Resumen honesto

- **El camino más probable para ganar plata es la suscripción Premium**, no los anuncios.
- En el **escenario base** (crecimiento orgánico sostenido), la app paga sus costos de IA desde el
  mes 6 y deja **unos 14.000 al mes al cumplir 2 años**. Cubre una suscripción de US$100 al mes
  recién hacia el **mes 23**.
- En el **escenario optimista** (prensa, un video que se vuelve viral, crecimiento de 15 % al mes)
  cubre US$100 al mes desde el **mes 8**.
- En el **escenario pesimista** casi no deja plata, pero tampoco cuesta: el gasto en IA es de unos
  pocos miles de pesos al mes.
- **Lo que más mueve la aguja no es el precio, sino cuánta gente sigue usando la app** (retención) y
  la difusión gratuita. Por eso el plan pone primero el lanzamiento orgánico.
- **Los fondos concursables (CORFO, Start-Up Chile) pueden aportar más que la app en el primer año:**
  hasta $15 millones no reembolsables (sección 7).

## 2. Modelo: gratis + Premium

Lo básico queda **gratis siempre**: agregar a mano, vencimientos, avisos, recetario, lista de
compras, Resumen, código de barras y respaldo. Así la app sirve sin pagar y la gente la recomienda.

|                                  | Gratis                | Premium                                                  |
| -------------------------------- | --------------------- | -------------------------------------------------------- |
| Escaneo de boletas               | 30 al mes             | Ilimitado (uso justo: 150 al mes)                        |
| Recetas con IA                   | 5 al mes              | 40 al mes                                                |
| Madurez con foto                 | 10 al mes             | 60 al mes                                                |
| Hogar compartido (por construir) | —                     | Sí, hasta 5 personas                                     |
| Historial y estadísticas         | Mes actual y anterior | 12 meses, comparación de precios completa                |
| Precio                           | $0                    | **$1.990 al mes** o **$14.990 al año** (≈ $1.249 al mes) |

### Por qué $1.990

- Es menos que Spotify Estudiantes ($2.500) y que Fitia Premium (unos $4.200 al mes, según un sitio
  de terceros).
- El argumento se sostiene solo: si la app te ayuda a salvar $5.000 al mes en comida, se paga dos
  veces y media.
- Después del IVA (19 %) y de la comisión de Google (15 %), quedan unos **$1.210 por persona al
  mes** (mezclando 60 % mensual y 40 % anual).

### Cuándo empezar a cobrar

1. **No al lanzar.** Primero hay que tener gente que use la app (meta: 300 o más activos al mes) y
   saber cuánta sigue usándola.
2. Lanzar con todo gratis y un mensaje de "**Fundadores**": los primeros 500 usuarios reciben 3
   meses de Premium gratis cuando exista. Crea compromiso y no cuesta nada.
3. Activar Premium cerca del **mes 4**, con la versión instalada (development build), que es
   obligatoria para cobrar.

## 3. Cómo se cobra (técnico)

- Google Play obliga a usar su sistema de pagos (Google Play Billing) para suscripciones. La
  comisión es de **15 %** desde el primer día.
- En Expo se usa **`expo-iap`** (la opción que recomienda Expo). **No funciona en Expo Go:**
  necesita el development build, que se genera con EAS.
- Opcional: **RevenueCat** (gratis hasta US$2.500 al mes en ventas) para ver suscriptores,
  renovaciones y cancelaciones sin programar un servidor.
- La cuota del servidor ya está preparada: pasar a Premium es subir los límites para ese usuario.
  Falta guardar en Supabase quién es Premium, verificando la compra con Google.

## 4. Anuncios dentro de la app: no (por ahora)

| Formato              | Lo que paga en Latinoamérica (aprox.) | Con 1.000 usuarios activos |
| -------------------- | ------------------------------------- | -------------------------- |
| Banner               | US$0,10–0,50 por mil vistas           | US$5–15 al mes             |
| Video con recompensa | ~US$3,40 por mil vistas               | Depende de cuántos lo vean |

Con pocos usuarios los anuncios pagan centavos, molestan, obligan a declarar seguimiento y van
contra la promesa de privacidad, que es lo que diferencia a Frescura. **Alternativa a evaluar más
adelante:** un video **opcional** con recompensa para desbloquear 5 escaneos extra. Pagaría la IA
de esos escaneos, pero solo si la persona lo elige.

## 5. Publicidad pagada: todavía no

- En Latinoamérica una instalación cuesta entre **US$0,50 y US$2** (fuentes de la industria).
- En el escenario base, cada instalación aporta en promedio unos **$50** en sus primeros 6 meses
  (35 % sigue activo × 2 % paga × $1.210 × ~6 meses). Una instalación pagada cuesta entre $475 y
  $1.900.
- **Conclusión:** la publicidad pagada no se recupera mientras no exista Premium y la retención sea
  baja. Primero difusión gratis (TikTok, Instagram, universidad, prensa), según
  `docs/marketing.md`. La prueba de $50.000 en anuncios queda para cuando la retención a 7 días
  sea de 40 % o más.

## 6. Trámites e impuestos (lo que tienes que saber)

> No soy contador. Esto es una guía para saber qué preguntar; confírmalo con el SII o con un
> contador antes de cobrar.

1. **Para publicar gratis no necesitas trámites tributarios**, solo la cuenta de Google Play.
2. **Antes de cobrar:**
   - En Play Console, completa el **perfil de pagos** (cuenta bancaria y datos tributarios).
   - **Inicio de actividades en el SII** como persona natural. Se hace en línea en sii.cl. Pregunta
     qué actividad corresponde a "venta de aplicaciones y servicios digitales".
   - **IVA:** la ayuda de Google Play en español se contradice. Una versión dice que Google retiene
     y paga el IVA de las compras en Chile; otra, que el desarrollador residente en Chile debe
     declararlo. **Confírmalo en Play Console → Perfil de pagos y con el SII.** Las proyecciones ya
     descuentan el 19 % para no inflar los números.
3. Los ingresos se declaran en la **Operación Renta** de abril de cada año.

## 7. Plata que no viene de usuarios

| Fuente                                        | Monto                                                          | Qué piden                                                                                                                                       | Cuándo                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **CORFO Semilla Inicia**                      | Hasta **$15.000.000** no reembolsables (75 % del proyecto)     | Persona natural mayor de 18 años y residente en Chile, o empresa nueva sin ventas; producto nuevo con posibilidad de vender durante el proyecto | Convocatorias regionales durante el año (las de 2026 ya cerraron en varias regiones); revisa corfo.gob.cl |
| **Start-Up Chile Build**                      | **$15.000.000** sin ceder acciones, más 4 meses de aceleración | Idea validada o prototipo (Frescura ya tiene producto)                                                                                          | La generación más reciente cerró en mayo de 2026; atento a la próxima en startupchile.org                 |
| **Incubadoras y concursos de tu universidad** | Variable, más mentorías                                        | Ser estudiante                                                                                                                                  | Pregunta en tu universidad: casi todas tienen programas de emprendimiento                                 |
| **Alianzas con municipalidades**              | Licencia o patrocinio                                          | Programas de reducción de residuos                                                                                                              | Cuando tengas usuarios y métricas                                                                         |
| **Alianzas con marcas o supermercados**       | Patrocinio de recetas o campañas                               | Usuarios en volumen                                                                                                                             | Más adelante; cuidar la confianza: nada que parezca publicidad encubierta                                 |

**Recomendación:** prepara la postulación a Semilla Inicia o a Start-Up Chile apenas tengas la
prueba cerrada con resultados (usuarios, retención, comentarios). Con un producto funcionando y
datos reales, la postulación es mucho más fuerte. Yo te ayudo a escribirla.

## 8. Proyecciones a 24 meses

### Supuestos

|                                            | Pesimista | Base | Optimista |
| ------------------------------------------ | --------- | ---- | --------- |
| Instalaciones el mes 1                     | 150       | 400  | 800       |
| Crecimiento de instalaciones al mes        | 5 %       | 12 % | 15 %      |
| Instalan y siguen el primer mes            | 30 %      | 35 % | 40 %      |
| Activos que siguen al mes siguiente        | 70 %      | 78 % | 82 %      |
| Activos que pagan Premium (desde el mes 4) | 1 %       | 2 %  | 3,5 %     |

Precio neto por Premium: $1.210 al mes. Costo de IA: US$0,006 por usuario gratis y US$0,02 por
Premium al mes. Supabase Pro (US$25) solo sobre 50.000 activos. Dólar a $950.

### Escenario pesimista

| Mes | Instalaciones (total) | Activos al mes | Premium | Ingresos | Costo IA e infra | Resultado |
| --- | --------------------- | -------------- | ------- | -------- | ---------------- | --------- |
| 1   | 150                   | 45             | 0       | $0       | $256             | -$256     |
| 3   | 473                   | 105            | 0       | $0       | $597             | -$597     |
| 6   | 1.020                 | 157            | 2       | $1.901   | $917             | $985      |
| 9   | 1.654                 | 194            | 2       | $2.350   | $1.133           | $1.217    |
| 12  | 2.388                 | 229            | 2       | $2.772   | $1.336           | $1.435    |
| 18  | 4.220                 | 309            | 3       | $3.741   | $1.804           | $1.937    |
| 24  | 6.675                 | 415            | 4       | $5.016   | $2.419           | $2.598    |

Resultado del año 1: $8.874 · año 2: $24.149 · cubre US$100 al mes ($95.000): no en 24 meses · US$200: no en 24 meses

### Escenario base

| Mes | Instalaciones (total) | Activos al mes | Premium | Ingresos | Costo IA e infra | Resultado |
| --- | --------------------- | -------------- | ------- | -------- | ---------------- | --------- |
| 1   | 400                   | 140            | 0       | $0       | $798             | -$798     |
| 3   | 1.350                 | 383            | 0       | $0       | $2.184           | -$2.184   |
| 6   | 3.246                 | 720            | 14      | $17.421  | $4.296           | $13.125   |
| 9   | 5.910                 | 1.098          | 22      | $26.563  | $6.550           | $20.013   |
| 12  | 9.653                 | 1.583          | 32      | $38.309  | $9.446           | $28.863   |
| 18  | 22.300                | 3.162          | 63      | $76.499  | $18.863          | $57.636   |
| 24  | 47.262                | 6.249          | 125     | $151.195 | $37.281          | $113.914  |

Resultado del año 1: $158.739 · año 2: $789.153 · cubre US$100 al mes ($95.000): mes 23 · US$200: no en 24 meses

### Escenario optimista

| Mes | Instalaciones (total) | Activos al mes | Premium | Ingresos   | Costo IA e infra | Resultado  |
| --- | --------------------- | -------------- | ------- | ---------- | ---------------- | ---------- |
| 1   | 800                   | 320            | 0       | $0         | $1.824           | -$1.824    |
| 3   | 2.778                 | 940            | 0       | $0         | $5.359           | -$5.359    |
| 6   | 7.003                 | 1.948          | 68      | $82.489    | $12.011          | $70.477    |
| 9   | 13.429                | 3.249          | 114     | $137.557   | $20.030          | $117.527   |
| 12  | 23.201                | 5.099          | 178     | $215.879   | $31.435          | $184.444   |
| 18  | 60.669                | 11.973         | 419     | $506.965   | $73.821          | $433.144   |
| 24  | 147.334               | 27.749         | 971     | $1.174.959 | $171.089         | $1.003.869 |

Resultado del año 1: $945.775 · año 2: $6.246.295 · cubre US$100 al mes ($95.000): mes 8 · US$200: mes 13

**Cómo leerlo:** "Resultado" es ingresos menos costos de IA y servidor en ese mes. No incluye el pago
único de Google Play (US$25) ni tu tiempo.

## 9. Lo que más cambia los números

1. **Retención** (cuánta gente sigue usando la app): pasar de 78 % a 85 % mensual casi duplica los
   usuarios activos al año. Se mejora con el escaneo de boletas, los avisos y la lista de compras.
2. **Difusión gratis:** cada nota de prensa o video que funciona puede traer cientos de
   instalaciones en una semana.
3. **Conversión a Premium:** el hogar compartido es la función que más justifica pagar (familias).

## 10. Plan de lanzamiento con fechas (propuesta)

| Cuándo      | Qué                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Esta semana | Nombre y correo para la política de privacidad; `.env` y funciones del servidor (`docs/setup-backend.md`) |
| Semana 1    | Cuenta de Google Play (US$25), verificación con un Android prestado, compilación con EAS                  |
| Semanas 1–3 | Prueba cerrada con 15–20 testers; encuesta en los días 7 y 14                                             |
| Semana 2    | Versión web en Cloudflare Pages (gratis) para mostrar la app en redes y en postulaciones                  |
| Semana 4    | Acceso a producción y publicación en Google Play, todo gratis + mensaje "Fundadores"                      |
| Semanas 4–8 | Difusión orgánica (`docs/marketing.md`): 3 videos por semana, universidad, grupos, prensa                 |
| Mes 2       | Postular a CORFO Semilla Inicia o Start-Up Chile (la convocatoria abierta que corresponda)                |
| Mes 3       | Development build + `expo-iap`; trámites en el SII                                                        |
| Mes 4       | Activar Premium ($1.990 al mes o $14.990 al año)                                                          |
| Mes 5–6     | Hogar compartido (primera función exclusiva de Premium)                                                   |

## 11. Riesgos

| Riesgo                             | Cómo se mitiga                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Poca gente se queda                | Medir en la prueba cerrada; mejorar el primer uso; avisos útiles y no invasivos    |
| Nadie paga                         | Premium con funciones claras (escaneo ilimitado, hogar); precio bajo; oferta anual |
| La IA se encarece                  | Topes diarios y mensuales activos; IA solo donde suma; modelo más barato           |
| Problema con impuestos             | Hacer el inicio de actividades antes de cobrar; consultar a un contador            |
| Un supermercado lanza algo similar | Privacidad y neutralidad (sirve para cualquier supermercado)                       |

## Fuentes

- Semilla Inicia 2026: [Fomento Biobío](https://www.fomentobiobio.gob.cl/programas-financiamiento/semilla-inicia-2025/),
  [Alfondo](https://alfondo.cl/fondos/semilla-inicia),
  [El Tipógrafo](https://eltipografo.cl/2026/02/lanzan-postulacion-al-fondo-semilla-inicia-2026-de-corfo)
- Start-Up Chile: [Emol](https://www.emol.com/noticias/Economia/2026/05/06/1199166/startup-chile-convocatoria.html),
  [ChileAtiende](https://www.chileatiende.gob.cl/fichas/94371-start-up-chile-apoyo-para-startups-innovadoras)
- Comisión de Google Play: [TechCrunch](https://techcrunch.com/?p=2221893),
  [Adapty](https://adapty.io/blog/google-play-billing-changes-subscriptions-fees),
  [Pricepush](https://pricepush.app/blog/google-play-subscription-fees-2026-real-math)
- IVA en Google Play: [Ayuda de Play Console (es-419)](https://support.google.com/googleplay/android-developer/answer/138000?hl=es-419),
  [Ayuda de Play Console (es)](https://support.google.com/googleplay/android-developer/answer/138000?hl=es)
- Compras dentro de la app con Expo: [Guía de Expo](https://docs.expo.dev/guides/in-app-purchases/),
  [Adapty](https://adapty.io/blog/expo-in-app-purchases-tutorial/)
- RevenueCat (sitios de terceros): [CostBench](https://costbench.com/software/subscription-billing/revenuecat/free-plan/),
  [AgentDeals](https://agentdeals.dev/vendor/revenuecat)
- Precios de referencia en Chile: [iProfesional (Spotify)](https://www.iprofesional.com/tecnologia/385726-spotify-mas-caro-cual-es-el-nuevo-precio-en-la-argentina),
  [AppTail (Fitia)](https://apptail.io/app/fitia-diet-meal-planner-WQG/chile)
- Anuncios (eCPM): [Playio](https://blog.playio.co/mobile-game-ecpm-benchmarks-2026),
  [Appodeal](https://appodeal.com/the-mobile-ecpm-report-updated-q4-2024-view)
- Costo por instalación: [Mapendo](https://mapendo.co/blog/mobile-apps-cpi-2026-the-ultimate-report-for-app-marketers),
  [Linkrunner](https://linkrunner.io/cost-per-install-benchmark),
  [AppsFlyer LatAm](https://www.appsflyer.com/es/resources/reports/finance-marketers-latam-report/)
