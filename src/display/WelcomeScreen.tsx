import { BrandMark } from './BrandMark'

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
          <div className="mini-island">
            <span className="mini-island__water" />
            <span className="mini-island__sand" />
            <span className="mini-island__grass" />
            <span className="mini-island__house"><i /></span>
            <span className="mini-island__tree mini-island__tree--one" />
            <span className="mini-island__tree mini-island__tree--two" />
            <span className="mini-island__person" />
          </div>
        </div>

        <div className="welcome-card__copy">
          <p className="eyebrow">Un petit monde à votre rythme</p>
          <h1 id="welcome-title"><BrandMark /></h1>
          <p className="welcome-card__lead">
            Explorez le rivage, cueillez quelques trésors et retrouvez la chaleur de votre maison.
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
