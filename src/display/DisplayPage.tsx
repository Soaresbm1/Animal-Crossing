import { useState } from 'react'
import { BrandMark } from './BrandMark'
import { GameWorld } from './GameWorld'
import { GameDialog } from './GameDialog'
import { useGame } from './useGame'
import { WelcomeScreen } from './WelcomeScreen'

export function DisplayPage() {
  const [started, setStarted] = useState(false)
  const game = useGame(started)

  const startGame = () => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    setStarted(true)
  }

  if (!started) return <WelcomeScreen onStart={startGame} />

  return (
    <main className="game-shell game-shell--immersive">
      <header className="game-header">
        <BrandMark compact />
        <div className="game-header__controls">
          <span><kbd>ZQSD</kbd> Se déplacer</span>
          <span><kbd>Espace</kbd> Agir</span>
          <button type="button" className="inventory-toggle" onClick={game.toggleInventory}><kbd>E</kbd> Inventaire</button>
          <span aria-label={`${game.state.coins} pièces`}>◉ {game.state.coins}</span>
          <span className="save-indicator"><i /> Sauvegarde locale</span>
        </div>
      </header>

      <div className="game-layout">
        <GameWorld state={game.state} onAction={game.act}>
          {game.panel && <GameDialog key={game.panel} game={game} />}
          <div className={`game-toast ${game.message && !game.panel ? 'game-toast--visible' : ''}`} role="status" aria-live="polite">{!game.panel && game.message}</div>
        </GameWorld>
      </div>

    </main>
  )
}
