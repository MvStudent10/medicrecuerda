import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMedicamentos } from '../hooks/useMedicamentos'
import { desactivarMedicamento } from '../services/medicamentos'
import ModalMedicamento from '../components/ui/ModalMedicamento'

export default function Medicamentos() {
  const { user } = useAuth()
  const { medicamentos, cargando } = useMedicamentos()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState(null)

  const abrirModalNuevo = () => {
    setMedicamentoEditando(null)
    setModalAbierto(true)
  }

  const abrirModalEditar = (med) => {
    setMedicamentoEditando(med)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setMedicamentoEditando(null)
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Desactivar este medicamento?')) return
    try {
      await desactivarMedicamento(user.uid, id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💊 Mis Medicamentos</h1>
        <button
          onClick={abrirModalNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Agregar
        </button>
      </div>

      {cargando ? (
        <p className="text-center text-gray-400 py-12">Cargando medicamentos...</p>
      ) : medicamentos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💊</p>
          <p className="text-gray-500">No tienes medicamentos registrados.</p>
          <p className="text-gray-400 text-sm mt-1">Agrega tu primer medicamento arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medicamentos.map((med) => (
            <div key={med.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{med.nombre}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {med.dosis} · Cada {med.frecuenciaHoras}h
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Primera toma: {med.horaInicio || '08:00'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {med.fechaInicio} → {med.fechaFin}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => abrirModalEditar(med)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(med.id)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalMedicamento
          medicamento={medicamentoEditando}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  )
}