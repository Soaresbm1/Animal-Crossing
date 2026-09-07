import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DisplayPage } from '../src/display/DisplayPage'
import {
  EXTERIOR_DOOR_POSITION,
  SHOP_POSITION,
  LILA_POSITION,
  FISHING_POSITION,
  decodeGameState,
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'e' })
    expect(
      screen.getByRole('region', { name: /sac de plage/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByLabelText(/emplacement \d+ vide/i),
    ).toHaveLength(8)
    expect(screen.getByLabelText('Maison')).toBeInTheDocument()
    expect(screen.getByLabelText('Coquillage')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Pomme')).toHaveLength(5)
    expect(screen.getByLabelText('Fleur')).toBeInTheDocument()

    expect(screen.getByRole('dialog', { name: 'Mon sac de plage' })).toBeInTheDocument()
    expect(screen.getByLabelText('0 pièces')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'e' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    fireEvent.keyDown(window, { key: 'e' })
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

  it('achète un fauteuil puis le place et sauvegarde immédiatement', async () => {
    const initial = createInitialGameState()
    localStorage.setItem(SAVE_KEY, encodeGameState({ ...initial, coins: 60, quest: 'complete', player: { ...initial.player, position: SHOP_POSITION } }))
    const user = await renderStartedGame()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByRole('dialog', { name: 'Le petit marché' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Acheter · 40 pièces' }))
    expect(screen.getByLabelText('20 pièces')).toBeInTheDocument()
    const bought = decodeGameState(localStorage.getItem(SAVE_KEY)!)!
    expect(bought.furniture.owned).toBe(true)
    cleanup()
    localStorage.setItem(SAVE_KEY, encodeGameState({ ...bought, scene: 'house', player: { ...bought.player, position: { x: 48, y: 62 } } }))
    await renderStartedGame()
    fireEvent.keyDown(window, { key: 'e' })
    await user.click(screen.getByRole('button', { name: 'Installer le fauteuil ici' }))
    expect(screen.getByLabelText('Fauteuil sauge installé')).toBeInTheDocument()
    expect(decodeGameState(localStorage.getItem(SAVE_KEY)!)?.furniture.position).toEqual({ x: 48, y: 62 })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ouvre Lila avec Espace et accepte la mission dans la fenêtre', async () => {
    const initial = createInitialGameState()
    localStorage.setItem(SAVE_KEY, encodeGameState({ ...initial, player: { ...initial.player, position: LILA_POSITION } }))
    const user = await renderStartedGame()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByRole('dialog', { name: 'Un moment avec Lila' })).toBeInTheDocument()
    expect(decodeGameState(localStorage.getItem(SAVE_KEY)!)?.quest).toBe('new')
    await user.click(screen.getByRole('button', { name: 'Accepter la mission' }))
    expect(decodeGameState(localStorage.getItem(SAVE_KEY)!)?.quest).toBe('active')
    await user.click(screen.getByRole('button', { name: 'Fermer la fenêtre' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ouvre la pêche au ponton et capture au signal avec Espace', async () => {
    const initial = createInitialGameState()
    localStorage.setItem(SAVE_KEY, encodeGameState({
      ...initial,
      fishing: { ...initial.fishing, rodOwned: true },
      player: { ...initial.player, position: FISHING_POSITION },
    }))
    const user = await renderStartedGame()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByRole('dialog', { name: 'Au fil de l’eau' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lancer la ligne · Espace' }))
    expect(screen.getByText('Patience… n’appuie pas encore.')).toBeInTheDocument()
    expect(await screen.findByText('Ça mord !', {}, { timeout: 2_500 })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(decodeGameState(localStorage.getItem(SAVE_KEY)!)?.fishing.catchCount).toBe(1))
    expect(screen.getAllByText(/Perche soleil attrapée/).length).toBeGreaterThan(0)
  })
})
