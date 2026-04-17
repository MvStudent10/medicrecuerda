/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js')

const swUrl = new URL(self.location.href)
const p = swUrl.searchParams

const firebaseConfig = {
  apiKey: p.get('apiKey') || '',
  authDomain: p.get('authDomain') || '',
  projectId: p.get('projectId') || '',
  storageBucket: p.get('storageBucket') || '',
  messagingSenderId: p.get('messagingSenderId') || '',
  appId: p.get('appId') || '',
  measurementId: p.get('measurementId') || '',
}

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig)

  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || 'MedicRecuerda'
    const options = {
      body: payload?.notification?.body || 'Tienes un recordatorio de medicamento.',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: payload?.data || {},
    }

    self.registration.showNotification(title, options)
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' })
    if (allClients.length > 0) {
      allClients[0].focus()
      return
    }

    clients.openWindow('/')
  })())
})
