export function calcularTomasDelDia(medicamentos, fecha) {
  const tomas = []

  for (const med of medicamentos) {
    if (med.fechaInicio > fecha || med.fechaFin < fecha) continue

    const [horaBase, minBase] = (med.horaInicio || '08:00').split(':').map(Number)

    // Calculamos cuántas tomas caben en 24 horas
    const tomasPorDia = Math.floor(24 / med.frecuenciaHoras)

    for (let i = 0; i < tomasPorDia; i++) {
      const totalMinutos = horaBase * 60 + minBase + i * med.frecuenciaHoras * 60
      const horaFinal = Math.floor(totalMinutos / 60) % 24
      const minFinal = totalMinutos % 60

      // Si la toma cae en otro día, la ignoramos
      if (Math.floor(totalMinutos / 60) >= 24 && i > 0) {
        // Verificar si esa hora ya pasó al día siguiente y corresponde a hoy
        const horaStr = horaFinal.toString().padStart(2, '0') + ':' +
          minFinal.toString().padStart(2, '0')

        // Solo incluimos si la toma "del día siguiente" cae antes de horaBase
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