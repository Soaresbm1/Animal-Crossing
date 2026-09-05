import { getDayPhase, type GameState } from '../game'
import { House, ItemSprite, Player, Tree } from './SceneDecor'

const formatGameTime = (minuteOfDay: number) => {
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = Math.floor(minuteOfDay % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function GameWorld({ state, onAction }: { state: GameState; onAction: () => void }) {
  const dayPhase = getDayPhase(state.clock)
  const outdoors = state.scene === 'island'

  return (
    <section className={`game-world game-world--${dayPhase} ${outdoors ? '' : 'game-world--indoors'}`}>
      <div className="world-time">
        <span aria-hidden="true">{dayPhase === 'night' ? '☾' : dayPhase === 'dusk' ? '◐' : '☀'}</span>
        <div>
          <strong>{formatGameTime(state.clock.minuteOfDay)}</strong>
          <small>Jour {state.clock.day}</small>
        </div>
      </div>

      {outdoors ? (
        <div className="island-scene" data-testid="island-scene">
          <div className="island-scene__water" aria-hidden="true" />
          <div className="island-scene__land" aria-hidden="true">
            <i className="shore-line shore-line--one" />
            <i className="shore-line shore-line--two" />
            <i className="path-to-home" />
          </div>
          <House />
          <Tree className="scene-tree--one" />
          <Tree className="scene-tree--two" />
          <Tree className="scene-tree--three" />
          <span className="grass-clump grass-clump--one" aria-hidden="true">〽</span>
          <span className="grass-clump grass-clump--two" aria-hidden="true">〽</span>
          <span className="grass-clump grass-clump--three" aria-hidden="true">〽</span>
          {state.collectibles
            .filter((item) => !item.collected)
            .map((item) => (
              <ItemSprite key={item.id} kind={item.type} x={item.position.x} y={item.position.y} />
            ))}
          <Player x={state.player.position.x} y={state.player.position.y} indoors={false} />
        </div>
      ) : (
        <div className="house-scene" data-testid="house-scene">
          <div className="house-scene__wall" aria-hidden="true">
            <span className="inside-window"><i /></span>
            <span className="shelf"><i /><i /><i /></span>
          </div>
          <div className="house-scene__floor" aria-hidden="true" />
          <div className="inside-rug" aria-hidden="true" />
          <div className="inside-bed" aria-hidden="true"><i /></div>
          <div className="inside-table" aria-hidden="true"><i /></div>
          <div className="inside-door" aria-label="Sortie" />
          <Player x={state.player.position.x} y={state.player.position.y} indoors />
        </div>
      )}

      <button className="action-prompt" type="button" onClick={onAction}>
        <kbd>Espace</kbd>
        <span>{outdoors ? 'Ramasser ou entrer' : 'Sortir de la maison'}</span>
      </button>
      <div className="scene-tint" aria-hidden="true" />
    </section>
  )
}
