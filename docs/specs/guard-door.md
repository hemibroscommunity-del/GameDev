# The guard door (card L PR 5, grand plan step 5.3b)

The guard is your shield, raised or not. Its machine has two halves, as every
door of card L PR 5 does: the worker's (`ps.blocking`, `ps._guardBrokenUntil`
in `server/src/hits.js`, `combat.js`, `index.js`) and the page's. **The
worker's half waits for card K** (it holds `combat.js` and `index.js`). The
page's is built (v2.3.5521).

## The page (v2.3.5521)

`src/game/guardDoor.js` (`guardTo`, `GUARD_PAGE_WAYS`, `guardPhase`); held by
`server/test/guard-page-door.test.mjs` and the phase table's guard (the
`guard` row on the page). Your shield on the phone is down or up: one field,
`S._shieldUp`, the boolean every reader already reads (the move's
`blocking`, the shield button, the renderer, the coach). Two files wrote it
in three places; now only `guardTo` does, by a way of `GUARD_PAGE_WAYS`:

| way | caller | to |
|---|---|---|
| `raise` | `shieldToggle.js raiseShieldToggle` (the button, a key, the mouse: all through it) | up |
| `raise` | `playerActions.js raiseShield` (unused since v2.3.2242: nothing imports it) | up |
| `drop` | `shieldToggle.js dropShield` (a tap, a block landed, a dodge, the stamina's release, a death: its `why`) | down |

- **The rules are the callers' own checks**, so nothing a player sees
  changes: up only from down, with a shield in hand (v2.3.212) and out of
  the cooldown a broken guard leaves (`_shieldCdUntil`); down only from up
  (`dropShield`: one drop, one word to the worker). The refusals that need
  the world (swimming, dazed, mid-jump) stay with `raiseShieldToggle`, which
  asks them first. `?guarddoor=0` lifts the door's rules (its row is in card
  T's table).
- **Not folded, notes beside it**: which input holds it (`_shieldKb`,
  `_shieldMouse`), the cooldown and its auto-release (`_shieldCdUntil`,
  `_shieldAutoReleased`, `shieldEnd`), the stamp of the raise
  (`shieldActive`), the renderer's pose (`_blockPose`) and the block ring's
  own state (`ui/mobile/blockRingBus.js`).
- **Not yours**: a peer's copy of their guard (`other._shieldUp`,
  `game/shieldCopies.js`, from `player_shield`), and the renderers' copies
  of the state for a posed picture: the guard's `besides`.
- **The door writes the two values as such** (`true`, `false`), so the
  state census still reads a flag (the ledger's `flag` mark).
- **A module of no imports**, so a node test reads its rules. The suite also
  loads `shieldToggle.js` itself and plays a raise, a toggle down, the
  cooldown, no shield, the water, each with its word to the worker read off
  the action door's transport. `playerActions.js` pulls in a `.jsx` node
  cannot load, so its unused raise is held by its text.
