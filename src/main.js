import './styles/app.css'
import { createGameHost } from './app/gameHost.js'
import { gameRegistry } from './app/gameRegistry.js'
import { showLaunchScreen } from './app/launchScreen.js'
import { flightChessGame } from './games/flightChess/index.js'

const root = document.getElementById('app')

gameRegistry.register(flightChessGame)
const host = createGameHost(root, gameRegistry)
showLaunchScreen()
host.mount(flightChessGame.id)
