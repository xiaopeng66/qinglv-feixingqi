// 游戏状态与核心逻辑（发布-订阅模式）
import { createDefaultSquares, STORAGE_KEYS } from './data.js'

const listeners = new Set()
const LAST_POSITION = 47
const POSITION_SCHEME = 'task-positions-v2'

function defaultPlayers() {
  return [
    { id: 'boy', name: '男生', color: '#8B7BF3', emoji: '👦', position: 0, paused: false },
    { id: 'girl', name: '女生', color: '#FF8FAB', emoji: '👧', position: 0, paused: false }
  ]
}

function initialState() {
  return {
    players: defaultPlayers(),
    current: 0,
    diceValue: 0,
    rolling: false,
    moving: false,
    movePath: [],
    winner: null,
    rerollPending: false,
    effects: [],
    completedTasks: {},
    soundEnabled: true,
    phase: 'idle', // idle | rolling | moving | effects | done
    squares: createDefaultSquares(),
    notice: null
  }
}

function loadState() {
  try {
    const squares = JSON.parse(localStorage.getItem(STORAGE_KEYS.squares))
    const players = JSON.parse(localStorage.getItem(STORAGE_KEYS.players))
    const game = JSON.parse(localStorage.getItem(STORAGE_KEYS.game))
    if (Array.isArray(squares) && squares.length === 48 && Array.isArray(players) && players.length === 2) {
      const usesTaskPositions = game?.positionScheme === POSITION_SCHEME
      const restoredPlayers = players.map(player => {
        const savedPosition = Number.isInteger(player.position) ? player.position : 0
        // Earlier releases counted the hidden start cell as position 1. Shift that
        // representation once so position 1 always means the visible first task.
        const position = usesTaskPositions ? savedPosition : Math.max(0, savedPosition - 1)
        return { ...player, position: Math.max(0, Math.min(LAST_POSITION, position)) }
      })
      const completedTasks = game?.completedTasks && typeof game.completedTasks === 'object'
        ? game.completedTasks
        : {}
      const soundEnabled = game?.soundEnabled !== false
      const base = { ...initialState(), squares, players: restoredPlayers, completedTasks, soundEnabled }
      if (game && typeof game === 'object') {
        if (Number.isInteger(game.current) && game.current >= 0 && game.current < players.length) base.current = game.current
        if (Number.isInteger(game.diceValue) && game.diceValue >= 1 && game.diceValue <= 6) base.diceValue = game.diceValue
      }
      return base
    }
  } catch (e) { /* ignore */ }
  return null
}

let state = loadState() || initialState()

function emit() {
  listeners.forEach(fn => fn(state))
  persist()
}

function currentPlayer() {
  return state.players[state.current]
}

function normalTaskText(square, playerId) {
  const key = playerId === 'girl' ? 'girlText' : 'boyText'
  return square[key] || square.text || '自定义任务内容'
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEYS.squares, JSON.stringify(state.squares))
    localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(state.players))
    localStorage.setItem(STORAGE_KEYS.game, JSON.stringify({
      current: state.current,
      diceValue: state.diceValue,
      positionScheme: POSITION_SCHEME,
      completedTasks: state.completedTasks,
      soundEnabled: state.soundEnabled
    }))
  } catch (e) { /* ignore */ }
}

function movementPath(startPos, steps, direction = 1) {
  const path = []
  let pos = startPos

  for (let i = 0; i < steps; i++) {
    const next = Math.max(0, Math.min(LAST_POSITION, pos + direction))
    if (next === pos) break
    pos = next
    path.push(pos)
  }

  return { finalPos: pos, path }
}

function effectsForLanding(pos) {
  // Position 0 is the start cell; visible task N is stored at array index N.
  const sq = state.squares[pos]
  if (!sq || sq.type === 'start') return []
  if (sq.type === 'normal') return [{ type: 'normal', squareId: sq.id, duration: Number(sq.duration) || 0, text: normalTaskText(sq, currentPlayer().id) }]
  if (sq.type === 'forward' || sq.type === 'backward') {
    return [{ type: sq.type, squareId: sq.id, duration: Number(sq.duration) || 0, text: sq.text, value: Math.max(1, Number(sq.value) || 1) }]
  }
  if (sq.type === 'pause' || sq.type === 'reroll' || sq.type === 'finish') {
    return [{ type: sq.type, squareId: sq.id, duration: Number(sq.duration) || 0, text: sq.text }]
  }
  return []
}

// 计算一次掷骰的移动路径；特殊格的额外移动会在确认弹窗后单独执行。
function computeMove(startPos, steps) {
  const { finalPos, path } = movementPath(startPos, steps)
  return { finalPos, path, effects: effectsForLanding(finalPos) }
}

export const store = {
  get state() { return state },

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  rollDice() {
    if (state.rolling || state.moving || state.winner || state.phase === 'effects') return
    const p = currentPlayer()
    if (p.paused) return
    if (p.position >= LAST_POSITION) return
    state.rolling = true
    state.phase = 'rolling'
    emit()
  },

  // 骰子动画结束后由视图调用，传入最终点数
  commitRoll(value) {
    const p = currentPlayer()
    const start = p.position
    const { finalPos, path, effects } = computeMove(start, value)
    state.diceValue = value
    state.rolling = false
    state.moving = true
    state.movePath = path
    state._moveFinal = finalPos
    state._moveEffects = effects
    state.phase = 'moving'
    emit()
  },

  // 棋子移动动画结束后由视图调用
  finishMove() {
    const p = currentPlayer()
    p.position = state._moveFinal
    state.moving = false
    state.movePath = []
    state._moveFinal = null
    const effects = state._moveEffects
    state._moveEffects = null
    state.effects = effects
    if (state.effects.length === 0) {
      // 落到起点等无效果格子时，直接结束回合。
      this.finishTurn()
    } else {
      state.phase = 'effects'
      emit()
    }
  },

  confirmEffect() {
    if (state.phase !== 'effects' || state.effects.length === 0) return
    const eff = state.effects.shift()
    if (eff.type === 'forward' || eff.type === 'backward') {
      const direction = eff.type === 'forward' ? 1 : -1
      const { finalPos, path } = movementPath(currentPlayer().position, eff.value, direction)
      state.moving = true
      state.movePath = path
      state._moveFinal = finalPos
      state._moveEffects = effectsForLanding(finalPos)
      state.phase = 'moving'
      emit()
      return
    }
    if ((eff.type === 'normal' || eff.type === 'finish') && Number.isInteger(eff.squareId)) {
      const marks = state.completedTasks[eff.squareId] || {}
      state.completedTasks[eff.squareId] = { ...marks, [currentPlayer().id]: true }
    }
    if (eff.type === 'pause') currentPlayer().paused = true
    if (eff.type === 'reroll') state.rerollPending = true
    if (state.effects.length === 0) {
      this.finishTurn()
    } else {
      emit()
    }
  },

  finishTurn() {
    const p = currentPlayer()
    if (p.position >= LAST_POSITION) {
      state.winner = p.id
      state.phase = 'done'
      emit()
      return
    }
    if (state.rerollPending) {
      state.rerollPending = false
      state.phase = 'idle'
      emit()
      return
    }
    let next = (state.current + 1) % state.players.length
    let skipped = false
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[next].paused) {
        state.players[next].paused = false
        if (!skipped) {
          this.showNotice(`${state.players[next].name} 被暂停，跳过本回合`)
          skipped = true
        }
        next = (next + 1) % state.players.length
      } else {
        break
      }
    }
    state.current = next
    state.phase = 'idle'
    emit()
  },

  showNotice(text) {
    state.notice = text
    emit()
    clearTimeout(state._noticeTimer)
    state._noticeTimer = setTimeout(() => {
      state.notice = null
      emit()
    }, 2400)
  },

  resetGame() {
    state.players = defaultPlayers()
    state.current = 0
    state.diceValue = 0
    state.rolling = false
    state.moving = false
    state.winner = null
    state.rerollPending = false
    state.effects = []
    state.completedTasks = {}
    state.phase = 'idle'
    state.notice = null
    emit()
  },

  saveSquares(squares) {
    state.squares = squares
    emit()
  },

  resetSquares() {
    state.squares = createDefaultSquares()
    emit()
  },

  savePlayers(players) {
    if (Array.isArray(players) && players.length === 2) {
      state.players = players.map(p => ({ ...p }))
      emit()
    }
  },
  setSoundEnabled(enabled) {
    state.soundEnabled = enabled !== false
    emit()
  }
}
