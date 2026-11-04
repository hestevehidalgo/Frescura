# Activar el escaneo de boletas (Supabase + Anthropic)

Guía paso a paso para conectar el servidor que lee boletas. Se hace **una sola vez**. Tiempo
aproximado: 30 a 45 minutos.

**Importante sobre las claves:** la clave de Anthropic (empieza con `sk-ant-`) es secreta. Nunca
la pegues en el chat, en el código ni en GitHub: solo va en Supabase (paso 5). La URL y la clave
"publishable" de Supabase (empieza con `sb_publishable_`) sí son públicas por diseño.

## 1. Cuenta de Anthropic (la IA)

1. Entra a <https://platform.claude.com> y crea una cuenta.
2. Ve a **Billing** y compra créditos. Con **US$5** alcanza para miles de boletas (cada una cuesta
   menos de 1 centavo de dólar). Los créditos vencen al año y no se devuelven.
3. Ve a **Limits** (o Settings → Limits) y pon un **límite de gasto mensual de US$5**. Así
   nunca se cobra más de eso.
4. Ve a **API Keys** → **Create Key**. Nómbrala `frescura-supabase`.
5. **Copia la clave y guárdala en un lugar seguro** (por ejemplo, una nota del celular). Solo se
   muestra una vez. La usarás en el paso 5.

## 2. Proyecto en Supabase (el servidor)

1. Entra a <https://supabase.com> y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Toca **New project**:
   - Nombre: `frescura`
   - Región: **South America (São Paulo)**, la más cercana a Chile.
   - Database password: inventa una segura y **guárdala**.
3. Espera uno o dos minutos a que el proyecto quede listo.

## 3. Permitir usuarios sin registro (anónimos)

1. En el menú de la izquierda: **Authentication** → **Sign In / Providers** (o "Providers").
2. Activa **Allow anonymous sign-ins** y guarda.

## 4. Crear las tablas

1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abre en GitHub el archivo `supabase/migrations/20261031000000_quotas_and_usage.sql`, toca el
   botón **Copy raw file** (el ícono de copiar) y pégalo en el editor.
3. Toca **Run**. Debe decir `Success. No rows returned`.

## 5. Guardar la clave de Anthropic en Supabase

1. En el menú de la izquierda: **Edge Functions** → **Secrets** (o "Manage secrets").
2. Agrega:
   - Key: `ANTHROPIC_API_KEY`
   - Value: la clave que guardaste en el paso 1 (empieza con `sk-ant-`).
3. Guarda.

## 6. Subir la función que lee boletas

En PowerShell, dentro de la carpeta `Frescura`:

1. Trae lo último:
   ```bash
   git pull
   ```
2. Inicia sesión en Supabase:
   ```bash
   npx supabase login
   ```
   Si el navegador no se abre o da error (como pasó con Expo), ve a
   <https://supabase.com/dashboard/account/tokens>, crea un token, cópialo y escribe (cambiando
   `TU_TOKEN`):
   ```bash
   $env:SUPABASE_ACCESS_TOKEN="TU_TOKEN"
   ```
3. Conecta la carpeta con tu proyecto. El "project ref" está en la URL del panel de Supabase:
   `supabase.com/dashboard/project/ESTE_TEXTO`.
   ```bash
   npx supabase link --project-ref TU_PROJECT_REF
   ```
   Si te pide la contraseña de la base de datos, es la del paso 2.
4. Sube la función:
   ```bash
   npx supabase functions deploy parse-receipt --use-api
   ```
   Debe terminar con `Deployed Functions on project ...`.

## 7. Conectar la app con Supabase

1. En Supabase: **Project Settings** → **API Keys** (o "Data API"). Copia:
   - la **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - la **Publishable key** (empieza con `sb_publishable_`)
2. En PowerShell, dentro de la carpeta `Frescura`, crea el archivo `.env` con estos dos comandos
   (cambia los valores por los tuyos):
   ```bash
   Set-Content -Path .env -Value "EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co"
   ```
   ```bash
   Add-Content -Path .env -Value "EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxxxxx"
   ```
   El archivo `.env` no se sube a GitHub: queda solo en tu computador.
3. Reinicia la app borrando la copia guardada:
   ```bash
   npx expo start --clear
   ```

## 8. Probar

1. En el iPhone, abre Frescura → **Escanear** → **Sacar foto**.
2. Acepta el aviso de privacidad y el permiso de cámara.
3. Fotografía una boleta real: estirada, con buena luz y completa.
4. Revisa la lista y toca **Guardar**.

Si algo falla, mándale a Claude una captura del mensaje que aparece en la app.

## 9. Activar las recetas con IA (fase 3)

Se hace una sola vez, después de los pasos anteriores.

1. Crea la tabla de caché de recetas: en Supabase → **SQL Editor** → **New query**, pega el
   contenido de `supabase/migrations/20261102000000_generated_recipes.sql` y toca **Run**. Debe
   decir `Success. No rows returned`.
2. En PowerShell, dentro de la carpeta `Frescura`, trae lo último y sube la función:
   ```bash
   git pull
   ```
   ```bash
   npx supabase functions deploy generate-recipe --use-api
   ```
   Debe terminar con `Deployed Functions on project ...`. Si dice que no has iniciado sesión,
   repite el paso 6.2.
3. Prueba: en la app, **Recetas** → **Inventar receta**. Necesitas al menos dos productos en el
   inventario que no estén vencidos ni congelados.

## 10. Freno de gasto diario y borrado de datos (fase 5)

Los pasos están en la **Parte 2** de [`publicacion.md`](publicacion.md): una consulta SQL nueva
(`20261104000000_daily_spend.sql`) y subir las funciones `parse-receipt`, `generate-recipe` y
`delete-account`.

Opcional: para cambiar el tope diario (por defecto US$0,25), en Supabase → **Edge Functions →
Secrets** agrega `DAILY_LIMIT_USD` con el valor en dólares (por ejemplo `0.5`).

## 11. Madurez con foto

1. En Supabase → **SQL Editor** → **New query**, pega el contenido de
   `supabase/migrations/20261105000000_photo_quota.sql` y toca **Run** (`Success`).
2. En PowerShell, dentro de la carpeta `Frescura`:
   ```bash
   npx supabase functions deploy estimate-ripeness --use-api
   ```
3. Prueba: **+** → toca **Palta** → en "Para guardar", **Madurez con foto**.

## Ver cuánto se está gastando

En Supabase → **SQL Editor**, pega el contenido de `scripts/cost-report.sql` y toca **Run**.
Muestra el costo promedio por boleta, por día y por usuario. También puedes ver el gasto total en
la consola de Anthropic → **Usage**.
