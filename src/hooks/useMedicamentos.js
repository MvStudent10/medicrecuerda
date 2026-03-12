import { useState, useEffect } from 'react'
import { suscribirMedicamentos } from '../services/medicamentos'
import { useAuth } from './useAuth'

export function useMedicamentos() {
  const { user } = useAuth()
  const [medicamentos, setMedicamentos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!user) return

    const unsub = suscribirMedicamentos(user.uid, (datos) => {
      setMedicamentos(datos)
      setCargando(false)
    })

    return () => unsub()
  }, [user])

  return { medicamentos, cargando }
}