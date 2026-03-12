export function calcularTomasDelDia(medicamentos, fecha) {
  const tomas = []

  for (const med of medicamentos) {
    if (med.fechaInicio > fecha || med.fechaFin < fecha) continue

    const [horaBase, minBase] = (med.horaInicio || '08:00').split(':').map(Number)
    const tomasPorDia = Math.floor(24 / med.frecuenciaHoras)
    const esDiaInicio = med.fechaInicio === fecha

    for (let i = 0; i < tomasPorDia; i++) {
      const totalMinutos = horaBase * 60 + minBase + i * med.frecuenciaHoras * 60
      const horaFinal = Math.floor(totalMinutos / 60) % 24
      const minFinal = totalMinutos % 60

      // Si es el día de inicio ignoramos tomas anteriores a horaInicio
      if (esDiaInicio) {
        const minutosTomaActual = horaFinal * 60 + minFinal
        const minutosInicio = horaBase * 60 + minBase
        if (minutosTomaActual < minutosInicio) continue
      }

      if (Math.floor(totalMinutos / 60) >= 24 && i > 0) {
        const horaStr = horaFinal.toString().padStart(2, '0') + ':' +
          minFinal.toString().padStart(2, '0')
        if (horaFinal >= horaBase) continue
        tomas.push({
          medicamentoId: med.id,
          medicamentoNombre: med.nombre,
          dosis: med.dosis,
          fechaProgramada: fecha,
          horaProgramada: horaStr,
          tomado: false,
        })
        continue
      }

      const horaStr = horaFinal.toString().padStart(2, '0') + ':' +
        minFinal.toString().padStart(2, '0')

      tomas.push({
        medicamentoId: med.id,
        medicamentoNombre: med.nombre,
        dosis: med.dosis,
        fechaProgramada: fecha,
        horaProgramada: horaStr,
        tomado: false,
      })
    }
  }

  return tomas.sort((a, b) => a.horaProgramada.localeCompare(b.horaProgramada))
}