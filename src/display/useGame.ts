import { useCallback, useEffect, useRef, useState } from 'react'
import {
  advanceGame,
  interactWithResult,
  loadGame,
  saveGame,
  progressAction,
  LILA_POSITION,
  SHOP_POSITION,
  near,
  FISHING_POSITION,
  catchFish,
  type FishType,
  type ProgressAction,
  type GameState,
  type InteractionEvent,
  type InteractionResult,
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
    case 'message':
      return event.text
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
  target instanceof HTMLSelectElement

export interface GameControls {
  panel: 'lila' | 'shop' | 'inventory' | 'fishing' | null
  closePanel: () => void
  toggleInventory: () => void
  state: GameState
  message: string | null
  setRemoteMovement: (movement: MoveInput) => void
  clearRemoteMovement: () => void
  act: () => void
  progress: (action: ProgressAction) => void
  catchFish: (species: FishType) => boolean
}

export function useGame(enabled = true): GameControls {
  const [panel, setPanel] = useState<GameControls['panel']>(null)
  const closePanel = useCallback(() => setPanel(null), [])
  const toggleInventory = useCallback(() => setPanel(current => current === 'inventory' ? null : 'inventory'), [])
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
      messageTimer.current = window.setTimeout(() => setMessage(null), 6_000)
    }
  }, [])

  const commit = useCallback((result: InteractionResult) => {
    latestState.current = result.state
    setState(result.state)
    saveGame(result.state)
    showMessage(eventMessage(result.event))
  }, [showMessage])

  const act = useCallback(() => {
    if (panel) return
    const current = latestState.current
    if (current.scene === 'island' && near(current, LILA_POSITION)) { setPanel('lila'); return }
    if (current.scene === 'island' && near(current, SHOP_POSITION)) { setPanel('shop'); return }
    if (current.scene === 'island' && near(current, FISHING_POSITION)) {
      if (current.fishing.rodOwned) setPanel('fishing')
      else commit({ state: current, event: { type: 'message', text: 'Il te faut une canne à pêche du petit marché.' } })
      return
    }
    commit(interactWithResult(current))
  }, [commit, panel])

  const progress = useCallback((action: ProgressAction) => {
    commit(progressAction(latestState.current, action))
  }, [commit])

  const catchCaughtFish = useCallback((species: FishType) => {
    const previous = latestState.current
    const result = catchFish(previous, species)
    commit(result)
    return result.state !== previous
  }, [commit])

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
    if (!enabled) return
    const keys = pressedKeys.current
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'e' && !event.repeat) { event.preventDefault(); toggleInventory(); return }
      if (key === 'escape') { event.preventDefault(); closePanel(); return }
      if (panel) return

      if (key in MOVEMENT_KEYS) {
        event.preventDefault()
        pressedKeys.current.add(key)
      }

      if ((key === ' ' || key === 'enter') && !event.repeat && !(event.target instanceof HTMLButtonElement)) {
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
      keys.clear()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearKeyboard)
    }
  }, [act, enabled, panel, toggleInventory, closePanel])

  useEffect(() => {
    if (!enabled || panel) return
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
  }, [enabled, panel])

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

  return { state, message, panel, closePanel, toggleInventory, setRemoteMovement, clearRemoteMovement, act, progress, catchFish: catchCaughtFish }
}
