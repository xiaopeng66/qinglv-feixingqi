// 可分享的任务包格式：仅包含起点之后的 47 个可配置格子。
import { EDITABLE_TYPES } from './data.js'

export const TASK_PACK_FORMAT = 'qinglv-feixingqi-task-pack'
export const TASK_PACK_VERSION = 1
export const TASK_TEXT_MAX_LENGTH = 500
export const TASK_DURATION_MAX = 600

const IMPORTABLE_TYPES = new Set([...EDITABLE_TYPES, 'finish'])

function asText(value) {
  return typeof value === 'string' ? value : ''
}

function taskNumber(square) {
  return square.id - 1
}

export function createTaskPack(squares) {
  if (!Array.isArray(squares) || squares.length !== 48) throw new Error('当前棋盘数据不完整，无法导出。')

  return {
    format: TASK_PACK_FORMAT,
    version: TASK_PACK_VERSION,
    name: '情侣飞行棋任务包',
    tasks: squares.slice(1).map(square => {
      const task = { number: taskNumber(square), type: square.type, duration: Math.max(0, Math.min(TASK_DURATION_MAX, Number(square.duration) || 0)) }
      if (square.type === 'normal') {
        task.boyText = asText(square.boyText ?? square.text)
        task.girlText = asText(square.girlText ?? square.text)
      } else {
        task.text = asText(square.text)
        if (square.type === 'forward' || square.type === 'backward') task.value = Number(square.value) || 1
      }
      return task
    })
  }
}

function normalText(value, label, number) {
  const text = asText(value)
  if (text.length > TASK_TEXT_MAX_LENGTH) throw new Error(`第 ${number} 格${label}任务超过 ${TASK_TEXT_MAX_LENGTH} 字。`)
  return text
}

function durationValue(value, number) {
  if (value === undefined || value === null || value === '') return 0
  const duration = Number(value)
  if (!Number.isInteger(duration) || duration < 0 || duration > TASK_DURATION_MAX) {
    throw new Error(`第 ${number} 格倒计时必须是 0 至 ${TASK_DURATION_MAX} 秒的整数。`)
  }
  return duration
}

// 校验通过后返回新的棋盘草稿；不会修改传入的现有棋盘数据。
export function applyTaskPack(squares, pack) {
  if (!pack || typeof pack !== 'object') throw new Error('任务包不是有效的 JSON 对象。')
  if (pack.format !== TASK_PACK_FORMAT || pack.version !== TASK_PACK_VERSION) {
    throw new Error('不是支持的情侣飞行棋任务包格式。')
  }
  if (!Array.isArray(pack.tasks) || pack.tasks.length !== 47) {
    throw new Error('任务包必须包含第 1 至第 47 格，共 47 个任务。')
  }
  if (!Array.isArray(squares) || squares.length !== 48) throw new Error('当前棋盘数据不完整，无法导入。')

  const tasks = new Map()
  for (const item of pack.tasks) {
    const number = Number(item?.number)
    if (!Number.isInteger(number) || number < 1 || number > 47 || tasks.has(number)) {
      throw new Error('任务包中的格号必须是唯一的第 1 至第 47 格。')
    }
    if (!IMPORTABLE_TYPES.has(item.type) || (number === 47 ? item.type !== 'finish' : item.type === 'finish')) {
      throw new Error(`第 ${number} 格的类型不符合棋盘规则。`)
    }
    tasks.set(number, item)
  }

  const nextSquares = squares.map(square => ({ ...square }))
  for (let number = 1; number <= 47; number += 1) {
    const item = tasks.get(number)
    const current = nextSquares[number]
    const duration = durationValue(item.duration, number)
    if (item.type === 'normal') {
      const boyText = normalText(item.boyText, '男生', number)
      const girlText = normalText(item.girlText, '女生', number)
      nextSquares[number] = { ...current, type: 'normal', value: 0, duration, text: boyText || girlText, boyText, girlText }
      continue
    }

    const value = item.type === 'forward' || item.type === 'backward'
      ? Math.max(1, Math.min(10, Number(item.value) || 1))
      : 0
    const fallback = item.type === 'forward' ? `前进 ${value} 格`
      : item.type === 'backward' ? `后退 ${value} 格`
        : item.type === 'pause' ? '暂停一次'
          : item.type === 'reroll' ? '重摇一次'
            : '给对方一个胜利的拥抱'
    nextSquares[number] = { ...current, type: item.type, value, duration, text: asText(item.text) || fallback }
  }

  return nextSquares
}
