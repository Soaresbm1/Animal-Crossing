/**
 * Socket.IO contract shared by the game screen, the mobile controller and the
 * server. Keeping it here prevents the three peers from silently drifting to
 * different event names or payload shapes.
 */
export const SESSION_CODE_LENGTH = 6;

export interface JoinSessionPayload {
  code: string;
}
export interface MoveInput {
  x: number;
  y: number;
}

/** Backwards-friendly descriptive alias used by some game modules. */
export type MovementInput = MoveInput;

export interface SessionStatus {
  controllerConnected: boolean;
}

export interface ProtocolError {
  message: string;
}

export type CreateSessionAck =
  | { ok: true; code: string }
  | { ok: false; error: string };

export type JoinSessionAck =
  | { ok: true; code: string }
  | { ok: false; error: string };

export type SessionAck = JoinSessionAck;

export interface ClientToServerEvents {
  "screen:create-session": (ack: (response: CreateSessionAck) => void) => void;
  "controller:join-session": (
    payload: JoinSessionPayload,
    ack: (response: JoinSessionAck) => void,
  ) => void;
  "controller:move": (input: MoveInput) => void;
  "controller:action": () => void;
}

export interface ServerToClientEvents {
  "session:status": (status: SessionStatus) => void;
  "session:error": (error: ProtocolError) => void;
  "input:move": (input: MoveInput) => void;
  "input:action": () => void;
}
