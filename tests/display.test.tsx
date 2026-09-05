import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DisplayPage } from '../src/display/DisplayPage'
import {
  EXTERIOR_DOOR_POSITION,
  SAVE_KEY,
  createInitialGameState,
  encodeGameState,
} from '../src/game'

const dependencyMocks = vi.hoisted(() => ({
  io: vi.fn(),
  toDataURL: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: dependencyMocks.io,
}))

vi.mock('qrcode', () => ({
  default: { toDataURL: dependencyMocks.toDataURL },
}))

type EventHandler = (...arguments_: unknown[]) => void

function createDisplaySocket() {
  const handlers = new Map<string, Set<EventHandler>>()

  const socket = {
    on: vi.fn((event: string, handler: EventHandler) => {
      const eventHandlers = handlers.get(event) ?? new Set<EventHandler>()
      eventHandlers.add(handler)
      handlers.set(event, eventHandlers)

      if (event === 'connect') queueMicrotask(() => handler())
      return socket
    }),
    emit: vi.fn((event: string, ...arguments_: unknown[]) => {
      if (event === 'screen:create-session') {
        const acknowledge = arguments_[0] as (
          response: { ok: true; code: string },
        ) => void
        acknowledge({ ok: true, code: '731942' })
      }
      return socket
    }),
    disconnect: vi.fn(),
  }

  return socket
}

async function renderStartedGame() {
  const user = userEvent.setup()
  render(<DisplayPage />)
  await user.click(screen.getByRole('button', { name: /explorer l’île/i }))
  return user
}

describe('DisplayPage', () => {
  beforeEach(() => {
    localStorage.clear()
    dependencyMocks.io.mockReset()
    dependencyMocks.io.mockImplementation(() => createDisplaySocket())
    dependencyMocks.toDataURL.mockReset()
    dependencyMocks.toDataURL.mockResolvedValue(
      'data:image/png;base64,qr-code-de-test',
    )
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('passe de l’accueil au monde et expose ses éléments principaux', async () => {
    render(<DisplayPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /petite île/i }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('island-scene')).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /explorer l’île/i }))

    expect(screen.getByTestId('island-scene')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /sac de plage/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByLabelText(/emplacement \d+ vide/i),
    ).toHaveLength(8)
    expect(screen.getByLabelText('Maison')).toBeInTheDocument()
    expect(screen.getByLabelText('Coquillage')).toBeInTheDocument()
    expect(screen.getByLabelText('Pomme')).toBeInTheDocument()
    expect(screen.getByLabelText('Fleur')).toBeInTheDocument()

    expect(
      await screen.findByLabelText('Code de session 731942'),
    ).toHaveTextContent('731942')
    expect(
      await screen.findByRole('img', {
        name: /qr code ouvrant la manette petite île/i,
      }),
    ).toHaveAttribute('src', 'data:image/png;base64,qr-code-de-test')
    await waitFor(() => expect(dependencyMocks.toDataURL).toHaveBeenCalledOnce())

    const controllerUrl = dependencyMocks.toDataURL.mock.calls[0]?.[0]
    expect(new URL(String(controllerUrl)).pathname).toBe('/controller')
    expect(new URL(String(controllerUrl)).searchParams.get('code')).toBe(
      '731942',
    )
  })

  it('ramasse un objet avec le clavier et met à jour le sac', async () => {
    const initial = createInitialGameState()
    const shell = initial.collectibles[0]
    localStorage.setItem(
      SAVE_KEY,
      encodeGameState({
        ...initial,
        player: { ...initial.player, position: { ...shell.position } },
      }),
    )
    await renderStartedGame()

    fireEvent.keyDown(window, { key: ' ' })

    expect(
      await screen.findByText('Coquillage nacré ajouté à l’inventaire'),
    ).toBeInTheDocument()
    expect(screen.getByText('Coquillage nacré')).toBeInTheDocument()
    expect(screen.queryByTestId('item-shell')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(/emplacement \d+ vide/i)).toHaveLength(7)
  })

  it('entre dans la maison avec la touche Espace', async () => {
    const initial = createInitialGameState()
    localStorage.setItem(
      SAVE_KEY,
      encodeGameState({
        ...initial,
        player: {
          ...initial.player,
          position: { ...EXTERIOR_DOOR_POSITION },
        },
      }),
    )
    await renderStartedGame()

    fireEvent.keyDown(window, { key: ' ' })

    expect(await screen.findByTestId('house-scene')).toBeInTheDocument()
    expect(screen.queryByTestId('island-scene')).not.toBeInTheDocument()
    expect(screen.getByText('Bienvenue à la maison')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sortir de la maison/i }),
    ).toBeInTheDocument()
  })
})
