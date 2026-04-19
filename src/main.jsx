import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

let actualizarPWA = () => {}
const UPDATE_BANNER_KEY = 'medicrecuerda-pwa-update-available'

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

function ShellAplicacion() {
  const [hayActualizacion, setHayActualizacion] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(UPDATE_BANNER_KEY) === 'true'
  })

  useEffect(() => {
    actualizarPWA = registerSW({
      immediate: true,
      onNeedRefresh() {
        localStorage.setItem(UPDATE_BANNER_KEY, 'true')
        setHayActualizacion(true)
      },
      onOfflineReady() {
        console.info('MedicRecuerda ya está lista para uso offline.')
      },
    })
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

    const controllerChangeHandler = () => {
      localStorage.removeItem(UPDATE_BANNER_KEY)
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined

    const marcarActualizacionSiHayWaiting = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration?.waiting && registration?.active) {
          localStorage.setItem(UPDATE_BANNER_KEY, 'true')
          setHayActualizacion(true)
        }
      } catch (err) {
        console.error('No se pudo validar waiting SW', err)
      }
    }

    const forzarRevisionSw = () => {
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .then(() => marcarActualizacionSiHayWaiting())
        .catch((err) => {
          console.error('No se pudo revisar actualización del SW', err)
        })
    }

    // Verificar actualizaciones cada vez que el usuario vuelve a la app
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        forzarRevisionSw()
      }
    }

    // Si vuelve internet, intentar descargar la nueva versión de inmediato.
    const onlineHandler = () => {
      forzarRevisionSw()
    }

    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('online', onlineHandler)

    marcarActualizacionSiHayWaiting()

    // Revisión periódica para evitar versiones stale en sesiones largas.
    const intervalId = window.setInterval(forzarRevisionSw, 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler)
      window.removeEventListener('online', onlineHandler)
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <>
      {hayActualizacion && (
        <div className="fixed inset-x-0 top-3 z-[9999] px-4">
          <div className="mx-auto max-w-lg rounded-2xl border border-blue-200 bg-white/95 shadow-lg backdrop-blur px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Nueva versión disponible</p>
              <p className="text-xs text-blue-700">
                Hay una actualización lista. Toca el botón para recargar la app.
              </p>
            </div>
            <button
              onClick={() => actualizarPWA(true)}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}

      <div className={hayActualizacion ? 'pt-24' : ''}>
        <App />
      </div>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ShellAplicacion />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)