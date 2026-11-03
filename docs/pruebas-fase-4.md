# Pruebas de la fase 4 en el iPhone

Lista para revisar estadísticas y pulido con Expo Go. Marca cada punto y anota lo que falle (con
captura si puedes). El criterio para aprobar la fase: **la lista de accesibilidad y de estados
está completa y revisada en el celular.**

## Antes de empezar

- [ ] En PowerShell, dentro de la carpeta `Frescura`: `git checkout -- package-lock.json`,
      `git pull`, `npm ci` y `npx expo start --clear`.
- [ ] Abre la app en Expo Go escaneando el código QR.

## Agregar con tienda y por dictado

- [ ] En **+** → **Dictar o escribir una lista**, toca el micrófono del teclado y di "dos
      tomates, un kilo de papas y media docena de huevos". Aparecen los tres en "Para guardar"
      con esas cantidades.
- [ ] Si dices algo que no está en el catálogo, la app avisa cuál no reconoció.
- [ ] Pon precio a cada uno y en **Dónde** elige una tienda. La próxima vez ya viene elegida.
- [ ] Repite otro día (o ahora mismo) con los mismos productos en otra tienda y otro precio.

## Resumen

- [ ] **Resumen** muestra plata salvada, plata botada y el porcentaje aprovechado.
- [ ] Marca algo como "Me lo comí" cuando vence pronto: sube la plata salvada.
- [ ] Marca algo como "Lo boté": sube la plata botada y aparece un consejo.
- [ ] **Gasto del mes** muestra el total, por categoría y por supermercado.
- [ ] **Comparar precios** muestra el producto comprado en dos tiendas y dónde está más barato.
- [ ] En el detalle de ese producto aparece **Precios que pagaste**.
- [ ] Las flechas cambian de mes; no deja ir a meses futuros.

## Respaldo

- [ ] **Ajustes** → **Tus datos** → **Guardar respaldo**: se abre el menú de compartir. Guárdalo
      en **Archivos**.
- [ ] Borra o cambia algo en la app. Luego **Cargar respaldo**, elige el archivo y confirma: todo
      vuelve como estaba.
- [ ] Si eliges un archivo que no es un respaldo, la app avisa y no cambia nada.

## Accesibilidad

- [ ] **VoiceOver** (Ajustes del iPhone → Accesibilidad → VoiceOver): recorre Inicio, Agregar,
      Recetas, Resumen y Ajustes. Cada botón se lee con un nombre claro (también los de solo
      ícono: +, Ajustes, quitar, flechas de mes).
- [ ] Los montos del resumen y las barras se leen con su texto ("Verduras: $5.180").
- [ ] **Texto grande** (Ajustes → Pantalla y brillo → Tamaño del texto, al máximo): nada queda
      cortado ni encimado en Inicio, Agregar, Recetas, Resumen y Ajustes.
- [ ] Los botones se pueden tocar con el dedo sin apuntar (son de al menos 44 puntos).
- [ ] Los estados nunca dependen solo del color: vencimientos, ingredientes ("Tienes", "Falta")
      y plata salvada o botada tienen ícono y texto.
- [ ] **Modo oscuro** (Centro de control → Modo oscuro): todas las pantallas se leen bien.

## Estados

- [ ] **Vacío:** con la app recién instalada (o después de cargar un respaldo vacío), Inicio,
      Recetas y Resumen muestran un mensaje que explica qué hacer.
- [ ] **Cargando:** al abrir Recetas y Resumen se ve un indicador mientras cargan (puede ser muy
      breve).
- [ ] **Sin internet** (modo avión): escanear una boleta y pedir una receta con IA muestran
      "Sin conexión a internet" y se puede seguir agregando a mano.
- [ ] **Cuota agotada:** cuando se acaben los escaneos o recetas con IA del mes, el mensaje lo
      dice y la app sigue funcionando sin IA. En **Ajustes** → **Tus datos** se ve cuántos
      quedan.
