import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMedicamentos } from '../hooks/useMedicamentos'
import { eliminarMedicamento } from '../services/medicamentos'
import ModalMedicamento from '../components/ui/ModalMedicamento'

export default function Medicamentos() {
  const { user } = useAuth()
  const { medicamentos, cargando } = useMedicamentos()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState(null)

  const handleAgregar = () => {
    setMedicamentoEditando(null)
    setModalAbierto(true)
  }

  const handleEditar = (med) => {
    setMedicamentoEditando(med)
    setModalAbierto(true)
  }

  const handleEliminar = async (med) => {
    if (!confirm(`¿Eliminar ${med.nombre}?`)) return
    try {
      await eliminarMedicamento(user.uid, med.id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setMedicamentoEditando(null)
  }

  if (cargando) {
    return <p className="text-center text-gray-400 py-12">Cargando...</p>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💊 Medicamentos</h1>
        <button
          onClick={handleAgregar}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Lista vacía */}
      {medicamentos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💊</p>
          <p className="text-gray-500">No tienes medicamentos registrados.</p>
          <p className="text-gray-400 text-sm mt-1">
            Toca "+ Agregar" para comenzar.
          </p>
        </div>
      )}

      {/* Lista de medicamentos */}
      <div className="space-y-3">
        {medicamentos.map((med) => (
          <div
            key={med.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Bolita de color */}
                <div
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: med.color || '#3b82f6' }}
                />
                <div>
                  <p className="font-semibold text-gray-800">{med.nombre}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{med.dosis}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Cada {med.frecuenciaHoras}h · Primera toma: {med.horaInicio}
                  </p>
                  <p className="text-xs text-gray-400">
                    {med.fechaInicio} → {med.fechaFin}
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleEditar(med)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(med)}
                  className="text-red-400 hover:text-red-600 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <ModalMedicamento
          medicamento={medicamentoEditando}
          totalMedicamentos={medicamentos.length}
          onCerrar={handleCerrarModal}
        />
      )}

    </div>
  )
}