import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase' // Asegúrate de exportar 'db'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  
  // 1. Agrupamos el estado del formulario (Clean Code)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmarPassword: ''
  })
  
  // Estados de la UI
  const [isRegistro, setIsRegistro] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false) // UX para accesibilidad

  const mensajesError = {
    'auth/invalid-email': 'El correo no es válido.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/email-already-in-use': 'Este correo ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  }

  // Manejador genérico para todos los inputs
  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const validar = () => {
    if (isRegistro) {
      if (!formData.nombre.trim()) return 'El nombre es obligatorio.'
      if (formData.nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.'
      if (formData.password !== formData.confirmarPassword) return 'Las contraseñas no coinciden.'
    }
    if (!formData.email.trim()) return 'El correo es obligatorio.'
    if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    const errorValidacion = validar()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setCargando(true)
    const emailLimpio = formData.email.trim().toLowerCase()
    const nombreLimpio = formData.nombre.trim()

    try {
      if (isRegistro) {
        // A. Crear usuario en Firebase Auth
        const credencial = await createUserWithEmailAndPassword(auth, emailLimpio, formData.password)
        
        // B. Actualizar el perfil en Auth
        await updateProfile(credencial.user, { displayName: nombreLimpio })

        // C. BUENA PRÁCTICA: Crear su documento en Firestore para futuros registros médicos
        await setDoc(doc(db, 'usuarios', credencial.user.uid), {
          nombre: nombreLimpio,
          email: emailLimpio,
          fechaRegistro: serverTimestamp(),
          rol: 'paciente' // Útil si después quieres agregar perfiles médicos
        })
      } else {
        // Iniciar sesión
        await signInWithEmailAndPassword(auth, emailLimpio, formData.password)
      }
      
      navigate('/')
      
    } catch (err) {
      console.error("Error de Auth:", err) // Útil para debugear
      setError(mensajesError[err.code] || 'Ocurrió un error. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  const cambiarModo = () => {
    setIsRegistro(!isRegistro)
    setError('')
    setMensaje('')
    setFormData({ nombre: '', email: '', password: '', confirmarPassword: '' })
  }

  const handleOlvidePassword = async () => {
    setError('')
    setMensaje('')
    const emailLimpio = formData.email.trim().toLowerCase()

    if (!emailLimpio) {
      setError('Escribe tu correo para enviarte el enlace de recuperación.')
      return
    }

    try {
      await sendPasswordResetEmail(auth, emailLimpio)
      setMensaje('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.')
    } catch (err) {
      console.error('Error al enviar reset password:', err)
      setError(mensajesError[err.code] || 'No se pudo enviar el correo de recuperación. Intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">💊 MedicRecuerda</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {isRegistro ? 'Crea tu cuenta gratuita' : 'Bienvenido de nuevo'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Nombre */}
          {isRegistro && (
            <div className="mb-4">
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre"
              />
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ejemplo@correo.com"
            />
          </div>

          {/* Password con botón de visualización */}
          <div className="mb-4 relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {/* Confirmar password */}
          {isRegistro && (
            <div className="mb-6">
              <label htmlFor="confirmarPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                id="confirmarPassword"
                type={mostrarPassword ? "text" : "password"}
                required
                value={formData.confirmarPassword}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repite tu contraseña"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {mensaje && (
            <div role="status" className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {cargando ? 'Cargando...' : isRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>

          {!isRegistro && (
            <button
              type="button"
              onClick={handleOlvidePassword}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {isRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            onClick={cambiarModo}
            className="text-blue-600 font-medium hover:underline focus:outline-none"
          >
            {isRegistro ? 'Inicia sesión' : 'Regístrate gratis'}
          </button>
        </p>

      </div>
    </div>
  )
}