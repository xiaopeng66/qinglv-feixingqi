import { store } from '../../store.js'
import { EditView } from '../../views/EditView.js'
import { GameView } from '../../views/GameView.js'

export function createFlightChessSession(root) {
  let currentView = null
  let destroyed = false

  function replaceView(View, callbacks) {
    if (destroyed) return
    if (currentView) currentView.destroy()
    currentView = new View(root, store, callbacks)
  }

  function mountGame() {
    replaceView(GameView, { onEdit: mountEdit })
  }

  function mountEdit() {
    replaceView(EditView, { onBack: mountGame })
  }

  mountGame()

  return Object.freeze({
    destroy() {
      destroyed = true
      if (currentView) currentView.destroy()
      currentView = null
    }
  })
}
