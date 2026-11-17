# The dungeon's page door (card L PR 5, grand plan step 5.3b; v2.3.5535)

`src/game/dungeonDoor.js` (`dungeonTo`, `dungeonPhase`, `DUNGEON_PAGE_WAYS`,
`dungeonDoorOff`); held by `server/test/dungeon-page-door.test.mjs` and the
phase table's guard (the `dungeon` row on the page). The worker's half is the
dungeon door (`server/src/dungeon.js` `_dungeonTo`, v2.3.5215).

## What it is

Your run on the phone is one field, `S._inDungeon` (out, in), its notes
written beside it by the same call (the row's `notes`): `S._inCustomDungeon`
and `S._dungeonComplete` (its last wave beaten). The phase: `none`, `in`, or
`complete`. Seven files wrote them in twenty-four places.

| way | callers | writes |
|---|---|---|
| `enter` | `gameEvents.js` (the worker's run), `DungeonCreatorPanel.jsx` (a run of your own) | in, custom, not complete |
| `complete` | `gameEvents.js`, `dungeonWaves.js` | complete |
| `leave` | `gameEvents.js`, `dungeonWaves.js`, `zoneTransitions.js`, `wheelDungeons.js`, `respawn.js` | out: each site the fields it wrote before, and only those |

Each call names the fields it writes (`{ in, custom, complete }`, each a
boolean); a field not named is left as it is, as each old site left it.

## Step 1: nothing a player sees changes

The rules are the callers' own: enter writes in, complete writes complete,
leave writes no `in: true`. The `complete: false` an enter wrote a few lines
later now comes with the enter itself; nothing read it between.
`?dungeondoor=0` writes what a caller asks, as before.

## Beside the door

The run's place and number (`S._serverDungeon`, `S._dungeonZone`,
`S._dungeonWave`, `S._dungeonBack`), the opening
(`S._wheelDungeonOpening`), the clear (`S._dungeonClear`), the entry time
(`S._dungeonEnteredAt`), and the config, the depth and the boss mark.
