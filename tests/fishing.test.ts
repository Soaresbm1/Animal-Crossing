import { describe, expect, it } from 'vitest'
import {
  FISHING_POSITION,
  SHOP_POSITION,
  catchFish,
  createInitialGameState,
  decodeGameState,
  encodeGameState,
  progressAction,
  type GameState,
  type Vector2,
} from '../src/game'

const at = (state: GameState, position: Vector2): GameState => ({
  ...state,
  player: { ...state.player, position },
})

describe('fishing', () => {
  it('buys a rod, catches species, keeps the journal and sells the fish', () => {
    let state = at({ ...createInitialGameState(), coins: 60 }, SHOP_POSITION)
    state = progressAction(state, 'buy-rod').state
    expect(state.coins).toBe(35)
    expect(state.fishing.rodOwned).toBe(true)
    expect(progressAction(state, 'buy-rod').state.coins).toBe(35)

    state = catchFish(at(state, FISHING_POSITION), 'carp').state
    expect(state.inventory[0]).toMatchObject({ type: 'carp', name: 'Carpe miroir' })
    expect(state.fishing.collection).toEqual(['carp'])
    expect(state.fishing.catchCount).toBe(1)

    state = catchFish(at(state, FISHING_POSITION), 'carp').state
    expect(state.fishing.collection).toEqual(['carp'])
    expect(state.fishing.catchCount).toBe(2)
    state = progressAction(at(state, SHOP_POSITION), 'sell').state
    expect(state.coins).toBe(105)
    expect(state.inventory.every(item => item === null)).toBe(true)
    expect(state.fishing.collection).toEqual(['carp'])
  })

  it('requires the rod, the pontoon and an empty bag', () => {
    const initial = createInitialGameState()
    const withoutRod = at(initial, FISHING_POSITION)
    expect(catchFish(withoutRod, 'sardine').state).toBe(withoutRod)
    const equipped = { ...initial, fishing: { ...initial.fishing, rodOwned: true } }
    expect(catchFish(equipped, 'sardine').state).toBe(equipped)
    const full = {
      ...at(equipped, FISHING_POSITION),
      inventory: initial.inventory.map((_, index) => ({ id: `full-${index}`, type: 'flower' as const, name: 'Fleur' })),
    }
    expect(catchFish(full, 'sardine').state).toBe(full)
  })

  it('persists fishing and migrates a version 2 save', () => {
    const state = { ...createInitialGameState(), fishing: { rodOwned: true, collection: ['perch'] as const, catchCount: 4 } }
    expect(decodeGameState(encodeGameState(state))).toEqual(state)
    const versionTwo = JSON.parse(encodeGameState(state))
    versionTwo.version = 2
    delete versionTwo.state.fishing
    expect(decodeGameState(JSON.stringify(versionTwo))?.fishing).toEqual({ rodOwned: false, collection: [], catchCount: 0 })
  })
})
