import { useCallback, useEffect, useRef, useState } from 'react'
import {
  advanceGame,
  interactWithResult,
  loadGame,
  saveGame,
  type GameState,
  type InteractionEvent,
  type MoveInput,
} from '../game'

const MOVEMENT_KEYS: Record<string, MoveInput> = {
  arrowleft: { x: -1, y: 0 },
  q: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  arrowup: { x: 0, y: -1 },
  z: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
}

const eventMessage = (event: InteractionEvent): string | null => {
  switch (event.type) {
    case 'collected':
      return `${event.item.name} ajouté à l’inventaire`
    case 'inventory-full':
      return 'Votre sac est plein'
    case 'entered-house':
      return 'Bienvenue à la maison'
    case 'left-house':
      return 'De retour au grand air'
    default:
      return 'Rien à faire juste ici… approchez-vous d’un objet ou de la porte'
  }
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLButtonElement

export interface GameControls {
  state: GameState
  message: string | null
  setRemoteMovement: (movement: MoveInput) => void
  clearRemoteMovement: () => void
  act: () => void
}

export function useGame(): GameControls {
  const [state, setState] = useState<GameState>(() => loadGame())
  const [message, setMessage] = useState<string | null>(null)
  const latestState = useRef(state)
  const pressedKeys = useRef(new Set<string>())
  const remoteMovement = useRef<MoveInput>({ x: 0, y: 0 })
  const remoteSafetyTimer = useRef<number | undefined>(undefined)
  const messageTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    latestState.current = state
  }, [state])

  const showMessage = useCallback((nextMessage: string | null) => {
    window.clearTimeout(messageTimer.current)
    setMessage(nextMessage)
    if (nextMessage) {
      messageTimer.current = window.setTimeout(() => setMessage(null), 2_600)
    }
  }, [])

  const act = useCallback(() => {
    setState((current) => {
      const result = interactWithResult(current)
      showMessage(eventMessage(result.event))
      return result.state
    })
  }, [showMessage])

  const clearRemoteMovement = useCallback(() => {
    remoteMovement.current = { x: 0, y: 0 }
    window.clearTimeout(remoteSafetyTimer.current)
  }, [])

  const setRemoteMovement = useCallback((movement: MoveInput) => {
    remoteMovement.current = movement
    window.clearTimeout(remoteSafetyTimer.current)
    remoteSafetyTimer.current = window.setTimeout(() => {
      remoteMovement.current = { x: 0, y: 0 }
    }, 350)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()

      if (key in MOVEMENT_KEYS) {
        event.preventDefault()
        pressedKeys.current.add(key)
      }

      if ((key === ' ' || key === 'enter') && !event.repeat) {
        event.preventDefault()
        act()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase())
    }

    const clearKeyboard = () => pressedKeys.current.clear()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearKeyboard)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearKeyboard)
    }
  }, [act])

  useEffect(() => {
    let frame = 0
    let previous = performance.now()

    const tick = (now: number) => {
      const deltaMs = Math.min(50, now - previous)
      previous = now
      const keyboard = [...pressedKeys.current].reduce<MoveInput>(
        (total, key) => {
          const input = MOVEMENT_KEYS[key]
          return input ? { x: total.x + input.x, y: total.y + input.y } : total
        },
        { x: 0, y: 0 },
      )
      const movement = {
        x: keyboard.x + remoteMovement.current.x,
        y: keyboard.y + remoteMovement.current.y,
      }
      setState((current) => advanceGame(current, movement, deltaMs))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const saveProgress = () => saveGame(latestState.current)
    const timer = window.setInterval(saveProgress, 1_000)
    const saveBeforeLeaving = () => saveProgress()
    window.addEventListener('pagehide', saveBeforeLeaving)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pagehide', saveBeforeLeaving)
    }
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(messageTimer.current)
      window.clearTimeout(remoteSafetyTimer.current)
    },
    [],
  )

  return { state, message, setRemoteMovement, clearRemoteMovement, act }
}
