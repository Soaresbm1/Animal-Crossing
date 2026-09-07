import { useCallback, useEffect, useRef, useState } from 'react'
import { appleCount, FISH_CATALOG, FISHING_ROD_PRICE, type FishType } from '../game'
import { CharacterArt } from './IllustratedDecor'
import { Inventory } from './Inventory'
import type { GameControls } from './useGame'

export function GameDialog({ game }: { game: GameControls }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { state, panel, closePanel, progress } = game
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement
    element.showModal()
    return () => { element.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  const title = panel === 'lila' ? 'Un moment avec Lila' : panel === 'shop' ? 'Le petit marché' : panel === 'fishing' ? 'Au fil de l’eau' : 'Mon sac de plage'
  const eyebrow = panel === 'lila' ? 'UN GOÛTER DE BIENVENUE' : panel === 'shop' ? 'LES PETITS PLAISIRS DE L’ÎLE' : panel === 'fishing' ? 'LE PONTON DU SUD' : 'VOS TROUVAILLES'
  return <dialog ref={dialog} className="game-dialog" aria-labelledby="game-dialog-title" onCancel={event => { event.preventDefault(); closePanel() }}>
    <header className="game-dialog__header"><div><small>{eyebrow}</small><h2 id="game-dialog-title">{title}</h2></div><button type="button" onClick={closePanel} aria-label="Fermer la fenêtre">×</button></header>
    {panel === 'lila' && <div className="dialog-lila"><div className="dialog-portrait"><CharacterArt resident /></div><div><p>{state.quest === 'new' ? 'Bienvenue sur notre île ! Pour notre goûter, pourrais-tu me rapporter cinq pommes ? Je te donnerai 60 pièces pour aménager ta maison.' : state.quest === 'active' ? `Tu as ${appleCount(state)} pommes sur 5. Je prépare la table pendant que tu explores l’île !` : 'Merci pour les pommes ! Avec tes pièces, tu peux choisir un fauteuil au petit marché et l’installer chez toi.'}</p><button className="dialog-action" disabled={state.quest === 'complete' || (state.quest === 'active' && appleCount(state) < 5)} onClick={() => progress('talk')}>{state.quest === 'new' ? 'Accepter la mission' : state.quest === 'active' ? 'Donner les 5 pommes · +60 pièces' : 'Goûter préparé ✓'}</button></div></div>}
    {panel === 'shop' && <div className="dialog-market"><p className="dialog-balance">Votre porte-monnaie : <strong>{state.coins} pièces</strong></p><div className="dialog-products"><div className="dialog-product"><div className="armchair-preview" aria-hidden="true"><div className="placed-armchair"><i /></div></div><div><h3>Le fauteuil sauge</h3><p>Un coin douillet pour les fins de journée tranquilles.</p><button className="dialog-action" disabled={state.furniture.owned || state.coins < 40} onClick={() => progress('buy')}>{state.furniture.owned ? 'Fauteuil acheté ✓' : 'Acheter · 40 pièces'}</button></div></div><div className="dialog-product"><div className="rod-preview" aria-hidden="true"><i /><span>⌁</span></div><div><h3>La canne du rivage</h3><p>Pour tenter sa chance depuis le ponton au sud.</p><button className="dialog-action" disabled={state.fishing.rodOwned || state.coins < FISHING_ROD_PRICE} onClick={() => progress('buy-rod')}>{state.fishing.rodOwned ? 'Canne achetée ✓' : `Acheter · ${FISHING_ROD_PRICE} pièces`}</button></div></div></div><div className="dialog-sale"><h3>Vendre mes trouvailles</h3><p>Coquillage : 12 · Fleur : 8 · Pomme : 5<br />Sardine : 14 · Perche : 22 · Carpe : 35 pièces.</p><button className="dialog-action" onClick={() => progress('sell')}>Vendre le contenu du sac</button></div></div>}
    {panel === 'inventory' && <><Inventory slots={state.inventory} /><section className="fish-journal"><h3>Carnet de pêche</h3><div className="fish-journal__grid">{Object.entries(FISH_CATALOG).map(([key, fish]) => <div className={state.fishing.collection.includes(key as FishType) ? 'is-found' : ''} key={key}><span>{state.fishing.collection.includes(key as FishType) ? '◈' : '?'}</span><small>{state.fishing.collection.includes(key as FishType) ? fish.name : 'Espèce inconnue'}</small></div>)}</div></section><section className="dialog-furniture"><h3>Ma décoration</h3>{state.furniture.owned ? <><p>Fauteuil sauge {state.furniture.position ? '· installé' : '· prêt à installer'}</p><button className="dialog-action" disabled={state.scene !== 'house'} onClick={() => progress('place')}>{state.furniture.position ? 'Déplacer le fauteuil ici' : 'Installer le fauteuil ici'}</button><small>{state.scene === 'house' ? 'Fermez le sac, placez-vous au centre du tapis, puis rouvrez-le pour installer le fauteuil.' : 'Entrez dans votre maison pour installer le fauteuil.'}</small></> : <p>Les meubles achetés au marché apparaîtront ici.</p>}</section></>}
    {panel === 'fishing' && <FishingGame game={game} />}
    {game.message && <p className="dialog-feedback" role="status">{game.message}</p>}
    <footer className="game-dialog__footer">{panel === 'inventory' ? 'E ou Échap pour fermer' : 'Échap pour revenir sur l’île'} · Jeu en pause</footer>
  </dialog>
}

type FishingPhase = 'ready' | 'waiting' | 'bite' | 'caught' | 'missed' | 'full'

function FishingGame({ game }: { game: GameControls }) {
  const [phase, setPhase] = useState<FishingPhase>('ready')
  const timeout = useRef<number | undefined>(undefined)
  const species = Object.keys(FISH_CATALOG) as FishType[]
  const nextFish = species[(game.state.fishing.catchCount + game.state.clock.day) % species.length]
  const clearTimer = () => window.clearTimeout(timeout.current)
  const cast = useCallback(() => {
    clearTimer()
    setPhase('waiting')
    timeout.current = window.setTimeout(() => {
      setPhase('bite')
      timeout.current = window.setTimeout(() => setPhase('missed'), 950)
    }, 1300 + (game.state.fishing.catchCount % 3) * 450)
  }, [game.state.fishing.catchCount])
  const strike = useCallback(() => {
    if (phase === 'ready' || phase === 'caught' || phase === 'missed' || phase === 'full') { cast(); return }
    clearTimer()
    if (phase === 'waiting') { setPhase('missed'); return }
    setPhase(game.catchFish(nextFish) ? 'caught' : 'full')
  }, [cast, game, nextFish, phase])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === ' ') { event.preventDefault(); if (!event.repeat) strike() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [strike])
  useEffect(() => {
    const timer = timeout
    return () => window.clearTimeout(timer.current)
  }, [])
  const text = phase === 'ready' ? 'Lance ta ligne et observe le bouchon.' : phase === 'waiting' ? 'Patience… n’appuie pas encore.' : phase === 'bite' ? 'Ça mord !' : phase === 'caught' ? game.message : phase === 'full' ? 'Ton sac est plein.' : 'Trop tôt ou trop tard… Le poisson s’est échappé.'
  return <section className={`fishing-game fishing-game--${phase}`}><div className="fishing-water"><span className="fishing-float" /><i /><i /><i /></div><p role="status">{text}</p><button className="dialog-action" type="button" onClick={strike}>{phase === 'waiting' || phase === 'bite' ? 'Remonter · Espace' : 'Lancer la ligne · Espace'}</button><small>Attends que « Ça mord ! » apparaisse, puis appuie vite sur Espace.</small></section>
}
