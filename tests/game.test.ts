import { describe, expect, it } from "vitest";
import {
  EXTERIOR_DOOR_POSITION,
  INTERIOR_DOOR_POSITION,
  INVENTORY_SIZE,
  PLAYER_SPEED,
  SCENE_BOUNDS,
  advanceTime,
  createInitialGameState,
  getDayPhase,
  interactWithResult,
  movePlayer,
} from "../src/game";

describe("game engine", () => {
  it("creates a fresh island with three original collectibles and eight slots", () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    expect(first.scene).toBe("island");
    expect(first.collectibles.map((item) => item.type)).toEqual([
      "shell",
      "apple",
      "flower",
    ]);
    expect(first.inventory).toHaveLength(INVENTORY_SIZE);
    expect(first.inventory.every((slot) => slot === null)).toBe(true);
    expect(first.collectibles).not.toBe(second.collectibles);
  });

  it("normalizes diagonal input and keeps the player inside scene bounds", () => {
    const initial = createInitialGameState();
    const horizontal = movePlayer(initial, { x: 1, y: 0 }, 1);
    const diagonal = movePlayer(initial, { x: 1, y: 1 }, 1);

    const horizontalDistance = Math.hypot(
      horizontal.player.position.x - initial.player.position.x,
      horizontal.player.position.y - initial.player.position.y,
    );
    const diagonalDistance = Math.hypot(
      diagonal.player.position.x - initial.player.position.x,
      diagonal.player.position.y - initial.player.position.y,
    );
    expect(horizontalDistance).toBeCloseTo(PLAYER_SPEED);
    expect(diagonalDistance).toBeCloseTo(PLAYER_SPEED);

    const bounded = movePlayer(initial, { x: -1, y: -1 }, 100);
    expect(bounded.player.position).toEqual({
      x: SCENE_BOUNDS.island.minX,
      y: SCENE_BOUNDS.island.minY,
    });
  });

  it("collects a nearby object into the first free slot without mutation", () => {
    const initial = createInitialGameState();
    const shell = initial.collectibles[0];
    const nearby = {
      ...initial,
      player: { ...initial.player, position: { ...shell.position } },
    };
    const result = interactWithResult(nearby);

    expect(result.event.type).toBe("collected");
    expect(result.state.inventory[0]).toMatchObject({
      id: shell.id,
      type: "shell",
    });
    expect(result.state.collectibles[0].collected).toBe(true);
    expect(initial.collectibles[0].collected).toBe(false);
    expect(initial.inventory[0]).toBeNull();
  });

  it("does not remove a collectible when all inventory slots are occupied", () => {
    const initial = createInitialGameState();
    const shell = initial.collectibles[0];
    const fullInventory = Array.from({ length: INVENTORY_SIZE }, (_, index) => ({
      id: `kept-${index}`,
      type: "flower" as const,
      name: `Souvenir ${index}`,
    }));
    const state = {
      ...initial,
      player: { ...initial.player, position: { ...shell.position } },
      inventory: fullInventory,
    };

    const result = interactWithResult(state);
    expect(result.event.type).toBe("inventory-full");
    expect(result.state).toBe(state);
    expect(result.state.collectibles[0].collected).toBe(false);
  });

  it("enters and leaves the house from its two doorways", () => {
    const initial = createInitialGameState();
    const atFrontDoor = {
      ...initial,
      player: { ...initial.player, position: { ...EXTERIOR_DOOR_POSITION } },
    };
    const entered = interactWithResult(atFrontDoor);
    expect(entered.event.type).toBe("entered-house");
    expect(entered.state.scene).toBe("house");

    const atInteriorDoor = {
      ...entered.state,
      player: {
        ...entered.state.player,
        position: { ...INTERIOR_DOOR_POSITION },
      },
    };
    const left = interactWithResult(atInteriorDoor);
    expect(left.event.type).toBe("left-house");
    expect(left.state.scene).toBe("island");
  });

  it("advances the accelerated day/night clock across midnight", () => {
    const initial = createInitialGameState();
    const late = {
      ...initial,
      clock: { day: 3, minuteOfDay: 23 * 60 + 59 },
    };
    const advanced = advanceTime(late, 1);

    expect(advanced.clock.day).toBe(4);
    expect(advanced.clock.minuteOfDay).toBe(11);
    expect(getDayPhase(advanced.clock)).toBe("night");
    expect(late.clock.day).toBe(3);
  });
});
