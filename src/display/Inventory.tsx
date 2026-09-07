import type { InventorySlot } from '../game'

const itemSymbol: Record<string, string> = {
  shell: '◒',
  apple: '●',
  flower: '✿',
  sardine: '⌁',
  perch: '◈',
  carp: '◒',
}

export function Inventory({ slots }: { slots: readonly InventorySlot[] }) {
  return (
    <section className="inventory-card" aria-labelledby="inventory-title">
      <div className="inventory-card__heading">
        <div>
          <p>Vos trouvailles</p>
          <h2 id="inventory-title">Sac de plage</h2>
        </div>
        <span>{slots.filter(Boolean).length}/8</span>
      </div>
      <ol className="inventory-grid">
        {slots.map((slot, index) => (
          <li key={slot?.id ?? `empty-${index}`} className={slot ? `has-item item-${slot.type}` : ''}>
            {slot ? (
              <>
                <span aria-hidden="true">{itemSymbol[slot.type]}</span>
                <small>{slot.name}</small>
              </>
            ) : (
              <span className="inventory-empty" aria-label={`Emplacement ${index + 1} vide`} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
