import { describe, expect, it } from 'vitest'
import { createInitialGameState, interactWithResult, progressAction, LILA_POSITION, SHOP_POSITION, encodeGameState, decodeGameState, type GameState, type Vector2 } from '../src/game'

const at = (state: GameState, position: Vector2): GameState => ({ ...state, player: { ...state.player, position } })

describe('first home journey', () => {
  it('completes collection, reward, purchase, placement and reload without duplicate rewards', () => {
    let state = progressAction(at(createInitialGameState(), LILA_POSITION), 'talk').state
    expect(state.quest).toBe('active')
    expect(progressAction(state, 'talk').state.coins).toBe(0)
    for (const apple of state.collectibles.filter(item => item.type === 'apple')) {
      state = interactWithResult(at(state, apple.position)).state
    }
    expect(state.inventory.filter(item => item?.type === 'apple')).toHaveLength(5)
    state = progressAction(at(state, LILA_POSITION), 'talk').state
    expect(state.quest).toBe('complete')
    expect(state.coins).toBe(60)
    expect(state.inventory.every(item => item === null)).toBe(true)
    expect(state.collectibles.filter(item => item.type === 'apple' && !item.collected)).toHaveLength(5)
    expect(progressAction(state, 'talk').state.coins).toBe(60)
    state = progressAction(at(state, SHOP_POSITION), 'buy').state
    expect(state.coins).toBe(20)
    expect(progressAction(state, 'buy').state.coins).toBe(20)
    expect(progressAction(state, 'place').state.furniture.position).toBeNull()
    state = progressAction(at({ ...state, scene: 'house' }, { x: 48, y: 62 }), 'place').state
    expect(state.furniture.position).toEqual({ x: 48, y: 62 })
    expect(decodeGameState(encodeGameState(state))).toEqual(state)
  })

  it('keeps mission apples when selling, prevents remote purchases and overspending', () => {
    const initial = createInitialGameState()
    expect(progressAction(at(initial, SHOP_POSITION), 'buy').state.furniture.owned).toBe(false)
    let state = initial
    for (const item of state.collectibles) state = interactWithResult(at(state, item.position)).state
    state = progressAction(at(state, SHOP_POSITION), 'sell').state
    expect(state.coins).toBe(20)
    expect(state.inventory.filter(item => item?.type === 'apple')).toHaveLength(5)
    expect(progressAction(state, 'sell').state.coins).toBe(20)
    const rich = { ...initial, coins: 100 }
    expect(progressAction(rich, 'buy').state.furniture.owned).toBe(false)
  })

  it('migrates an original save without losing its collected items', () => {
    const initial = createInitialGameState()
    const legacy = { scene: initial.scene, player: initial.player, clock: initial.clock,
      collectibles: initial.collectibles.slice(0, 3).map(item => item.id === 'apple-1' ? { ...item, collected: true } : item),
      inventory: [{ id: 'apple-1', type: 'apple', name: 'Pomme dorée' }, ...initial.inventory.slice(1)] }
    const loaded = decodeGameState(JSON.stringify({ version: 1, savedAt: '2026-09-04', state: legacy }))!
    expect(loaded.collectibles.filter(item => item.type === 'apple')).toHaveLength(5)
    expect(loaded.quest).toBe('new')
    expect(loaded.player).toEqual(initial.player)
    expect(loaded.inventory[0]?.id).toBe('apple-1')
    expect(loaded.collectibles.find(item => item.id === 'apple-1')?.collected).toBe(true)
  })

  it('rejects corrupt economy and furniture fields', () => {
    for (const fields of [{ coins: -1 }, { coins: 1.5 }, { quest: 'wrong' }, { furniture: { owned: false, position: { x: 50, y: 60 } } }]) {
      expect(decodeGameState(encodeGameState({ ...createInitialGameState(), ...fields } as GameState))).toBeNull()
    }
  })
})
