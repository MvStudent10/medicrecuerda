import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { useNavigate } from 'react-router-dom'
import {
  activarPushRecordatorios,
  desactivarPushRecordatorios,
  escucharPushEnPrimerPlano,
} from '../services/pushMessaging'

export default function Perfil() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [seccionAbierta, setSeccionAbierta] = useState(null)

  const [nombre, setNombre] = useState(user?.displayName || '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [errorNombre, setErrorNombre] = useState('')
  const [exitoNombre, setExitoNombre] = useState(false)

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [exitoPassword, setExitoPassword] = useState(false)
  const [mostrarPasswords, setMostrarPasswords] = useState(false)

  const [permisoNotificaciones, setPermisoNotificaciones] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })
  const [alertasActivas, setAlertasActivas] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('alertasMedicRecuerda') === 'true'
  })
  const [pushActivo, setPushActivo] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pushMedicRecuerda') === 'true'
  })
  const [estadoPush, setEstadoPush] = useState('')

  const [cerrando, setCerrando] = useState(false)

  const mensajesError = {
    'auth/wrong-password': 'La contraseña actual es incorrecta.',
    'auth/weak-password': 'La nueva contraseña debe tener al menos 6 caracteres.',
    'auth/requires-recent-login': 'Por seguridad, cierra sesión y vuelve a iniciar antes de cambiar tu contraseña.',
    'auth/invalid-credential': 'La contraseña actual es incorrecta.',
  }

  const toggleSeccion = (seccion) => {
    setSeccionAbierta(seccionAbierta === seccion ? null : seccion)
    setErrorNombre('')
    setErrorPassword('')
    setExitoNombre(false)
    setExitoPassword(false)
    setMostrarPasswords(false)
  }

  const reproducirAlertaSonora = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.03

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      setTimeout(() => {
        osc.stop()
        ctx.close()
      }, 250)
    } catch (err) {
      console.error('No se pudo reproducir sonido de alerta', err)
    }
  }, [])

  const mostrarNotificacion = useCallback(async (titulo, cuerpo) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(titulo, {
          body: cuerpo,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'medicrecuerda-recordatorio',
          renotify: true,
        })
      } else {
        new Notification(titulo, { body: cuerpo })
      }
    } catch (err) {
      console.error('No se pudo mostrar notificación', err)
    }

    reproducirAlertaSonora()
  }, [reproducirAlertaSonora])

  const activarNotificaciones = async () => {
    if (!('Notification' in window)) return
    const permiso = await Notification.requestPermission()
    setPermisoNotificaciones(permiso)

    if (permiso === 'granted') {
      setAlertasActivas(true)
      localStorage.setItem('alertasMedicRecuerda', 'true')
      await mostrarNotificacion('Recordatorios activados', 'Te avisaremos cuando una toma esté próxima o sea momento de tomarla.')
    }
  }

  const desactivarNotificaciones = () => {
    setAlertasActivas(false)
    localStorage.setItem('alertasMedicRecuerda', 'false')
  }

  const activarPush = async () => {
    if (!user) return
    setEstadoPush('Activando push...')
    try {
      await activarPushRecordatorios(user.uid)
      setPushActivo(true)
      localStorage.setItem('pushMedicRecuerda', 'true')
      setEstadoPush('Push en segundo plano activado.')
    } catch (err) {
      console.error(err)
      setEstadoPush(err.message || 'No se pudo activar push.')
    }
  }

  const desactivarPush = async () => {
    if (!user) return
    try {
      await desactivarPushRecordatorios(user.uid)
      setPushActivo(false)
      localStorage.setItem('pushMedicRecuerda', 'false')
      setEstadoPush('Push en segundo plano desactivado.')
    } catch (err) {
      console.error(err)
      setEstadoPush('No se pudo desactivar push.')
    }
  }

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermisoNotificaciones(Notification.permission)
  }, [])

  useEffect(() => {
    let unsub = () => {}

    const init = async () => {
      unsub = await escucharPushEnPrimerPlano(async (payload) => {
        const title = payload?.notification?.title || 'MedicRecuerda'
        const body = payload?.notification?.body || 'Tienes un recordatorio de medicamento.'
        await mostrarNotificacion(title, body)
      })
    }

    init()
    return () => unsub()
  }, [mostrarNotificacion])

  const handleGuardarNombre = async (e) => {
    e.preventDefault()
    setErrorNombre('')
    setExitoNombre(false)

    if (!nombre.trim()) { setErrorNombre('El nombre no puede estar vacío.'); return }
    if (nombre.trim().length < 2) { setErrorNombre('El nombre debe tener al menos 2 caracteres.'); return }

    setGuardandoNombre(true)
    try {
      await updateProfile(user, { displayName: nombre.trim() })
      await updateDoc(doc(db, 'usuarios', user.uid), { nombre: nombre.trim() })
      setExitoNombre(true)
      setTimeout(() => {
        setSeccionAbierta(null)
        setExitoNombre(false)
      }, 1500)
    } catch (err) {
      setErrorNombre('Error al guardar. Intenta de nuevo.')
      console.error(err)
    } finally {
      setGuardandoNombre(false)
    }
  }

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setErrorPassword('')
    setExitoPassword(false)

    if (!passwordActual) { setErrorPassword('Ingresa tu contraseña actual.'); return }
    if (passwordNueva.length < 6) { setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (passwordNueva !== passwordConfirmar) { setErrorPassword('Las contraseñas no coinciden.'); return }
    if (passwordActual === passwordNueva) { setErrorPassword('La nueva contraseña debe ser diferente a la actual.'); return }

    setGuardandoPassword(true)
    try {
      const credencial = EmailAuthProvider.credential(user.email, passwordActual)
      await reauthenticateWithCredential(user, credencial)
      await updatePassword(user, passwordNueva)
      setExitoPassword(true)
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
      setTimeout(() => {
        setSeccionAbierta(null)
        setExitoPassword(false)
      }, 1500)
    } catch (err) {
      setErrorPassword(mensajesError[err.code] || 'Error al cambiar contraseña. Intenta de nuevo.')
      console.error(err)
    } finally {
      setGuardandoPassword(false)
    }
  }

  const handleCerrarSesion = async () => {
    if (!confirm('¿Estás seguro que deseas cerrar sesión?')) return
    setCerrando(true)
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error(err)
      setCerrando(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      <h1 className="text-2xl font-bold text-gray-800 mb-6">👤 Mi Perfil</h1>

      {/* Avatar e info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
          {user?.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">{user?.displayName || 'Sin nombre'}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-800">🔔 Recordatorios inteligentes</p>
              <p className="text-xs text-indigo-700 mt-1">
                Controla alertas locales, sonido y notificaciones push en segundo plano.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-100 whitespace-nowrap">
              {permisoNotificaciones === 'granted'
                ? 'Permiso activo'
                : permisoNotificaciones === 'denied'
                  ? 'Bloqueado'
                  : 'Pendiente'}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {permisoNotificaciones === 'denied' ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              Tienes las notificaciones bloqueadas en el navegador. Actívalas desde la configuración del sitio para usar recordatorios.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={alertasActivas && permisoNotificaciones === 'granted' ? desactivarNotificaciones : activarNotificaciones}
              className={`w-full text-sm font-semibold py-3 rounded-xl transition-colors ${
                alertasActivas && permisoNotificaciones === 'granted'
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {alertasActivas && permisoNotificaciones === 'granted' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
            </button>

            <button
              onClick={reproducirAlertaSonora}
              className="w-full bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              Probar sonido
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={pushActivo ? desactivarPush : activarPush}
              className={`w-full text-sm font-semibold py-3 rounded-xl transition-colors ${
                pushActivo
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {pushActivo ? 'Desactivar push en segundo plano' : 'Activar push en segundo plano'}
            </button>

            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600 flex items-center justify-center text-center">
              {estadoPush || 'Activa push para recibir recordatorios aunque la app esté en otra pestaña.'}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">

        {/* Editar nombre */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => toggleSeccion('nombre')}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✏️</span>
              <span className="font-medium text-gray-700">Editar nombre</span>
            </div>
            <span className="text-gray-400 text-lg">
              {seccionAbierta === 'nombre' ? '▲' : '▼'}
            </span>
          </button>

          {seccionAbierta === 'nombre' && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <form onSubmit={handleGuardarNombre} noValidate className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />
                {errorNombre && (
                  <div role="alert" className="mb-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                    {errorNombre}
                  </div>
                )}
                {exitoNombre && (
                  <div className="mb-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">
                    ✅ Nombre actualizado correctamente.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={guardandoNombre}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {guardandoNombre ? 'Guardando...' : 'Guardar nombre'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => toggleSeccion('password')}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <span className="font-medium text-gray-700">Cambiar contraseña</span>
            </div>
            <span className="text-gray-400 text-lg">
              {seccionAbierta === 'password' ? '▲' : '▼'}
            </span>
          </button>

          {seccionAbierta === 'password' && (
            <div className="px-5 pb-5 border-t border-gray-50">
              <form onSubmit={handleCambiarPassword} noValidate className="mt-4 space-y-3">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarPasswords ? 'text' : 'password'}
                      value={passwordActual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      autoComplete="current-password"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tu contraseña actual"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPasswords(!mostrarPasswords)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600 text-sm font-medium"
                    >
                      {mostrarPasswords ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña
                  </label>
                  <input
                    type={mostrarPasswords ? 'text' : 'password'}
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type={mostrarPasswords ? 'text' : 'password'}
                    value={passwordConfirmar}
                    onChange={(e) => setPasswordConfirmar(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                {errorPassword && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                    {errorPassword}
                  </div>
                )}
                {exitoPassword && (
                  <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">
                    ✅ Contraseña actualizada correctamente.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {guardandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleCerrarSesion}
          disabled={cerrando}
          className="w-full bg-white rounded-2xl shadow-sm border border-red-100 px-5 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">
            {cerrando ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </span>
        </button>

      </div>
    </div>
  )
}