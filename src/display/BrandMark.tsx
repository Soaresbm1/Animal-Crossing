export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`} aria-label="Petite Île">
      <span className="brand-mark__sun" aria-hidden="true" />
      <span className="brand-mark__words">
        <span>Petite</span>
        <strong>Île</strong>
      </span>
    </span>
  )
}
