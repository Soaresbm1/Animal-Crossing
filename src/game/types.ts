export type SceneId = "island" | "house";

export type CollectibleType = "shell" | "apple" | "flower";
export type FishType = "sardine" | "perch" | "carp";
export type ItemType = CollectibleType | FishType;

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

/** Direction received from the keyboard, touch controller, or network. */
export type MoveInput = Vector2;

export interface WorldBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface PlayerState {
  readonly position: Vector2;
  readonly facing: Vector2;
}

export interface CollectibleState {
  readonly id: string;
  readonly type: CollectibleType;
  readonly name: string;
  readonly position: Vector2;
  readonly collected: boolean;
}

export interface InventoryItem {
  readonly id: string;
  readonly type: ItemType;
  readonly name: string;
}

export type InventorySlot = InventoryItem | null;

export interface GameClock {
  /** The first in-game day is day 1. */
  readonly day: number;
  /** Number of minutes since midnight, in the [0, 1440) interval. */
  readonly minuteOfDay: number;
}

export interface GameState {
  readonly coins: number;
  readonly quest: "new" | "active" | "complete";
  readonly furniture: { readonly owned: boolean; readonly position: Vector2 | null };
  readonly fishing: {
    readonly rodOwned: boolean;
    readonly collection: readonly FishType[];
    readonly catchCount: number;
  };
  readonly scene: SceneId;
  readonly player: PlayerState;
  readonly collectibles: readonly CollectibleState[];
  /** Always contains exactly INVENTORY_SIZE slots. */
  readonly inventory: readonly InventorySlot[];
  readonly clock: GameClock;
}

export type DayPhase = "dawn" | "day" | "dusk" | "night";

export type InteractionEvent =
  | { readonly type: "message"; readonly text: string }
  | { readonly type: "collected"; readonly item: InventoryItem }
  | { readonly type: "inventory-full"; readonly item: CollectibleState }
  | { readonly type: "entered-house" }
  | { readonly type: "left-house" }
  | { readonly type: "nothing" };

export interface InteractionResult {
  readonly state: GameState;
  readonly event: InteractionEvent;
}
