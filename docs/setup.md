# Cómo levantar Frescura desde cero

Guía para principiantes, paso a paso, en un computador **Windows** y un **iPhone**. Si algo no
sale como dice aquí, copia el mensaje de error completo y pégaselo a Claude.

## Lo que vas a instalar (todo gratis)

| Programa               | Para qué sirve                                          |
| ---------------------- | ------------------------------------------------------- |
| Node.js LTS            | Ejecuta las herramientas de JavaScript (Expo, tests)    |
| Git                    | Descarga el código desde GitHub y guarda los cambios    |
| Visual Studio Code     | Editor para mirar el código (opcional pero recomendado) |
| Expo Go (en el iPhone) | Abre la app en tu celular mientras la desarrollamos     |

## 1. Instalar Node.js

1. Entra a <https://nodejs.org/en/download> (sirve cualquier versión **LTS** desde la 22.13).
2. Arriba aparece un comando para Docker: **ignóralo**. Baja hasta la línea "Or get a prebuilt
   Node.js for Windows running a x64 architecture" y toca el botón verde **Windows Installer
   (.msi)**.
3. Abre el archivo descargado y acepta las opciones por defecto (Next, Next, Install). Si aparece
   la casilla "Automatically install the necessary tools", déjala **sin marcar**: no hace falta.
4. Abre **PowerShell**: toca la tecla Windows, escribe `PowerShell` y presiona Enter. Se abre una
   ventana negra que termina en `PS C:\Users\TuUsuario>` y un cursor: está esperando que
   escribas. Escribe el comando y presiona Enter:

   ```bash
   node --version
   ```

   Debe mostrar algo como `v26.13.0`. Si dice que no reconoce el comando, cierra PowerShell, ábrelo
   de nuevo y vuelve a probar: PowerShell solo ve los programas instalados antes de abrirse.

## 2. Instalar Git

1. Entra a <https://git-scm.com/download/win> y descarga el instalador.
2. Acepta las opciones por defecto.
3. En PowerShell:

   ```bash
   git --version
   ```

## 3. Descargar el código

En PowerShell, elige una carpeta (por ejemplo, tus Documentos) y descarga el repositorio:

```bash
cd $HOME\Documents
```

```bash
git clone https://github.com/hestevehidalgo/Frescura.git
```

```bash
cd Frescura
```

Como el repositorio es privado, Git te va a pedir iniciar sesión en GitHub: se abre una ventana
del navegador, entra con tu cuenta y autoriza.

## 4. Instalar las dependencias del proyecto

Dentro de la carpeta `Frescura`:

```bash
npm install
```

Tarda unos minutos la primera vez. Al final puede mostrar avisos ("warnings"); es normal.

Para comprobar que todo está bien:

```bash
npm run check
```

Debe terminar con `Tests: ... passed`.

## 5. Instalar Expo Go en el iPhone

1. Abre la App Store y busca **Expo Go**.
2. Instálala. Si ya la tenías, actualízala: tiene que ser compatible con el **SDK 58**.

## 6. Crear tu cuenta de Expo (gratis)

Expo Go exige iniciar sesión con la misma cuenta en el computador y en el iPhone.

1. Crea una cuenta en <https://expo.dev/signup>.
2. En PowerShell, dentro de la carpeta `Frescura`:

   ```bash
   npx expo login
   ```

   Escribe tu usuario (o correo) y tu contraseña. Al escribir la contraseña no se ve nada en
   pantalla: es normal, escríbela igual y presiona Enter.

3. En el iPhone, abre Expo Go, toca **Log in** (o el ícono de perfil) y entra con la misma cuenta.

## 7. Abrir la app en tu iPhone

1. El computador y el iPhone deben estar **conectados a la misma red Wi-Fi**.
2. En PowerShell, dentro de la carpeta `Frescura`:

   ```bash
   npx expo start
   ```

3. La primera vez, Windows puede preguntar si permites que Node.js use la red: marca **Redes
   privadas** y acepta.
4. En la terminal aparece un **código QR**. Abre la **cámara** del iPhone, apunta al código y toca
   el aviso que dice "Abrir en Expo Go".
5. Se abre Frescura con sus 4 pestañas: Inicio, Escanear, Recetas y Resumen.

Mientras `npx expo start` esté corriendo, cada cambio en el código se ve al instante en el
celular. Para detenerlo, presiona `Ctrl + C` en PowerShell.

### Si el celular no se conecta

Mientras la app está corriendo, PowerShell no acepta comandos nuevos: primero detenla con
`Ctrl + C`.

- Revisa que ambos estén en la misma red Wi-Fi (no en datos móviles).
- Algunas redes (universidad, oficinas) bloquean la conexión entre dispositivos. En ese caso usa:

  ```bash
  npx expo start --tunnel
  ```

  La primera vez te pedirá instalar un paquete extra: responde que sí (`y`).

## 8. Traer los cambios nuevos

Cada vez que Claude termine una fase y suba código nuevo, en la carpeta `Frescura`:

```bash
git pull
```

```bash
npm install
```

Y luego vuelve a abrir la app con `npx expo start`.

## Más adelante

- **Cuenta de Apple Developer (US$99 al año):** la vamos a necesitar en la fase 1, cuando la app use
  OCR para leer fechas. Claude te avisará y te dirá exactamente qué hacer.
- **Android:** para probar en Android sin celular Android se usa el emulador de Android Studio.
  Lo configuramos cuando haga falta.
- **Supabase y Anthropic:** se configuran en la fase 2.
