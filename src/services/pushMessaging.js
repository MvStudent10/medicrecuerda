import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { app, db } from './firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

function buildServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  })

  return `/firebase-messaging-sw.js?${params.toString()}`
}

async function registrarServiceWorkerFcm() {
  const swUrl = buildServiceWorkerUrl()
  return navigator.serviceWorker.register(swUrl, {
    scope: '/firebase-cloud-messaging-push-scope',
  })
}

function esperarSwActivo(registration, timeoutMs = 12000) {
  if (registration.active) return Promise.resolve(registration)

  const worker = registration.installing || registration.waiting
  if (!worker) {
    return registration.update().then(() => {
      if (registration.active) return registration
      throw new Error('El Service Worker de notificaciones no se activó todavía.')
    })
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado activando Service Worker de notificaciones.'))
    }, timeoutMs)

    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        clearTimeout(timeoutId)
        resolve(registration)
      }
    })
  })
}

export async function activarPushRecordatorios(uid) {
  if (!uid) throw new Error('Se requiere uid para activar push.')
  if (!VAPID_KEY) throw new Error('Falta VITE_FIREBASE_VAPID_KEY en variables de entorno.')

  const soportado = await isSupported()
  if (!soportado) throw new Error('Este navegador no soporta Firebase Messaging.')

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado.')

  const registration = await registrarServiceWorkerFcm()
  await esperarSwActivo(registration)
  const messaging = getMessaging(app)

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  if (!token) throw new Error('No se pudo generar token de notificaciones push.')

  await setDoc(doc(db, 'usuarios', uid, 'notificaciones', 'fcm_web'), {
    token,
    activo: true,
    plataforma: 'web',
    actualizadoEn: serverTimestamp(),
  }, { merge: true })

  return token
}

export async function desactivarPushRecordatorios(uid) {
  if (!uid) return
  await setDoc(doc(db, 'usuarios', uid, 'notificaciones', 'fcm_web'), {
    activo: false,
    actualizadoEn: serverTimestamp(),
  }, { merge: true })
}

export async function escucharPushEnPrimerPlano(callback) {
  const soportado = await isSupported()
  if (!soportado) return () => {}

  const messaging = getMessaging(app)
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
