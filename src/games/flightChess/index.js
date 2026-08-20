import { createFlightChessSession } from './session.js'

export const flightChessGame = Object.freeze({
  id: 'flight-chess',
  title: '情侣飞行棋',
  description: '一款面向两人的本地互动棋盘游戏',
  createSession: createFlightChessSession
})
