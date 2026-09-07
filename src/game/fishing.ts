import type { FishType, GameState, InteractionResult, InventoryItem, Vector2 } from './types'

export const FISHING_POSITION: Vector2 = { x: 50, y: 83 }
export const FISHING_ROD_PRICE = 25

export const FISH_CATALOG: Readonly<Record<FishType, { name: string; price: number }>> = {
  sardine: { name: 'Sardine argentée', price: 14 },
  perch: { name: 'Perche soleil', price: 22 },
  carp: { name: 'Carpe miroir', price: 35 },
}

const message = (state: GameState, text: string): InteractionResult => ({
  state,
  event: { type: 'message', text },
})

export function catchFish(state: GameState, species: FishType): InteractionResult {
  if (state.scene !== 'island' || Math.hypot(state.player.position.x - FISHING_POSITION.x, state.player.position.y - FISHING_POSITION.y) > 7) {
    return message(state, 'Approche-toi du ponton pour pêcher.')
  }
  if (!state.fishing.rodOwned) return message(state, 'Il te faut une canne à pêche du petit marché.')
  const emptySlot = state.inventory.findIndex(item => item === null)
  if (emptySlot === -1) return message(state, 'Ton sac est plein : vends ou range une récolte avant de pêcher.')
  const fish = FISH_CATALOG[species]
  const inventory = [...state.inventory]
  const item: InventoryItem = { id: `fish-${state.fishing.catchCount + 1}`, type: species, name: fish.name }
  inventory[emptySlot] = item
  const collection = state.fishing.collection.includes(species)
    ? state.fishing.collection
    : [...state.fishing.collection, species]
  return message({
    ...state,
    inventory,
    fishing: { ...state.fishing, collection, catchCount: state.fishing.catchCount + 1 },
  }, `${fish.name} attrapée ! Valeur : ${fish.price} pièces.`)
}
