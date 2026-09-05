import { INVENTORY_SIZE, MINUTES_PER_DAY, SCENE_BOUNDS } from "./constants";
import { clampToBounds, createInitialGameState, normalizeMovement } from "./engine";
import type {
  CollectibleState,
  CollectibleType,
  GameState,
  InventoryItem,
  InventorySlot,
  SceneId,
  Vector2,
} from "./types";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "petite-ile:save";

export interface GameStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

interface SaveEnvelope {
  readonly version: typeof SAVE_VERSION;
  readonly savedAt: string;
  readonly state: GameState;
}

const collectibleTypes = new Set<CollectibleType>([
  "shell",
  "apple",
  "flower",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isScene = (value: unknown): value is SceneId =>
  value === "island" || value === "house";

const isCollectibleType = (value: unknown): value is CollectibleType =>
  typeof value === "string" && collectibleTypes.has(value as CollectibleType);

function parseVector(value: unknown): Vector2 | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null;
  }
  return { x: value.x, y: value.y };
}

function parseInventoryItem(value: unknown): InventoryItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    !isCollectibleType(value.type) ||
    typeof value.name !== "string"
  ) {
    return null;
  }
  return { id: value.id, type: value.type, name: value.name };
}

function parseCollectible(value: unknown): CollectibleState | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    !isCollectibleType(value.type) ||
    typeof value.name !== "string" ||
    typeof value.collected !== "boolean"
  ) {
    return null;
  }
  const position = parseVector(value.position);
  return position
    ? {
        id: value.id,
        type: value.type,
        name: value.name,
        position,
        collected: value.collected,
      }
    : null;
}

/**
 * Validates untrusted persisted data and returns a detached state. Coordinates
 * are clamped so a valid-but-edited save cannot strand the player off-map.
 */
function parseGameState(value: unknown): GameState | null {
  if (
    !isRecord(value) ||
    !isScene(value.scene) ||
    !isRecord(value.player) ||
    !isRecord(value.clock) ||
    !Array.isArray(value.collectibles) ||
    !Array.isArray(value.inventory) ||
    value.inventory.length !== INVENTORY_SIZE ||
    !Number.isInteger(value.clock.day) ||
    !isFiniteNumber(value.clock.day) ||
    value.clock.day < 1 ||
    !isFiniteNumber(value.clock.minuteOfDay) ||
    value.clock.minuteOfDay < 0 ||
    value.clock.minuteOfDay >= MINUTES_PER_DAY
  ) {
    return null;
  }

  const position = parseVector(value.player.position);
  const facing = parseVector(value.player.facing);
  if (!position || !facing) return null;

  const collectibles: CollectibleState[] = [];
  const collectibleIds = new Set<string>();
  for (const candidate of value.collectibles) {
    const collectible = parseCollectible(candidate);
    if (!collectible || collectibleIds.has(collectible.id)) return null;
    collectibleIds.add(collectible.id);
    collectibles.push(collectible);
  }

  const inventory: InventorySlot[] = [];
  const inventoryIds = new Set<string>();
  for (const candidate of value.inventory) {
    if (candidate === null) {
      inventory.push(null);
      continue;
    }
    const item = parseInventoryItem(candidate);
    if (!item || inventoryIds.has(item.id)) return null;
    inventoryIds.add(item.id);
    inventory.push(item);
  }

  return {
    scene: value.scene,
    player: {
      position: clampToBounds(position, SCENE_BOUNDS[value.scene]),
      facing: normalizeMovement(facing),
    },
    collectibles,
    inventory,
    clock: {
      day: value.clock.day,
      minuteOfDay: value.clock.minuteOfDay,
    },
  };
}

export function encodeGameState(state: GameState): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify(envelope);
}

/** Returns null for corrupt, unsupported, or structurally invalid saves. */
export function decodeGameState(serialized: string): GameState | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.version !== SAVE_VERSION ||
      typeof value.savedAt !== "string"
    ) {
      return null;
    }
    return parseGameState(value.state);
  } catch {
    return null;
  }
}

function getBrowserStorage(): GameStorage | null {
  try {
    const storage = (globalThis as { localStorage?: GameStorage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

/** Saves to the supplied storage (or localStorage) without throwing. */
export function saveGame(
  state: GameState,
  storage: GameStorage | null = getBrowserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, encodeGameState(state));
    return true;
  } catch {
    return false;
  }
}

/** Loads a save, falling back to a fresh state on every storage/data failure. */
export function loadGame(
  storage: GameStorage | null = getBrowserStorage(),
): GameState {
  if (!storage) return createInitialGameState();
  try {
    const serialized = storage.getItem(SAVE_KEY);
    return serialized ? (decodeGameState(serialized) ?? createInitialGameState()) : createInitialGameState();
  } catch {
    return createInitialGameState();
  }
}

export function clearSavedGame(
  storage: GameStorage | null = getBrowserStorage(),
): boolean {
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
