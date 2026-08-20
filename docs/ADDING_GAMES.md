# Adding Games

Each game is an isolated module. The app shell knows how to register and mount games, but it does not contain a game's rules, views, or storage details. This keeps a new game from changing flight chess behavior by default.

## 1. Create a game module

Create a folder under `src/games/`. Its `index.js` exports a definition with a stable `id`, a display title, and a session factory.

```js
import { createExampleSession } from './session.js'

export const exampleGame = Object.freeze({
  id: 'example-game',
  title: 'Example Game',
  description: 'Short description for a future game selector.',
  createSession: createExampleSession
})
```

The ID is permanent once released. It is used for storage names and future links, so do not reuse an ID for a different game.

## 2. Keep a session boundary

`createSession(root)` creates the game UI and returns an object with `destroy()`. The `destroy()` method must remove subscriptions, timers, listeners, and child views created by that game.

```js
export function createExampleSession(root) {
  // Mount the game's view and keep its cleanup handles here.
  return {
    destroy() {
      root.replaceChildren()
    }
  }
}
```

Do not add game-specific view switching or rules to `src/main.js`, `src/app/gameHost.js`, or `src/app/gameRegistry.js`.

## 3. Register the game

Import the definition in `src/main.js` and register it before mounting it:

```js
gameRegistry.register(exampleGame)
```

The current product opens flight chess directly. When there are multiple released games, add a selector that calls `host.mount(gameId)` instead of adding conditionals to the app entry point.

## 4. Use isolated storage

Give every game its own keys. Use a namespaced pattern such as `qinglv.games.example-game.v1.state`. Never read or write another game's keys.

When changing a released format, read the old version first and write only the new version. Do not delete old keys during automatic migration; users may need them to recover data.

## 5. Test the rules and lifecycle

Keep pure game rules in small modules where possible and cover them with Node tests. Add a regression case for each fixed bug. Run all checks before pushing:

```powershell
npm test
npm run build
```

For Android changes, also run `npx cap sync android` and build the debug APK.
