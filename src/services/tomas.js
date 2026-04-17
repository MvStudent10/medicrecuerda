import {
  collection,
  doc,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const tomasRef = (uid) => collection(db, 'usuarios', uid, 'tomas')

const generarTomaId = (medicamentoId, fecha, hora) =>
  `${medicamentoId}_${fecha}_${hora.replace(':', '')}`

export function suscribirTomasDelDia(uid, fecha, callback) {
  const q = query(
    tomasRef(uid),
    where('fechaProgramada', '==', fecha)
  )
  return onSnapshot(q, (snapshot) => {
    const tomas = {}
    snapshot.docs.forEach((doc) => {
      tomas[doc.id] = doc.data()
    })
    callback(tomas)
  })
}

export function suscribirTomasDelMes(uid, anio, mes, callback) {
  const fechaInicio = `${anio}-${String(mes).padStart(2, '0')}-01`
  const fechaFin = `${anio}-${String(mes).padStart(2, '0')}-31`

  const q = query(
    tomasRef(uid),
    where('fechaProgramada', '>=', fechaInicio),
    where('fechaProgramada', '<=', fechaFin)
  )

  return onSnapshot(q, (snapshot) => {
    const tomas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(tomas)
  })
}

export async function marcarComoTomado(uid, toma, horaReal) {
  const tomaId = generarTomaId(toma.medicamentoId, toma.fechaProgramada, toma.horaProgramada)
  const ref = doc(db, 'usuarios', uid, 'tomas', tomaId)
  await setDoc(ref, {
    ...toma,
    tomado: true,
    horaReal: horaReal, // hora real en que se tomó HH:mm
    tomadoEn: serverTimestamp(),
  }, { merge: true })
}

export async function marcarComoOmitido(uid, toma) {
  const tomaId = generarTomaId(toma.medicamentoId, toma.fechaProgramada, toma.horaProgramada)
  const ref = doc(db, 'usuarios', uid, 'tomas', tomaId)
  await setDoc(ref, {
    ...toma,
    tomado: false,
    omitido: true,
    horaReal: null,
    omitidoEn: serverTimestamp(),
  }, { merge: true })
}