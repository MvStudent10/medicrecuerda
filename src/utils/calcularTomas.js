export function calcularTomasDelDia(medicamentos, fecha, tomasRegistradas = {}) {
  const tomas = []

  for (const med of medicamentos) {
    if (med.fechaInicio > fecha || med.fechaFin < fecha) continue

    const [horaBase, minBase] = (med.horaInicio || '08:00').split(':').map(Number)
    const tomasPorDia = Math.floor(24 / med.frecuenciaHoras)
    const esDiaInicio = med.fechaInicio === fecha
    const horarioFijo = med.horarioFijo || false

    // Buscar la última toma real registrada de este medicamento hoy
    const tomasDelMed = Object.values(tomasRegistradas).filter(
      (t) => t.medicamentoId === med.id && t.tomado && t.horaReal
    )

    // Ordenar por horaReal descendente para obtener la última
    tomasDelMed.sort((a, b) => b.horaReal.localeCompare(a.horaReal))
    const ultimaTomaReal = tomasDelMed[0]

    for (let i = 0; i < tomasPorDia; i++) {
      let horaFinal, minFinal

      if (!horarioFijo && ultimaTomaReal && i > 0) {
        // Calcular desde la última hora real tomada
        const [horaUltima, minUltima] = ultimaTomaReal.horaReal.split(':').map(Number)
        const totalMinutos = horaUltima * 60 + minUltima + i * med.frecuenciaHoras * 60
        horaFinal = Math.floor(totalMinutos / 60) % 24
        minFinal = totalMinutos % 60
        if (Math.floor(totalMinutos / 60) >= 24) continue
      } else {
        // Calcular desde horaInicio original
        const totalMinutos = horaBase * 60 + minBase + i * med.frecuenciaHoras * 60
        horaFinal = Math.floor(totalMinutos / 60) % 24
        minFinal = totalMinutos % 60
        if (Math.floor(totalMinutos / 60) >= 24) continue
      }

      // Si es día de inicio ignorar tomas anteriores a horaInicio
      if (esDiaInicio) {
        const minutosTomaActual = horaFinal * 60 + minFinal
        const minutosInicio = horaBase * 60 + minBase
        if (minutosTomaActual < minutosInicio) continue
      }

      const horaStr =
        horaFinal.toString().padStart(2, '0') + ':' +
        minFinal.toString().padStart(2, '0')

      tomas.push({
        medicamentoId: med.id,
        medicamentoNombre: med.nombre,
        dosis: med.dosis,
        fechaProgramada: fecha,
        horaProgramada: horaStr,
        tomado: false,
        horarioFijo,
      })
    }
  }

  return tomas.sort((a, b) => a.horaProgramada.localeCompare(b.horaProgramada))
}