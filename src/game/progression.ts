import type { GameState, InteractionResult, Vector2 } from './types';
import { FISH_CATALOG, FISHING_ROD_PRICE } from './fishing';

export const LILA_POSITION = { x: 33, y: 53 };
export const SHOP_POSITION = { x: 69, y: 29 };
export const FURNITURE_PRICE = 40;
export type ProgressAction = 'talk' | 'sell' | 'buy' | 'buy-rod' | 'place';
export const near = (state: GameState, point: Vector2) =>
  Math.hypot(state.player.position.x - point.x, state.player.position.y - point.y) <= 7;
export const appleCount = (state: GameState) => state.inventory.filter(item => item?.type === 'apple').length;
const result = (state: GameState, text: string): InteractionResult => ({ state, event: { type: 'message', text } });

export function progressAction(state: GameState, action: ProgressAction): InteractionResult {
  if (action === 'talk') {
    if (state.scene !== 'island' || !near(state, LILA_POSITION)) return result(state, 'Approche-toi de Lila.');
    if (state.quest === 'new') return result({ ...state, quest: 'active' }, 'Lila : Bienvenue ! Rapporte-moi 5 pommes pour notre goûter. Je te donnerai 60 pièces.');
    if (state.quest === 'complete') return result(state, 'Lila : Merci pour le goûter ! Choisis un meuble à la boutique pour ta maison.');
    if (appleCount(state) < 5) return result(state, `Lila : Tu as ${appleCount(state)}/5 pommes. Cherche les fruits rouges sur l’île !`);
    let remaining = 5;
    const delivered = new Set<string>();
    const inventory = state.inventory.map(item => {
      if (item?.type === 'apple' && remaining > 0) {
        remaining -= 1;
        delivered.add(item.id);
        return null;
      }
      return item;
    });
    return result({ ...state, inventory, coins: state.coins + 60, quest: 'complete',
      collectibles: state.collectibles.map(item => delivered.has(item.id) ? { ...item, collected: false } : item),
    }, 'Lila : Merci ! Voici 60 pièces. De nouvelles pommes sont disponibles ; la boutique t’attend au nord-est.');
  }
  if (action === 'place') {
    if (state.scene !== 'house' || !state.furniture.owned) return result(state, 'Achète le fauteuil, puis entre dans ta maison.');
    const { x, y } = state.player.position;
    if (x < 36 || x > 66 || y < 53 || y > 72) return result(state, 'Place-toi au centre du tapis pour installer le fauteuil.');
    return result({ ...state, furniture: { owned: true, position: { x, y } } }, 'Ton fauteuil est installé ! Tu peux le déplacer depuis un autre endroit du tapis.');
  }
  if (state.scene !== 'island' || !near(state, SHOP_POSITION)) return result(state, 'Approche-toi de la boutique au nord-est.');
  if (action === 'buy') {
    if (state.furniture.owned) return result(state, 'Tu possèdes déjà ce fauteuil.');
    if (state.coins < FURNITURE_PRICE) return result(state, 'Il te faut 40 pièces pour le fauteuil.');
    return result({ ...state, coins: state.coins - FURNITURE_PRICE, furniture: { owned: true, position: null } }, 'Fauteuil acheté ! Entre dans la maison et place-toi sur le tapis.');
  }
  if (action === 'buy-rod') {
    if (state.fishing.rodOwned) return result(state, 'Tu possèdes déjà une canne à pêche.');
    if (state.coins < FISHING_ROD_PRICE) return result(state, `Il te faut ${FISHING_ROD_PRICE} pièces pour la canne.`);
    return result({ ...state, coins: state.coins - FISHING_ROD_PRICE, fishing: { ...state.fishing, rodOwned: true } }, 'Canne achetée ! Rejoins le ponton au sud et appuie sur Espace.');
  }
  const sold = state.inventory.filter(item => item && (item.type !== 'apple' || state.quest === 'complete'));
  if (!sold.length) return result(state, 'Rien à vendre. Tes pommes sont réservées au goûter de Lila.');
  const ids = new Set(sold.map(item => item!.id));
  const earned = sold.reduce((total, item) => {
    if (!item) return total;
    if (item.type === 'shell') return total + 12;
    if (item.type === 'flower') return total + 8;
    if (item.type === 'apple') return total + 5;
    return total + FISH_CATALOG[item.type].price;
  }, 0);
  return result({ ...state, coins: state.coins + earned,
    inventory: state.inventory.map(item => item && ids.has(item.id) ? null : item),
    collectibles: state.collectibles.map(item => ids.has(item.id) ? { ...item, collected: false } : item),
  }, `Vente : +${earned} pièces. De nouvelles récoltes sont disponibles sur l’île.`);
}

export function interactProgression(state: GameState): InteractionResult | null {
  if (state.scene === 'island' && near(state, LILA_POSITION)) return progressAction(state, 'talk');
  if (state.scene === 'island' && near(state, SHOP_POSITION)) return result(state, 'Bienvenue à la boutique ! Choisis Vendre ou Acheter dans le panneau à droite.');
  return null;
}
