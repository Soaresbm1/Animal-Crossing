import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { createGameServer, type GameServer } from "./app.js";

export interface StartServerOptions {
  host?: string;
  port?: number;
  production?: boolean;
}

function configuredPort(): number {
  const rawPort = process.env.PORT ?? "3000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`PORT invalide: ${rawPort}`);
  }
  return port;
}

export async function startServer(options: StartServerOptions = {}): Promise<GameServer> {
  const server = createGameServer({ production: options.production });
  const port = options.port ?? configuredPort();
  const host = options.host ?? process.env.HOST ?? "0.0.0.0";

  await new Promise<void>((resolveListen, rejectListen) => {
    server.httpServer.once("error", rejectListen);
    server.httpServer.listen(port, host, () => {
      server.httpServer.off("error", rejectListen);
      resolveListen();
    });
  });

  return server;
}

async function main(): Promise<void> {
  const server = await startServer({ production: true });
  const address = server.httpServer.address();
  const port = typeof address === "object" && address ? address.port : configuredPort();
  console.log(`Petite Île écoute sur http://localhost:${port}`);

  const shutdown = async (): Promise<void> => {
    await server.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const entryPoint = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPoint === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
