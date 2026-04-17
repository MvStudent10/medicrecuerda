import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

// Recover automatically if a stale cached chunk causes a preload error after deploy.
const PRELOAD_RELOAD_KEY = 'medicrecuerda-preload-reload-ts'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()

  // Offline mode can trigger preload failures; avoid infinite reload loops.
  if (!navigator.onLine) return

  const ahora = Date.now()
  const ultimoIntento = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || '0')
  if (ahora - ultimoIntento < 10000) return

  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(ahora))
  window.location.reload()
})

if ('serviceWorker' in navigator) {
  // Recargar cuando el SW toma control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })

  const forzarRevisionSw = () => {
    navigator.serviceWorker.ready
      .then((reg) => reg.update())
      .catch((err) => {
        console.error('No se pudo revisar actualización del SW', err)
      })
  }

  // Verificar actualizaciones cada vez que el usuario vuelve a la app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      forzarRevisionSw()
    }
  })

  // Si vuelve internet, intentar descargar la nueva versión de inmediato.
  window.addEventListener('online', forzarRevisionSw)

  // Revisión periódica para evitar versiones stale en sesiones largas.
  setInterval(forzarRevisionSw, 60 * 1000)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)