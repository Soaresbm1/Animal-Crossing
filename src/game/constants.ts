import type {
  CollectibleState,
  GameClock,
  SceneId,
  Vector2,
  WorldBounds,
} from "./types";

export const INVENTORY_SIZE = 8;
export const PLAYER_SPEED = 18;
export const INTERACTION_RADIUS = 7;

/** A complete in-game day lasts two real minutes. */
export const GAME_MINUTES_PER_REAL_SECOND = 12;
export const MINUTES_PER_DAY = 24 * 60;

export const INITIAL_CLOCK: GameClock = {
  day: 1,
  minuteOfDay: 8 * 60,
};

export const SCENE_BOUNDS: Readonly<Record<SceneId, WorldBounds>> = {
  island: { minX: 8, maxX: 92, minY: 14, maxY: 86 },
  house: { minX: 20, maxX: 80, minY: 18, maxY: 90 },
};

export const INITIAL_PLAYER_POSITION: Vector2 = { x: 50, y: 58 };
export const EXTERIOR_DOOR_POSITION: Vector2 = { x: 50, y: 24 };
export const INTERIOR_DOOR_POSITION: Vector2 = { x: 50, y: 88 };
export const HOUSE_ENTRY_POSITION: Vector2 = { x: 50, y: 76 };
export const ISLAND_EXIT_POSITION: Vector2 = { x: 50, y: 36 };

export const INITIAL_COLLECTIBLES: readonly CollectibleState[] = [
  {
    id: "shell-1",
    type: "shell",
    name: "Coquillage nacré",
    position: { x: 22, y: 72 },
    collected: false,
  },
  {
    id: "apple-1",
    type: "apple",
    name: "Pomme dorée",
    position: { x: 74, y: 58 },
    collected: false,
  },
  {
    id: "flower-1",
    type: "flower",
    name: "Fleur des dunes",
    position: { x: 36, y: 38 },
    collected: false,
  },
  ...[{ x: 24, y: 48 }, { x: 64, y: 76 }, { x: 80, y: 38 }, { x: 39, y: 66 }].map((position, index) => ({
    id: `apple-${index + 2}`, type: 'apple' as const, name: 'Pomme dorée', position, collected: false,
  })),
];

/** Public, UI-friendly name for the immutable world item definitions. */
export const WORLD_ITEMS = INITIAL_COLLECTIBLES;
