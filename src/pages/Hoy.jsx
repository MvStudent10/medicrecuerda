import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMedicamentos } from '../hooks/useMedicamentos'
import { suscribirTomasDelDia, marcarComoTomado } from '../services/tomas'
import { calcularTomasDelDia } from '../utils/calcularTomas'
import { getFechaHoy, getHoraActual } from '../utils/fecha'

export default function Hoy() {
  const { user } = useAuth()
  const { medicamentos, cargando } = useMedicamentos()
  const [tomasRegistradas, setTomasRegistradas] = useState({})
  const [marcando, setMarcando] = useState(null)
  const [modalToma, setModalToma] = useState(null)
  const [horaRealInput, setHoraRealInput] = useState('')
  const [confirmarPasadas, setConfirmarPasadas] = useState(null)

  const fecha = getFechaHoy()
  const horaActual = getHoraActual()

  useEffect(() => {
    if (!user) return
    const unsub = suscribirTomasDelDia(user.uid, fecha, (datos) => {
      setTomasRegistradas(datos)
    })
    return () => unsub()
  }, [user, fecha])

  const tomasDelDia = calcularTomasDelDia(medicamentos, fecha, tomasRegistradas)

  const tomaId = (toma) =>
    `${toma.medicamentoId}_${toma.fechaProgramada}_${toma.horaProgramada.replace(':', '')}`

  const esTomado = (toma) => tomasRegistradas[tomaId(toma)]?.tomado === true

  const pendientes = tomasDelDia.filter((t) => !esTomado(t))
  const completadas = tomasDelDia.filter((t) => esTomado(t))

  // Tomas pasadas sin confirmar
  const tomasPasadasSinConfirmar = pendientes.filter(
    (t) => t.horaProgramada < horaActual
  )

  const abrirModalMarcar = (toma) => {
    setModalToma(toma)
    setHoraRealInput(horaActual)
  }

  const handleMarcar = async () => {
    if (!modalToma) return
    setMarcando(modalToma.medicamentoId + modalToma.horaProgramada)
    try {
      await marcarComoTomado(user.uid, modalToma, horaRealInput)
      setModalToma(null)
    } catch (err) {
      console.error(err)
    } finally {
      setMarcando(null)
    }
  }

  const handleConfirmarPasadas = async (siLasTomo) => {
    if (siLasTomo) {
      for (const toma of tomasPasadasSinConfirmar) {
        await marcarComoTomado(user.uid, toma, toma.horaProgramada)
      }
    }
    setConfirmarPasadas(false)
  }

  // Índice de la primera toma no tomada (para bloqueo)
  const indicePrimeraNoTomada = pendientes.findIndex((t) => !esTomado(t))

  if (cargando) {
    return <p className="text-center text-gray-400 py-12">Cargando...</p>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👋 Hoy</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </div>

      {/* Banner tomas pasadas sin confirmar */}
      {tomasPasadasSinConfirmar.length > 0 && confirmarPasadas !== false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="font-semibold text-amber-800 mb-1">
            ⚠️ Tienes {tomasPasadasSinConfirmar.length} toma{tomasPasadasSinConfirmar.length > 1 ? 's' : ''} sin confirmar
          </p>
          <p className="text-sm text-amber-700 mb-3">
            ¿Las tomaste?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirmarPasadas(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              Sí, las tomé
            </button>
            <button
              onClick={() => handleConfirmarPasadas(false)}
              className="flex-1 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              No las tomé
            </button>
          </div>
        </div>
      )}

      {/* Progreso del día */}
      {tomasDelDia.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700">Progreso de hoy</span>
            <span className="text-sm font-bold text-blue-700">
              {completadas.length}/{tomasDelDia.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completadas.length / tomasDelDia.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Sin medicamentos */}
      {tomasDelDia.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-gray-500">No tienes tomas programadas para hoy.</p>
          <p className="text-gray-400 text-sm mt-1">Agrega medicamentos en la sección 💊</p>
        </div>
      )}

      {/* Tomas pendientes */}
      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pendientes
          </h2>
          <div className="space-y-3">
            {pendientes.map((toma, index) => {
              const esPasada = toma.horaProgramada < horaActual
              const estaBloqueada = index > indicePrimeraNoTomada
              const claveMarcando = toma.medicamentoId + toma.horaProgramada

              return (
                <div
                  key={tomaId(toma)}
                  className={`rounded-2xl shadow-sm border p-4 flex items-center justify-between transition-all
                    ${esPasada ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}
                    ${estaBloqueada ? 'opacity-40' : ''}
                  `}
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-base">{toma.medicamentoNombre}</p>
                    <p className="text-sm font-medium text-gray-600 mt-0.5">{toma.dosis}</p>
                    <p className={`text-sm mt-1 font-semibold ${esPasada ? 'text-red-500' : 'text-yellow-600'}`}>
                      {esPasada ? '⚠️ Atrasada' : '🕐 Pendiente'} · {toma.horaProgramada}
                    </p>
                  </div>
                  <button
                    onClick={() => !estaBloqueada && abrirModalMarcar(toma)}
                    disabled={marcando === claveMarcando || estaBloqueada}
                    className={`text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors
                      ${estaBloqueada ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'}
                    `}
                  >
                    {marcando === claveMarcando ? '...' : estaBloqueada ? '🔒' : 'Tomado ✓'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tomas completadas */}
      {completadas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Completadas
          </h2>
          <div className="space-y-3">
            {completadas.map((toma) => {
              const horaReal = tomasRegistradas[tomaId(toma)]?.horaReal
              return (
                <div
                  key={tomaId(toma)}
                  className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-700 text-base">{toma.medicamentoNombre}</p>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{toma.dosis}</p>
                    <p className="text-sm mt-1 text-green-600 font-semibold">
                      ✅ Tomada a las {horaReal || toma.horaProgramada}
                    </p>
                  </div>
                  <span className="text-2xl">✓</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal confirmar hora real */}
      {modalToma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setModalToma(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-800 text-lg mb-1">
              ✅ Marcar como tomado
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {modalToma.medicamentoNombre} · {modalToma.dosis}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿A qué hora lo tomaste?
            </label>
            <input
              type="time"
              value={horaRealInput}
              onChange={(e) => setHoraRealInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleMarcar}
                disabled={marcando !== null}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {marcando !== null ? 'Guardando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setModalToma(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}