import { useState } from 'react'
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