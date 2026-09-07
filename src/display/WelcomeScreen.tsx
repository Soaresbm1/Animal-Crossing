import { BrandMark } from './BrandMark'
import { House, Landscape, Player, Tree } from './IllustratedDecor'

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="welcome-shell">
      <div className="welcome-shell__sky" aria-hidden="true">
        <span className="cloud cloud--one" />
        <span className="cloud cloud--two" />
        <span className="cloud cloud--three" />
      </div>

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-card__art" aria-hidden="true">
          <div className="welcome-island">
            <Landscape />
            <House />
            <Tree className="scene-tree--one" />
            <Tree className="scene-tree--two" />
            <Player x={50} y={58} indoors={false} />
          </div>
        </div>

        <div className="welcome-card__copy">
          <p className="eyebrow">Un petit monde à votre rythme</p>
          <h1 id="welcome-title"><BrandMark /></h1>
          <p className="welcome-card__lead">
            Rencontrez Lila, préparez un goûter de pommes et offrez à votre maison son premier fauteuil.
          </p>
          <button className="primary-button" type="button" onClick={onStart}>
            <span>Explorer l’île</span>
            <span aria-hidden="true">→</span>
          </button>
          <p className="welcome-card__hint">
            <kbd>ZQSD</kbd> ou <kbd>↑ ↓ ← →</kbd> pour marcher · <kbd>Espace</kbd> pour agir
          </p>
        </div>
      </section>

      <p className="welcome-footer">Prototype original · progression sauvegardée sur cet appareil</p>
    </main>
  )
}
