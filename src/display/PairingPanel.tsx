import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { DisplaySession } from './useDisplaySession'

export function PairingPanel({ session }: { session: DisplaySession }) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  const controllerUrl = useMemo(() => {
    if (!session.code) return null
    const url = new URL('/controller', window.location.origin)
    url.searchParams.set('code', session.code)
    return url.toString()
  }, [session.code])

  useEffect(() => {
    let active = true
    if (!controllerUrl) {
      return
    }

    void QRCode.toDataURL(controllerUrl, {
      width: 228,
      margin: 1,
      color: { dark: '#173f3aff', light: '#fffaf0ff' },
    }).then((dataUrl) => {
      if (active) setQrCode(dataUrl)
    })

    return () => {
      active = false
    }
  }, [controllerUrl])

  const statusLabel = !session.serverConnected
    ? 'Serveur indisponible'
    : session.controllerConnected
      ? 'Manette connectée'
      : 'En attente de l’iPhone'

  return (
    <section className="pairing-card" aria-labelledby="pairing-title">
      <div className="panel-heading">
        <span className="panel-heading__icon" aria-hidden="true">⌁</span>
        <div>
          <p>Jouer avec l’iPhone</p>
          <h2 id="pairing-title">Associer la manette</h2>
        </div>
      </div>

      <div className="connection-status" data-connected={session.controllerConnected}>
        <span aria-hidden="true" />
        {statusLabel}
      </div>

      <div className="pairing-card__content">
        <div className="qr-shell">
          {controllerUrl && qrCode ? <img src={qrCode} alt="QR code ouvrant la manette Petite Île" /> : <span>…</span>}
        </div>
        <div className="pairing-code">
          <p>ou saisir le code</p>
          <strong aria-label={`Code de session ${session.code ?? 'en création'}`}>
            {session.code ?? '······'}
          </strong>
          <small>Valable pour cette session</small>
        </div>
      </div>

      {isLocalhost && (
        <p className="pairing-warning">
          Pour scanner depuis l’iPhone, ouvrez cette page avec l’adresse IP locale du Lenovo, pas avec localhost.
        </p>
      )}
      {session.error && <p className="pairing-error">{session.error}</p>}
    </section>
  )
}
