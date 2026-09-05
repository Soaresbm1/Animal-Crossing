export function Tree({ className = '' }: { className?: string }) {
  return (
    <span className={`scene-tree ${className}`} aria-hidden="true">
      <i className="scene-tree__shadow" />
      <i className="scene-tree__trunk" />
      <i className="scene-tree__crown scene-tree__crown--back" />
      <i className="scene-tree__crown scene-tree__crown--front" />
      <i className="scene-tree__fruit" />
    </span>
  )
}

export function House() {
  return (
    <span className="scene-house" aria-label="Maison">
      <i className="scene-house__shadow" />
      <i className="scene-house__wall" />
      <i className="scene-house__roof" />
      <i className="scene-house__chimney" />
      <i className="scene-house__window scene-house__window--left" />
      <i className="scene-house__window scene-house__window--right" />
      <i className="scene-house__door" />
    </span>
  )
}

export function Player({ x, y, indoors }: { x: number; y: number; indoors: boolean }) {
  return (
    <span
      className={`player ${indoors ? 'player--indoors' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label="Votre personnage"
      data-testid="player"
      data-x={x.toFixed(2)}
      data-y={y.toFixed(2)}
    >
      <i className="player__shadow" />
      <i className="player__body" />
      <i className="player__head" />
      <i className="player__hair" />
      <i className="player__face" />
      <i className="player__bag" />
    </span>
  )
}

export function ItemSprite({ kind, x, y }: { kind: string; x: number; y: number }) {
  const labels: Record<string, string> = {
    shell: 'Coquillage',
    apple: 'Pomme',
    flower: 'Fleur',
  }

  return (
    <span
      className={`world-item world-item--${kind}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={labels[kind] ?? 'Objet'}
      data-testid={`item-${kind}`}
    >
      <i />
    </span>
  )
}
