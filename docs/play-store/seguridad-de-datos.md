# Formulario "Seguridad de los datos" (Google Play)

Respuestas para Play Console → **Política de la app → Seguridad de los datos**. Se basan en lo
que hace el código hoy (fase 5). Si cambia algo que sale del celular, hay que actualizarlo.

## Preguntas generales

| Pregunta                                                             | Respuesta                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ¿La app recopila o comparte alguno de los tipos de datos requeridos? | **Sí**                                                                                                                          |
| ¿Todos los datos se encriptan en tránsito?                           | **Sí** (HTTPS)                                                                                                                  |
| ¿Ofreces una forma de solicitar que se borren los datos?             | **Sí**: en la app (Ajustes → Tus datos → Borrar todos mis datos) y en `https://hestevehidalgo.github.io/frescura/borrar-datos/` |

"Compartir" en Google Play significa entregar datos a otra empresa para sus propios fines.
Supabase y Anthropic procesan los datos **en nombre de Frescura** (son proveedores de
servicio), así que según las definiciones de Google eso es "recopilar", no "compartir".

## Tipos de datos recopilados

| Categoría → Tipo                                                 | ¿Se recopila?                                                              | ¿Se comparte? | ¿Efímero?                                    | ¿Obligatorio? | Finalidad                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------- | -------------------------------------------- | ------------- | ---------------------------------------------------------- |
| Fotos y videos → **Fotos**                                       | Sí (foto de la boleta al escanear y foto de una fruta para ver su madurez) | No            | No (Anthropic puede guardarla hasta 30 días) | Opcional      | Funcionalidad de la app                                    |
| Salud y fitness → **Información de salud**                       | Sí (alergias alimentarias a evitar, al pedir una receta con IA)            | No            | No                                           | Opcional      | Funcionalidad de la app                                    |
| Actividad en la app → **Otro contenido generado por el usuario** | Sí (nombres genéricos de ingredientes al pedir receta con IA)              | No            | No                                           | Opcional      | Funcionalidad de la app                                    |
| Actividad en la app → **Interacciones con la app**               | Sí (cuántos escaneos y recetas con IA usaste en el mes)                    | No            | No                                           | Opcional      | Funcionalidad de la app, prevención de fraudes y seguridad |
| Dispositivo u otros IDs → **Dispositivo u otros IDs**            | Sí (identificador anónimo aleatorio de la sesión)                          | No            | No                                           | Opcional      | Funcionalidad de la app, prevención de fraudes y seguridad |

Todo es **opcional** porque solo se envía al usar el escaneo o las recetas con IA; sin eso, la
app funciona completa a mano.

## Lo que NO se recopila

Nombre, correo, teléfono, dirección, ubicación, contactos, compras dentro de la app, historial
web, mensajes, audio (el dictado lo hace el teclado del celular), archivos, calendario,
información financiera (los precios quedan en el celular), ID de publicidad, registros de
fallos ni diagnósticos.

## Lo que queda solo en el celular (no se declara)

Inventario, fechas, precios, tiendas, recetas propias, dieta, equipamiento y ajustes. Google no
pide declarar los datos que nunca salen del dispositivo.

## Códigos de barras

Al leer un código, la app consulta el número en Open Food Facts (una base pública de alimentos).
El número del código no es un dato personal, por eso no se declara; igual se explica en la
política de privacidad.
