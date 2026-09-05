import { spawn } from "node:child_process";
import { createServer } from "node:net";

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        reject(new Error("Impossible de choisir un port de test."));
        return;
      }
      const { port } = address;
      probe.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

async function waitForHealth(url, child, output) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Le serveur s’est arrêté prématurément.\n${output()}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return response;
    } catch {
      // The server may still be starting; retry briefly.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Le serveur n’a pas répondu à temps.\n${output()}`);
}

const port = await availablePort();
const url = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server-dist/server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    NODE_ENV: "production",
    PORT: String(port),
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
child.stdout.on("data", (chunk) => (logs += chunk.toString()));
child.stderr.on("data", (chunk) => (logs += chunk.toString()));

try {
  const health = await waitForHealth(url, child, () => logs);
  const body = await health.json();
  if (body.status !== "ok") throw new Error("Réponse de santé inattendue.");

  const [home, page, manifest, serviceWorker, socketHandshake] = await Promise.all([
    fetch(`${url}/`),
    fetch(`${url}/controller?code=123456`),
    fetch(`${url}/manifest.webmanifest`),
    fetch(`${url}/sw.js`),
    fetch(`${url}/socket.io/?EIO=4&transport=polling`),
  ]);
  const [homeHtml, html, manifestJson, workerSource, handshake] = await Promise.all([
    home.text(),
    page.text(),
    manifest.json(),
    serviceWorker.text(),
    socketHandshake.text(),
  ]);
  if (!home.ok || !homeHtml.toLowerCase().includes("<!doctype html")) {
    throw new Error("La page d’accueil de production est indisponible.");
  }
  if (!page.ok || !html.toLowerCase().includes("<!doctype html")) {
    throw new Error("Le fallback SPA de production ne renvoie pas index.html.");
  }
  if (!manifest.ok || manifestJson.start_url !== "/controller") {
    throw new Error("Le manifeste PWA est invalide ou indisponible.");
  }
  if (!serviceWorker.ok || !workerSource.includes("petite-ile-shell")) {
    throw new Error("Le service worker est invalide ou indisponible.");
  }
  if (!socketHandshake.ok || !handshake.startsWith("0{")) {
    throw new Error("La négociation Socket.IO de production a échoué.");
  }

  console.log(`Smoke test production réussi sur ${url}.`);
} finally {
  if (child.exitCode === null) child.kill("SIGTERM");
  await new Promise((resolveExit) => {
    if (child.exitCode !== null) resolveExit();
    else child.once("exit", resolveExit);
  });
}
