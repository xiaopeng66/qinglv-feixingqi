// 应用入口
import './styles/app.css'
import { store } from './store.js'
import { GameView } from './views/GameView.js'
import { EditView } from './views/EditView.js'

const root = document.getElementById('app')
let currentView = null

function mountGame() {
  if (currentView) currentView.destroy()
  currentView = new GameView(root, store, { onEdit: mountEdit })
}

function mountEdit() {
  if (currentView) currentView.destroy()
  currentView = new EditView(root, store, { onBack: mountGame })
}

mountGame()
