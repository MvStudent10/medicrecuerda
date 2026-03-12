import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const medicamentosRef = (uid) =>
  collection(db, 'usuarios', uid, 'medicamentos')

export function suscribirMedicamentos(uid, callback) {
  const q = query(
    medicamentosRef(uid),
    where('activo', '==', true),
    orderBy('creadoEn', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(datos)
  })
}

export async function agregarMedicamento(uid, datos) {
  return addDoc(medicamentosRef(uid), {
    ...datos,
    activo: true,
    creadoEn: serverTimestamp(),
  })
}

export async function editarMedicamento(uid, medicamentoId, datos) {
  const ref = doc(db, 'usuarios', uid, 'medicamentos', medicamentoId)
  return updateDoc(ref, datos)
}

export async function desactivarMedicamento(uid, medicamentoId) {
  const ref = doc(db, 'usuarios', uid, 'medicamentos', medicamentoId)
  return updateDoc(ref, { activo: false })
}