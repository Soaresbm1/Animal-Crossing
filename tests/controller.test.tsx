import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ControllerPage } from '../src/controller/ControllerPage'

type EventHandler = (...arguments_: unknown[]) => void

class FakeSocket {
  connected = false
  readonly emitted: Array<{ event: string; payload?: unknown }> = []
  private readonly handlers = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler) {
    const eventHandlers = this.handlers.get(event) ?? new Set<EventHandler>()
    eventHandlers.add(handler)
    this.handlers.set(event, eventHandlers)
    return this
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler)
    return this
  }

  connect() {
    this.connected = true
    this.dispatch('connect')
    return this
  }

  disconnect() {
    this.connected = false
    this.dispatch('disconnect', 'io client disconnect')
    return this
  }

  emit(event: string, ...arguments_: unknown[]) {
    this.emitted.push({ event, payload: arguments_[0] })

    if (event === 'controller:join-session') {
      const payload = arguments_[0] as { code: string }
      const acknowledge = arguments_[1] as (
        result: { ok: true; code: string },
      ) => void
      acknowledge({ ok: true, code: payload.code })
    }

    return this
  }

  dispatch(event: string, ...arguments_: unknown[]) {
    this.handlers
      .get(event)
      ?.forEach((handler) => handler(...arguments_))
  }
}

function renderController(socket: FakeSocket) {
  return render(
    <ControllerPage socketFactory={() => socket as never} />,
  )
}

function prepareJoystick(joystick: HTMLElement) {
  Object.defineProperties(joystick, {
    getBoundingClientRect: {
      value: () => ({
        bottom: 200,
        height: 200,
        left: 0,
        right: 200,
        top: 0,
        width: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
    hasPointerCapture: { value: vi.fn(() => true) },
    releasePointerCapture: { value: vi.fn() },
    setPointerCapture: { value: vi.fn() },
  })
}

function firePointer(
  target: Element,
  type: 'pointerdown' | 'pointercancel',
  init: MouseEventInit & { pointerId: number },
) {
  const event = new MouseEvent(type, { bubbles: true, ...init })
  Object.defineProperty(event, 'pointerId', { value: init.pointerId })
  fireEvent(target, event)
}

describe('ControllerPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/controller?code=731942')
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('préremplit le code du QR et rejoint la session', async () => {
    const socket = new FakeSocket()
    const user = userEvent.setup()
    renderController(socket)

    const codeInput = screen.getByRole('textbox', {
      name: /code de connexion/i,
    })
    expect(codeInput).toHaveValue('731942')

    await user.click(
      screen.getByRole('button', { name: /connecter la manette/i }),
    )

    expect(socket.emitted).toContainEqual({
      event: 'controller:join-session',
      payload: { code: '731942' },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Manette connectée')
    expect(
      screen.getByRole('group', { name: /joystick de déplacement/i }),
    ).toBeInTheDocument()
  })

  it('filtre la saisie pour ne conserver que six chiffres', async () => {
    const socket = new FakeSocket()
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/controller')
    renderController(socket)

    const codeInput = screen.getByRole('textbox', {
      name: /code de connexion/i,
    })
    await user.type(codeInput, '12a34-5678')

    expect(codeInput).toHaveValue('123456')
    expect(
      screen.getByRole('button', { name: /connecter la manette/i }),
    ).toBeEnabled()
  })

  it('borne le joystick puis envoie un neutre et le bouton d’action', async () => {
    const socket = new FakeSocket()
    const user = userEvent.setup()
    renderController(socket)
    await user.click(
      screen.getByRole('button', { name: /connecter la manette/i }),
    )

    const joystick = screen.getByRole('group', {
      name: /joystick de déplacement/i,
    })
    prepareJoystick(joystick)

    firePointer(joystick, 'pointerdown', {
      clientX: 260,
      clientY: 100,
      pointerId: 7,
    })

    expect(socket.emitted).toContainEqual({
      event: 'controller:move',
      payload: { x: 1, y: 0 },
    })

    firePointer(joystick, 'pointercancel', { pointerId: 7 })
    expect(socket.emitted.at(-1)).toEqual({
      event: 'controller:move',
      payload: { x: 0, y: 0 },
    })

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /effectuer une action/i }),
      { pointerId: 8 },
    )
    expect(socket.emitted.at(-1)).toEqual({
      event: 'controller:action',
      payload: undefined,
    })
  })

  it('répète le mouvement tant que le joystick reste tenu', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    renderController(socket)
    fireEvent.click(
      screen.getByRole('button', { name: /connecter la manette/i }),
    )

    const joystick = screen.getByRole('group', {
      name: /joystick de déplacement/i,
    })
    prepareJoystick(joystick)
    firePointer(joystick, 'pointerdown', {
      clientX: 260,
      clientY: 100,
      pointerId: 9,
    })

    const movementsBeforeHeartbeat = socket.emitted.filter(
      ({ event }) => event === 'controller:move',
    ).length
    act(() => vi.advanceTimersByTime(250))
    const movementsAfterHeartbeat = socket.emitted.filter(
      ({ event }) => event === 'controller:move',
    ).length

    expect(movementsAfterHeartbeat).toBeGreaterThan(movementsBeforeHeartbeat)
    firePointer(joystick, 'pointercancel', { pointerId: 9 })
    expect(socket.emitted.at(-1)).toEqual({
      event: 'controller:move',
      payload: { x: 0, y: 0 },
    })
  })
})
