import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { GameWorld } from './GameWorld'
import { Inventory } from './Inventory'
import { PairingPanel } from './PairingPanel'
import { useDisplaySession } from './useDisplaySession'
import { useGame } from './useGame'
import { WelcomeScreen } from './WelcomeScreen'

export function DisplayPage() {
  const [started, setStarted] = useState(false)
  const game = useGame()
  const session = useDisplaySession(
    game.setRemoteMovement,
    game.act,
    game.clearRemoteMovement,
  )

  const startGame = () => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    setStarted(true)
  }

  if (!started) return <WelcomeScreen onStart={startGame} />

  return (
    <main className="game-shell">
      <header className="game-header">
        <BrandMark compact />
        <div className="game-header__controls">
          <span><kbd>ZQSD</kbd> Se déplacer</span>
          <span><kbd>Espace</kbd> Agir</span>
          <span className="save-indicator"><i /> Sauvegarde locale</span>
        </div>
      </header>

      <div className="game-layout">
        <GameWorld state={game.state} onAction={game.act} />
        <aside className="game-sidebar">
          <PairingPanel session={session} />
          <Inventory slots={game.state.inventory} />
        </aside>
      </div>

      <div className={`game-toast ${game.message ? 'game-toast--visible' : ''}`} role="status" aria-live="polite">
        {game.message}
      </div>
    </main>
  )
}
