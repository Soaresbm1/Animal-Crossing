import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { io as connectSocket, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

import { createGameServer, type GameServer } from "../server/app.js";
import type {
  ClientToServerEvents,
  CreateSessionAck,
  JoinSessionAck,
  ServerToClientEvents,
} from "../src/shared/protocol.js";

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

const servers: GameServer[] = [];
const sockets: TestSocket[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.disconnect();
  for (const server of servers.splice(0)) await server.close();
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

async function runningServer(options = {}): Promise<{ server: GameServer; url: string }> {
  const server = createGameServer(options);
  servers.push(server);
  await new Promise<void>((resolve) => server.httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = server.httpServer.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

async function client(url: string): Promise<TestSocket> {
  const socket = connectSocket(url, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  sockets.push(socket);

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
    socket.connect();
  });
  return socket;
}

function createSession(screen: TestSocket): Promise<CreateSessionAck> {
  return new Promise((resolve) => screen.emit("screen:create-session", resolve));
}

function joinSession(controller: TestSocket, code: string): Promise<JoinSessionAck> {
  return new Promise((resolve) => {
    controller.emit("controller:join-session", { code }, resolve);
  });
}

function nextEvent<T>(register: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Événement Socket.IO non reçu.")), 1_000);
    register((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

describe("serveur Petite Île", () => {
  it("expose son état de santé", async () => {
    const { url } = await runningServer();
    const response = await fetch(`${url}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("crée un code à six chiffres et accepte une seule manette", async () => {
    const { url } = await runningServer();
    const screen = await client(url);
    const firstController = await client(url);
    const secondController = await client(url);
    const statuses: boolean[] = [];
    screen.on("session:status", ({ controllerConnected }) => statuses.push(controllerConnected));

    const created = await createSession(screen);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error);
    expect(created.code).toMatch(/^\d{6}$/);

    await expect(joinSession(firstController, "12AB56")).resolves.toMatchObject({ ok: false });
    await expect(joinSession(firstController, created.code)).resolves.toEqual({
      ok: true,
      code: created.code,
    });
    await expect(joinSession(secondController, created.code)).resolves.toMatchObject({
      ok: false,
    });
    expect(statuses).toEqual([false, true]);
  });

  it("relaie seulement les déplacements et actions valides de la manette associée", async () => {
    const { url } = await runningServer();
    const screen = await client(url);
    const controller = await client(url);
    const intruder = await client(url);
    const created = await createSession(screen);
    if (!created.ok) throw new Error(created.error);
    await joinSession(controller, created.code);

    const moves: Array<{ x: number; y: number }> = [];
    let actions = 0;
    screen.on("input:move", (input) => moves.push(input));
    screen.on("input:action", () => actions++);

    const validMove = nextEvent<{ x: number; y: number }>((resolve) =>
      screen.once("input:move", resolve),
    );
    const validAction = nextEvent<void>((resolve) =>
      screen.once("input:action", () => resolve()),
    );

    intruder.emit("controller:move", { x: 0.1, y: 0.2 });
    controller.emit("controller:move", { x: 0.4, y: -0.75 });
    controller.emit("controller:move", { x: 2, y: 0 });
    intruder.emit("controller:action");
    controller.emit("controller:action");

    await Promise.all([validMove, validAction]);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(moves).toEqual([{ x: 0.4, y: -0.75 }]);
    expect(actions).toBe(1);
  });

  it("isole les sessions et neutralise le mouvement à la déconnexion", async () => {
    const { url } = await runningServer();
    const screenA = await client(url);
    const screenB = await client(url);
    const controllerA = await client(url);
    const controllerB = await client(url);
    const sessionA = await createSession(screenA);
    const sessionB = await createSession(screenB);
    if (!sessionA.ok || !sessionB.ok) throw new Error("Création de session impossible");
    await joinSession(controllerA, sessionA.code);
    await joinSession(controllerB, sessionB.code);

    const movesA: Array<{ x: number; y: number }> = [];
    const movesB: Array<{ x: number; y: number }> = [];
    const statusesA: boolean[] = [];
    screenA.on("input:move", (move) => movesA.push(move));
    screenB.on("input:move", (move) => movesB.push(move));
    screenA.on("session:status", ({ controllerConnected }) => statusesA.push(controllerConnected));

    controllerA.emit("controller:move", { x: 1, y: 0 });
    await nextEvent<{ x: number; y: number }>((resolve) => screenA.once("input:move", resolve));
    expect(movesB).toEqual([]);

    const neutral = nextEvent<{ x: number; y: number }>((resolve) => {
      screenA.on("input:move", (move) => {
        if (move.x === 0 && move.y === 0) resolve(move);
      });
    });
    const disconnected = nextEvent<boolean>((resolve) => {
      screenA.on("session:status", ({ controllerConnected }) => {
        if (!controllerConnected) resolve(controllerConnected);
      });
    });
    controllerA.disconnect();
    const [neutralMove, disconnectedStatus] = await Promise.all([neutral, disconnected]);
    expect(neutralMove).toEqual({ x: 0, y: 0 });
    expect(disconnectedStatus).toBe(false);
    expect(movesA).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(statusesA).toEqual([false]);
  });

  it("sert le build et renvoie index.html pour une route SPA en production", async () => {
    const directory = await mkdtemp(join(tmpdir(), "petite-ile-server-"));
    temporaryDirectories.push(directory);
    const html = "<!doctype html><title>Petite Île</title>";
    await writeFile(join(directory, "index.html"), html, "utf8");
    const { url } = await runningServer({ production: true, staticDirectory: directory });

    const response = await fetch(`${url}/manette?code=123456`);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe(html);
  });
});
