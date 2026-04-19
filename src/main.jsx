import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
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

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)