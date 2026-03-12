import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { suscribirTomasDelMes } from '../services/tomas'
import { getFechaHoy } from '../utils/fecha'

function getDiasDelMes(anio, mes) {
  return new Date(anio, mes, 0).getDate()
}

function agruparTomasPorDia(tomas) {
  return tomas.reduce((acc, toma) => {
    const fecha = toma.fechaProgramada
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(toma)
    return acc
  }, {})
}

function calcularCumplimiento(tomasDelDia) {
  if (!tomasDelDia || tomasDelDia.length === 0) return null
  const tomadas = tomasDelDia.filter((t) => t.tomado).length
  return Math.round((tomadas / tomasDelDia.length) * 100)
}

function colorPorCumplimiento(porcentaje) {
  if (porcentaje === null) return 'bg-gray-100 text-gray-400'
  if (porcentaje === 100) return 'bg-green-500 text-white'
  if (porcentaje >= 50) return 'bg-yellow-400 text-white'
  return 'bg-red-400 text-white'
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Lunes a Domingo
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function Modal({ fecha, tomas, onCerrar }) {
  if (!fecha) return null

  const tomasOrdenadas = [...tomas].sort((a, b) =>
    a.horaProgramada.localeCompare(b.horaProgramada)
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onCerrar}
    >
      {/* Fondo oscuro */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Contenido del modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-gray-800">
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </h3>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {tomasOrdenadas.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              Sin tomas registradas este día.
            </p>
          ) : (
            <div className="space-y-3">
              {tomasOrdenadas.map((toma) => (
                <div
                  key={toma.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-10 shrink-0">
                      {toma.horaProgramada}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {toma.medicamentoNombre}
                      </p>
                      <p className="text-xs text-gray-500">{toma.dosis}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ml-2 ${
                    toma.tomado
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-500'
                  }`}>
                    {toma.tomado ? '✅ Tomado' : '❌ Omitido'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Progreso() {
  const { user } = useAuth()
  const fechaHoy = getFechaHoy()
  const hoy = new Date()

  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [tomas, setTomas] = useState([])
  const [vista, setVista] = useState('calendario')
  const [modalFecha, setModalFecha] = useState(null)

  useEffect(() => {
    if (!user) return
    const unsub = suscribirTomasDelMes(user.uid, anio, mes, setTomas)
    return () => unsub()
  }, [user, anio, mes])

  const tomasPorDia = agruparTomasPorDia(tomas)

  const diasDelMes = getDiasDelMes(anio, mes)

  // Primer día del mes en formato Lun=0 ... Dom=6
  const primerDiaJS = new Date(anio, mes - 1, 1).getDay() // 0=Dom
  const primerDiaLunes = (primerDiaJS + 6) % 7 // Convertir a Lun=0

  const irMesAnterior = () => {
    if (mes === 1) { setAnio(a => a - 1); setMes(12) }
    else setMes(m => m - 1)
  }

  const irMesSiguiente = () => {
    if (mes === 12) { setAnio(a => a + 1); setMes(1) }
    else setMes(m => m + 1)
  }

  // Últimos 7 días para vista semanal
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">


      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Mi Progreso</h1>

      {/* Toggle vistas */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setVista('calendario')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            vista === 'calendario' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setVista('semanal')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            vista === 'semanal' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          📋 Semanal
        </button>
      </div>

      {/* ── VISTA CALENDARIO ── */}
      {vista === 'calendario' && (
        <>
          {/* Navegación mes */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={irMesAnterior}
              className="text-gray-500 hover:text-blue-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl"
            >
              ‹
            </button>
            <h2 className="font-semibold text-gray-700">
              {MESES[mes - 1]} {anio}
            </h2>
            <button
              onClick={irMesSiguiente}
              className="text-gray-500 hover:text-blue-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl"
            >
              ›
            </button>
          </div>

          {/* Cabecera días semana — Lun a Dom */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid calendario */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Celdas vacías antes del primer día */}
            {Array.from({ length: primerDiaLunes }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Días del mes */}
            {Array.from({ length: diasDelMes }, (_, i) => {
              const dia = i + 1
              const fechaDia = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
              const porcentaje = calcularCumplimiento(tomasPorDia[fechaDia])
              const esHoy = fechaDia === fechaHoy

              return (
                <button
                  key={dia}
                  onClick={() => setModalFecha(fechaDia)}
                  className={`
                    aspect-square rounded-lg text-xs font-semibold
                    flex items-center justify-center
                    transition-all border-2 active:scale-95
                    ${colorPorCumplimiento(porcentaje)}
                    ${esHoy ? 'border-blue-500' : 'border-transparent'}
                  `}
                >
                  {dia}
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 justify-center mt-2">
            {[
              { color: 'bg-green-500', label: '100%' },
              { color: 'bg-yellow-400', label: 'Parcial' },
              { color: 'bg-red-400', label: '0%' },
              { color: 'bg-gray-100', label: 'Sin tomas' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── VISTA SEMANAL ── */}
      {vista === 'semanal' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {ultimos7Dias.map((fecha) => {
            const tomasDelDia = tomasPorDia[fecha] || []
            const porcentaje = calcularCumplimiento(tomasDelDia)
            const esHoy = fecha === fechaHoy
            const dia = new Date(fecha + 'T12:00:00')

            return (
              <button
                key={fecha}
                onClick={() => setModalFecha(fecha)}
                className={`
                  rounded-2xl p-3 text-left border-2 transition-all active:scale-95
                  ${esHoy ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white shadow-sm'}
                `}
              >
                <p className={`text-xs font-medium mb-1 ${esHoy ? 'text-blue-600' : 'text-gray-500'}`}>
                  {dia.toLocaleDateString('es-MX', { weekday: 'short' })}
                </p>
                <p className={`text-lg font-bold ${esHoy ? 'text-blue-700' : 'text-gray-800'}`}>
                  {dia.getDate()}
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  {dia.toLocaleDateString('es-MX', { month: 'short' })}
                </p>
                {porcentaje !== null ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    porcentaje === 100 ? 'bg-green-100 text-green-600' :
                    porcentaje >= 50 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-500'
                  }`}>
                    {porcentaje}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalFecha && (
        <Modal
          fecha={modalFecha}
          tomas={tomasPorDia[modalFecha] || []}
          onCerrar={() => setModalFecha(null)}
        />
      )}

    </div>
  )
}