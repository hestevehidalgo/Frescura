# Publicar Frescura en Google Play (fase 5)

Guía paso a paso. Hazla en orden; cada parte dice cuánto demora y qué hacer si algo falla.

**Costo total:** US$25 una vez (cuenta de Google Play). Todo lo demás es gratis.

**Tiempo total:** unas 3 semanas, la mayoría esperando. Google exige que las cuentas personales
nuevas hagan una **prueba cerrada con al menos 12 personas durante 14 días seguidos** antes de
publicar para todos.

---

## Parte 0. Lo que necesito de ti (5 minutos)

Para completar la política de privacidad necesito dos datos, que van a ser públicos:

1. **Nombre del responsable:** tu nombre completo (la ley chilena pide identificar al
   responsable de los datos).
2. **Correo de contacto:** te recomiendo crear un Gmail solo para la app (por ejemplo
   `frescura.app@gmail.com`) para no publicar tu correo personal. Google Play también lo
   muestra en la ficha.

Mándamelos por el chat y yo los pongo en la política, la página de borrado y la ficha.

---

## Parte 1. Publicar la política de privacidad (10 minutos)

La política queda en una página gratis de GitHub (GitHub Pages).

1. Entra a <https://github.com/hestevehidalgo/frescura/settings/pages>.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Ve a la pestaña **Actions** del repositorio, toca **Publicar sitio** (a la izquierda) →
   **Run workflow** → **Run workflow** (botón verde).
4. Espera 1 o 2 minutos hasta que aparezca un ✓ verde.
5. Abre <https://hestevehidalgo.github.io/frescura/privacidad/>: debe verse la política.

Cada vez que yo cambie algo en la carpeta `site/`, la página se actualiza sola.

---

## Parte 2. Actualizar el servidor (15 minutos)

La fase 5 agrega el freno de gasto diario y el borrado de datos. En PowerShell, dentro de la
carpeta `Frescura`:

1. Trae lo último:
   ```bash
   git checkout -- package-lock.json
   ```
   ```bash
   git pull
   ```
   ```bash
   npm ci
   ```
2. En Supabase → **SQL Editor** → **New query**, pega el contenido de
   `supabase/migrations/20261104000000_daily_spend.sql` y toca **Run**. Debe decir `Success`.
   (Si todavía no hiciste la de recetas, `20261102000000_generated_recipes.sql`, hazla antes.)
3. Sube las tres funciones (una por una):
   ```bash
   npx supabase functions deploy parse-receipt --use-api
   ```
   ```bash
   npx supabase functions deploy generate-recipe --use-api
   ```
   ```bash
   npx supabase functions deploy delete-account --use-api
   ```
   Cada una debe terminar con `Deployed Functions on project ...`. Si dice que no iniciaste
   sesión, repite el paso 6.2 de `docs/setup-backend.md`.
4. Revisa que el límite de gasto de Anthropic siga activo: <https://console.anthropic.com> →
   **Settings → Limits** → límite mensual de **US$5**.

---

## Parte 3. Crear la cuenta de Google Play (30 minutos + 1 a 7 días de espera)

1. Entra a <https://play.google.com/console/signup> con la cuenta de Google que quieras usar
   para publicar (puede ser el Gmail nuevo de la Parte 0).
2. Elige **Para mí (cuenta personal)**.
3. Completa tus datos y paga **US$25** con tarjeta. Es un pago único.
4. Google te pide **verificar tu identidad** con tu cédula. Puede demorar de unas horas a
   varios días.
5. **Verificación con un celular Android (obligatoria):** en la portada de Play Console aparece
   la tarea "Verifica que tienes acceso a un dispositivo móvil Android". Necesitas un **Android
   real** (de un familiar o amigo sirve; Android 10 o más nuevo, no sirve el emulador):
   - escanea el código QR que muestra la consola con ese celular;
   - instala la app **Google Play Console**;
   - inicia sesión con tu cuenta de desarrollador y toca **Verificar**. Toma menos de un minuto.
   - Después puedes cerrar sesión en ese celular.

---

## Parte 4. Compilar la app para Android (30 minutos + espera en la cola)

Se compila en los servidores de Expo (gratis, unas 15 compilaciones al mes). Tu computador no
necesita Android Studio.

1. Inicia sesión en Expo (si te pide navegador y falla, usa `--no-browser` como antes):
   ```bash
   npx eas-cli@latest login
   ```
2. Conecta el proyecto con Expo:
   ```bash
   npx eas-cli@latest init
   ```
   Como la configuración está en `app.config.ts`, te va a mostrar un texto con un
   **projectId** (algo como `a1b2c3d4-...`). **Mándame ese id** por el chat: no es secreto y yo
   lo agrego al proyecto.
3. Después de que yo lo agregue, trae el cambio con `git pull` y guarda las dos variables del
   servidor en Expo (son las mismas de tu archivo `.env`; cambia los valores):
   ```bash
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://hhnsyuahofyowhihoakm.supabase.co --visibility plaintext
   ```
   ```bash
   npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_KEY --value sb_publishable_TU_CLAVE --visibility plaintext
   ```
   La clave "publishable" es pública por diseño (la protege Row Level Security), por eso puede
   ir en la app. La clave de Anthropic **nunca** va aquí.
4. Compila:
   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```
   - La primera vez pregunta si genera una **keystore** (la firma de la app): responde **Yes**.
     Expo la guarda por ti.
   - Demora entre 15 minutos y un par de horas (el plan gratis va en cola).
   - Al terminar te da un enlace para descargar un archivo **.aab**. Descárgalo.

---

## Parte 5. Crear la app en Play Console (1 hora)

1. En Play Console → **Crear app**:
   - Nombre: `Frescura: no botes comida`
   - Idioma predeterminado: **Español (Latinoamérica) – es-419**
   - App o juego: **App** · Gratis o pagada: **Gratis**
   - Acepta las declaraciones.
2. En **Panel** aparece la lista "Configura tu app". Usa estos archivos para cada tarea:
   - **Política de privacidad:** `https://hestevehidalgo.github.io/frescura/privacidad/`
   - **Acceso a la app, anuncios, clasificación del contenido, público objetivo, apps de
     noticias, salud, funciones financieras:** las respuestas están en
     [`play-store/ficha.md`](play-store/ficha.md), sección "Cuestionarios".
   - **Seguridad de los datos:** [`play-store/seguridad-de-datos.md`](play-store/seguridad-de-datos.md).
   - **Ficha de la tienda:** textos de [`play-store/ficha.md`](play-store/ficha.md) e imágenes de
     `docs/play-store/imagenes/` (descárgalas desde GitHub con el botón de descarga).
   - **Eliminación de cuentas** (si la pide): URL
     `https://hestevehidalgo.github.io/frescura/borrar-datos/`.

---

## Parte 6. Prueba cerrada con 12 personas por 14 días

1. Play Console → **Pruebas → Prueba cerrada** → **Crear pista** (o usa la que viene,
   "Alpha").
2. **Países:** Chile (y otros si tienes testers fuera).
3. **Testers:** crea una lista de correo con los **Gmail** de tus testers (los que usan en su
   Play Store). Recomiendo invitar a **15 o más**, porque siempre alguien se olvida.
4. **Crear versión** → sube el archivo **.aab** de la Parte 4 → nombre `0.1.0` → notas: "Primera
   versión de prueba" → **Revisar y lanzar**. Google revisa la versión (de horas a pocos días).
5. Cuando esté aprobada, copia el **enlace de participación** (opt-in) y mándaselo a los
   testers con el mensaje de abajo.
6. **Durante los 14 días:** los testers deben seguir inscritos todo el período (si alguien se
   sale, se rompe su conteo). Pídeles abrir la app varias veces por semana y contarte qué
   falló.
7. Al día 15, en el **Panel** aparece **Solicitar acceso a producción**. Google pregunta cómo
   fue la prueba: responde con lo que aprendiste (cuántas personas, qué cambiaste). Yo te ayudo
   con las respuestas.

### Mensaje para los testers (copiar y pegar)

> ¡Hola! Estoy publicando **Frescura**, una app para no botar comida: te dice qué vence
> primero, te sugiere recetas y te muestra cuánta plata salvas. Necesito 14 días de prueba
> antes de publicarla. ¿Me ayudas?
>
> 1. Abre este enlace desde tu celular Android con tu cuenta de Gmail: **[ENLACE]**
> 2. Toca **Convertirse en tester** y luego **Descargar en Google Play**.
> 3. Úsala cuando vuelvas del súper o de la feria (agrega lo que compraste) y ábrela un par de
>    veces por semana.
> 4. **No te salgas del programa de prueba durante 14 días.**
> 5. Si algo falla o no se entiende, mándame una captura.
>
> ¡Gracias!

### Dónde conseguir 12+ testers

- Familia y amigos con Android (en Chile la mayoría de los celulares son Android).
- Compañeros de la universidad: un mensaje al grupo del curso suele bastar.
- Grupos de WhatsApp o de Facebook de tu comuna, de recetas o de ahorro en el súper.
- Si no alcanzas, existen comunidades donde desarrolladores se prueban las apps entre sí
  ("testers community"), pero es mejor gente real que use la app.

---

## Parte 7. Medir el costo real

Durante la prueba, una vez por semana: Supabase → **SQL Editor** → pega
`scripts/cost-report.sql` → **Run**. Mándame una captura y lo anoto en `docs/costos.md`. El
criterio de la fase es que el costo por boleta quede bajo **US$0,01**.

---

## Si algo falla

- **La compilación falla:** mándame el enlace del registro ("build logs") que muestra Expo.
- **Google rechaza la versión:** mándame el correo completo de Google (no contiene claves).
- **No llegas a 12 testers:** la prueba sigue corriendo; agrega más correos a la lista cuando
  quieras. El conteo de 14 días es por persona.
