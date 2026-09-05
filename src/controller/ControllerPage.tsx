import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  SESSION_CODE_LENGTH,
  type ClientToServerEvents,
  type ProtocolError,
  type MovementInput,
  type ServerToClientEvents,
  type SessionStatus,
} from '../shared/protocol'
import './controller.css'

type ControllerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface ControllerPageProps {
  socketFactory?: () => ControllerSocket
}

type ConnectionState =
  | 'connecting'
  | 'ready'
  | 'joining'
  | 'connected'
  | 'disconnected'
  | 'error'

const ZERO_VECTOR: MovementInput = { x: 0, y: 0 }
const DEAD_ZONE = 0.14
const MOVE_INTERVAL_MS = 40
const MOVE_HEARTBEAT_MS = 120

const stateLabels: Record<ConnectionState, string> = {
  connecting: 'Connexion au serveur…',
  ready: 'Prête à être associée',
  joining: 'Association en cours…',
  connected: 'Manette connectée',
  disconnected: 'Connexion perdue, reconnexion…',
  error: 'Connexion impossible',
}

function codeFromLocation() {
  if (typeof window === 'undefined') return ''

  return new URLSearchParams(window.location.search)
    .get('code')
    ?.replace(/\D/g, '')
    .slice(0, SESSION_CODE_LENGTH) ?? ''
}

function makeSocket(): ControllerSocket {
  return io({ autoConnect: false }) as ControllerSocket
}

function boundedVector(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): MovementInput {
  const radius = Math.max(Math.min(bounds.width, bounds.height) / 2, 1)
  const x = (clientX - (bounds.left + bounds.width / 2)) / radius
  const y = (clientY - (bounds.top + bounds.height / 2)) / radius
  const magnitude = Math.hypot(x, y)

  if (magnitude <= DEAD_ZONE) return ZERO_VECTOR

  const strength = Math.min(1, (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE))
  const scale = strength / magnitude

  return {
    x: Number((x * scale).toFixed(3)),
    y: Number((y * scale).toFixed(3)),
  }
}

export function ControllerPage({ socketFactory }: ControllerPageProps) {
  const [code, setCode] = useState(codeFromLocation)
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [vector, setVector] = useState<MovementInput>(ZERO_VECTOR)

  const socketRef = useRef<ControllerSocket | null>(null)
  const pairedRef = useRef(false)
  const joinedCodeRef = useRef<string | null>(null)
  const pendingCodeRef = useRef<string | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const joystickRef = useRef<HTMLDivElement | null>(null)
  const pressedKeysRef = useRef(new Set<string>())
  const lastMoveAtRef = useRef(0)
  const pendingMoveRef = useRef<MovementInput | null>(null)
  const moveTimerRef = useRef<number | null>(null)

  const cancelQueuedMove = useCallback(() => {
    pendingMoveRef.current = null
    if (moveTimerRef.current !== null) {
      window.clearTimeout(moveTimerRef.current)
      moveTimerRef.current = null
    }
  }, [])

  const sendVector = useCallback(
    (nextVector: MovementInput) => {
      setVector(nextVector)

      const socket = socketRef.current
      if (!pairedRef.current || !socket?.connected) return

      const now = performance.now()
      const elapsed = now - lastMoveAtRef.current

      if (elapsed >= MOVE_INTERVAL_MS && moveTimerRef.current === null) {
        socket.emit('controller:move', nextVector)
        lastMoveAtRef.current = now
        return
      }

      pendingMoveRef.current = nextVector
      if (moveTimerRef.current !== null) return

      moveTimerRef.current = window.setTimeout(
        () => {
          moveTimerRef.current = null
          const latestVector = pendingMoveRef.current
          pendingMoveRef.current = null
          const currentSocket = socketRef.current

          if (latestVector && pairedRef.current && currentSocket?.connected) {
            currentSocket.emit('controller:move', latestVector)
            lastMoveAtRef.current = performance.now()
          }
        },
        Math.max(0, MOVE_INTERVAL_MS - elapsed),
      )
    },
    [],
  )

  const resetJoystick = useCallback(
    (emitNeutral = true) => {
      activePointerRef.current = null
      pressedKeysRef.current.clear()
      cancelQueuedMove()
      setVector(ZERO_VECTOR)

      const socket = socketRef.current
      if (emitNeutral && pairedRef.current && socket?.connected) {
        socket.emit('controller:move', ZERO_VECTOR)
        lastMoveAtRef.current = performance.now()
      }
    },
    [cancelQueuedMove],
  )

  const joinSession = useCallback((sessionCode: string) => {
    const socket = socketRef.current

    if (!socket?.connected) {
      pendingCodeRef.current = sessionCode
      setConnectionState('connecting')
      socket?.connect()
      return
    }

    pendingCodeRef.current = null
    setConnectionState('joining')
    setErrorMessage(null)

    socket.emit('controller:join-session', { code: sessionCode }, (result) => {
      if (!result.ok) {
        pairedRef.current = false
        joinedCodeRef.current = null
        setConnectionState('error')
        setErrorMessage(result.error)
        return
      }

      pairedRef.current = true
      joinedCodeRef.current = result.code
      setCode(result.code)
      setConnectionState('connected')
    })
  }, [])

  useEffect(() => {
    const socket = socketFactory?.() ?? makeSocket()
    socketRef.current = socket

    const handleConnect = () => {
      const sessionCode = pendingCodeRef.current ?? joinedCodeRef.current
      if (sessionCode) {
        joinSession(sessionCode)
      } else {
        setConnectionState('ready')
        setErrorMessage(null)
      }
    }

    const handleDisconnect = () => {
      pairedRef.current = false
      resetJoystick(false)
      setConnectionState('disconnected')
    }

    const handleConnectError = () => {
      pairedRef.current = false
      resetJoystick(false)
      setConnectionState('error')
      setErrorMessage('Le serveur est injoignable pour le moment.')
    }

    const handleSessionStatus = (sessionStatus: SessionStatus) => {
      if (sessionStatus.controllerConnected) {
        pairedRef.current = true
        setConnectionState('connected')
        setErrorMessage(null)
      } else {
        pairedRef.current = false
        resetJoystick(false)
        setConnectionState(socket.connected ? 'ready' : 'disconnected')
      }
    }

    const handleSessionError = ({ message }: ProtocolError) => {
      pairedRef.current = false
      resetJoystick(false)
      setConnectionState('error')
      setErrorMessage(message)
    }

    const handleWindowBlur = () => {
      const pointerId = activePointerRef.current
      const joystick = joystickRef.current
      activePointerRef.current = null

      if (pointerId !== null && joystick?.hasPointerCapture(pointerId)) {
        joystick.releasePointerCapture(pointerId)
      }
      resetJoystick(true)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('session:status', handleSessionStatus)
    socket.on('session:error', handleSessionError)
    window.addEventListener('blur', handleWindowBlur)

    if (socket.connected) {
      handleConnect()
    } else {
      socket.connect()
    }

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('session:status', handleSessionStatus)
      socket.off('session:error', handleSessionError)
      cancelQueuedMove()
      if (pairedRef.current && socket.connected) {
        socket.emit('controller:move', ZERO_VECTOR)
      }
      pairedRef.current = false
      socket.disconnect()
      socketRef.current = null
    }
  }, [cancelQueuedMove, joinSession, resetJoystick, socketFactory])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedCode = code
      .replace(/\D/g, '')
      .slice(0, SESSION_CODE_LENGTH)
    setCode(normalizedCode)

    if (normalizedCode.length !== SESSION_CODE_LENGTH) {
      setConnectionState('error')
      setErrorMessage('Saisissez les six chiffres affichés sur le PC.')
      return
    }

    joinSession(normalizedCode)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pairedRef.current || activePointerRef.current !== null) return

    event.preventDefault()
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    sendVector(
      boundedVector(
        event.clientX,
        event.clientY,
        event.currentTarget.getBoundingClientRect(),
      ),
    )
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return

    event.preventDefault()
    sendVector(
      boundedVector(
        event.clientX,
        event.clientY,
        event.currentTarget.getBoundingClientRect(),
      ),
    )
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return

    event.preventDefault()
    activePointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    resetJoystick(true)
  }

  const handleLostPointerCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (activePointerRef.current !== event.pointerId) return
    resetJoystick(true)
  }

  const updateKeyboardVector = (event: KeyboardEvent<HTMLDivElement>) => {
    const pressed = pressedKeysRef.current
    const left = pressed.has('arrowleft') || pressed.has('a') || pressed.has('q')
    const right = pressed.has('arrowright') || pressed.has('d')
    const up = pressed.has('arrowup') || pressed.has('w') || pressed.has('z')
    const down = pressed.has('arrowdown') || pressed.has('s')
    const x = Number(right) - Number(left)
    const y = Number(down) - Number(up)
    const magnitude = Math.hypot(x, y)

    if (magnitude === 0) {
      resetJoystick(true)
    } else {
      sendVector({ x: x / magnitude, y: y / magnitude })
    }

    event.preventDefault()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!pairedRef.current || event.repeat) return
    const key = event.key.toLowerCase()
    const movementKeys = [
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'a',
      'd',
      'q',
      's',
      'w',
      'z',
    ]
    if (!movementKeys.includes(key)) return

    pressedKeysRef.current.add(key)
    updateKeyboardVector(event)
  }

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase()
    if (!pressedKeysRef.current.delete(key)) return
    updateKeyboardVector(event)
  }

  const triggerAction = () => {
    const socket = socketRef.current
    if (!pairedRef.current || !socket?.connected) return

    socket.emit('controller:action')
    navigator.vibrate?.(18)
  }

  const isConnected = connectionState === 'connected'

  useEffect(() => {
    if (!isConnected || (vector.x === 0 && vector.y === 0)) return

    const heartbeat = window.setInterval(() => {
      const socket = socketRef.current
      if (pairedRef.current && socket?.connected) {
        socket.emit('controller:move', vector)
        lastMoveAtRef.current = performance.now()
      }
    }, MOVE_HEARTBEAT_MS)

    return () => window.clearInterval(heartbeat)
  }, [isConnected, vector])

  const joystickStyle = {
    '--stick-x': `${50 + vector.x * 31}%`,
    '--stick-y': `${50 + vector.y * 31}%`,
  } as CSSProperties

  return (
    <main className="controller-page">
      <header className="controller-header">
        <div className="controller-brand">
          <span className="controller-brand__mark" aria-hidden="true">
            ◉
          </span>
          <div>
            <p className="controller-eyebrow">Petite Île</p>
            <h1>Manette mobile</h1>
          </div>
        </div>
        <div
          className={`controller-status controller-status--${connectionState}`}
          role="status"
          aria-live="polite"
        >
          <span className="controller-status__dot" aria-hidden="true" />
          <span>{stateLabels[connectionState]}</span>
        </div>
      </header>

      {!isConnected ? (
        <section className="controller-pairing" aria-labelledby="pairing-title">
          <div className="controller-pairing__icon" aria-hidden="true">
            6×
          </div>
          <h2 id="pairing-title">Associer cette manette</h2>
          <p>
            Saisissez le code à six chiffres visible sur l’écran du jeu.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="session-code">Code de connexion</label>
            <input
              id="session-code"
              name="code"
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, SESSION_CODE_LENGTH),
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              enterKeyHint="go"
              pattern="[0-9]{6}"
              maxLength={SESSION_CODE_LENGTH}
              placeholder="000000"
              aria-describedby="code-help"
              aria-invalid={connectionState === 'error'}
              autoFocus
            />
            <span id="code-help" className="controller-pairing__hint">
              {code.length}/6 chiffres
            </span>
            {errorMessage ? (
              <p className="controller-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className="controller-connect-button"
              disabled={
                code.length !== SESSION_CODE_LENGTH ||
                connectionState === 'joining'
              }
            >
              {connectionState === 'joining'
                ? 'Association…'
                : 'Connecter la manette'}
            </button>
          </form>
        </section>
      ) : (
        <section className="controller-controls" aria-labelledby="controls-title">
          <div className="controller-session">
            <span>Session</span>
            <strong>{code}</strong>
          </div>
          <h2 id="controls-title" className="controller-sr-only">
            Commandes de jeu
          </h2>

          <div className="controller-controls__layout">
            <div className="controller-stick-block">
              <p id="joystick-help">Déplacer</p>
              <div
                ref={joystickRef}
                className="controller-stick"
                style={joystickStyle}
                role="group"
                tabIndex={0}
                aria-label="Joystick de déplacement"
                aria-roledescription="joystick"
                aria-describedby="joystick-instructions"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
                onLostPointerCapture={handleLostPointerCapture}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onBlur={() => resetJoystick(true)}
              >
                <span className="controller-stick__rings" aria-hidden="true" />
                <span className="controller-stick__thumb" aria-hidden="true">
                  <span />
                </span>
              </div>
              <span id="joystick-instructions" className="controller-sr-only">
                Faites glisser le joystick ou utilisez les flèches du clavier.
              </span>
            </div>

            <div className="controller-action-block">
              <p>Interagir</p>
              <button
                type="button"
                className="controller-action-button"
                aria-label="Effectuer une action"
                onPointerDown={(event) => {
                  event.preventDefault()
                  triggerAction()
                }}
                onClick={(event) => {
                  if (event.detail === 0) triggerAction()
                }}
              >
                <span aria-hidden="true">A</span>
                <small>Action</small>
              </button>
            </div>
          </div>

          <p className="controller-safety-note">
            Gardez cette page ouverte pendant la partie.
          </p>
        </section>
      )}
    </main>
  )
}

export default ControllerPage
