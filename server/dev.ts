import { startServer } from './index.js'

const server = await startServer({ host: '0.0.0.0', port: 3001, production: false })
console.log('Serveur temps réel disponible sur http://localhost:3001')

const shutdown = async () => {
  await server.close()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
