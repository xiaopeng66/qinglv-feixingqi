import assert from 'node:assert/strict'
import test from 'node:test'
import { createGameRegistry } from '../src/app/gameRegistry.js'

function createGame(id = 'test-game') {
  return {
    id,
    title: 'Test Game',
    createSession() {
      return { destroy() {} }
    }
  }
}

test('registers and lists a valid game definition', () => {
  const registry = createGameRegistry()
  const game = createGame()

  const registered = registry.register(game)

  assert.equal(registry.get(game.id), registered)
  assert.deepEqual(registry.list(), [registered])
  assert.equal(Object.isFrozen(registered), true)
})

test('returns null when a game is not registered', () => {
  const registry = createGameRegistry()

  assert.equal(registry.get('missing'), null)
})

test('rejects a duplicate game id', () => {
  const registry = createGameRegistry()
  registry.register(createGame())

  assert.throws(() => registry.register(createGame()), /already registered/)
})

test('rejects incomplete game definitions', () => {
  const registry = createGameRegistry()

  assert.throws(() => registry.register(), /definition is required/)
  assert.throws(() => registry.register({ title: 'Missing ID', createSession() {} }), /non-empty id/)
  assert.throws(() => registry.register({ id: 'missing-title', createSession() {} }), /non-empty title/)
  assert.throws(() => registry.register({ id: 'missing-session', title: 'Missing session' }), /createSession/)
})
