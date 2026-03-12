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

  const fecha = getFechaHoy()
  const horaActual = getHoraActual()

  useEffect(() => {
    if (!user) return
    const unsub = suscribirTomasDelDia(user.uid, fecha, setTomasRegistradas)
    return () => unsub()
  }, [user, fecha])

  const tomasDelDia = calcularTomasDelDia(medicamentos, fecha)

  const handleMarcar = async (toma) => {
    setMarcando(toma.medicamentoId + toma.horaProgramada)
    try {
      await marcarComoTomado(user.uid, toma)
    } catch (err) {
      console.error(err)
    } finally {
      setMarcando(null)
    }
  }

  const tomaId = (toma) =>
    `${toma.medicamentoId}_${toma.fechaProgramada}_${toma.horaProgramada.replace(':', '')}`

  const esTomado = (toma) => tomasRegistradas[tomaId(toma)]?.tomado === true

  const pendientes = tomasDelDia.filter((t) => !esTomado(t))
  const completadas = tomasDelDia.filter((t) => esTomado(t))

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
          <p className="text-gray-400 text-sm mt-1">
            Agrega medicamentos en la sección 💊
          </p>
        </div>
      )}

      {/* Tomas pendientes */}
      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pendientes
          </h2>
          <div className="space-y-3">
            {pendientes.map((toma) => {
              const esPasada = toma.horaProgramada < horaActual
              const claveMarcando = toma.medicamentoId + toma.horaProgramada
              return (
                <div
                  key={tomaId(toma)}
                  className={`bg-white rounded-2xl shadow-sm border p-4 flex items-center justify-between ${esPasada ? 'border-red-100' : 'border-gray-100'}`}
                >
                  <div>
                    <p className="font-semibold text-gray-800">{toma.medicamentoNombre}</p>
                    <p className="text-sm text-gray-500">{toma.dosis}</p>
                    <p className={`text-xs mt-1 font-medium ${esPasada ? 'text-red-400' : 'text-blue-500'}`}>
                      {esPasada ? '⚠️ Atrasada' : '🕐'} {toma.horaProgramada}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMarcar(toma)}
                    disabled={marcando === claveMarcando}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    {marcando === claveMarcando ? '...' : 'Tomado ✓'}
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
            {completadas.map((toma) => (
              <div
                key={tomaId(toma)}
                className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center justify-between opacity-75"
              >
                <div>
                  <p className="font-semibold text-gray-700">{toma.medicamentoNombre}</p>
                  <p className="text-sm text-gray-500">{toma.dosis}</p>
                  <p className="text-xs mt-1 text-green-500 font-medium">
                    ✅ {toma.horaProgramada}
                  </p>
                </div>
                <span className="text-2xl">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}