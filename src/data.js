// 格子类型定义与默认 48 格内容

export const SQUARE_TYPES = {
  start:    { key: 'start',    label: '起点',    icon: 'home',        color: '#34C759', desc: '游戏起点' },
  finish:   { key: 'finish',   label: '终点',    icon: 'flag',        color: '#FFB800', desc: '到达即获胜' },
  normal:   { key: 'normal',   label: '普通任务', icon: 'heart',      color: '#FF6B9D', desc: '自定义任务内容' },
  forward:  { key: 'forward',  label: '前进',    icon: 'arrow-right', color: '#4CD964', desc: '再前进指定格数' },
  backward: { key: 'backward', label: '后退',    icon: 'arrow-left',  color: '#FF9500', desc: '后退指定格数' },
  pause:    { key: 'pause',    label: '休息',    icon: 'coffee',      color: '#FFCC00', desc: '下回合跳过' },
  reroll:   { key: 'reroll',   label: '重摇',    icon: 'refresh-cw',  color: '#AF52DE', desc: '再掷一次骰子' }
}

// 编辑界面下拉可选的预设类型（起点/终点为固定格，不参与下拉）
export const EDITABLE_TYPES = ['normal', 'forward', 'backward', 'pause', 'reroll']

// 默认 48 格内容（情侣任务示例，可在编辑页自定义）
export function createDefaultSquares() {
  const tasks = [
    '亲对方一下 😘',
    '说一句土味情话',
    '给对方按摩肩膀 30 秒',
    '深情对视 10 秒不许笑',
    '模仿对方说话的语气',
    '唱一首歌给对方听',
    '给对方一个大大的拥抱',
    '讲一个笑话逗对方笑',
    '说出对方的三个优点',
    '给对方捶背 20 下',
    '用方言说“我爱你”',
    '给对方倒一杯水',
    '一起自拍一张合照',
    '猜拳三局两胜，输的人做家务',
    '给对方一个额头吻',
    '分享今天最开心的一件事',
    '给对方发一个爱心表情',
    '互相说一句“辛苦了”',
    '给对方捏捏耳朵',
    '回忆第一次约会的地点',
    '给对方一个公主抱（尽力而为）',
    '说一句对方最想听的话',
    '给对方喂一颗糖',
    '互相击掌庆祝一下',
    '给对方整理衣领',
    '夸夸对方今天的穿搭',
    '给对方一个摸头杀',
    '一起比个心拍张照',
    '说出对方最喜欢的一道菜',
    '给对方揉揉手',
    '互相挠痒痒 10 秒',
    '给对方一个晚安吻（提前预支）',
    '帮对方拿拖鞋',
    '说一句“有你真好”',
    '给对方一个熊抱',
    '互相猜对方此刻在想什么',
    '给对方一个鼓励的击掌',
    '一起喊一句“我们最棒”',
    '给对方一个脸颊吻',
    '分享一个共同的回忆',
    '给对方一个温柔的摸脸杀',
    '互相说一句悄悄话',
    '给对方讲一个睡前故事的开头',
    '一起做三个深蹲',
    '说出对方今天最帅/最美的一个瞬间',
    '给对方吹吹手掌再牵住',
    '模仿对方最常说的一个口头禅',
    '一起许一个只有彼此知道的小愿望'
  ]

  const squares = []
  for (let i = 1; i <= 48; i++) {
    squares.push({
      id: i,
      type: 'normal',
      text: tasks[i - 2] || '自定义任务内容',
      boyText: tasks[i - 2] || '自定义任务内容',
      girlText: tasks[i - 2] || '自定义任务内容',
      duration: 0,
      value: 0
    })
  }

  // 起点
  squares[0] = { id: 1, type: 'start', text: '起点 · 出发啦！', value: 0 }
  // 终点
  squares[47] = { id: 48, type: 'finish', text: '给对方一个胜利的拥抱', duration: 0, value: 0 }

  // 预设特殊格分布（前进/后退/暂停/重摇）
  const specials = {
    4:  { type: 'forward',  value: 2,  text: '前进 2 格' },
    8:  { type: 'backward', value: 2,  text: '后退 2 格' },
    12: { type: 'reroll',   value: 0,  text: '重摇一次' },
    15: { type: 'pause',    value: 0,  text: '暂停一次' },
    19: { type: 'forward',  value: 3,  text: '前进 3 格' },
    23: { type: 'backward', value: 3,  text: '后退 3 格' },
    27: { type: 'reroll',   value: 0,  text: '重摇一次' },
    31: { type: 'pause',    value: 0,  text: '暂停一次' },
    35: { type: 'forward',  value: 2,  text: '前进 2 格' },
    39: { type: 'backward', value: 2,  text: '后退 2 格' },
    43: { type: 'reroll',   value: 0,  text: '重摇一次' },
    46: { type: 'pause',    value: 0,  text: '暂停一次' }
  }

  for (const [id, spec] of Object.entries(specials)) {
    squares[id - 1] = { id: Number(id), ...spec }
  }

  return squares
}

// 本地存储键
export const STORAGE_KEYS = {
  squares: 'qlfxq_squares_v1',
  players: 'qlfxq_players_v1',
  game: 'qlfxq_game_v1'
}
