import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { agregarMedicamento, editarMedicamento } from '../../services/medicamentos'
import { getFechaHoy } from '../../utils/fecha'

const FRECUENCIAS = [
  { label: 'Cada 4 horas', value: 4 },
  { label: 'Cada 6 horas', value: 6 },
  { label: 'Cada 8 horas', value: 8 },
  { label: 'Cada 12 horas', value: 12 },
  { label: 'Cada 24 horas (1 vez al día)', value: 24 },
]

export const COLORES_MEDICAMENTO = [
  { id: 'azul',     bg: 'bg-blue-500',   hex: '#3b82f6' },
  { id: 'celeste',  bg: 'bg-sky-400',    hex: '#38bdf8' },
  { id: 'verde',    bg: 'bg-emerald-500',hex: '#10b981' },
  { id: 'amarillo', bg: 'bg-yellow-400', hex: '#facc15' },
  { id: 'naranja',  bg: 'bg-orange-500', hex: '#f97316' },
  { id: 'rojo',     bg: 'bg-red-500',    hex: '#ef4444' },
  { id: 'rosa',     bg: 'bg-pink-400',   hex: '#f472b6' },
  { id: 'morado',   bg: 'bg-purple-500', hex: '#a855f7' },
  { id: 'gris',     bg: 'bg-gray-400',   hex: '#9ca3af' },
]

// Asigna color automático basado en índice
export function getColorAuto(index) {
  return COLORES_MEDICAMENTO[index % COLORES_MEDICAMENTO.length]
}

const getFormVacio = () => ({
  nombre: '',
  dosis: '',
  frecuenciaHoras: 8,
  fechaInicio: getFechaHoy(),
  fechaFin: '',
  horaInicio: '08:00',
  horarioFijo: false,
  color: '',
})

export default function ModalMedicamento({ medicamento, totalMedicamentos = 0, onCerrar }) {
  const { user } = useAuth()
  const [form, setForm] = useState(getFormVacio())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (medicamento) {
      setForm({
        nombre: medicamento.nombre,
        dosis: medicamento.dosis,
        frecuenciaHoras: medicamento.frecuenciaHoras,
        fechaInicio: medicamento.fechaInicio,
        fechaFin: medicamento.fechaFin,
        horaInicio: medicamento.horaInicio || '08:00',
        horarioFijo: medicamento.horarioFijo || false,
        color: medicamento.color || '',
      })
    } else {
      setForm(getFormVacio())
    }
  }, [medicamento])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validar = () => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.'
    if (!form.dosis.trim()) return 'La dosis es obligatoria.'
    if (!form.horaInicio) return 'La hora de la primera toma es obligatoria.'
    if (!form.fechaInicio) return 'La fecha de inicio es obligatoria.'
    if (!form.fechaFin) return 'La fecha de fin es obligatoria.'
    if (form.fechaFin < form.fechaInicio) return 'La fecha de fin no puede ser anterior al inicio.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errorValidacion = validar()
    if (errorValidacion) { setError(errorValidacion); return }

    setGuardando(true)
    try {
      // Si no eligió color, asignar automáticamente
      const colorFinal = form.color
        ? form.color
        : getColorAuto(totalMedicamentos).hex

      const datos = {
        nombre: form.nombre.trim(),
        dosis: form.dosis.trim(),
        frecuenciaHoras: Number(form.frecuenciaHoras),
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        horaInicio: form.horaInicio,
        horarioFijo: form.horarioFijo === true || form.horarioFijo === 'true',
        color: colorFinal,
      }
      if (medicamento) {
        await editarMedicamento(user.uid, medicamento.id, datos)
      } else {
        await agregarMedicamento(user.uid, datos)
      }
      onCerrar()
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.')
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onCerrar}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-gray-800">
            {medicamento ? 'Editar medicamento' : 'Nuevo medicamento'}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="p-4 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del medicamento
            </label>
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Paracetamol"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosis
            </label>
            <input
              name="dosis"
              type="text"
              value={form.dosis}
              onChange={handleChange}
              placeholder="Ej: 500mg, 1 tableta"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frecuencia
            </label>
            <select
              name="frecuenciaHoras"
              value={form.frecuenciaHoras}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FRECUENCIAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora de la primera toma
            </label>
            <input
              name="horaInicio"
              type="time"
              value={form.horaInicio}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selector de color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color del medicamento
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORES_MEDICAMENTO.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    color: prev.color === color.hex ? '' : color.hex
                  }))}
                  className={`w-8 h-8 rounded-full transition-transform active:scale-90
                    ${color.bg}
                    ${form.color === color.hex
                      ? 'ring-2 ring-offset-2 ring-gray-600 scale-110'
                      : 'opacity-70 hover:opacity-100'
                    }
                  `}
                />
              ))}
            </div>
            {!form.color && (
              <p className="text-xs text-gray-400 mt-1">
                Se asignará un color automáticamente
              </p>
            )}
          </div>

          {/* Toggle horario fijo */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">🔒 Mantener horario fijo</p>
              <p className="text-xs text-gray-400 mt-0.5">Las tomas no se ajustan aunque te atrases</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, horarioFijo: !prev.horarioFijo }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.horarioFijo ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.horarioFijo ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha inicio
              </label>
              <input
                name="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha fin
              </label>
              <input
                name="fechaFin"
                type="date"
                value={form.fechaFin}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {guardando ? 'Guardando...' : medicamento ? 'Guardar cambios' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}