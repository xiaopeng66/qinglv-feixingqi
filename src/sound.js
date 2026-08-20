let audioContext = null

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

const SOUNDS = {
  'ui-open': [{ frequency: 480, offset: 0, duration: 0.055, volume: 0.035, type: 'sine' }],
  'ui-close': [{ frequency: 360, offset: 0, duration: 0.05, volume: 0.028, type: 'sine' }],
  'ui-select': [{ frequency: 620, offset: 0, duration: 0.045, volume: 0.032, type: 'triangle' }],
  dice: [
    { frequency: 210, offset: 0, duration: 0.055, volume: 0.045, type: 'triangle' },
    { frequency: 290, offset: 0.075, duration: 0.06, volume: 0.042, type: 'triangle' },
    { frequency: 390, offset: 0.15, duration: 0.075, volume: 0.045, type: 'triangle' }
  ],
  move: [{ frequency: 330, offset: 0, duration: 0.045, volume: 0.024, type: 'sine' }],
  'task-open': [
    { frequency: 440, offset: 0, duration: 0.07, volume: 0.04, type: 'sine' },
    { frequency: 554, offset: 0.075, duration: 0.095, volume: 0.04, type: 'sine' }
  ],
  'countdown-start': [
    { frequency: 523, offset: 0, duration: 0.06, volume: 0.038, type: 'triangle' },
    { frequency: 659, offset: 0.07, duration: 0.09, volume: 0.04, type: 'triangle' }
  ],
  'countdown-tick': [{ frequency: 740, offset: 0, duration: 0.026, volume: 0.018, type: 'sine' }],
  'countdown-urgent': [
    { frequency: 880, offset: 0, duration: 0.032, volume: 0.03, type: 'triangle' },
    { frequency: 1175, offset: 0.045, duration: 0.045, volume: 0.026, type: 'triangle' }
  ],
  'countdown-finish': [
    { frequency: 523, offset: 0, duration: 0.07, volume: 0.038, type: 'sine' },
    { frequency: 659, offset: 0.085, duration: 0.08, volume: 0.04, type: 'sine' },
    { frequency: 784, offset: 0.175, duration: 0.13, volume: 0.042, type: 'sine' }
  ],
  confirm: [
    { frequency: 392, offset: 0, duration: 0.065, volume: 0.04, type: 'sine' },
    { frequency: 523, offset: 0.075, duration: 0.1, volume: 0.04, type: 'sine' }
  ],
  success: [
    { frequency: 587, offset: 0, duration: 0.07, volume: 0.04, type: 'sine' },
    { frequency: 784, offset: 0.09, duration: 0.12, volume: 0.04, type: 'sine' }
  ],
  error: [{ frequency: 210, offset: 0, duration: 0.12, volume: 0.035, type: 'triangle' }],
  win: [
    { frequency: 392, offset: 0, duration: 0.1, volume: 0.045, type: 'sine' },
    { frequency: 494, offset: 0.1, duration: 0.1, volume: 0.045, type: 'sine' },
    { frequency: 587, offset: 0.2, duration: 0.18, volume: 0.048, type: 'sine' }
  ]
}

function playTone(context, now, tone) {
  const start = now + tone.offset
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = tone.type || 'sine'
  oscillator.frequency.setValueAtTime(tone.frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(tone.volume, start + Math.min(0.012, tone.duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + tone.duration + 0.02)
}

export function playSound(kind, enabled = true) {
  if (!enabled) return
  const context = getContext()
  const sound = SOUNDS[kind]
  if (!context || !sound) return
  const now = context.currentTime
  sound.forEach(tone => playTone(context, now, tone))
}
