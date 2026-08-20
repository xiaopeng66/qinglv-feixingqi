function assertGameDefinition(game) {
  if (!game || typeof game !== 'object') {
    throw new TypeError('A game definition is required.')
  }
  if (typeof game.id !== 'string' || game.id.trim() === '') {
    throw new TypeError('A game definition must provide a non-empty id.')
  }
  if (typeof game.title !== 'string' || game.title.trim() === '') {
    throw new TypeError('A game definition must provide a non-empty title.')
  }
  if (typeof game.createSession !== 'function') {
    throw new TypeError('A game definition must provide createSession(root).')
  }
}

export function createGameRegistry() {
  const games = new Map()

  return Object.freeze({
    register(game) {
      assertGameDefinition(game)
      if (games.has(game.id)) {
        throw new Error(`A game with id "${game.id}" is already registered.`)
      }
      const definition = Object.freeze({ ...game })
      games.set(definition.id, definition)
      return definition
    },

    get(id) {
      return games.get(id) || null
    },

    list() {
      return Array.from(games.values())
    }
  })
}

export const gameRegistry = createGameRegistry()
