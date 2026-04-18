# MedicRecuerda

Aplicacion web progresiva (PWA) para recordatorios de medicamentos, construida con React + Vite + Firebase.

Este README esta pensado para mover el proyecto a otra computadora e instalar todo correctamente.

## 1. Requisitos del sistema

- Node.js 20 LTS (recomendado para mantener compatibilidad con Firebase Functions).
- npm 10 o superior.
- Git.
- Firebase CLI (para emuladores y despliegue):
	- Instalacion global recomendada: `npm install -g firebase-tools`

Nota: en `functions/package.json` se define `"engines": { "node": "20" }`, por lo que el backend de Cloud Functions requiere Node 20.

### Configurar Node 20 en Windows (recomendado)

Si tu computadora tiene otra version de Node (por ejemplo 22/24), instala NVM for Windows y usa Node 20:

```powershell
winget install --id CoreyButler.NVMforWindows -e --accept-source-agreements --accept-package-agreements
nvm install 20.19.5
nvm use 20.19.5
node -v
npm -v
```

Si `nvm` no se reconoce despues de instalarlo, cierra y abre una terminal nueva.

## 2. Librerias y versiones

### Frontend (raiz del proyecto)

Dependencias de ejecucion:

- firebase: 12.10.0
- react: 19.2.0
- react-dom: 19.2.0
- react-router-dom: 7.13.1

Dependencias de desarrollo:

- @eslint/js: 9.39.1
- @tailwindcss/vite: 4.2.1
- @types/react: 19.2.7
- @types/react-dom: 19.2.3
- @vitejs/plugin-react: 5.1.1
- eslint: 9.39.1
- eslint-plugin-react-hooks: 7.0.1
- eslint-plugin-react-refresh: 0.4.24
- globals: 16.5.0
- tailwindcss: 4.0.0
- vite: 7.3.1
- vite-plugin-pwa: 1.2.0

Override de seguridad:

- serialize-javascript: ^7.0.3

### Cloud Functions (`functions/`)

Dependencias:

- firebase-admin: ^13.4.0
- firebase-functions: ^6.0.1

## 3. Instalacion en otra computadora

1. Clona el repositorio y entra a la carpeta:

```bash
git clone <URL_DEL_REPO>
cd medicrecuerda
```

2. Instala dependencias del frontend (raiz):

```bash
npm ci
```

3. Instala dependencias de Cloud Functions:

```bash
cd functions
npm install
cd ..
```

Recomendacion:

- Usa `npm ci` en la raiz para respetar exactamente `package-lock.json`.
- En `functions/`, usa `npm ci` solo si `functions/package-lock.json` esta versionado; si no, usa `npm install`.

## 4. Variables de entorno (.env)

Crear un archivo `.env` en la raiz del proyecto con estas variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
```

Notas importantes:

- `VITE_FIREBASE_VAPID_KEY` debe ser la clave publica Web Push (VAPID) de Firebase Cloud Messaging.
- Este proyecto ya tiene `.env` agregado a `.gitignore`; no subir credenciales al repositorio.

## 5. Scripts disponibles

### En la raiz

- `npm run dev`: inicia Vite en desarrollo.
- `npm run build`: genera build de produccion.
- `npm run preview`: previsualiza el build.
- `npm run lint`: ejecuta ESLint.

### En `functions/`

- `npm run serve`: inicia emulador de funciones.
- `npm run deploy`: despliega funciones a Firebase.

## 6. Firebase

- Proyecto por defecto configurado en `.firebaserc`: `medicrecuerda`.
- Si vas a usar otro proyecto en la nueva computadora:

```bash
firebase login
firebase use --add
```

## 7. Ejecucion local recomendada

1. Terminal 1 (frontend, en raiz):

```bash
npm run dev
```

2. Terminal 2 (funciones, dentro de `functions/`):

```bash
npm run serve
```

## 8. Problemas comunes al migrar

- Error por version de Node: verificar que sea Node 20.
- Falla de Firebase Messaging: revisar `VITE_FIREBASE_VAPID_KEY` y permisos de notificaciones del navegador.
- Error de dependencias: borrar `node_modules` y reinstalar con `npm ci` en raiz y en `functions/`.

## 9. Comandos rapidos (resumen)

```bash
# raiz
npm ci
npm run dev

# functions
cd functions
npm install
npm run serve
```

## 10. Verificacion post-instalacion (30-60 segundos)

Ejecuta estos comandos para confirmar que el entorno quedo listo:

```bash
# versiones base
node -v
npm -v
firebase --version

# validacion del proyecto
npm run build
```

Resultado esperado:

- `node -v` debe mostrar Node 20.x.
- `firebase --version` debe responder una version (sin error de comando no reconocido).
- `npm run build` debe finalizar en exito y generar la carpeta `dist/`.
