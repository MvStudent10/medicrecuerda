import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { app, db } from './firebase'

const VAPID_KEY = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '')
  .trim()
  .replace(/^['"]|['"]$/g, '')

const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope/'
const PUSH_SW_PATH = '/firebase-messaging-sw.js'

function esVapidKeyValida(key) {
  // Firebase entrega la clave publica VAPID en base64url (sin '='), normalmente ~87 chars.
  return /^[A-Za-z0-9_-]{80,120}$/.test(key)
}

function describirErrorPush(error) {
  const texto = `${error?.code || ''} ${error?.message || ''}`.toLowerCase()

  if (texto.includes('push service error')) {
    return 'El navegador rechazo la suscripcion push. Verifica que la VAPID key corresponda al mismo proyecto de Firebase y vuelve a intentar.'
  }

  if (texto.includes('registration') || texto.includes('service worker')) {
    return 'No se pudo registrar el Service Worker de notificaciones. Revisa que la app se esté ejecutando en HTTPS o localhost y vuelve a intentar.'
  }

  if (texto.includes('permission')) {
    return 'El navegador bloqueo la suscripcion push. Activa los permisos de notificaciones e intenta otra vez.'
  }

  return 'No se pudo activar push. Revisa la consola del navegador para más detalle.'
}

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

async function limpiarServiceWorkersPushObsoletos() {
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || ''
        return scriptUrl.includes(PUSH_SW_PATH) || registration.scope.includes(PUSH_SW_SCOPE)
      })
      .map((registration) => registration.unregister())
  )
}

async function registrarServiceWorkerFcm() {
  const swUrl = buildServiceWorkerUrl()
  try {
    return await navigator.serviceWorker.register(swUrl, {
      scope: PUSH_SW_SCOPE,
      updateViaCache: 'none',
    })
  } catch (error) {
    await limpiarServiceWorkersPushObsoletos()
    return navigator.serviceWorker.register(swUrl, {
      scope: PUSH_SW_SCOPE,
      updateViaCache: 'none',
    })
  }
}

function esperarSwActivo(registration, timeoutMs = 12000) {
  if (registration.active) {
    console.log('[FCM] SW ya estaba activo')
    return Promise.resolve(registration)
  }

  const worker = registration.installing || registration.waiting
  console.log('[FCM] Estado del worker:', worker?.state)

  if (!worker) {
    return registration.update().then(() => {
      if (registration.active) return registration
      throw new Error('El Service Worker de notificaciones no se activó todavía.')
    })
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.log('[FCM] Timeout - estado final del worker:', worker.state)
      reject(new Error('Tiempo de espera agotado activando Service Worker de notificaciones.'))
    }, timeoutMs)

    worker.addEventListener('statechange', () => {
      console.log('[FCM] statechange ->', worker.state)
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
  if (!esVapidKeyValida(VAPID_KEY)) {
    throw new Error('VITE_FIREBASE_VAPID_KEY es invalida. Usa la clave publica Web Push (VAPID) de Firebase Cloud Messaging.')
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Push requiere HTTPS o localhost. Abre la app en un contexto seguro e intenta de nuevo.')
  }

  const soportado = await isSupported()
  if (!soportado) throw new Error('Este navegador no soporta Firebase Messaging.')

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado.')

  const messaging = getMessaging(app)
  await deleteToken(messaging).catch(() => {})

  const registration = await registrarServiceWorkerFcm()
  await esperarSwActivo(registration)

  let token
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
  } catch (error) {
    await limpiarServiceWorkersPushObsoletos()
    const retryRegistration = await registrarServiceWorkerFcm()
    await esperarSwActivo(retryRegistration)
    try {
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: retryRegistration,
      })
    } catch (retryError) {
      throw new Error(describirErrorPush(retryError))
    }
  }

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
