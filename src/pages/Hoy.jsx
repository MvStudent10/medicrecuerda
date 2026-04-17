import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMedicamentos } from '../hooks/useMedicamentos'
import { suscribirTomasDelDia, marcarComoTomado, marcarComoOmitido } from '../services/tomas'
import {
  activarPushRecordatorios,
  desactivarPushRecordatorios,
  escucharPushEnPrimerPlano,
} from '../services/pushMessaging'
import { calcularTomasDelDia } from '../utils/calcularTomas'
import { getFechaHoy, getHoraActual } from '../utils/fecha'

const ALERTAS_MINUTOS_ANTES = 30

export default function Hoy() {
  const { user } = useAuth()
  const { medicamentos, cargando } = useMedicamentos()
  const [tomasRegistradas, setTomasRegistradas] = useState({})
  const [marcando, setMarcando] = useState(null)
  const [modalToma, setModalToma] = useState(null)
  const [confirmarOmitirToma, setConfirmarOmitirToma] = useState(null)
  const [horaRealInput, setHoraRealInput] = useState('')
  const [confirmarPasadas, setConfirmarPasadas] = useState(null)
  const [horaConfirmacionPasadas, setHoraConfirmacionPasadas] = useState(getHoraActual())
  const [permisoNotificaciones, setPermisoNotificaciones] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [alertasActivas, setAlertasActivas] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('alertasMedicRecuerda') === 'true'
  })
  const [pushActivo, setPushActivo] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pushMedicRecuerda') === 'true'
  })
  const [estadoPush, setEstadoPush] = useState('')
  const alertasEnviadasRef = useRef(new Set())

  const fecha = getFechaHoy()
  const horaActual = getHoraActual()

  const convertirHoraAMinutos = (hora) => {
    const [h, m] = hora.split(':').map(Number)
    return h * 60 + m
  }

  const reproducirAlertaSonora = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.03

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      setTimeout(() => {
        osc.stop()
        ctx.close()
      }, 250)
    } catch (err) {
      console.error('No se pudo reproducir sonido de alerta', err)
    }
  }, [])

  const mostrarNotificacion = useCallback(async (titulo, cuerpo) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(titulo, {
          body: cuerpo,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'medicrecuerda-recordatorio',
          renotify: true,
        })
      } else {
        new Notification(titulo, { body: cuerpo })
      }
    } catch (err) {
      console.error('No se pudo mostrar notificación', err)
    }

    reproducirAlertaSonora()
  }, [reproducirAlertaSonora])

  const activarNotificaciones = async () => {
    if (!('Notification' in window)) return
    const permiso = await Notification.requestPermission()
    setPermisoNotificaciones(permiso)

    if (permiso === 'granted') {
      setAlertasActivas(true)
      localStorage.setItem('alertasMedicRecuerda', 'true')
      await mostrarNotificacion('Recordatorios activados', 'Te avisaremos cuando una toma esté próxima o sea momento de tomarla.')
    }
  }

  const desactivarNotificaciones = () => {
    setAlertasActivas(false)
    localStorage.setItem('alertasMedicRecuerda', 'false')
  }

  const activarPush = async () => {
    if (!user) return
    setEstadoPush('Activando push...')
    try {
      await activarPushRecordatorios(user.uid)
      setPushActivo(true)
      localStorage.setItem('pushMedicRecuerda', 'true')
      setEstadoPush('Push en segundo plano activado.')
    } catch (err) {
      console.error(err)
      setEstadoPush(err.message || 'No se pudo activar push.')
    }
  }

  const desactivarPush = async () => {
    if (!user) return
    try {
      await desactivarPushRecordatorios(user.uid)
      setPushActivo(false)
      localStorage.setItem('pushMedicRecuerda', 'false')
      setEstadoPush('Push en segundo plano desactivado.')
    } catch (err) {
      console.error(err)
      setEstadoPush('No se pudo desactivar push.')
    }
  }

  useEffect(() => {
    if (!user) return
    const unsub = suscribirTomasDelDia(user.uid, fecha, (datos) => {
      setTomasRegistradas(datos)
    })
    return () => unsub()
  }, [user, fecha])

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermisoNotificaciones(Notification.permission)
  }, [])

  useEffect(() => {
    let unsub = () => {}

    const init = async () => {
      unsub = await escucharPushEnPrimerPlano(async (payload) => {
        const title = payload?.notification?.title || 'MedicRecuerda'
        const body = payload?.notification?.body || 'Tienes un recordatorio de medicamento.'
        await mostrarNotificacion(title, body)
      })
    }

    init()
    return () => unsub()
  }, [mostrarNotificacion])

  const tomasDelDia = calcularTomasDelDia(medicamentos, fecha, tomasRegistradas)

  const tomaId = (toma) =>
    `${toma.medicamentoId}_${toma.fechaProgramada}_${toma.horaProgramada.replace(':', '')}`

  const esTomado = (toma) => tomasRegistradas[tomaId(toma)]?.tomado === true
  const esOmitido = (toma) => tomasRegistradas[tomaId(toma)]?.omitido === true
  const esResuelto = (toma) => esTomado(toma) || esOmitido(toma)

  const pendientes = tomasDelDia.filter((t) => !esResuelto(t))
  const completadas = tomasDelDia.filter((t) => esTomado(t))
  const omitidas = tomasDelDia.filter((t) => esOmitido(t))
  const resueltas = tomasDelDia.filter((t) => esResuelto(t))

  // Tomas pasadas sin confirmar
  const tomasPasadasSinConfirmar = pendientes.filter(
    (t) => t.horaProgramada < horaActual
  )

  const primeraPendienteVencida =
    pendientes.length > 0 && pendientes[0].horaProgramada < horaActual
      ? pendientes[0]
      : null

  useEffect(() => {
    if (!alertasActivas || permisoNotificaciones !== 'granted') return

    const revisarYNotificar = async () => {
      const ahora = new Date()
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes()

      for (const toma of pendientes) {
        const minutosToma = convertirHoraAMinutos(toma.horaProgramada)
        const diff = minutosToma - minutosActuales
        const idBase = `${fecha}_${tomaId(toma)}`

        const esProxima = diff <= ALERTAS_MINUTOS_ANTES && diff >= ALERTAS_MINUTOS_ANTES - 1
        if (esProxima) {
          const clave = `${idBase}_proxima`
          if (!alertasEnviadasRef.current.has(clave)) {
            alertasEnviadasRef.current.add(clave)
            await mostrarNotificacion(
              'Toma próxima',
              `${toma.medicamentoNombre}: en ${ALERTAS_MINUTOS_ANTES} minutos (${toma.horaProgramada}).`
            )
          }
        }

        const esMomento = diff <= 0 && diff >= -1
        if (esMomento) {
          const clave = `${idBase}_momento`
          if (!alertasEnviadasRef.current.has(clave)) {
            alertasEnviadasRef.current.add(clave)
            await mostrarNotificacion(
              'Es momento de tu toma',
              `${toma.medicamentoNombre} (${toma.dosis}) programado para ${toma.horaProgramada}.`
            )
          }
        }
      }
    }

    revisarYNotificar()
    const intervalId = setInterval(revisarYNotificar, 30000)
    return () => clearInterval(intervalId)
  }, [alertasActivas, permisoNotificaciones, pendientes, fecha, mostrarNotificacion])

  useEffect(() => {
    alertasEnviadasRef.current.clear()
  }, [fecha])

  const abrirModalMarcar = (toma) => {
    setModalToma(toma)
    setHoraRealInput(horaActual)
  }

  const handleMarcar = async () => {
    if (!modalToma) return
    setMarcando(modalToma.medicamentoId + modalToma.horaProgramada)
    try {
      await marcarComoTomado(user.uid, modalToma, horaRealInput)
      setModalToma(null)
    } catch (err) {
      console.error(err)
    } finally {
      setMarcando(null)
    }
  }

  const confirmarOmitir = (toma) => {
    const tomaObjetivo = toma || modalToma
    if (!tomaObjetivo) return
    setConfirmarOmitirToma(tomaObjetivo)
  }

  const handleOmitir = async () => {
    const tomaObjetivo = confirmarOmitirToma
    if (!tomaObjetivo) return
    const clave = tomaObjetivo.medicamentoId + tomaObjetivo.horaProgramada
    setMarcando(clave)
    try {
      await marcarComoOmitido(user.uid, tomaObjetivo)
      if (modalToma && tomaObjetivo === modalToma) {
        setModalToma(null)
      }
      setConfirmarOmitirToma(null)
    } catch (err) {
      console.error(err)
    } finally {
      setMarcando(null)
    }
  }

  const handleConfirmarPasadas = async (siLasTomo) => {
    if (siLasTomo) {
      for (const toma of tomasPasadasSinConfirmar) {
        await marcarComoTomado(user.uid, toma, horaConfirmacionPasadas || toma.horaProgramada)
      }
    } else {
      for (const toma of tomasPasadasSinConfirmar) {
        await marcarComoOmitido(user.uid, toma)
      }
    }
    setConfirmarPasadas(false)
  }

  // Índice de la primera toma pendiente (para bloqueo)
  const indicePrimeraNoTomada = 0

  if (cargando) {
    return <p className="text-center text-gray-400 py-12">Cargando...</p>
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👋 Hoy</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>
      </div>

      {/* Control de notificaciones */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-6">
        <p className="text-sm font-semibold text-indigo-800 mb-1">🔔 Recordatorios inteligentes</p>
        <p className="text-xs text-indigo-700 mb-3">
          Te avisamos 30 minutos antes y justo cuando sea momento de tu toma, con sonido incluido.
        </p>

        {permisoNotificaciones === 'denied' ? (
          <p className="text-xs text-red-600 font-medium">
            Tienes las notificaciones bloqueadas en el navegador. Actívalas en la configuración del sitio.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
            {!alertasActivas || permisoNotificaciones !== 'granted' ? (
              <button
                onClick={activarNotificaciones}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                Activar notificaciones
              </button>
            ) : (
              <button
                onClick={desactivarNotificaciones}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
              >
                Desactivar notificaciones
              </button>
            )}
            <button
              onClick={reproducirAlertaSonora}
              className="flex-1 bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              Probar sonido
            </button>
            </div>

            <div className="flex gap-2">
              {!pushActivo ? (
                <button
                  onClick={activarPush}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
                >
                  Activar push en segundo plano
                </button>
              ) : (
                <button
                  onClick={desactivarPush}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
                >
                  Desactivar push en segundo plano
                </button>
              )}
            </div>

            {estadoPush && (
              <p className="text-xs font-medium text-indigo-800">{estadoPush}</p>
            )}
          </div>
        )}
      </div>

      {/* Banner tomas pasadas sin confirmar */}
      {tomasPasadasSinConfirmar.length > 0 && confirmarPasadas !== false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="font-semibold text-amber-800 mb-1">
            ⚠️ Tienes {tomasPasadasSinConfirmar.length} toma{tomasPasadasSinConfirmar.length > 1 ? 's' : ''} sin confirmar
          </p>
          <p className="text-sm text-amber-700 mb-3">
            ¿Las tomaste?
          </p>
          <label className="block text-xs font-medium text-amber-800 mb-1">
            Hora aproximada para registrarlas
          </label>
          <input
            type="time"
            value={horaConfirmacionPasadas}
            onChange={(e) => setHoraConfirmacionPasadas(e.target.value)}
            className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-center mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirmarPasadas(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              Sí, las tomé
            </button>
            <button
              onClick={() => handleConfirmarPasadas(false)}
              className="flex-1 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
            >
              No las tomé
            </button>
          </div>
        </div>
      )}

      {/* Acción rápida */}
      {primeraPendienteVencida && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-red-700 font-semibold mb-1">⚡ Acción rápida</p>
          <p className="text-sm text-red-700 mb-3">
            Tienes una toma vencida: {primeraPendienteVencida.medicamentoNombre} ({primeraPendienteVencida.horaProgramada})
          </p>
          <button
            onClick={() => abrirModalMarcar(primeraPendienteVencida)}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-3 rounded-lg transition-colors"
          >
            Marcar ahora
          </button>
        </div>
      )}

      {/* Progreso del día */}
      {tomasDelDia.length > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700">Progreso de hoy</span>
            <span className="text-sm font-bold text-blue-700">
              {resueltas.length}/{tomasDelDia.length}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(resueltas.length / tomasDelDia.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Tomadas: {completadas.length} · Omitidas: {omitidas.length}
          </p>
        </div>
      )}

      {/* Sin medicamentos */}
      {tomasDelDia.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-gray-500">No tienes tomas programadas para hoy.</p>
          <p className="text-gray-400 text-sm mt-1">Agrega medicamentos en la sección 💊</p>
        </div>
      )}

      {/* Tomas pendientes */}
      {pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pendientes
          </h2>
          <div className="space-y-3">
            {pendientes.map((toma, index) => {
              const esPasada = toma.horaProgramada < horaActual
              const estaBloqueada = index > indicePrimeraNoTomada
              const claveMarcando = toma.medicamentoId + toma.horaProgramada

              return (
                <div
                  key={tomaId(toma)}
                  className={`rounded-2xl shadow-sm border p-4 flex items-center justify-between transition-all
                    ${esPasada ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}
                    ${estaBloqueada ? 'opacity-40' : ''}
                  `}
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-base">{toma.medicamentoNombre}</p>
                    <p className="text-sm font-medium text-gray-600 mt-0.5">{toma.dosis}</p>
                    <p className={`text-sm mt-1 font-semibold ${esPasada ? 'text-red-500' : 'text-yellow-600'}`}>
                      {esPasada ? '⚠️ Atrasada' : '🕐 Pendiente'} · {toma.horaProgramada}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-28">
                    <button
                      onClick={() => !estaBloqueada && abrirModalMarcar(toma)}
                      disabled={marcando === claveMarcando || estaBloqueada}
                      className={`text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors
                        ${estaBloqueada ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'}
                      `}
                    >
                      {marcando === claveMarcando ? '...' : estaBloqueada ? '🔒' : 'Tomado ✓'}
                    </button>
                    <button
                      onClick={() => !estaBloqueada && confirmarOmitir(toma)}
                      disabled={marcando === claveMarcando || estaBloqueada}
                      className={`text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors
                        ${estaBloqueada ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300'}
                      `}
                    >
                      Omitir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tomas omitidas */}
      {omitidas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Omitidas
          </h2>
          <div className="space-y-3">
            {omitidas.map((toma) => (
              <div
                key={tomaId(toma)}
                className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-700 text-base">{toma.medicamentoNombre}</p>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{toma.dosis}</p>
                  <p className="text-sm mt-1 text-gray-600 font-semibold">
                    ⏭️ Omitida · {toma.horaProgramada}
                  </p>
                </div>
                <span className="text-xl">⏭️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tomas completadas */}
      {completadas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Completadas
          </h2>
          <div className="space-y-3">
            {completadas.map((toma) => {
              const horaReal = tomasRegistradas[tomaId(toma)]?.horaReal
              return (
                <div
                  key={tomaId(toma)}
                  className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-700 text-base">{toma.medicamentoNombre}</p>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">{toma.dosis}</p>
                    <p className="text-sm mt-1 text-green-600 font-semibold">
                      ✅ Tomada a las {horaReal || toma.horaProgramada}
                    </p>
                  </div>
                  <span className="text-2xl">✓</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal confirmar hora real */}
      {modalToma && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setModalToma(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-800 text-lg mb-1">
              ✅ Marcar como tomado
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {modalToma.medicamentoNombre} · {modalToma.dosis}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿A qué hora lo tomaste?
            </label>
            <input
              type="time"
              value={horaRealInput}
              onChange={(e) => setHoraRealInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={handleMarcar}
                disabled={marcando !== null}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {marcando !== null ? 'Guardando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => confirmarOmitir()}
                disabled={marcando !== null}
                className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                No la tomé
              </button>
              <button
                onClick={() => setModalToma(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar omitir */}
      {confirmarOmitirToma && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          onClick={() => setConfirmarOmitirToma(null)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border-2 border-red-300"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-red-700 mb-2">Confirmación importante</p>
            <p className="text-lg font-semibold text-gray-800 mb-1">
              ¿Seguro que deseas
            </p>
            <p className="text-4xl font-black tracking-wide text-center mb-2 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 bg-clip-text text-transparent">
              OMITIR
            </p>
            <p className="text-lg font-semibold text-gray-800 mb-2">esta dosis?</p>
            <p className="text-sm text-gray-600 mb-5">
              {confirmarOmitirToma.medicamentoNombre} · {confirmarOmitirToma.dosis} · {confirmarOmitirToma.horaProgramada}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleOmitir}
                disabled={marcando !== null}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {marcando !== null ? 'Guardando...' : 'Sí, OMITIR'}
              </button>
              <button
                onClick={() => setConfirmarOmitirToma(null)}
                disabled={marcando !== null}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                No, volver
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}