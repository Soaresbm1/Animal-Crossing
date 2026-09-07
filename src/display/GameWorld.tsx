import { FISHING_POSITION, getDayPhase, LILA_POSITION, SHOP_POSITION, near, type GameState } from '../game'
import { ItemSprite } from './SceneDecor'
import { CharacterArt, House, Landscape, Player, Tree } from './IllustratedDecor'
import type { ReactNode } from 'react'

const formatGameTime = (minuteOfDay: number) => {
  const hours = Math.floor(minuteOfDay / 60)
  const minutes = Math.floor(minuteOfDay % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function GameWorld({ state, onAction, children }: { state: GameState; onAction: () => void; children?: ReactNode }) {
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
          <Landscape />
          <div className="water-glints" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="drifting-cloud" aria-hidden="true" />
          <House />
          <div className="island-resident" style={{ left: `${LILA_POSITION.x}%`, top: `${LILA_POSITION.y}%` }} aria-label="Lila"><CharacterArt resident /><b>Lila</b></div>
          <div className="island-shop" style={{ left: `${SHOP_POSITION.x}%`, top: `${SHOP_POSITION.y}%` }} aria-label="Boutique"><span><i /><i /><i /></span><b>Le petit marché</b></div>
          <div className={`fishing-spot ${state.fishing.rodOwned ? 'fishing-spot--active' : ''}`} style={{ left: `${FISHING_POSITION.x}%`, top: `${FISHING_POSITION.y}%` }} aria-label="Ponton de pêche"><i /><i /><i /></div>
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
          {state.furniture.position && <div className="placed-armchair" aria-label="Fauteuil sauge installé" style={{ left: `${state.furniture.position.x}%`, top: `${state.furniture.position.y}%` }}><i /></div>}
          <Player x={state.player.position.x} y={state.player.position.y} indoors />
        </div>
      )}

      <button className="action-prompt" type="button" onClick={onAction}>
        <kbd>Espace</kbd>
        <span>{outdoors ? near(state, LILA_POSITION) ? 'Parler à Lila' : near(state, SHOP_POSITION) ? 'Visiter la boutique' : near(state, FISHING_POSITION) ? state.fishing.rodOwned ? 'Pêcher au ponton' : 'Canne requise' : 'Ramasser ou entrer' : 'Sortir de la maison'}</span>
      </button>
      <div className="scene-tint" aria-hidden="true" />
      <div className="world-caption" aria-hidden="true"><span>{outdoors ? 'L’ARCHIPEL DES JOURS HEUREUX' : 'UN PETIT REFUGE'}</span><strong>{outdoors ? 'La douceur de ne rien presser.' : 'Bienvenue chez vous.'}</strong></div>
      {children}
    </section>
  )
}
