import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultSquares, LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../src/data.js'

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    }
  }
}

test('loads legacy flight chess data and persists it under the namespaced keys', async () => {
  const storage = createMemoryStorage()
  const legacySquares = createDefaultSquares()
  const legacyPlayers = [
    { id: 'boy', name: '旧玩家 A', color: '#000000', emoji: 'A', position: 4, paused: false },
    { id: 'girl', name: '旧玩家 B', color: '#ffffff', emoji: 'B', position: 2, paused: false }
  ]
  const legacyGame = { current: 1, diceValue: 5, positionScheme: 'task-positions-v2', soundEnabled: false }
  storage.setItem(LEGACY_STORAGE_KEYS.squares, JSON.stringify(legacySquares))
  storage.setItem(LEGACY_STORAGE_KEYS.players, JSON.stringify(legacyPlayers))
  storage.setItem(LEGACY_STORAGE_KEYS.game, JSON.stringify(legacyGame))
  globalThis.localStorage = storage

  const { store } = await import(`../src/store.js?storage-migration-test=${Date.now()}`)

  assert.equal(store.state.players[0].name, '旧玩家 A')
  assert.equal(store.state.players[0].position, 4)
  assert.equal(store.state.current, 1)
  assert.equal(store.state.soundEnabled, false)

  store.setSoundEnabled(true)

  assert.notEqual(storage.getItem(STORAGE_KEYS.squares), null)
  assert.notEqual(storage.getItem(STORAGE_KEYS.players), null)
  assert.notEqual(storage.getItem(STORAGE_KEYS.game), null)
  assert.equal(storage.getItem(LEGACY_STORAGE_KEYS.squares), JSON.stringify(legacySquares))
})
