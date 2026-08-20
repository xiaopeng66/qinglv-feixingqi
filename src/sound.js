let audioContext = null

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

const PATTERNS = {
  dice: [[220, 0, 0.05], [330, 0.07, 0.06], [440, 0.15, 0.08]],
  move: [[280, 0, 0.06]],
  confirm: [[392, 0, 0.08], [523, 0.09, 0.12]],
  timeout: [[330, 0, 0.1], [220, 0.12, 0.18]],
  win: [[392, 0, 0.1], [494, 0.1, 0.1], [587, 0.2, 0.2]]
}

export function playSound(kind, enabled = true) {
  if (!enabled) return
  const context = getContext()
  const pattern = PATTERNS[kind]
  if (!context || !pattern) return
  const now = context.currentTime
  pattern.forEach(([frequency, offset, duration]) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = kind === 'dice' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + offset)
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.08, now + offset + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + duration + 0.02)
  })
}
