import { describe, expect, it } from "vitest";
import {
  SAVE_KEY,
  SAVE_VERSION,
  createInitialGameState,
  decodeGameState,
  loadGame,
  saveGame,
  type GameStorage,
} from "../src/game";

class MemoryStorage implements GameStorage {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

describe("versioned saves", () => {
  it("round-trips a detached game state", () => {
    const storage = new MemoryStorage();
    const initial = createInitialGameState();
    const changed = {
      ...initial,
      clock: { day: 2, minuteOfDay: 750 },
      inventory: [
        { id: "shell-1", type: "shell" as const, name: "Coquillage nacré" },
        ...initial.inventory.slice(1),
      ],
      collectibles: initial.collectibles.map((item) =>
        item.id === "shell-1" ? { ...item, collected: true } : item,
      ),
    };

    expect(saveGame(changed, storage)).toBe(true);
    const raw = storage.getItem(SAVE_KEY);
    expect(JSON.parse(raw ?? "{}").version).toBe(SAVE_VERSION);
    expect(loadGame(storage)).toEqual(changed);
    expect(loadGame(storage)).not.toBe(changed);
  });

  it("rejects malformed JSON and unsupported save versions", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "not json");
    expect(loadGame(storage)).toEqual(createInitialGameState());

    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        version: SAVE_VERSION + 1,
        savedAt: new Date().toISOString(),
        state: createInitialGameState(),
      }),
    );
    expect(loadGame(storage)).toEqual(createInitialGameState());
  });

  it("rejects structurally invalid data and clamps edited coordinates", () => {
    const validState = createInitialGameState();
    const invalid = JSON.stringify({
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state: { ...validState, inventory: [] },
    });
    expect(decodeGameState(invalid)).toBeNull();

    const offMap = JSON.stringify({
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        ...validState,
        player: { ...validState.player, position: { x: 99_999, y: -99_999 } },
      },
    });
    expect(decodeGameState(offMap)?.player.position).toEqual({ x: 92, y: 14 });
  });

  it("survives storage access failures", () => {
    const failingStorage: GameStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    expect(saveGame(createInitialGameState(), failingStorage)).toBe(false);
    expect(loadGame(failingStorage)).toEqual(createInitialGameState());
  });
});
