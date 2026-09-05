import { randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import { resolve } from "node:path";

import express, { type Express } from "express";
import { Server as SocketServer, type Socket } from "socket.io";

import {
  SESSION_CODE_LENGTH,
  type ClientToServerEvents,
  type CreateSessionAck,
  type JoinSessionAck,
  type JoinSessionPayload,
  type MoveInput,
  type ServerToClientEvents,
} from "../src/shared/protocol.js";

type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Session {
  code: string;
  screenId: string;
  controllerId?: string;
}
export interface GameServerOptions {
  /** Override production mode in tests without mutating process.env. */
  production?: boolean;
  /** Directory containing the Vite production output. */
  staticDirectory?: string;
}

export interface GameServer {
  app: Express;
  httpServer: HttpServer;
  io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
  close: () => Promise<void>;
}

const CODE_PATTERN = new RegExp(`^\\d{${SESSION_CODE_LENGTH}}$`);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJoinSessionPayload(value: unknown): value is JoinSessionPayload {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.code === "string" &&
    CODE_PATTERN.test(value.code)
  );
}

export function isMoveInput(value: unknown): value is MoveInput {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    value.x >= -1 &&
    value.x <= 1 &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    value.y >= -1 &&
    value.y <= 1
  );
}

function sessionCode(sessions: Map<string, Session>): string {
  if (sessions.size >= 1_000_000) {
    throw new Error("Toutes les sessions disponibles sont utilisées.");
  }

  let code: string;
  do {
    code = randomInt(0, 1_000_000).toString().padStart(SESSION_CODE_LENGTH, "0");
  } while (sessions.has(code));
  return code;
}

export function createGameServer(options: GameServerOptions = {}): GameServer {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: true, credentials: true },
  });

  const sessions = new Map<string, Session>();
  const screenSessions = new Map<string, string>();
  const controllerSessions = new Map<string, string>();

  app.disable("x-powered-by");
  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  const production = options.production ?? process.env.NODE_ENV === "production";
  const staticDirectory = resolve(options.staticDirectory ?? "dist");

  if (production) {
    app.use(express.static(staticDirectory));
    app.use((request, response, next) => {
      if (
        request.method !== "GET" ||
        request.path.startsWith("/api/") ||
        request.path.startsWith("/socket.io/")
      ) {
        next();
        return;
      }

      const indexFile = resolve(staticDirectory, "index.html");
      if (!existsSync(indexFile)) {
        response.status(503).json({ error: "Le client de production n'est pas construit." });
        return;
      }
      response.sendFile(indexFile);
    });
  }

  function emitStatus(session: Session, controllerConnected: boolean): void {
    io.to(session.screenId).emit("session:status", { controllerConnected });
    if (session.controllerId) {
      io.to(session.controllerId).emit("session:status", { controllerConnected });
    }
  }

  function detachController(session: Session): void {
    const controllerId = session.controllerId;
    if (!controllerId) return;

    controllerSessions.delete(controllerId);
    session.controllerId = undefined;
    io.to(session.screenId).emit("input:move", { x: 0, y: 0 });
    emitStatus(session, false);
  }

  function removeScreenSession(screenId: string): void {
    const code = screenSessions.get(screenId);
    if (!code) return;

    const session = sessions.get(code);
    screenSessions.delete(screenId);
    sessions.delete(code);

    if (session?.controllerId) {
      controllerSessions.delete(session.controllerId);
      io.to(session.controllerId).emit("session:status", { controllerConnected: false });
      io.to(session.controllerId).emit("session:error", {
        message: "L’écran de jeu a fermé la session.",
      });
    }
  }

  io.on("connection", (socket: RealtimeSocket) => {
    socket.on("screen:create-session", (ack) => {
      if (typeof ack !== "function") {
        socket.emit("session:error", { message: "Demande de session invalide." });
        return;
      }

      if (controllerSessions.has(socket.id)) {
        const response: CreateSessionAck = {
          ok: false,
          error: "Une manette ne peut pas créer une session de jeu.",
        };
        ack(response);
        return;
      }

      removeScreenSession(socket.id);

      try {
        const code = sessionCode(sessions);
        const session: Session = { code, screenId: socket.id };
        sessions.set(code, session);
        screenSessions.set(socket.id, code);
        emitStatus(session, false);
        ack({ ok: true, code });
      } catch (error) {
        ack({
          ok: false,
          error: error instanceof Error ? error.message : "Impossible de créer la session.",
        });
      }
    });

    socket.on("controller:join-session", (payload, ack) => {
      if (typeof ack !== "function") {
        socket.emit("session:error", { message: "Demande de connexion invalide." });
        return;
      }

      if (!isJoinSessionPayload(payload)) {
        const response: JoinSessionAck = {
          ok: false,
          error: "Le code doit contenir exactement six chiffres.",
        };
        ack(response);
        return;
      }

      if (screenSessions.has(socket.id)) {
        ack({ ok: false, error: "L’écran de jeu ne peut pas devenir une manette." });
        return;
      }

      const currentCode = controllerSessions.get(socket.id);
      if (currentCode) {
        if (currentCode === payload.code) {
          ack({ ok: true, code: currentCode });
        } else {
          ack({ ok: false, error: "Cette manette est déjà associée à une session." });
        }
        return;
      }

      const session = sessions.get(payload.code);
      if (!session) {
        ack({ ok: false, error: "Session introuvable." });
        return;
      }
      if (session.controllerId) {
        ack({ ok: false, error: "Une manette est déjà connectée à cette session." });
        return;
      }

      session.controllerId = socket.id;
      controllerSessions.set(socket.id, session.code);
      emitStatus(session, true);
      ack({ ok: true, code: session.code });
    });

    socket.on("controller:move", (input) => {
      if (!isMoveInput(input)) {
        socket.emit("session:error", { message: "Commande de déplacement invalide." });
        return;
      }

      const code = controllerSessions.get(socket.id);
      const session = code ? sessions.get(code) : undefined;
      if (!session || session.controllerId !== socket.id) {
        socket.emit("session:error", { message: "Cette manette n’est pas associée." });
        return;
      }

      io.to(session.screenId).emit("input:move", input);
    });

    // The cast keeps the public protocol ergonomic (an action has no payload)
    // while retaining a runtime arity check against untyped/malicious clients.
    const onAction = (...args: unknown[]): void => {
      if (args.length !== 0) {
        socket.emit("session:error", { message: "Commande d’action invalide." });
        return;
      }

      const code = controllerSessions.get(socket.id);
      const session = code ? sessions.get(code) : undefined;
      if (!session || session.controllerId !== socket.id) {
        socket.emit("session:error", { message: "Cette manette n’est pas associée." });
        return;
      }

      io.to(session.screenId).emit("input:action");
    };
    socket.on("controller:action", onAction as ClientToServerEvents["controller:action"]);

    socket.on("disconnect", () => {
      const controllerCode = controllerSessions.get(socket.id);
      if (controllerCode) {
        const session = sessions.get(controllerCode);
        if (session?.controllerId === socket.id) detachController(session);
      }
      removeScreenSession(socket.id);
    });
  });

  return {
    app,
    httpServer,
    io,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        if (!httpServer.listening) {
          io.close();
          resolveClose();
          return;
        }
        io.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      }),
  };
}
