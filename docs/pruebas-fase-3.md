# Pruebas de la fase 3 en el iPhone

Lista para revisar las recetas con Expo Go. Marca cada punto y anota lo que falle (con captura si
puedes). El criterio para aprobar la fase: **con un refri típico, las primeras 5 recetas usan al
menos dos cosas que vencen pronto, y "Cociné esta receta" descuenta bien del inventario.**

## Antes de empezar

- [ ] En PowerShell, dentro de la carpeta `Frescura`: `git checkout -- package-lock.json`,
      `git pull`, `npm ci` y `npx expo start --clear`.
- [ ] Abre la app en Expo Go escaneando el código QR.

## Bienvenida

- [ ] La primera vez aparece la bienvenida (3 pantallas). "Saltar" funciona en cualquiera.
- [ ] Elige una dieta, una alergia y tu equipamiento: después aparecen en Ajustes → Cocina.

## Recetas sugeridas

- [ ] Agrega 6 a 8 productos frescos (palta, tomate, lechuga, huevos, pollo, queso...).
- [ ] En **Inicio**, la tarjeta verde "Hoy cocina con esto" muestra una receta sugerida y al
      tocarla se abre.
- [ ] En **Recetas**, las primeras dicen "Usa N cosas que vencen pronto" y "Te falta: ..." tiene
      sentido.
- [ ] Los filtros Rápidas, Chilenas, Una olla y Mis recetas cambian la lista.
- [ ] Si eliges "Vegetariana" en Ajustes, desaparecen las recetas con carne, pollo o pescado.
- [ ] Si quitas el horno en Ajustes, desaparecen las recetas al horno.

## Detalle, modo cocina y "Cociné esta receta"

- [ ] Cada ingrediente dice **Tienes** (con cuándo vence), **Básico** o **Falta**, con ícono.
- [ ] **Modo cocina**: un paso a la vez, letra grande, y la pantalla no se apaga sola.
- [ ] **Cociné esta receta**: elige "La mitad" en un producto y "Nada" en otro, toca
      **Descontar del inventario** y revisa en Inicio que quedó bien.
- [ ] Toca **Deshacer** en el aviso: todo vuelve a como estaba.

## Recetas propias

- [ ] **Nueva receta**: escribe un nombre, ingredientes como `500 g carne molida` (uno por
      línea) y pasos. Al guardar se abre la receta y aparece en **Mis recetas**.
- [ ] Los ingredientes que tienes en el inventario salen como **Tienes**.
- [ ] **Borrar receta** la quita; **Deshacer** la recupera.

## Recetas con IA (después de activar el backend)

Necesita los pasos 7 y 9 de [`setup-backend.md`](setup-backend.md).

- [ ] **Inventar receta** muestra "Inventando una receta…" y luego abre una receta nueva con el
      aviso amarillo de IA.
- [ ] El aviso de abajo dice cuántas recetas con IA te quedan este mes.
- [ ] **Guardar en mis recetas** la deja en **Mis recetas**.
- [ ] Sin internet (modo avión), aparece "Sin conexión a internet." y no se rompe nada.

## Modo oscuro y accesibilidad

- [ ] En modo oscuro todo se lee bien.
- [ ] Con texto grande (Ajustes del iPhone → Pantalla → Tamaño del texto) nada queda cortado.
