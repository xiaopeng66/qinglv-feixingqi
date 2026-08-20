// 临时逻辑冒烟测试：验证 store 核心流程与新模块导入无误
import { store } from './src/store.js'
import { BOARD_LAYOUT, cellColor, displaySquareNumber, renderBoardCellsHtml } from './src/board.js'
import { icon } from './src/icons.js'
import { applyTaskPack, createTaskPack, TASK_PACK_FORMAT, TASK_PACK_VERSION, TASK_DURATION_MAX } from './src/taskPack.js'

function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exit(1) }
  console.log('PASS: ' + msg)
}

const s = store.state
assert(s.squares.length === 48, '初始 48 格')
assert(s.players.length === 2, '两名玩家')
const defaultNormalSquare = s.squares.find(square => square.type === 'normal')
assert(typeof defaultNormalSquare?.boyText === 'string' && typeof defaultNormalSquare?.girlText === 'string', '普通任务预设男女独立文案')
assert(BOARD_LAYOUT.length === 48, 'BOARD_LAYOUT 覆盖 48 格')
assert(BOARD_LAYOUT[0][0] === 10 && BOARD_LAYOUT[0][1] === 1, '第 1 格位于三层回环左下起点')
assert(BOARD_LAYOUT[47][0] === 6 && BOARD_LAYOUT[47][1] === 4, '第 48 格位于内环终点')
assert(new Set(BOARD_LAYOUT.map(([row, col]) => `${row}-${col}`)).size === 48, '棋盘坐标不重复')
assert(BOARD_LAYOUT[23][0] === 1 && BOARD_LAYOUT[23][1] === 1, '第 24 格位于外环顶部转角')
assert(BOARD_LAYOUT[35][0] === 8 && BOARD_LAYOUT[35][1] === 6, '第 36 格进入内环')
assert(BOARD_LAYOUT[43][0] === 3 && BOARD_LAYOUT[43][1] === 3, '第 44 格位于内环顶部转角')
assert(BOARD_LAYOUT[46][0] === BOARD_LAYOUT[47][0] && BOARD_LAYOUT[47][1] === BOARD_LAYOUT[46][1] + 1, '第 48 格位于第 47 格右侧')
assert(BOARD_LAYOUT[5][0] === 10 && BOARD_LAYOUT[35][0] === 8, '底部内外圈之间保留一整行')
for (let index = 1; index < BOARD_LAYOUT.length; index += 1) {
  const [previousRow, previousCol] = BOARD_LAYOUT[index - 1]
  const [row, col] = BOARD_LAYOUT[index]
  const distance = Math.abs(row - previousRow) + Math.abs(col - previousCol)
  assert(distance === 1, `第 ${index} 格与第 ${index + 1} 格路径连续`)
}
assert(cellColor(1).includes('gradient') && cellColor(48).includes('gradient'), '起终点渐变')
assert(displaySquareNumber(2) === 1 && displaySquareNumber(48) === 47, '任务格显示编号为 1 至 47')
assert(icon('heart').startsWith('<svg'), 'icon() 返回 svg')
const exportedPack = createTaskPack(s.squares)
assert(exportedPack.format === TASK_PACK_FORMAT && exportedPack.version === TASK_PACK_VERSION && exportedPack.tasks.length === 47, '任务包导出使用统一 47 格格式')
assert(exportedPack.tasks.every(task => task.duration === 0), '默认任务包包含倒计时字段')
const timedPack = { ...exportedPack, tasks: exportedPack.tasks.map((task, index) => index === 0 ? { ...task, duration: 30 } : task) }
const timedSquares = applyTaskPack(s.squares, timedPack)
assert(timedSquares[1].duration === 30, '任务包可导入倒计时秒数')
let invalidDurationRejected = false
try { applyTaskPack(s.squares, { ...timedPack, tasks: timedPack.tasks.map((task, index) => index === 0 ? { ...task, duration: TASK_DURATION_MAX + 1 } : task) }) } catch (error) { invalidDurationRejected = true }
assert(invalidDurationRejected, '超出倒计时上限的任务包会被拒绝')
const restoredPackSquares = applyTaskPack(s.squares, exportedPack)
assert(restoredPackSquares[0].type === 'start' && restoredPackSquares[47].type === 'finish', '任务包导入保留固定起点与终点')
let invalidPackRejected = false
try { applyTaskPack(s.squares, { ...exportedPack, tasks: exportedPack.tasks.slice(1) }) } catch (error) { invalidPackRejected = true }
assert(invalidPackRejected, '不完整任务包会被拒绝')

const boardHtml = renderBoardCellsHtml(s.squares)
assert(boardHtml.includes('board-cell-start') && boardHtml.includes('board-cell-end'), '棋盘含起终点')
const startCellHtml = boardHtml.match(/<div class="board-cell board-cell-start[^>]*>[\s\S]*?<\/div>/)?.[0] || ''
assert(startCellHtml.includes('endpoint-marker') && !startCellHtml.includes('class="cn"'), '起点仅保留房子标识，不显示编号')
assert(boardHtml.includes('data-sq="2"') && boardHtml.includes('<span class="cn">1</span>'), '起点后的首个任务格显示为 1')
assert(boardHtml.includes('data-sq="48"') && boardHtml.includes('<span class="cn">47</span>'), '终点显示为 47')
assert((boardHtml.match(/class="board-cell[^"]*"/g) || []).length === 48, '棋盘渲染 48 格')
assert(boardHtml.includes('board-core'), '棋盘含中心标识区')
assert(boardHtml.includes('board-cell--forward') && boardHtml.includes('board-cell--reroll'), '特殊格含语义样式')
assert(!boardHtml.includes('track-turn'), '棋盘不含赛道方向标')
assert(boardHtml.includes('pieces--normal') && boardHtml.includes('pieces--special') && boardHtml.includes('pieces--endpoint'), '棋子容器标明格子类型')
const markedBoardHtml = renderBoardCellsHtml(s.squares, { 2: { boy: true, girl: true } })
assert(markedBoardHtml.includes('task-done-mark--boy') && markedBoardHtml.includes('task-done-mark--girl'), '棋盘可显示男女任务完成标记')

store.resetGame()
store.rollDice()
assert(store.state.rolling === true && store.state.phase === 'rolling', 'rollDice 进入滚动')
store.commitRoll(3)
assert(store.state.moving === true, 'commitRoll 进入移动')
assert(Array.isArray(store.state.movePath) && store.state.movePath.length === 3, '移动路径 3 步')
assert(store.state.movePath.join(',') === '1,2,3', '起点掷 3 点依次到第 1、2、3 格')
store.finishMove()
assert(!store.state.moving, 'finishMove 结束移动')
assert(store.state.players[0].position === 3, '起点掷 3 点停在可见第 3 格')

// 重开后，旧动画回调和非法骰子值都不能污染新棋局状态。
store.resetGame()
store.commitRoll(6)
assert(store.state.phase === 'idle' && store.state.players[0].position === 0, '未处于掷骰状态时忽略过期的骰子回调')
store.rollDice()
store.commitRoll(7)
assert(store.state.rolling === true && store.state.phase === 'rolling', '非法骰子值不会改变滚动状态')
store.resetGame()
store.finishMove()
assert(store.state.phase === 'idle' && store.state.players[0].position === 0, '重开后忽略过期的移动完成回调')

// 旧棋盘只有 text 时仍可正常触发任务，且男女任务按当前玩家分别读取。
store.resetGame()
const taskSquare = store.state.squares.find(square => square.type === 'normal')
taskSquare.text = '旧版兼容任务'
taskSquare.boyText = ''
taskSquare.girlText = ''
store.state.players[0].position = taskSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.effects[0]?.text === '旧版兼容任务', '旧版普通任务 text 可回退使用')

store.resetGame()
const separateTaskSquare = store.state.squares.find(square => square.type === 'normal')
separateTaskSquare.duration = 30
separateTaskSquare.boyText = '男生专属任务'
separateTaskSquare.girlText = '女生专属任务'
store.state.players[0].position = separateTaskSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.effects[0]?.text === '男生专属任务', '男生触发男生任务')
assert(store.state.effects[0]?.duration === 30, '限时任务效果携带倒计时')
store.resetGame()
store.state.current = 1
const girlTaskSquare = store.state.squares.find(square => square.id === separateTaskSquare.id)
girlTaskSquare.boyText = '男生专属任务'
girlTaskSquare.girlText = '女生专属任务'
store.state.players[1].position = girlTaskSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.effects[0]?.text === '女生专属任务', '女生触发女生任务')

// 普通任务确认后只标记完成任务的玩家；重开会清空标记。
store.resetGame()
const completedSquare = store.state.squares.find(square => square.type === 'normal')
store.state.players[0].position = completedSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
store.confirmEffect()
assert(store.state.completedTasks[completedSquare.id]?.boy === true, '男生完成任务后显示男生标记')
store.state.players[1].position = completedSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
store.confirmEffect()
assert(store.state.completedTasks[completedSquare.id]?.boy && store.state.completedTasks[completedSquare.id]?.girl, '男女完成同一任务后同时保留标记')
store.resetGame()
assert(Object.keys(store.state.completedTasks).length === 0, '重开后清空任务完成标记')
store.setSoundEnabled(false)
assert(store.state.soundEnabled === false, '音效开关可关闭')
store.setSoundEnabled(true)

// 重摇会保留当前玩家；暂停会在下次轮到该玩家时跳过并自动恢复。
store.resetGame()
const rerollSquare = store.state.squares.find(square => square.type === 'reroll')
store.state.players[0].position = rerollSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
store.confirmEffect()
assert(store.state.current === 0 && store.state.phase === 'idle' && !store.state.rerollPending, '重摇格让当前玩家再次掷骰')

store.resetGame()
const pauseSquare = store.state.squares.find(square => square.type === 'pause')
const normalSquareAfterPause = store.state.squares.find(square => square.type === 'normal')
store.state.players[0].position = pauseSquare.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
store.confirmEffect()
assert(store.state.players[0].paused && store.state.current === 1, '暂停格标记当前玩家并切换到对方回合')
store.state.players[1].position = normalSquareAfterPause.id - 2
store.rollDice()
store.commitRoll(1)
store.finishMove()
store.confirmEffect()
assert(!store.state.players[0].paused && store.state.current === 1 && store.state.notice?.includes('跳过本回合'), '暂停玩家会被跳过并在随后恢复')
store.resetGame()

// 前进、后退提示确认后才启动额外移动，并根据新落点继续生成任务。
store.resetGame()
const forwardSquare = store.state.squares.find(square => square.id === 2)
const forwardTarget = store.state.squares.find(square => square.id === 4)
forwardSquare.type = 'forward'
forwardSquare.value = 2
forwardSquare.text = '前进 2 格'
forwardTarget.type = 'normal'
forwardTarget.text = '前进后的任务'
forwardTarget.boyText = '前进后的任务'
store.state.players[0].position = 0
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.players[0].position === 1 && store.state.effects[0]?.type === 'forward', '先落到前进格并显示确认弹窗')
store.confirmEffect()
assert(store.state.moving && store.state.movePath.join(',') === '2,3', '确认前进后才开始额外移动')
store.finishMove()
assert(store.state.effects[0]?.text === '前进后的任务', '前进落点继续触发新任务')

store.resetGame()
const backwardSquare = store.state.squares.find(square => square.id === 6)
backwardSquare.type = 'backward'
backwardSquare.value = 2
backwardSquare.text = '后退 2 格'
store.state.players[0].position = 4
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.players[0].position === 5 && store.state.effects[0]?.type === 'backward', '先落到后退格并显示确认弹窗')
store.confirmEffect()
assert(store.state.moving && store.state.movePath.join(',') === '4,3', '确认后退后才开始额外移动')
store.finishMove()
assert(store.state.effects[0]?.text === '前进后的任务', '后退落点继续触发新任务')

// 终点任务确认完成后才判定胜利。
store.resetGame()
const finishSquare = store.state.squares.find(square => square.type === 'finish')
finishSquare.text = '完成终点挑战'
store.state.players[0].position = 46
store.rollDice()
store.commitRoll(1)
store.finishMove()
assert(store.state.phase === 'effects' && store.state.effects[0]?.type === 'finish' && store.state.effects[0]?.text === '完成终点挑战', '到达终点先显示可设置的终点任务')
assert(!store.state.winner, '终点任务确认前不判胜')
store.confirmEffect()
assert(store.state.winner === 'boy' && store.state.phase === 'done', '完成终点任务后判胜')
store.resetGame()

console.log('\n所有冒烟测试通过')
