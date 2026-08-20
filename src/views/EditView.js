// 编辑界面：自定义每一格的类型与任务内容
import { SQUARE_TYPES, EDITABLE_TYPES, createDefaultSquares } from '../data.js'
import { displaySquareNumber } from '../board.js'
import { icon } from '../icons.js'
import { escapeHtml } from '../utils.js'
import { applyTaskPack, createTaskPack, TASK_PACK_FORMAT, TASK_PACK_VERSION, TASK_TEXT_MAX_LENGTH, TASK_DURATION_MAX } from '../taskPack.js'
import { playSound } from '../sound.js'

const AUTO_TEXT = /^(前进|后退)\s*\d+\s*格$|^(暂停一次|重摇一次)$/

export class EditView {
  constructor(root, store, callbacks) {
    this.root = root
    this.store = store
    this.callbacks = callbacks
    this.draft = store.state.squares.map(sq => ({ ...sq }))
    this.render()
  }

  destroy() {
    this.root.innerHTML = ''
  }

  render() {
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="app-header gradient">
          <button class="icon-btn" data-action="back" aria-label="返回棋盘">${icon('chevron-left', 24)}</button>
          <div class="app-brand"><span class="app-brand-mark">${icon('logo', 22)}</span><h1>编辑棋盘</h1></div>
          <button class="header-text-btn" data-action="save">保存</button>
        </header>
        <div class="edit-view">
          <div class="edit-action-row">
            <button data-action="import-pack">${icon('upload', 16)}导入任务包</button>
            <button class="secondary" data-action="export-pack">${icon('download', 16)}导出任务包</button>
            <button data-action="reset">${icon('rotate-ccw', 16)}恢复默认</button>
          </div>
          <div class="edit-hint">普通任务可分别设置男女内容；前进/后退可设置格数。起点固定，第 47 格可设置终点任务。</div>
          <p class="pack-status" id="pack-status" hidden></p>
          <div class="cell-list no-scrollbar" id="cell-list"></div>
          <div class="bottom-save-bar">
            <button data-action="save">${icon('check', 16)}保存修改</button>
          </div>
        </div>
        <div id="modal-root"></div>
        <div id="type-picker-root"></div>
      </div>
    `
    this.listEl = this.root.querySelector('#cell-list')
    this.modalRoot = this.root.querySelector('#modal-root')
    this.typePickerRoot = this.root.querySelector('#type-picker-root')
    this.renderList()

    this.root.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleAction(e.currentTarget.dataset.action))
    })
  }

  // 生成单个格子的类型控件（底部类型面板入口）
  typeControl(sq, type) {
    return `
      <button type="button" class="type-picker-trigger" data-action="type-picker" data-id="${sq.id}" aria-label="选择第 ${displaySquareNumber(sq.id)} 格类型">
        ${icon(type.icon, 15)}<span>${type.label}</span>${icon('chevron-down', 14)}
      </button>
    `
  }

  // 前进/后退的格数步进控件
  stepControl(sq) {
    return `
      <div class="step-control" data-role="step">
        <button type="button" data-action="decrease" data-id="${sq.id}" aria-label="减少第 ${displaySquareNumber(sq.id)} 格的格数">${icon('minus', 12)}</button>
        <span class="step-value" data-role="step-value">${sq.value || 1}</span>
        <button type="button" data-action="increase" data-id="${sq.id}" aria-label="增加第 ${displaySquareNumber(sq.id)} 格的格数">${icon('plus', 12)}</button>
      </div>
    `
  }

  renderList() {
    this.listEl.innerHTML = this.draft.map(sq => {
      const type = SQUARE_TYPES[sq.type] || SQUARE_TYPES.normal
      const isStart = sq.type === 'start'
      const isFinish = sq.type === 'finish'
      const fixed = isStart || isFinish
      const badgeClass = fixed ? 'bg-primary' : 'bg-muted'
      const highlight = (sq.type === 'forward' || sq.type === 'backward') ? ' highlight' : ''
      const showStep = sq.type === 'forward' || sq.type === 'backward'
      const normalTaskFields = sq.type === 'normal' && !fixed

      let left = ''
      if (isStart) {
        left = `
          <div class="type-row">
            <span class="type-pill">${icon(type.icon, 12)}${type.label}</span>
            <span class="fixed-tag">${icon('lock', 10)}固定</span>
          </div>
        `
      } else if (isFinish) {
        left = `
          <div class="type-row">
            <span class="type-pill">${icon(type.icon, 12)}终点任务</span>
            <span class="fixed-tag">${icon('flag', 10)}到达后触发</span>
          </div>
        `
      } else {
        left = `
          <div class="type-row">
            ${this.typeControl(sq, type)}
            ${showStep ? this.stepControl(sq) : ''}
          </div>
        `
      }

      return `
        <div class="cell-card" data-id="${sq.id}">
          <div class="number-badge ${badgeClass}${highlight}">${isStart ? icon('home', 17) : displaySquareNumber(sq.id)}</div>
          <div class="cell-fields">
            ${left}
            ${normalTaskFields ? `
              <div class="dual-task-fields">
                ${this.taskField('boy', sq.boyText ?? sq.text ?? '')}
                ${this.taskField('girl', sq.girlText ?? sq.text ?? '')}
              </div>
              ${this.durationField(sq)}
            ` : isStart ? `<input class="content-input" type="text" data-field="text" value="${escapeHtml(sq.text || '')}" disabled>` : `
              <input class="content-input" type="text" data-field="text" value="${escapeHtml(sq.text || '')}" placeholder="${isFinish ? '输入终点任务' : '输入任务内容'}">
              ${this.durationField(sq)}
            `}
          </div>
        </div>
      `
    }).join('')

    this.bindListEvents()
  }

  taskField(player, value) {
    const label = player === 'boy' ? '男生' : '女生'
    const safeValue = String(value).slice(0, TASK_TEXT_MAX_LENGTH)
    return `
      <label class="task-input-row">
        <span class="task-person-tag task-person-tag--${player}">${label}</span>
        <span class="task-input-content">
          <textarea class="content-input task-textarea" data-field="${player}Text" maxlength="${TASK_TEXT_MAX_LENGTH}" rows="3" placeholder="${label}触发的任务">${escapeHtml(safeValue)}</textarea>
          <span class="task-char-count" aria-live="polite">${safeValue.length}/${TASK_TEXT_MAX_LENGTH}</span>
        </span>
      </label>
    `
  }

  durationField(sq) {
    const duration = Math.max(0, Math.min(TASK_DURATION_MAX, Number(sq.duration) || 0))
    return `
      <div class="duration-field" aria-label="第 ${displaySquareNumber(sq.id)} 格限时秒数">
        <span>限时</span>
        <div class="duration-stepper">
          <button type="button" data-action="duration-decrease" data-id="${sq.id}" aria-label="减少限时">−</button>
          <output class="duration-value" data-field="duration" data-role="duration-value" data-value="${duration}">${duration}</output>
          <button type="button" data-action="duration-increase" data-id="${sq.id}" aria-label="增加限时">＋</button>
        </div>
        <em>秒（0 为不限时）</em>
      </div>
    `
  }

  bindListEvents() {
    this.listEl.querySelectorAll('[data-action="type-picker"]').forEach(btn => {
      btn.addEventListener('click', () => this.openTypePicker(Number(btn.dataset.id)))
    })

    // 步进按钮
    this.listEl.querySelectorAll('[data-action="decrease"],[data-action="increase"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'increase' ? 1 : -1
        this.adjustStep(Number(btn.dataset.id), delta)
      })
    })

    this.listEl.querySelectorAll('[data-action="duration-decrease"],[data-action="duration-increase"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'duration-increase' ? 5 : -5
        this.adjustDuration(Number(btn.dataset.id), delta)
      })
    })

    // 文案输入（普通任务可分别维护男女任务）
    this.listEl.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        this.updateTaskCount(input)
        const id = Number(input.closest('.cell-card').dataset.id)
        const sq = this.draft.find(s => s.id === id)
        if (sq) {
          sq[input.dataset.field] = input.dataset.field === 'duration'
            ? Math.max(0, Math.min(TASK_DURATION_MAX, Math.round(Number(input.value) || 0)))
            : input.value
        }
      })
    })
  }

  updateTaskCount(input) {
    if (!input.classList.contains('task-textarea')) return
    if (input.value.length > TASK_TEXT_MAX_LENGTH) {
      input.value = input.value.slice(0, TASK_TEXT_MAX_LENGTH)
    }
    const count = input.closest('.task-input-content')?.querySelector('.task-char-count')
    if (count) count.textContent = `${input.value.length}/${TASK_TEXT_MAX_LENGTH}`
  }

  // A final read avoids losing text that is still composing in a mobile IME.
  syncDraftFromForm() {
    this.listEl.querySelectorAll('[data-field]').forEach(input => {
      const id = Number(input.closest('.cell-card')?.dataset.id)
      const sq = this.draft.find(item => item.id === id)
      if (!sq || input.disabled) return
      const value = input.dataset.field === 'duration'
        ? Math.max(0, Math.min(TASK_DURATION_MAX, Number(input.dataset.value) || 0))
        : input.classList.contains('task-textarea')
          ? input.value.slice(0, TASK_TEXT_MAX_LENGTH)
          : input.value
      sq[input.dataset.field] = value
    })
  }

  adjustDuration(id, delta) {
    const sq = this.draft.find(s => s.id === id)
    if (!sq) return
    sq.duration = Math.max(0, Math.min(TASK_DURATION_MAX, (Number(sq.duration) || 0) + delta))
    const card = this.listEl.querySelector(`.cell-card[data-id="${id}"]`)
    const value = card?.querySelector('[data-role="duration-value"]')
    if (value) {
      value.textContent = String(sq.duration)
      value.dataset.value = String(sq.duration)
    }
    playSound('ui-select', this.store.state.soundEnabled)
  }

  setSquareType(id, type) {
    const sq = this.draft.find(s => s.id === id)
    if (!sq || !EDITABLE_TYPES.includes(type)) return
    sq.type = type
    sq.value = Math.max(1, Math.min(10, Number(sq.value) || 1))
    if (sq.type === 'forward') sq.text = `前进 ${sq.value} 格`
    else if (sq.type === 'backward') sq.text = `后退 ${sq.value} 格`
    else if (sq.type === 'pause') sq.text = '暂停一次'
    else if (sq.type === 'reroll') sq.text = '重摇一次'
    else {
      if (AUTO_TEXT.test(sq.text || '')) sq.text = ''
      if (sq.boyText == null) sq.boyText = sq.text || ''
      if (sq.girlText == null) sq.girlText = sq.text || ''
    }

    const scrollTop = this.listEl.scrollTop
    this.renderList()
    this.listEl.scrollTop = scrollTop
    playSound('ui-select', this.store.state.soundEnabled)
  }

  openTypePicker(id) {
    const sq = this.draft.find(s => s.id === id)
    if (!sq) return
    playSound('ui-open', this.store.state.soundEnabled)
    const options = EDITABLE_TYPES.map(type => {
      const item = SQUARE_TYPES[type]
      const selected = sq.type === type ? ' is-selected' : ''
      return `<button class="type-sheet-option${selected}" data-type="${type}">${icon(item.icon, 20)}<span>${item.label}</span><small>${item.desc}</small></button>`
    }).join('')
    this.typePickerRoot.innerHTML = `
      <div class="type-sheet-scrim" data-action="type-picker-close"></div>
      <section class="type-picker-sheet" role="dialog" aria-modal="true" aria-label="选择格子类型">
        <div class="sheet-handle"></div>
        <div class="sheet-title">第 ${displaySquareNumber(id)} 格类型</div>
        <div class="type-sheet-options">${options}</div>
      </section>
    `
    this.typePickerRoot.querySelector('[data-action="type-picker-close"]').addEventListener('click', () => this.closeTypePicker())
    this.typePickerRoot.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setSquareType(id, btn.dataset.type)
        this.closeTypePicker(false)
      })
    })
  }

  closeTypePicker(withSound = true) {
    if (withSound && this.typePickerRoot.innerHTML) playSound('ui-close', this.store.state.soundEnabled)
    this.typePickerRoot.innerHTML = ''
  }

  adjustStep(id, delta) {
    const sq = this.draft.find(s => s.id === id)
    if (!sq) return
    sq.value = Math.max(1, Math.min(10, (sq.value || 1) + delta))
    const item = this.listEl.querySelector(`.cell-card[data-id="${id}"]`)
    if (!item) return
    const valEl = item.querySelector('[data-role="step-value"]')
    if (valEl) valEl.textContent = String(sq.value)
    if (sq.type === 'forward') sq.text = `前进 ${sq.value} 格`
    if (sq.type === 'backward') sq.text = `后退 ${sq.value} 格`
    const textInput = item.querySelector('[data-field="text"]')
    if (textInput) textInput.value = sq.text
    playSound('ui-select', this.store.state.soundEnabled)
  }

  handleAction(action) {
    if (action === 'back') {
      playSound('ui-close', this.store.state.soundEnabled)
      this.callbacks.onBack()
    } else if (action === 'save') {
      this.syncDraftFromForm()
      this.store.saveSquares(this.draft)
      playSound('success', this.store.state.soundEnabled)
      this.callbacks.onBack()
    } else if (action === 'import-pack') {
      this.syncDraftFromForm()
      this.openImportPack()
    } else if (action === 'export-pack') {
      this.syncDraftFromForm()
      this.openExportPack()
    } else if (action === 'reset') {
      this.draft = createDefaultSquares().map(sq => ({ ...sq }))
      this.renderList()
      playSound('ui-select', this.store.state.soundEnabled)
    }
  }

  updatePackStatus(message, tone = 'success') {
    const status = this.root.querySelector('#pack-status')
    if (!status) return
    status.hidden = false
    status.className = `pack-status pack-status--${tone}`
    status.textContent = message
  }

  closePackModal(withSound = true) {
    if (withSound && this.modalRoot.innerHTML) playSound('ui-close', this.store.state.soundEnabled)
    this.modalRoot.innerHTML = ''
  }

  openExportPack() {
    const content = JSON.stringify(createTaskPack(this.draft), null, 2)
    playSound('ui-open', this.store.state.soundEnabled)
    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="modal-wrapper" role="dialog" aria-modal="true" aria-label="导出任务包">
        <div class="task-modal task-pack-modal">
          <div class="task-ribbon"><span>导出任务包</span></div>
          <button class="close-btn" data-action="pack-close" aria-label="关闭">${icon('x', 20)}</button>
          <div class="modal-body pack-modal-body">
            <p class="m-text">复制这段统一格式的 JSON，发送给对方后即可导入。</p>
            <textarea class="pack-json" data-role="export-content" rows="12" readonly spellcheck="false">${escapeHtml(content)}</textarea>
          </div>
          <div class="modal-actions">
            <button class="m-btn primary" data-action="pack-copy">复制任务包</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelector('[data-action="pack-close"]').addEventListener('click', () => this.closePackModal())
    this.modalRoot.querySelector('[data-action="pack-copy"]').addEventListener('click', () => this.copyTaskPack(content))
  }

  async copyTaskPack(content) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(content)
      this.updatePackStatus('任务包已复制，可直接发送给对方。')
      playSound('success', this.store.state.soundEnabled)
    } catch (error) {
      const field = this.modalRoot.querySelector('[data-role="export-content"]')
      field?.focus()
      field?.select()
      document.execCommand('copy')
      this.updatePackStatus('任务包已选中，请复制后发送给对方。', 'info')
      playSound('ui-select', this.store.state.soundEnabled)
    }
  }

  openImportPack() {
    playSound('ui-open', this.store.state.soundEnabled)
    this.modalRoot.innerHTML = `
      <div class="backdrop-scrim"></div>
      <div class="modal-wrapper" role="dialog" aria-modal="true" aria-label="导入任务包">
        <div class="task-modal task-pack-modal">
          <div class="task-ribbon"><span>导入任务包</span></div>
          <button class="close-btn" data-action="pack-close" aria-label="关闭">${icon('x', 20)}</button>
          <div class="modal-body pack-modal-body">
            <p class="m-text">粘贴由本应用导出的任务包 JSON。导入只更新草稿，点击“保存修改”后才生效。</p>
            <textarea class="pack-json" data-role="import-content" rows="12" spellcheck="false" placeholder="粘贴任务包 JSON"></textarea>
            <p class="pack-format-note">格式：${TASK_PACK_FORMAT} / v${TASK_PACK_VERSION}</p>
            <p class="pack-import-error" data-role="import-error" hidden></p>
          </div>
          <div class="modal-actions">
            <button class="m-btn secondary" data-action="pack-close">取消</button>
            <button class="m-btn primary" data-action="pack-apply">导入到草稿</button>
          </div>
        </div>
      </div>
    `
    this.modalRoot.querySelectorAll('[data-action="pack-close"]').forEach(btn => btn.addEventListener('click', () => this.closePackModal()))
    this.modalRoot.querySelector('[data-action="pack-apply"]').addEventListener('click', () => this.importTaskPack())
  }

  importTaskPack() {
    const field = this.modalRoot.querySelector('[data-role="import-content"]')
    try {
      this.draft = applyTaskPack(this.draft, JSON.parse(field?.value || ''))
      this.closePackModal(false)
      this.renderList()
      this.updatePackStatus('任务包已导入到草稿，点击“保存修改”后生效。')
      playSound('success', this.store.state.soundEnabled)
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入失败，请检查任务包内容。'
      const errorEl = this.modalRoot.querySelector('[data-role="import-error"]')
      if (errorEl) {
        errorEl.hidden = false
        errorEl.textContent = message
      }
      playSound('error', this.store.state.soundEnabled)
    }
  }
}
