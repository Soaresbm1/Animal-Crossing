import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  MoveInput,
  ServerToClientEvents,
} from '../shared/protocol'

type DisplaySocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface DisplaySession {
  code: string | null
  serverConnected: boolean
  controllerConnected: boolean
  error: string | null
}

export function useDisplaySession(
  onMove: (movement: MoveInput) => void,
  onAction: () => void,
  onControllerGone: () => void,
): DisplaySession {
  const [session, setSession] = useState<DisplaySession>({
    code: null,
    serverConnected: false,
    controllerConnected: false,
    error: null,
  })
  useEffect(() => {
    const socket: DisplaySocket = io({ autoConnect: true })

    const createSession = () => {
      setSession((current) => ({ ...current, serverConnected: true, error: null }))
      socket.emit('screen:create-session', (response) => {
        if (response.ok) {
          setSession({
            code: response.code,
            serverConnected: true,
            controllerConnected: false,
            error: null,
          })
        } else {
          setSession((current) => ({ ...current, error: response.error }))
        }
      })
    }

    socket.on('connect', createSession)
    socket.on('disconnect', () => {
      onControllerGone()
      setSession((current) => ({
        ...current,
        serverConnected: false,
        controllerConnected: false,
      }))
    })
    socket.on('session:status', ({ controllerConnected }) => {
      if (!controllerConnected) onControllerGone()
      setSession((current) => ({ ...current, controllerConnected }))
    })
    socket.on('session:error', ({ message }) => {
      setSession((current) => ({ ...current, error: message }))
    })
    socket.on('input:move', (movement) => onMove(movement))
    socket.on('input:action', () => onAction())

    return () => {
      socket.disconnect()
    }
  }, [onAction, onControllerGone, onMove])

  return session
}
