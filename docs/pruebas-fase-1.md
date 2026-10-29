# Pruebas de la fase 1 en el iPhone

Lista para revisar la fase 1 con Expo Go. Marca cada punto y anota lo que falle (con captura si
puedes). El criterio para aprobar la fase: **usar la app una semana sin boletas, recibir el resumen
a la hora elegida y que no se pierda nada al cerrar o reiniciar el celular.**

## Antes de empezar

- [ ] En el computador, dentro de la carpeta `Frescura`: `git pull`, luego `npm install` y luego
      `npx expo start`.
- [ ] Abre la app en Expo Go escaneando el código QR.

## Agregar productos

- [ ] Inicio vacío muestra "Tu refri está vacío (por ahora)" y el botón "Agregar productos".
- [ ] En Agregar, tocar Palta suma 1 (aparece un número verde en la baldosa).
- [ ] Mantener presionado Tomate abre "¿Cuánto compraste?": cambia la cantidad y pon un precio
      (ej: $1.290).
- [ ] Escribir "leche" en el buscador muestra sugerencias; tocar una la agrega.
- [ ] Escribir algo que no existe (ej: "quinoa") permite "Agregar «Quinoa»" y elegir la categoría.
- [ ] "Guardé sobras" → escribir "cazuela" agrega "Sobras de cazuela".
- [ ] En "Para guardar", tocar el lugar (Refri/Despensa/Congelador) lo cambia; en la palta y el
      tomate aparece "¿Madura?".
- [ ] "Lo compré: Ayer" cambia la fecha de compra.
- [ ] "Guardar N productos" vuelve a Inicio y muestra "Agregaste N productos · Deshacer".
- [ ] La primera vez aparece "¿Te aviso antes de que algo venza?". Responde **Sí, avísame** y
      acepta el permiso del iPhone.

## Inicio

- [ ] Los productos aparecen ordenados por urgencia: Vence hoy, Próximos 3 días, Esta semana, Más
      adelante. Cada fecha tiene color, ícono y texto.
- [ ] "Hoy cocina con esto" muestra los 3 que vencen primero.
- [ ] Los filtros Refri / Congelador / Despensa funcionan.
- [ ] El buscador encuentra sin tildes (escribe "platano").
- [ ] **Deslizar a la derecha** = "Me lo comí" (aparece "¡bien aprovechado!" con Deshacer).
- [ ] **Deslizar a la izquierda** = pregunta por qué lo botaste.
- [ ] **Deshacer** dentro de 5 segundos devuelve el producto.
- [ ] **Mantener presionado** abre el menú: Usé una parte, Lo abrí, Lo congelé, Cambiar fecha,
      Cambiar lugar, Dividir en dos, Editar, Ver detalle.
- [ ] "Usé una parte" en huevos: "Usé 1" deja 5.
- [ ] "Lo abrí" en una leche larga vida la pasa al Refri con fecha de pocos días.
- [ ] "Lo congelé" y luego "Lo descongelé" en carne: queda con 1 día y el detalle dice que no se
      vuelva a congelar.
- [ ] "Cambiar fecha" → escribe `12/11/26` o `VENC 12.11.26`: dice "Fecha: 12/11/2026" y se
      guarda como "Fecha del envase".
- [ ] "Seleccionar" permite marcar varios y "Me lo comí" o "Lo boté" para todos juntos.
- [ ] Dos compras del mismo producto muestran "Usa este primero · 2 lotes" en la más antigua.

## Detalle y edición

- [ ] Tocar un producto abre su detalle: fecha, origen (estimada, del envase o tuya), rango y
      el texto "Fecha estimada. Revisa siempre la fecha del envase, el olor y el aspecto".
- [ ] En carnes, pollo y pescados aparece la advertencia de no consumirlos después de la fecha.
- [ ] El historial muestra lo que le pasó (agregado, abierto, congelado…).
- [ ] "Editar" permite cambiar nombre, cantidad, unidad, precio, fecha de compra y notas.

## Código de barras

- [ ] Agregar → "Leer código" pide la cámara y lee el código de un producto del súper.
- [ ] Si Open Food Facts lo conoce, muestra "Encontramos: …" y lo agrega.
- [ ] Si no lo conoce, permite escribir el nombre y elegir la categoría. La segunda vez que
      escaneas el mismo producto, lo reconoce al tiro (sin internet).

## Avisos (durante la semana)

- [ ] En Ajustes, deja la hora del resumen a una hora que te acomode.
- [ ] Recibes **un solo** resumen al día a esa hora, y solo los días en que algo vence pronto.
- [ ] Nunca llega un aviso de noche (horario silencioso 22:00 a 08:00).
- [ ] Si hay carne o pollo que vence ese día, llega un aviso extra a las 9:00.
- [ ] Al mantener presionado un aviso de un solo producto aparecen "Me lo comí" y "Lo boté".
- [ ] Apagar "Resumen diario" en Ajustes hace que dejen de llegar.

## Nada se pierde

- [ ] Cierra Expo Go por completo (desliza hacia arriba) y vuelve a abrir: todo sigue ahí.
- [ ] Reinicia el iPhone y vuelve a abrir: todo sigue ahí.
- [ ] Algo que venció hace más de 3 días sin respuesta desaparece de la lista (queda archivado
      "sin información", no cuenta como botado).

## Modo oscuro y accesibilidad

- [ ] Con el iPhone en modo oscuro, la app se ve oscura y se lee bien.
- [ ] Con el texto grande (Ajustes del iPhone → Pantalla y brillo → Tamaño del texto) la app
      sigue siendo usable.
