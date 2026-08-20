export function createGameHost(root, registry) {
  if (!(root instanceof HTMLElement)) {
    throw new TypeError('A root HTMLElement is required.')
  }
  if (!registry || typeof registry.get !== 'function') {
    throw new TypeError('A game registry is required.')
  }

  let currentSession = null

  return Object.freeze({
    mount(gameId) {
      const game = registry.get(gameId)
      if (!game) {
        throw new Error(`Game "${gameId}" is not registered.`)
      }
      if (currentSession) currentSession.destroy()
      currentSession = game.createSession(root)
      if (!currentSession || typeof currentSession.destroy !== 'function') {
        throw new TypeError(`Game "${gameId}" must return a session with destroy().`)
      }
      return currentSession
    },

    destroy() {
      if (currentSession) currentSession.destroy()
      currentSession = null
      root.replaceChildren()
    }
  })
}
