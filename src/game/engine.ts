import {
  EXTERIOR_DOOR_POSITION,
  GAME_MINUTES_PER_REAL_SECOND,
  HOUSE_ENTRY_POSITION,
  INITIAL_CLOCK,
  INITIAL_COLLECTIBLES,
  INITIAL_PLAYER_POSITION,
  INTERACTION_RADIUS,
  INTERIOR_DOOR_POSITION,
  INVENTORY_SIZE,
  ISLAND_EXIT_POSITION,
  MINUTES_PER_DAY,
  PLAYER_SPEED,
  SCENE_BOUNDS,
} from "./constants";
import type {
  DayPhase,
  GameState,
  InteractionResult,
  InventoryItem,
  MoveInput,
  Vector2,
  WorldBounds,
} from "./types";
import { interactProgression } from './progression';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const distanceBetween = (a: Vector2, b: Vector2): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const copyVector = ({ x, y }: Vector2): Vector2 => ({ x, y });

export function createInitialGameState(): GameState {
  return {
    coins: 0,
    quest: 'new',
    furniture: { owned: false, position: null },
    fishing: { rodOwned: false, collection: [], catchCount: 0 },
    scene: "island",
    player: {
      position: copyVector(INITIAL_PLAYER_POSITION),
      facing: { x: 0, y: 1 },
    },
    collectibles: INITIAL_COLLECTIBLES.map((collectible) => ({
      ...collectible,
      position: copyVector(collectible.position),
    })),
    inventory: Array.from({ length: INVENTORY_SIZE }, () => null),
    clock: { ...INITIAL_CLOCK },
  };
}

/** Compatibility name used by the application layer. */
export const createInitialState = createInitialGameState;

/**
 * Keeps analog movement below unit length, preventing diagonal movement from
 * being faster than horizontal or vertical movement.
 */
export function normalizeMovement(direction: Vector2): Vector2 {
  const x = Number.isFinite(direction.x) ? direction.x : 0;
  const y = Number.isFinite(direction.y) ? direction.y : 0;
  const magnitude = Math.hypot(x, y);

  if (magnitude === 0 || magnitude <= 1) {
    return { x, y };
  }

  return { x: x / magnitude, y: y / magnitude };
}

export function clampToBounds(position: Vector2, bounds: WorldBounds): Vector2 {
  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: clamp(position.y, bounds.minY, bounds.maxY),
  };
}

/** Pure player movement. deltaSeconds is real elapsed time, in seconds. */
export function movePlayer(
  state: GameState,
  direction: Vector2,
  deltaSeconds: number,
): GameState {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return state;
  }

  const movement = normalizeMovement(direction);
  if (movement.x === 0 && movement.y === 0) {
    return state;
  }

  const position = clampToBounds(
    {
      x: state.player.position.x + movement.x * PLAYER_SPEED * deltaSeconds,
      y: state.player.position.y + movement.y * PLAYER_SPEED * deltaSeconds,
    },
    SCENE_BOUNDS[state.scene],
  );

  return {
    ...state,
    player: {
      position,
      facing: movement,
    },
  };
}

function firstEmptyInventorySlot(state: GameState): number {
  return state.inventory.findIndex((slot) => slot === null);
}

/**
 * Performs the closest available action and returns a small event suitable for
 * UI feedback. Collection has priority over a doorway when both are in range.
 */
export function interactWithResult(state: GameState): InteractionResult {
  const progression = interactProgression(state);
  if (progression) return progression;
  if (state.scene === "island") {
    const collectible = state.collectibles
      .filter(
        (candidate) =>
          !candidate.collected &&
          distanceBetween(candidate.position, state.player.position) <=
            INTERACTION_RADIUS,
      )
      .sort(
        (left, right) =>
          distanceBetween(left.position, state.player.position) -
          distanceBetween(right.position, state.player.position),
      )[0];

    if (collectible) {
      const emptySlot = firstEmptyInventorySlot(state);
      if (emptySlot === -1) {
        return {
          state,
          event: { type: "inventory-full", item: collectible },
        };
      }

      const item: InventoryItem = {
        id: collectible.id,
        type: collectible.type,
        name: collectible.name,
      };
      const inventory = [...state.inventory];
      inventory[emptySlot] = item;

      return {
        state: {
          ...state,
          collectibles: state.collectibles.map((candidate) =>
            candidate.id === collectible.id
              ? { ...candidate, collected: true }
              : candidate,
          ),
          inventory,
        },
        event: { type: "collected", item },
      };
    }

    if (
      distanceBetween(state.player.position, EXTERIOR_DOOR_POSITION) <=
      INTERACTION_RADIUS
    ) {
      return {
        state: {
          ...state,
          scene: "house",
          player: {
            position: copyVector(HOUSE_ENTRY_POSITION),
            facing: { x: 0, y: -1 },
          },
        },
        event: { type: "entered-house" },
      };
    }
  } else if (
    distanceBetween(state.player.position, INTERIOR_DOOR_POSITION) <=
    INTERACTION_RADIUS
  ) {
    return {
      state: {
        ...state,
        scene: "island",
        player: {
          position: copyVector(ISLAND_EXIT_POSITION),
          facing: { x: 0, y: 1 },
        },
      },
      event: { type: "left-house" },
    };
  }

  return { state, event: { type: "nothing" } };
}

/** Convenience form for React-style state setters. */
export function interact(state: GameState): GameState {
  return interactWithResult(state).state;
}

/** Pure accelerated clock update. deltaSeconds is real elapsed time. */
export function advanceTime(
  state: GameState,
  deltaSeconds: number,
): GameState {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return state;
  }

  const totalMinutes =
    state.clock.minuteOfDay + deltaSeconds * GAME_MINUTES_PER_REAL_SECOND;
  const elapsedDays = Math.floor(totalMinutes / MINUTES_PER_DAY);

  return {
    ...state,
    clock: {
      day: state.clock.day + elapsedDays,
      minuteOfDay: totalMinutes % MINUTES_PER_DAY,
    },
  };
}

/** Advances only the accelerated clock; deltaMs is real elapsed milliseconds. */
export function advanceDay(state: GameState, deltaMs: number): GameState {
  return advanceTime(state, deltaMs / 1_000);
}

/**
 * Advances one complete frame (movement and clock) using browser-style elapsed
 * milliseconds. This is the main entry point for the render loop.
 */
export function advanceGame(
  state: GameState,
  input: MoveInput,
  deltaMs: number,
): GameState {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  const seconds = deltaMs / 1_000;
  return advanceTime(movePlayer(state, input, seconds), seconds);
}

export function getDayPhase(clock: GameState["clock"]): DayPhase {
  const hour = clock.minuteOfDay / 60;
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 18) return "day";
  if (hour >= 18 && hour < 20) return "dusk";
  return "night";
}

/** A continuous 0.25–1 value useful for tinting the scene. */
export function getDaylightLevel(clock: GameState["clock"]): number {
  const hour = clock.minuteOfDay / 60;
  if (hour >= 8 && hour < 18) return 1;
  if (hour >= 5 && hour < 8) return 0.25 + ((hour - 5) / 3) * 0.75;
  if (hour >= 18 && hour < 20) return 1 - ((hour - 18) / 2) * 0.75;
  return 0.25;
}
