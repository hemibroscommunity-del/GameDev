# The life's page door (card L PR 5, grand plan step 5.3b; v2.3.5534)

`src/game/dyingDoor.js` (`dyingTo`, `dyingPhase`, `DYING_WAYS`,
`dyingDoorOff`); held by `server/test/life-page-door.test.mjs` and the phase
table's guard (the `life` row on the page). The worker's half is the life
door (`server/src/life.js` `_lifeTo`, `ps.life`); the names differ on
purpose.

## What it is

Your dying seconds on the phone are one field, `S._dying` (alive, dying),
its start `S._deathStart` (the death animation's clock) written beside it by
the same call (the row's `notes`). Six files wrote them in fourteen places.

| way | callers | writes |
|---|---|---|
| `die` | `wsClient.js` (the worker's death), `gameEvents.js` and `monsterCombat.js` (a local death), `BroTown.jsx` (the catch-all, a seeded start kept) | dying, from its start |
| `seed` | `entityRenderer.js` (hp 0 and no start yet) | the start alone |
| `respawn` | `respawn.js` `applyLocalRespawn`, `monsterCombat.js`'s town respawn, `BroTown.jsx`'s fallback | alive, the start back to 0 |

## Step 1: nothing a player sees changes

The rule is the callers' own: a start is a number. Each pair of writes was a
few lines apart with nothing reading the start between them, so writing both
at once changes nothing. `?dyingdoor=0` writes what a caller asks, as before.

## Beside the door

`S.respawnTimer` (also a dodge's short hold, `dodge.js`), the death card
(`S._deathCard`, `deathCard.js`), the death count on the save, and the
renderer's posed-picture copy (`poseFrame`, the guard's `besides`).
