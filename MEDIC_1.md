# MEDIC.md — Documentación Técnica de MedicRecuerda

> Este archivo está diseñado para que cualquier IA o desarrollador pueda entender el proyecto completo, retomarlo y continuar sin fricción.

---

## 1. ¿Qué es MedicRecuerda?

Una Progressive Web App (PWA) que ayuda a mejorar la adherencia a tratamientos médicos mediante recordatorios digitales simples y accesibles. Está orientada principalmente a **adultos mayores** y personas con tratamientos prolongados en México.

**Límites del sistema:**
- No reemplaza la supervisión médica profesional.
- No ajusta dosis ni realiza diagnósticos.
- Depende de que el usuario registre correctamente su tratamiento.
- No se conecta con expedientes clínicos oficiales.

**URL de producción:** `https://medicrecuerda.vercel.app`

**Repositorio:** `https://github.com/Mvcs02/medicrecuerda` (privado)

---

## 2. Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.x | UI framework |
| Vite | 7.x | Bundler y dev server |
| Tailwind CSS | v4 (`@tailwindcss/vite`) | Estilos |
| React Router DOM | 7.x | Enrutamiento SPA |
| Firebase Auth | 11.x | Autenticación |
| Firebase Firestore | 11.x | Base de datos NoSQL |
| vite-plugin-pwa | latest | Service Worker y Web App Manifest |
| Workbox | (via vite-plugin-pwa) | Estrategia de caché offline |
| Vercel | — | Hosting y deploy automático |

### Notas críticas de versiones

- **Tailwind CSS v4** — ya NO usa `tailwind.config.js`. Se configura como plugin de Vite directamente en `vite.config.js`. El `index.css` solo necesita `@import "tailwindcss";`
- **vite-plugin-pwa** — versiones `>=0.20.0` tienen una vulnerabilidad en `serialize-javascript <=7.0.2`. Se resuelve con un `overrides` en `package.json` (ver sección de errores conocidos).
- **AuthContext** — separado en dos archivos para evitar warning de Fast Refresh de Vite: el contexto en `context/AuthContext.jsx` y el hook en `hooks/useAuth.js`.

---

## 3. Estructura de Carpetas

```
medicrecuerda/
├── public/
│   ├── icon-180x180.png       # Ícono PWA Apple
│   ├── icon-192x192.png       # Ícono PWA Android
│   └── icon-512x512.png       # Ícono PWA splash / maskable
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── ProtectedRoute.jsx     # Guarda rutas autenticadas
│   │   └── ui/
│   │       └── ModalMedicamento.jsx   # Modal agregar/editar medicamento
│   ├── context/
│   │   └── AuthContext.jsx            # createContext + AuthProvider
│   ├── hooks/
│   │   ├── useAuth.js                 # useContext(AuthContext)
│   │   └── useMedicamentos.js         # onSnapshot de medicamentos activos
│   ├── pages/
│   │   ├── Hoy.jsx                    # Pantalla principal de tomas del día
│   │   ├── Login.jsx                  # Login + Registro
│   │   ├── Medicamentos.jsx           # CRUD de medicamentos
│   │   ├── Perfil.jsx                 # Editar nombre, cambiar contraseña, logout
│   │   └── Progreso.jsx               # Calendario + vista semanal
│   ├── services/
│   │   ├── firebase.js                # initializeApp, auth, db
│   │   ├── medicamentos.js            # CRUD Firestore medicamentos
│   │   └── tomas.js                   # CRUD + listeners Firestore tomas
│   ├── utils/
│   │   ├── calcularTomas.js           # Lógica de cálculo de tomas del día
│   │   └── fecha.js                   # getFechaHoy(), getHoraActual()
│   ├── App.jsx                        # Router + Navbar
│   ├── main.jsx                       # Entry point + Service Worker listener
│   └── index.css                      # @import "tailwindcss"
├── .env                               # Variables de entorno Firebase (NO commitear)
├── .gitignore                         # Incluye .env
├── eslint.config.js                   # react-refresh/only-export-components: off
├── index.html
├── package.json                       # Incluye overrides de serialize-javascript
└── vite.config.js                     # React + Tailwind + VitePWA
```

---

## 4. Configuraciones Clave

### `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180x180.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'MedicRecuerda',
        short_name: 'MedicRecuerda',
        description: 'Recordatorios inteligentes para tu tratamiento médico',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore-cache', networkTimeoutSeconds: 10 },
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
```

### `index.css`
```css
@import "tailwindcss";
```

### `package.json` — sección clave
```json
{
  "overrides": {
    "serialize-javascript": "^7.0.3"
  }
}
```

### `eslint.config.js` — regla desactivada
```javascript
'react-refresh/only-export-components': 'off'
```

---

## 5. Firebase

### Proyecto
- **Nombre:** `medicrecuerda`
- **Auth:** Email/Password activado
- **Firestore:** Modo producción, índice compuesto activo en `medicamentos` (activo + creadoEn)

### Variables de entorno (`.env`)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=medicrecuerda
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

> ⚠️ Estas variables deben configurarse también en Vercel (Settings → Environment Variables).

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /medicamentos/{medicamentoId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /tomas/{tomaId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /notificaciones/{notificacionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /vinculaciones/{vinculacionId} {
      allow read, write: if request.auth != null
        && (resource.data.cuidadorId == request.auth.uid
        || resource.data.pacienteId == request.auth.uid);
    }
  }
}
```

---

## 6. Modelos de Datos (Firestore)

### `usuarios/{uid}`
```javascript
{
  nombre: string,
  email: string,
  fechaRegistro: timestamp,
  rol: 'paciente'
}
```

### `usuarios/{uid}/medicamentos/{id}`
```javascript
{
  nombre: string,
  dosis: string,
  frecuenciaHoras: number,        // 4 | 6 | 8 | 12 | 24
  fechaInicio: string,            // 'YYYY-MM-DD'
  fechaFin: string,               // 'YYYY-MM-DD'
  horaInicio: string,             // 'HH:mm'
  horarioFijo: boolean,           // true = no ajustar horarios aunque haya retraso
  color: string,                  // hex ej: '#3b82f6', asignado por usuario o automático
  activo: boolean,                // false = eliminado lógicamente
  creadoEn: timestamp
}
```

### `usuarios/{uid}/tomas/{id}`
```javascript
// ID determinista: medicamentoId_fecha_hora (ej: abc123_2026-03-11_0800)
{
  medicamentoId: string,
  medicamentoNombre: string,      // desnormalizado para historial
  dosis: string,                  // desnormalizado para historial
  fechaProgramada: string,        // 'YYYY-MM-DD'
  horaProgramada: string,         // 'HH:mm'
  tomado: boolean,
  horaReal: string | null,        // 'HH:mm' hora en que realmente se tomó
  tomadoEn: timestamp | null
}
```

**Decisiones de arquitectura importantes:**
- `activo: false` en lugar de borrar medicamentos → preserva historial de tomas
- Datos desnormalizados en tomas (`medicamentoNombre`, `dosis`) → el historial no se corrompe si se edita el medicamento
- IDs de tomas son deterministas → operación `marcarComoTomado` es idempotente

---

## 7. Lógica de Negocio Crítica

### `utils/fecha.js`
```javascript
// IMPORTANTE: Usa Date() local, NO UTC, para evitar bugs de timezone
export function getFechaHoy() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

export function getHoraActual() {
  const hoy = new Date()
  return `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`
}
```

> ⚠️ `getHoraActual()` devuelve `HH:mm` con minutos. Si en algún momento devuelve solo `HH:00` es un bug regresivo.

### `utils/calcularTomas.js` — Reglas de negocio
- Si `fechaInicio === fecha` (día de inicio del tratamiento) → solo mostrar tomas desde `horaInicio` en adelante, no tomas pasadas ficticias.
- Si `horarioFijo === false` y hay tomas registradas hoy con `horaReal` → calcular las siguientes tomas desde la última `horaReal`, no desde `horaInicio`.
- Si `horarioFijo === true` → ignorar `horaReal`, siempre calcular desde `horaInicio`.
- Si `totalMinutos >= 1440` (la toma cae al día siguiente) → se ignora para el día actual.

### `Hoy.jsx` — Reglas de UX
- **Toma pendiente** (hora aún no llega): fondo amarillo claro `bg-yellow-50`
- **Toma atrasada** (hora ya pasó y no está marcada): fondo rojo claro `bg-red-50`
- **Tomas bloqueadas**: solo se puede marcar la primera toma pendiente; el resto aparece bloqueado hasta que se marca en orden.
- **Al marcar**: se abre un modal con input de hora prellenado con la hora actual. El usuario puede ajustar si la tomó unos minutos antes.
- **Banner de tomas pasadas sin confirmar**: al abrir la app con tomas pasadas sin marcar, aparece banner preguntando "¿Las tomaste?" con opciones Sí/No.
- **Tomas completadas**: muestran la `horaReal` en que fueron tomadas, no la `horaProgramada`.

### `services/tomas.js` — `marcarComoTomado`
```javascript
// Guarda horaReal (string HH:mm) además del timestamp del servidor
await setDoc(ref, {
  ...toma,
  tomado: true,
  horaReal: horaReal,
  tomadoEn: serverTimestamp(),
}, { merge: true })
```

---

## 8. Pantallas Implementadas

### Login.jsx ✅
- Toggle login / registro en el mismo componente
- Campos registro: nombre, email, password, confirmarPassword
- Toggle "Ver/Ocultar" contraseña (texto, no ícono)
- `updateProfile` para guardar `displayName` + `setDoc` en Firestore al registrar
- Sanitización: `email.trim().toLowerCase()`

### Hoy.jsx ✅
- Lee medicamentos via `useMedicamentos()`
- Calcula tomas del día con `calcularTomasDelDia(medicamentos, fecha, tomasRegistradas)`
- Suscripción en tiempo real a tomas via `suscribirTomasDelDia()`
- Barra de progreso del día
- Banner confirmación tomas pasadas
- Modal para registrar hora real de toma
- Bloqueo de tomas: solo la primera pendiente está activa

### Medicamentos.jsx ✅
- Lista de medicamentos activos con bolita de color identificadora
- Botón "+ Agregar" abre `ModalMedicamento`
- Botones Editar/Eliminar por medicamento
- Eliminar = `activo: false` (no se borra físicamente)

### ModalMedicamento.jsx ✅
- Campos: nombre, dosis, frecuencia (select), horaInicio (time), color (selector visual), horarioFijo (toggle switch), fechaInicio, fechaFin
- **Selector de color**: 9 círculos clickeables, si no se elige uno se asigna automáticamente basado en `medicamentosExistentes`
- **Toggle horarioFijo**: switch azul/gris, editable al crear y al editar
- `getFormVacio()` como función (no constante) para recalcular fecha en cada apertura

### Progreso.jsx ✅
- Toggle Calendario / Semanal
- **Calendario mensual**: grid 7 cols empezando en Lunes, colores por cumplimiento (verde/amarillo/rojo/gris), bolitas de color de medicamentos activos en cada día, navegación mes anterior/siguiente
- **Vista Semanal**: rango desde inicio del tratamiento más antiguo hasta fin del más largo; bolitas de colores por medicamento
- Clic en cualquier día abre Modal con detalle de tomas
- Leyenda de cumplimiento + leyenda de medicamentos con sus colores

### Perfil.jsx ✅
- Avatar con inicial del nombre
- Acordeón: Editar nombre / Cambiar contraseña
- Se cierra automáticamente 1.5s después de guardar exitosamente
- Cambiar contraseña requiere reautenticación con `reauthenticateWithCredential`
- Toggle "Ver/Ocultar" en los 3 campos de contraseña (un solo botón controla los 3)
- Cerrar sesión con `signOut`

---

## 9. Colores de Medicamentos

```javascript
export const COLORES_MEDICAMENTO = [
  { id: 'azul',     bg: 'bg-blue-500',    hex: '#3b82f6' },
  { id: 'celeste',  bg: 'bg-sky-400',     hex: '#38bdf8' },
  { id: 'verde',    bg: 'bg-emerald-500', hex: '#10b981' },
  { id: 'amarillo', bg: 'bg-yellow-400',  hex: '#facc15' },
  { id: 'naranja',  bg: 'bg-orange-500',  hex: '#f97316' },
  { id: 'rojo',     bg: 'bg-red-500',     hex: '#ef4444' },
  { id: 'rosa',     bg: 'bg-pink-400',    hex: '#f472b6' },
  { id: 'morado',   bg: 'bg-purple-500',  hex: '#a855f7' },
  { id: 'gris',     bg: 'bg-gray-400',    hex: '#9ca3af' },
]
```

**Asignación automática**: busca el primer color que no esté en uso entre los medicamentos existentes. Si todos están usados, regresa al primero.

---

## 10. PWA — Configuración

### Service Worker
- `registerType: 'autoUpdate'`
- `skipWaiting: true` + `clientsClaim: true` → toma control inmediato al detectar nueva versión
- `visibilitychange` listener en `main.jsx` → llama `reg.update()` cada vez que el usuario vuelve a la app desde segundo plano, garantizando actualizaciones automáticas sin que el usuario haga nada

### Estrategia de caché
- **Assets estáticos** (JS, CSS, HTML, PNG): CacheFirst via `globPatterns`
- **Firestore** (`firestore.googleapis.com`): NetworkFirst con timeout de 10s
- **Firebase Auth** (`identitytoolkit.googleapis.com`): NetworkOnly (el login nunca funciona offline, correcto por seguridad)

### Íconos
- `icon-192x192.png` — Android home screen
- `icon-512x512.png` — Splash screen + maskable
- `icon-180x180.png` — Apple iOS
- Diseño: pastilla cápsula roja/blanca sobre fondo azul redondeado

### Instalación en móvil
- **Android**: Banner automático del navegador
- **iOS**: Requiere Safari → botón compartir ⬆️ → "Agregar a pantalla de inicio"

---

## 11. Deploy — Vercel

- Conectado a GitHub repo `Mvcs02/medicrecuerda` rama `main`
- **Deploy automático**: cada `git push` a `main` redeploya en ~2 minutos
- Variables de entorno configuradas en el dashboard de Vercel
- Sin configuración adicional necesaria (Vite detectado automáticamente)

### Workflow de cambios
```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## 12. Errores Conocidos y Soluciones

### Error: `serialize-javascript` vulnerabilidad alta
**Síntoma:** `npm audit` reporta 4 high severity vulnerabilities  
**Causa:** `vite-plugin-pwa ≥0.20.0 → workbox-build → @rollup/plugin-terser → serialize-javascript ≤7.0.2`  
**Solución:** Agregar a `package.json`:
```json
"overrides": {
  "serialize-javascript": "^7.0.3"
}
```
**Nota:** NO usar `npm audit fix --force` porque degrada vite-plugin-pwa a v0.19.8 incompatible con Vite 5+.

---

### Error: Fast Refresh warning en AuthContext
**Síntoma:** Warning de Vite sobre mezclar componentes y hooks en el mismo archivo  
**Solución:** Separar en dos archivos:
- `context/AuthContext.jsx` → solo el contexto y el Provider
- `hooks/useAuth.js` → solo el hook `useAuth`

---

### Bug: Tomas del día de inicio del tratamiento aparecen atrasadas
**Causa:** `calcularTomasDelDia` calculaba todas las tomas del día sin considerar si era el primer día  
**Solución:** Verificar `esDiaInicio = med.fechaInicio === fecha` y omitir tomas con hora anterior a `horaInicio`

---

### Bug: Toma futura marcada como atrasada
**Causa:** `getHoraActual()` devolvía `HH:00` sin minutos, causando comparaciones incorrectas  
**Solución:** `getHoraActual()` devuelve `HH:mm` con minutos incluidos

---

### Bug: App no se actualiza en móvil sin cerrar manualmente
**Causa:** El Service Worker esperaba a que todas las pestañas cerraran antes de activarse  
**Solución triple:**
1. `skipWaiting: true` en workbox config
2. `clientsClaim: true` en workbox config
3. `visibilitychange` listener en `main.jsx` que llama `reg.update()`

---

### Error: `eliminarMedicamento is not exported`
**Causa:** La función en `services/medicamentos.js` se llama `desactivarMedicamento`, no `eliminarMedicamento`  
**Solución:** Importar con el nombre correcto:
```javascript
import { desactivarMedicamento } from '../services/medicamentos'
```

---

### Warning: LF/CRLF en Git Bash (Windows)
**Síntoma:** `warning: in the working copy of '.gitignore', LF will be replaced by CRLF`  
**Causa:** Windows usa CRLF, Git en Linux/Mac usa LF  
**Impacto:** Ninguno funcional, solo cosmético. Ignorar.

---

## 13. Pendientes / Roadmap

### Fase 3 — PWA (en progreso)
- [x] vite-plugin-pwa + Web App Manifest
- [x] Estrategia de caché offline
- [x] Actualizaciones automáticas sin intervención del usuario
- [ ] Firebase Cloud Messaging (notificaciones push cuando llega la hora de una toma)

### Features UX pendientes
- [ ] Selector AM/PM visual en lugar del input nativo `type="time"` (algunos dispositivos lo muestran en formato 24h sin claridad)
- [ ] Texto de ayuda en `ModalMedicamento` para usuarios que llevan días de tratamiento antes de registrarse: "¿Ya llevas días tomando este medicamento? Pon la fecha en que te lo recetaron."

### Fase 4 — Sistema de cuidadores (arquitectura definida, implementación diferida)
- Colección `vinculaciones/{vinculacionId}` con `cuidadorId` y `pacienteId`
- Campo `rol: 'paciente'` ya guardado en Firestore al registrar
- Las Security Rules ya contemplan la colección `vinculaciones`

### Mejoras técnicas pendientes
- Responsive desktop: toda la app usa `max-w-lg`, se ve estrecha en pantallas grandes. Pendiente ajuste global al terminar features.
- Reemplazar `confirm()` nativo por modales personalizados.

---

## 14. Notas de Contexto del Desarrollador

- **Desarrollador:** Manuel (estudiante de Ingeniería en Desarrollo y Gestión de Software, 4to cuatrimestre, UTTAB Villahermosa, Tabasco)
- **Experiencia:** Fullstack con background en Laravel, .NET Core, Firebase. Primera vez usando Git/GitHub en este proyecto.
- **Testers activos:** Usuarios adultos mayores reales, feedback incorporado directamente al desarrollo
- **Entorno de desarrollo:** Windows 11, VSCode, Git Bash para comandos Git
- **Preferencia de código:** Archivos completos mejor que fragmentos cuando los cambios afectan más de ~20 líneas
- **Git Bash en Windows:** Paste con clic derecho → Paste (no Ctrl+V por defecto)
- **Deploy:** `git add . && git commit -m "mensaje" && git push` — Vercel redeploya solo

---

## 15. Comandos de Referencia Rápida

```bash
# Desarrollo local (NO usa Service Worker)
npm run dev

# Build de producción (activa Service Worker)
npm run build

# Preview de producción local (prueba PWA y SW)
npm run preview

# Deploy a producción
git add .
git commit -m "descripción"
git push

# Auditoría de seguridad
npm audit

# Ruta del proyecto en Windows
C:\Users\MVLENOVO\Desktop\apwa\medicrecuerda
```

---

*Última actualización: Abril 2026*
