// 棋盘布局与渲染：8 列 x 10 行的三层回环棋盘，内外圈保留一格缓冲
import { icon } from './icons.js'

// 每格在棋盘网格中的坐标（[行, 列]），下标 0 对应内部起点格。
export const BOARD_LAYOUT = [
  [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8],
  [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8],
  [1, 7], [1, 6], [1, 5], [1, 4], [1, 3], [1, 2], [1, 1],
  [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
  [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
  [7, 6], [6, 6], [5, 6], [4, 6], [3, 6],
  [3, 5], [3, 4], [3, 3],
  [4, 3], [5, 3], [6, 3], [6, 4]
]

const SPECIAL_ICONS = {
  forward: 'plus',
  backward: 'minus',
  pause: 'coffee',
  reroll: 'refresh-cw'
}

// 内部序号 1 是起点；用户看到的任务格从 1 到 47 编号。
export function displaySquareNumber(id) {
  return id - 1
}

// 返回某格的背景色（CSS 值）
export function cellColor(square) {
  const id = typeof square === 'number' ? square : square.id
  const type = typeof square === 'number' ? 'normal' : square.type
  if (id === 1) return 'linear-gradient(135deg, #E5C487, #B97955)'
  if (id === 48) return 'linear-gradient(135deg, #E9A4A9, #A84B63)'
  return `var(--board-cell-${type || 'normal'})`
}

// 生成棋盘网格内所有格子的 HTML（含棋子容器 .pieces）
export function renderTaskCompletionMarks(marks = {}) {
  const boy = marks?.boy ? '<span class="task-done-mark task-done-mark--boy" aria-label="男生已完成">♂</span>' : ''
  const girl = marks?.girl ? '<span class="task-done-mark task-done-mark--girl" aria-label="女生已完成">♀</span>' : ''
  return boy || girl ? `<span class="task-completion-marks">${boy}${girl}</span>` : ''
}

export function renderBoardCellsHtml(squares, completedTasks = {}) {
  const cells = squares.map(sq => {
    const [row, col] = BOARD_LAYOUT[sq.id - 1]
    const style = `grid-row:${row};grid-column:${col};background:${cellColor(sq)}`
    const isEndpoint = sq.type === 'start' || sq.type === 'finish'
    const isSpecial = Boolean(SPECIAL_ICONS[sq.type])
    const pieceKind = isEndpoint ? 'endpoint' : isSpecial ? 'special' : 'normal'
    const pieces = `<div class="pieces pieces--${pieceKind}" data-pieces="${sq.id}" data-cell-kind="${pieceKind}"></div>`
    const completion = (sq.type === 'normal' || sq.type === 'finish')
      ? `<span data-completion="${sq.id}">${renderTaskCompletionMarks(completedTasks[sq.id])}</span>`
      : ''
    const typeClass = ` board-cell--${sq.type}`

    if (sq.type === 'start') {
      const endpoint = icon('home', 10, 'endpoint-marker')
      return `<div class="board-cell board-cell-start${typeClass}" data-sq="${sq.id}" style="${style}" aria-label="起点">${endpoint}${pieces}</div>`
    }
    if (sq.type === 'finish') {
      const endpoint = `<span class="cn">${displaySquareNumber(sq.id)}</span>${icon('flag', 10, 'endpoint-marker')}`
      return `<div class="board-cell board-cell-end${typeClass}" data-sq="${sq.id}" style="${style}" aria-label="第 ${displaySquareNumber(sq.id)} 格，终点">${endpoint}${completion}${pieces}</div>`
    }

    const marker = isSpecial ? `<span class="cell-marker" aria-hidden="true">${icon(SPECIAL_ICONS[sq.type], 9)}</span>` : ''
    return `<div class="board-cell${typeClass}" data-sq="${sq.id}" style="${style}"><span class="cn">${displaySquareNumber(sq.id)}</span>${marker}${completion}${pieces}</div>`
  }).join('')

  const core = `<div class="board-core" aria-hidden="true"><span class="core-rings"><span class="core-ring core-ring--left"></span><span class="core-ring core-ring--right"></span></span>${icon('heart', 18, 'core-heart')}</div>`
  return `${cells}${core}`
}
