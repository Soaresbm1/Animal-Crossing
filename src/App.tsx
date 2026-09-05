import { ControllerPage } from './controller/ControllerPage'
import { DisplayPage } from './display/DisplayPage'

export function App() {
  const isController = window.location.pathname.startsWith('/controller')

  return isController ? <ControllerPage /> : <DisplayPage />
}
