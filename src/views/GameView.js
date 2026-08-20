// 游戏主界面：螺旋棋盘 + 回合指示 + 3D 骰子 + 任务/胜利/设置弹窗 + 菜单
import { renderBoardCellsHtml, renderTaskCompletionMarks } from '../board.js'
import { icon } from '../icons.js'
import { escapeHtml } from '../utils.js'
import { playSound } from '../sound.js'

// 共用五官；性别差异由发型轮廓和心形发饰表达，避免仅靠微小蝴蝶结区分。
const FACE = '<span class="token-hair" aria-hidden="true"></span><span class="eye l"></span><span class="eye r"></span><span class="smile"></span>'

export class GameView {
  constructor(root, store, callbacks) {
    this.root = root
    this.store = store
    this.callbacks = callbacks
    this.animPos = null
    this.animTimer = null
    this.animating = false
    this.diceTimer = null
    this.diceFaceTimer = null
    this.modalCloseTimer = null
    this.diceRolling = false
    this.lastDiceValue = 0
    this.modalLocked = false
    this.taskTimerInterval = null
    this.taskTimerKey = null
    this.taskDeadline = 0
    this.taskTimerTimedOut = false
    this.taskTimerStarted = false
    this.winModalShown = false
    this.unsub = store.subscribe(() => this.update())
    this.render()
  }

  destroy() {
    this.unsub()
    this.cancelGameAnimations()
    clearTimeout(this.modalCloseTimer)
    this.clearTaskCountdown()
    this.root.innerHTML = ''
  }

  // A reset can happen while dice or token timers are pending. Cancel them so a
  // callback from the previous game cannot advance the freshly reset state.
  cancelGameAnimations() {
    clearTimeout(this.diceTimer)
    clearInterval(this.diceFaceTimer)
    clearTimeout(this.animTimer)
    this.diceTimer = null
    this.diceFaceTimer = null
    this.animTimer = null
    this.diceRolling = false
    this.animating = false
    this.animPos = null
    this.diceEl?.classList.remove('rolling')
  }

  render() {
    const s = this.store.state
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <button class="icon-btn" data-action="menu" aria-label="菜单">${icon('more-horizontal', 22)}</button>
          <div class="app-brand"><span class="app-brand-mark">${icon('logo', 22)}</span><h1>情侣飞行棋</h1></div>
          <button class="icon-btn" data-action="edit" aria-label="编辑棋盘">${icon('pencil', 18)}</button>
        </header>
        <div class="game-view">
          <section class="turn-bar" id="turn-bar"></section>
          <section class="board-section">
            <div class="board-grid" id="board">${renderBoardCellsHtml(s.squares, s.completedTasks)}</div>
          </section>
          <section class="dice-area">
            <div class="dice-3d" id="dice" aria-label="骰子"></div>
            <button class="roll-btn" id="roll-btn" data-action="roll">${icon('dices', 20)}<span>掷骰子</span></button>
            <p class="dice-hint">点击掷骰子，按点数前进</p>
          </section>
          <div class="ambient-ornaments" aria-hidden="true">
            <span class="ambient-mark ambient-mark--heart">${icon('heart', 20)}</span>
            <span class="ambient-mark ambient-mark--dices">${icon('dices', 22)}</span>
            <span class="ambient-mark ambient-mark--sparkle">${icon('sparkles', 18)}</span>
          </div>
        </div>
        <div id="menu-root"></div>
        <div id="modal-root"></div>
        <div id="toast-root"></div>
      </div>
    `
    this.boardEl = this.root.querySelector('#board')
    this.turnBarEl = this.root.querySelector('#turn-bar')
    this.diceEl = this.root.querySelector('#dice')
    this.rollBtn = this.root.querySelector('#roll-btn')
    this.menuRoot = this.root.querySelector('#menu-root')
    this.modalRoot = this.root.querySelector('#modal-root')
    this.toastRoot = this.root.querySelector('#toast-root')

    this.root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAction(e.currentTarget.dataset.action))
    })

    this.renderTurnBar()
    this.update()
  }

  // 回合指示条只显示当前玩家，并使用棋盘上实际可见的格号。
  renderTurnBar() {
    const s = this.store.state
    const current = s.players[s.current]
    this.turnBarEl.innerHTML = `
      <div class="tb-avatars" id="tb-avatars">
        ${this.renderAvatar(current)}
      </div>
      <div class="tb-text">
        <div class="tb-title" id="tb-title">${escapeHtml(current.name)}回合</div>
        <div class="tb-sub" id="tb-sub">轮到你掷骰子前进啦</div>
      </div>
      <div class="tb-badge" id="tb-badge" aria-label="${this.positionLabel(current.position)}">${this.renderPositionBadge(current.position)}</div>
    `
  }

  positionLabel(position) {
    return position === 0 ? '起点' : `第 ${Math.min(position, 47)} 格`
  }

  renderPositionBadge(position) {
    return position === 0 ? icon('home', 15) : String(Math.min(position, 47))
  }

  tokenFace(p) {
    return `${p.id === 'girl' ? icon('heart', 7, 'token-charm') : ''}${FACE}`
  }

  // 回合栏头像棋子
  renderAvatar(p) {
    const girl = p.id === 'girl'
    return `<div class="avatar-piece avatar-piece--${girl ? 'girl' : 'boy'}" style="background:${p.color}" aria-label="${girl ? '女生' : '男生'}棋子">${this.tokenFace(p)}</div>`
  }

  // 棋盘上的棋子
  renderPiece(p, moving = false) {
    const girl = p.id === 'girl'
    return `<span class="player-piece player-piece--${girl ? 'girl' : 'boy'}${moving ? ' player-piece--moving' : ''}" style="background:${p.color}" aria-label="${girl ? '女生' : '男生'}棋子">${this.tokenFace(p)}</span>`
  }

  update() {
    const s = this.store.state
    this.updateTurnBar()
    this.updateTaskCompletionMarks()
    this.updatePieces()
    this.updateDice()
    this.updateRollBtn()

    if (s.winner) {
      if (!this.winModalShown) this.showWinModal()
    } else if (s.phase === 'effects' && s.effects.length > 0) {
      this.showTaskModal(s.effects[0])
    } else if (!this.modalLocked) {
      this.winModalShown = false
      this.hideModal()
    }

    this.updateToast()

    if (s.moving && !this.animating) this.startMoveAnimation()
  }

  // 更新回合指示条：当前玩家、标题、副标题、位置徽标
  updateTurnBar() {
    const s = this.store.state
    const current = s.players[s.current]
    const titleEl = this.root.querySelector('#tb-title')
    const badgeEl = this.root.querySelector('#tb-badge')
    const avatarsEl = this.root.querySelector('#tb-avatars')
    if (titleEl) titleEl.textContent = `${current.name}回合`
    if (avatarsEl) avatarsEl.innerHTML = this.renderAvatar(current)
    if (badgeEl) {
      badgeEl.innerHTML = this.renderPositionBadge(current.position)
      badgeEl.setAttribute('aria-label', this.positionLabel(current.position))
    }
  }

  updatePieces() {
    const s = this.store.state
    const occupied = new Map()
    this.boardEl.querySelectorAll('[data-pieces]').forEach(el => {
      el.innerHTML = ''
      el.classList.remove('pieces--solo', 'pieces--duo')
    })
    this.boardEl.querySelectorAll('.board-cell--arrival').forEach(el => el.classList.remove('board-cell--arrival'))
    s.players.forEach((p, i) => {
      let pos = p.position
      const moving = s.moving && i === s.current && this.animPos != null
      if (moving) pos = this.animPos
      // 逻辑位置 0 是起点，位置 1 至 47 对应内部棋盘格 2 至 48。
      const cell = Math.min(Math.max(pos, 0) + 1, 48)
      const el = this.boardEl.querySelector(`[data-pieces="${cell}"]`)
      if (!el) return
      const players = occupied.get(cell) || []
      players.push({ player: p, moving })
      occupied.set(cell, players)
    })

    occupied.forEach((players, cell) => {
      const el = this.boardEl.querySelector(`[data-pieces="${cell}"]`)
      if (!el) return
      el.classList.add(players.length > 1 ? 'pieces--duo' : 'pieces--solo')
      el.innerHTML = players.map(({ player, moving }) => this.renderPiece(player, moving)).join('')
      if (players.some(({ moving }) => moving)) {
        el.closest('.board-cell')?.classList.add('board-cell--arrival')
      }
    })
  }

  updateTaskCompletionMarks() {
    const marks = this.store.state.completedTasks
    this.boardEl.querySelectorAll('[data-completion]').forEach(el => {
      el.innerHTML = renderTaskCompletionMarks(marks[Number(el.dataset.completion)])
    })
  }

  updateDice() {
    const s = this.store.state
    if (s.rolling) {
      if (!this.diceRolling) this.startDiceRoll()
      return
    }
    this.diceRolling = false
    clearTimeout(this.diceTimer)
    clearInterval(this.diceFaceTimer)
    this.diceEl.classList.remove('rolling')
    if (s.diceValue > 0) {
      if (s.diceValue !== this.lastDiceValue) {
        this.diceEl.classList.remove('show-value')
        void this.diceEl.offsetWidth
        this.diceEl.classList.add('show-value')
        this.lastDiceValue = s.diceValue
      }
      this.diceEl.innerHTML = this.renderDiceResult(s.diceValue)
    } else {
      this.diceEl.innerHTML = this.renderDiceResult(1, true)
      this.lastDiceValue = 0
    }
  }

  // 六面骰子：正面显示当前点数，其余面在滚动时共同参与立体旋转。
  renderDiceCube(value, blank = false) {
    const otherValues = [1, 2, 3, 4, 5, 6].filter(number => number !== value && number !== 7 - value)
    const values = [value, 7 - value, ...otherValues]
    const face = (name, faceValue) => `
      <div class="dice-face dice-face--${name}">
        ${blank ? '<div class="dice-dots"></div>' : this.renderDiceDots(faceValue)}
      </div>
    `
    return `<div class="dice-cube">${face('front', values[0])}${face('back', values[1])}${face('right', values[2])}${face('left', values[3])}${face('top', values[4])}${face('bottom', values[5])}</div>`
  }

  // 骰子停止后只保留平面点数，结果更容易一眼读出。
  renderDiceResult(value, blank = false) {
    return `<div class="dice-result" aria-label="${blank ? '待掷骰子' : `点数 ${value}`}">${blank ? '<div class="dice-dots"></div>' : this.renderDiceDots(value)}</div>`
  }

  // 根据点数生成骰点布局（3x3 网格）
  renderDiceDots(value) {
    const map = {
      1: [[2, 2]],
      2: [[1, 3], [3, 1]],
      3: [[1, 3], [2, 2], [3, 1]],
      4: [[1, 1], [1, 3], [3, 1], [3, 3]],
      5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
      6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]]
    }
    const dots = (map[value] || []).map(([r, c]) => `<span class="dot" style="grid-row:${r};grid-column:${c}"></span>`).join('')
    return `<div class="dice-dots">${dots}</div>`
  }

  startDiceRoll() {
    playSound('dice', this.store.state.soundEnabled)
    this.diceRolling = true
    this.diceEl.classList.remove('show-value')
    this.diceEl.classList.add('rolling')
    let preview = 1 + Math.floor(Math.random() * 6)
    this.diceEl.innerHTML = this.renderDiceCube(preview)
    clearTimeout(this.diceTimer)
    clearInterval(this.diceFaceTimer)
    this.diceFaceTimer = setInterval(() => {
      preview = 1 + Math.floor(Math.random() * 6)
      this.diceEl.innerHTML = this.renderDiceCube(preview)
    }, 95)
    this.diceTimer = setTimeout(() => {
      clearInterval(this.diceFaceTimer)
      this.diceEl.classList.remove('rolling')
      const value = 1 + Math.floor(Math.random() * 6)
      this.store.commitRoll(value)
    }, 900)
  }

  startMoveAnimation() {
    const s = this.store.state
    if (!s.moving || s.movePath.length === 0) {
      this.store.finishMove()
      return
    }
    this.animating = true
    this.animPos = s.players[s.current].position
    const path = s.movePath.slice()
    let i = 0
    const step = () => {
      if (i >= path.length) {
        this.animating = false
        this.animPos = null
        this.store.finishMove()
        return
      }
      this.animPos = path[i]
      i++
      playSound('move', this.store.state.soundEnabled)
      this.updatePieces()
      this.animTimer = setTimeout(step, 230)
    }
    this.animTimer = setTimeout(step, 120)
  }

  updateRollBtn() {
    const s = this.store.state
    const p = s.players[s.current]
    this.rollBtn.disabled = s.rolling || s.moving || s.winner || s.phase === 'effects' || p.paused || p.position >= 47
  }

  handleAction(action) {
    const s = this.store.state
    if (action === 'roll') {
      this.store.rollDice()
    } else if (action === 'menu') {
      this.toggleMenu()
    } else if (action === 'edit') {
      if (s.rolling || s.moving || s.phase === 'effects') return
      this.callbacks.onEdit()
    } else if (action === 'settings-item') {
      this.hideMenu()
      this.showSettingsModal()
    } else if (action === 'reset-item') {
      this.hideMenu()
      this.confirmReset()
    }
  }

  // ===== 菜单（玩家设置 / 重新开始） =====
  toggleMenu() {
    if (this.menuRoot.innerHTML) {
      this.hideMenu()
      return
    }
    this.menuRoot.innerHTML = `
      <div class="menu-backdrop" data-action="menu-close"></div>
      <div class="menu-panel">
        <button class="menu-item" data-action="settings-item">${icon('settings', 18)}<span>玩家设置</span></button>
        <button class="menu-item danger" data-action="reset-item">${icon('rotate-ccw', 18)}<span>重新开始</span></button>
      </div>
    `
    this.menuRoot.querySelector('[data-action="menu-close"]').addEventListener('click', () => this.hideMenu())
    this.menuRoot.querySelector('[data-action="settings-item"]').addEventListener('click', () => this.handleAction('settings-item'))
    this.menuRoot.querySelector('[data-action="reset-item"]').addEventListener('click', () => this.handleAction('reset-item'))
  }

  hideMenu() {
    this.menuRoot.innerHTML = ''
  }

  // ===== 确认重新开始 =====
  confirmReset() {
    this.modalLocked = true
    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="modal-wrapper">
        <div class="task-modal">
          <div class="task-ribbon"><span>重新开始</span></div>
          <div class="modal-body">
            <p class="m-text">双方棋子将回到起点，当前进度会清空。</p>
          </div>
          <div class="modal-actions" style="margin-top:16px;">
            <button class="m-btn secondary" data-action="reset-no">取消</button>
            <button class="m-btn primary" data-action="reset-yes">确认</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelector('[data-action="reset-yes"]').addEventListener('click', () => {
      this.cancelGameAnimations()
      this.modalLocked = false
      this.store.resetGame()
    })
    this.modalRoot.querySelector('[data-action="reset-no"]').addEventListener('click', () => {
      this.modalLocked = false
      this.update()
    })
  }

  // ===== 任务 / 效果弹窗 =====
  showTaskModal(eff) {
    clearTimeout(this.modalCloseTimer)
    const taskKey = `${eff.squareId}-${eff.type}-${eff.text || ''}-${eff.duration || 0}`
    if (this.taskModalKey === taskKey && this.modalRoot.querySelector('.task-modal')) {
      this.updateTaskCountdown()
      return
    }
    this.clearTaskCountdown()
    this.taskModalKey = taskKey
    this.currentTaskDuration = Number(eff.duration) || 0
    this.taskTimerStarted = false
    const s = this.store.state
    const current = s.players[s.current]
    let ribbon = '任务'
    let label = `${current.name}的任务`
    let title = eff.text || ''
    let primaryText = '完成任务'

    if (eff.type === 'forward') {
      ribbon = '前进'; label = current.name; title = eff.text || `前进 ${eff.value} 格！`; primaryText = '好的'
    } else if (eff.type === 'backward') {
      ribbon = '后退'; label = current.name; title = eff.text || `后退 ${eff.value} 格！`; primaryText = '好的'
    } else if (eff.type === 'pause') {
      ribbon = '休息'; label = current.name; title = eff.text || '休息一回合'; primaryText = '好的'
    } else if (eff.type === 'reroll') {
      ribbon = '重摇'; label = current.name; title = eff.text || '再掷一次骰子'; primaryText = '好的'
    } else if (eff.type === 'finish') {
      ribbon = '终点任务'; label = current.name; title = eff.text || '完成终点任务，赢得胜利'; primaryText = '完成任务'
    }

    const queue = s.effects.length > 1 ? `<div class="task-queue">还有 ${s.effects.length - 1} 个效果待确认</div>` : ''

    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="modal-wrapper" role="dialog" aria-modal="true">
        <div class="task-modal task-modal--${eff.type}">
          <div class="task-ribbon"><span>${ribbon}</span></div>
          <div class="task-player">
            <div class="tp-avatar avatar-piece avatar-piece--${current.id === 'girl' ? 'girl' : 'boy'}" style="background:${current.color}">${this.tokenFace(current)}</div>
            <span class="tp-label">${escapeHtml(label)}</span>
          </div>
          <div class="task-body">
            <p class="task-title">${escapeHtml(title)}</p>
            ${eff.duration > 0 ? `<div class="task-countdown" data-role="task-countdown" aria-live="polite"><div class="task-countdown-line"><span data-role="task-countdown-label">准备好后开始</span><strong data-role="task-time-value">${eff.duration}</strong><span>秒</span></div><div class="task-countdown-track"><span data-role="task-progress"></span></div><button class="countdown-start" type="button" data-action="countdown-start">开始倒计时</button></div>` : ''}
            ${queue}
          </div>
          <div class="modal-actions">
            <button class="m-btn primary" data-action="confirm">${primaryText}</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelectorAll('[data-action="confirm"]').forEach(btn => {
      btn.addEventListener('click', () => this.confirmTaskEffect())
    })
    this.modalRoot.querySelector('[data-action="countdown-start"]')?.addEventListener('click', () => this.startTaskCountdown(eff.duration))
    if (eff.duration > 0) {
      this.modalRoot.querySelector('.modal-actions [data-action="confirm"]')?.setAttribute('disabled', '')
      this.updateTaskCountdown()
    }
  }

  startTaskCountdown(duration) {
    if (this.taskTimerStarted || !duration) return
    this.clearTaskCountdown()
    this.taskTimerStarted = true
    this.taskDeadline = Date.now() + duration * 1000
    this.taskTimerTimedOut = false
    const startButton = this.modalRoot.querySelector('[data-action="countdown-start"]')
    if (startButton) {
      startButton.disabled = true
      startButton.textContent = '倒计时进行中'
    }
    const countdownLabel = this.modalRoot.querySelector('[data-role="task-countdown-label"]')
    if (countdownLabel) countdownLabel.textContent = '正在倒计时'
    const confirmButtons = this.modalRoot.querySelectorAll('[data-action="confirm"]')
    confirmButtons.forEach(button => { button.disabled = true })
    this.updateTaskCountdown()
    this.taskTimerInterval = setInterval(() => this.updateTaskCountdown(), 250)
  }

  updateTaskCountdown() {
    const panel = this.modalRoot.querySelector('[data-role="task-countdown"]')
    if (!panel) return
    if (!this.taskTimerStarted || !this.taskDeadline) {
      const value = panel.querySelector('[data-role="task-time-value"]')
      if (value) value.textContent = String(this.currentTaskDuration)
      return
    }
    const remaining = Math.max(0, this.taskDeadline - Date.now())
    const seconds = Math.ceil(remaining / 1000)
    const progress = panel.querySelector('[data-role="task-progress"]')
    const value = panel.querySelector('[data-role="task-time-value"]')
    if (value) value.textContent = String(seconds)
    if (progress) progress.style.width = `${Math.max(0, Math.min(100, remaining / ((Number(this.currentTaskDuration) || 1) * 1000) * 100))}%`
    if (remaining <= 0 && !this.taskTimerTimedOut) {
      this.taskTimerTimedOut = true
      panel.classList.add('is-timeout')
      const labels = panel.querySelectorAll('.task-countdown-line span')
      if (labels[0]) labels[0].textContent = '时间到，可以完成'
      if (labels[1]) labels[1].hidden = true
      const value = panel.querySelector('[data-role="task-time-value"]')
      if (value) value.textContent = ''
      const startButton = panel.querySelector('[data-action="countdown-start"]')
      if (startButton) { startButton.disabled = true; startButton.textContent = '倒计时已结束' }
      this.modalRoot.querySelectorAll('[data-action="confirm"]').forEach(button => { button.disabled = false })
      playSound('timeout', this.store.state.soundEnabled)
      clearInterval(this.taskTimerInterval)
      this.taskTimerInterval = null
    }
  }

  clearTaskCountdown(resetKey = true) {
    clearInterval(this.taskTimerInterval)
    this.taskTimerInterval = null
    this.taskDeadline = 0
    this.taskTimerTimedOut = false
    this.taskTimerStarted = false
    if (resetKey) this.taskModalKey = null
  }

  confirmTaskEffect() {
    if (this.currentTaskDuration > 0 && (!this.taskTimerStarted || !this.taskTimerTimedOut)) {
      this.store.showNotice(this.taskTimerStarted ? '倒计时结束后才能完成任务' : '请先点击“开始倒计时”')
      return
    }
    const modal = this.modalRoot.querySelector('.task-modal')
    if (modal?.classList.contains('modal-out')) return
    if (modal) modal.classList.add('modal-out')
    this.clearTaskCountdown()
    playSound('confirm', this.store.state.soundEnabled)
    clearTimeout(this.modalCloseTimer)
    this.modalCloseTimer = setTimeout(() => this.store.confirmEffect(), 150)
  }

  // ===== 胜利弹窗 =====
  showWinModal() {
    clearTimeout(this.modalCloseTimer)
    const s = this.store.state
    const winner = s.players.find(p => p.id === s.winner)
    this.winModalShown = true
    playSound('win', s.soundEnabled)
    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="confetti-layer">${this.renderConfetti()}</div>
      <div class="modal-wrapper">
        <div class="task-modal">
          <div class="task-ribbon"><span>胜利</span></div>
          <div class="win-body">
            <div class="win-emoji">🎉</div>
            <div class="win-title">${escapeHtml(winner.emoji)} ${escapeHtml(winner.name)} 获胜！</div>
            <div class="win-sub">恭喜到达终点，来一个胜利的拥抱吧！</div>
          </div>
          <div class="modal-actions">
            <button class="m-btn primary" data-action="play-again">再来一局</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelector('[data-action="play-again"]').addEventListener('click', () => {
      this.store.resetGame()
    })
  }

  // 生成获胜彩带碎片
  renderConfetti() {
    const colors = ['#FF8FAB', '#E85D8A', '#8B7BF3', '#6BCE9E', '#E8C75D', '#6BB8E8']
    let html = ''
    for (let i = 0; i < 36; i++) {
      const color = colors[i % colors.length]
      const left = Math.random() * 100
      const delay = (Math.random() * 1.2).toFixed(2)
      const dur = (1.6 + Math.random() * 1.4).toFixed(2)
      const rotate = Math.floor(Math.random() * 360)
      html += `<span class="confetti" style="left:${left}%;background:${color};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rotate}deg)"></span>`
    }
    return html
  }

  // ===== 玩家设置弹窗 =====
  showSettingsModal() {
    clearTimeout(this.modalCloseTimer)
    const s = this.store.state
    this.modalLocked = true
    const rows = s.players.map(p => `
      <div class="pset-row">
        <div class="pset-avatar avatar-piece avatar-piece--${p.id === 'girl' ? 'girl' : 'boy'}" style="background:${p.color}" aria-hidden="true">${this.tokenFace(p)}</div>
        <span class="pset-identity">${p.id === 'girl' ? '女生' : '男生'}</span>
        <input class="pset-name" data-field="name" data-id="${p.id}" value="${escapeHtml(p.name)}" maxlength="8" autocomplete="off" enterkeyhint="done" placeholder="输入昵称" aria-label="${p.id === 'girl' ? '女生' : '男生'}昵称" />
      </div>
    `).join('')
    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="modal-wrapper">
        <div class="task-modal settings-modal" role="dialog" aria-modal="true" aria-label="玩家设置">
          <div class="task-ribbon"><span>玩家设置</span></div>
          <div class="modal-body">
            <p class="m-text" style="margin-bottom:14px;">昵称会显示在回合和任务提示中</p>
            <div class="pset-list">${rows}</div>
            <label class="settings-toggle"><span>任务与骰子音效</span><input type="checkbox" data-field="sound-enabled" ${s.soundEnabled ? 'checked' : ''}></label>
          </div>
          <div class="modal-actions">
            <button class="m-btn secondary" data-action="settings-cancel">取消</button>
            <button class="m-btn primary" data-action="settings-save">保存</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelector('[data-action="settings-save"]').addEventListener('click', () => {
      const players = s.players.map(p => {
        const nameEl = this.modalRoot.querySelector(`[data-field="name"][data-id="${p.id}"]`)
        const name = String(nameEl.value || '').trim() || p.name
        return { ...p, name }
      })
      const soundEnabled = this.modalRoot.querySelector('[data-field="sound-enabled"]')?.checked !== false
      this.modalLocked = false
      this.store.savePlayers(players)
      this.store.setSoundEnabled(soundEnabled)
    })
    this.modalRoot.querySelector('[data-action="settings-cancel"]').addEventListener('click', () => {
      this.modalLocked = false
      this.hideModal()
    })
  }

  hideModal() {
    this.clearTaskCountdown()
    const modal = this.modalRoot.querySelector('.task-modal')
    if (!modal || modal.classList.contains('modal-out')) {
      this.modalRoot.innerHTML = ''
      return
    }
    modal.classList.add('modal-out')
    clearTimeout(this.modalCloseTimer)
    this.modalCloseTimer = setTimeout(() => {
      const s = this.store.state
      if (!this.modalLocked && !s.winner && !(s.phase === 'effects' && s.effects.length > 0)) this.modalRoot.innerHTML = ''
    }, 150)
  }

  updateToast() {
    const s = this.store.state
    if (s.notice) {
      this.toastRoot.innerHTML = `<div class="toast">${escapeHtml(s.notice)}</div>`
    } else {
      this.toastRoot.innerHTML = ''
    }
  }
}
