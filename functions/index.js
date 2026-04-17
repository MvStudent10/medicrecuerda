const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')

admin.initializeApp()

const db = admin.firestore()
const messaging = admin.messaging()

const TZ = 'America/Mexico_City'
const MINUTOS_ANTES = 30

function getFechaYHoraEnTZ(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type) => parts.find((p) => p.type === type)?.value
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')

  return {
    fecha: `${year}-${month}-${day}`,
    hora: `${hour}:${minute}`,
    minutosActuales: Number(hour) * 60 + Number(minute),
  }
}

function horaAMinutos(hora) {
  const [h, m] = (hora || '00:00').split(':').map(Number)
  return h * 60 + m
}

function calcularTomasDelDiaBackend(medicamentos, fecha) {
  const tomas = []

  for (const med of medicamentos) {
    if (!med.activo) continue
    if (!med.fechaInicio || !med.fechaFin) continue
    if (med.fechaInicio > fecha || med.fechaFin < fecha) continue

    const frecuencia = Number(med.frecuenciaHoras)
    if (!frecuencia || frecuencia <= 0) continue

    const [horaBase, minBase] = (med.horaInicio || '08:00').split(':').map(Number)
    const tomasPorDia = Math.floor(24 / frecuencia)

    for (let i = 0; i < tomasPorDia; i++) {
      const totalMinutos = horaBase * 60 + minBase + i * frecuencia * 60
      if (Math.floor(totalMinutos / 60) >= 24) continue

      const horaFinal = Math.floor(totalMinutos / 60) % 24
      const minFinal = totalMinutos % 60
      const horaStr = `${String(horaFinal).padStart(2, '0')}:${String(minFinal).padStart(2, '0')}`

      tomas.push({
        medicamentoId: med.id,
        medicamentoNombre: med.nombre || 'Medicamento',
        dosis: med.dosis || '',
        fechaProgramada: fecha,
        horaProgramada: horaStr,
      })
    }
  }

  return tomas.sort((a, b) => a.horaProgramada.localeCompare(b.horaProgramada))
}

function buildTomaId(toma) {
  return `${toma.medicamentoId}_${toma.fechaProgramada}_${toma.horaProgramada.replace(':', '')}`
}

function buildHistorialId(toma, tipo) {
  return `${buildTomaId(toma)}_${tipo}`
}

async function tokenActivoUsuario(uid) {
  const ref = db.collection('usuarios').doc(uid).collection('notificaciones').doc('fcm_web')
  const doc = await ref.get()
  if (!doc.exists) return null

  const data = doc.data() || {}
  if (!data.activo || !data.token) return null

  return { ref, token: data.token }
}

async function getTomasResueltasDelDia(uid, fecha) {
  const snap = await db
    .collection('usuarios')
    .doc(uid)
    .collection('tomas')
    .where('fechaProgramada', '==', fecha)
    .get()

  const resueltas = new Set()
  snap.forEach((doc) => {
    const data = doc.data() || {}
    if (data.tomado === true || data.omitido === true) {
      resueltas.add(doc.id)
    }
  })

  return resueltas
}

async function fueEnviada(uid, toma, tipo) {
  const historialRef = db
    .collection('usuarios')
    .doc(uid)
    .collection('notificaciones_historial')
    .doc(buildHistorialId(toma, tipo))

  const doc = await historialRef.get()
  return { historialRef, existe: doc.exists }
}

async function registrarEnvio(historialRef, toma, tipo) {
  await historialRef.set({
    tipo,
    medicamentoId: toma.medicamentoId,
    fechaProgramada: toma.fechaProgramada,
    horaProgramada: toma.horaProgramada,
    enviadoEn: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
}

async function enviarPush(token, title, body) {
  return messaging.send({
    token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      },
      fcmOptions: {
        link: '/',
      },
    },
  })
}

async function procesarUsuario(usuarioDoc, contexto) {
  const uid = usuarioDoc.id
  const { fecha, minutosActuales } = contexto

  const tokenInfo = await tokenActivoUsuario(uid)
  if (!tokenInfo) return { uid, enviados: 0, reason: 'sin_token' }

  const medsSnap = await db
    .collection('usuarios')
    .doc(uid)
    .collection('medicamentos')
    .where('activo', '==', true)
    .get()

  if (medsSnap.empty) return { uid, enviados: 0, reason: 'sin_medicamentos' }

  const medicamentos = medsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const tomasProgramadas = calcularTomasDelDiaBackend(medicamentos, fecha)
  if (tomasProgramadas.length === 0) return { uid, enviados: 0, reason: 'sin_tomas' }

  const tomasResueltas = await getTomasResueltasDelDia(uid, fecha)

  let enviados = 0

  for (const toma of tomasProgramadas) {
    const tomaId = buildTomaId(toma)
    if (tomasResueltas.has(tomaId)) continue

    const minutosToma = horaAMinutos(toma.horaProgramada)
    const diff = minutosToma - minutosActuales

    let tipo = null
    let title = ''
    let body = ''

    if (diff <= MINUTOS_ANTES && diff >= MINUTOS_ANTES - 1) {
      tipo = 'proxima'
      title = 'Toma proxima'
      body = `${toma.medicamentoNombre}: en ${MINUTOS_ANTES} minutos (${toma.horaProgramada}).`
    } else if (diff <= 0 && diff >= -1) {
      tipo = 'momento'
      title = 'Es momento de tu toma'
      body = `${toma.medicamentoNombre} (${toma.dosis}) a las ${toma.horaProgramada}.`
    }

    if (!tipo) continue

    const { historialRef, existe } = await fueEnviada(uid, toma, tipo)
    if (existe) continue

    try {
      await enviarPush(tokenInfo.token, title, body)
      await registrarEnvio(historialRef, toma, tipo)
      enviados++
    } catch (error) {
      const code = error?.errorInfo?.code || error?.code || ''
      logger.error(`Error enviando push uid=${uid} tipo=${tipo}`, error)

      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')
      ) {
        await tokenInfo.ref.set(
          {
            activo: false,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
      }
    }
  }

  return { uid, enviados, reason: 'ok' }
}

exports.enviarRecordatoriosMedicamento = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: TZ,
    memory: '256MiB',
    region: 'us-central1',
  },
  async () => {
    const contexto = getFechaYHoraEnTZ(new Date())

    const usuariosSnap = await db.collection('usuarios').get()
    if (usuariosSnap.empty) {
      logger.info('No hay usuarios para procesar.')
      return
    }

    let totalEnviados = 0
    let totalUsuarios = 0

    for (const usuarioDoc of usuariosSnap.docs) {
      totalUsuarios++
      const result = await procesarUsuario(usuarioDoc, contexto)
      totalEnviados += result.enviados
    }

    logger.info('Recordatorios ejecutados', {
      fecha: contexto.fecha,
      hora: contexto.hora,
      usuarios: totalUsuarios,
      notificacionesEnviadas: totalEnviados,
    })
  }
)
