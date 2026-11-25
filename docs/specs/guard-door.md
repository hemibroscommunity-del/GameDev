# The guard door (card L PR 5, grand plan step 5.3b)

The guard is your shield, raised or not. Its machine has two halves, as every
door of card L PR 5 does: the worker's (`ps.blocking`, `ps._guardBrokenUntil`
in `server/src/hits.js`, `combat.js`, `index.js`) and the page's. Both are
built: the page's in v2.3.5521, the worker's in v2.3.5536.

## The worker (v2.3.5536)

`server/src/moveclaims.js` (`_guardTo`, `GUARD_WAYS`, `guardStateOf`,
`_guardDoorOff`); held by `server/test/guard-door.test.mjs` and the phase
table's guard (the `guard` row on the worker). The shield is one field,
`ps.blocking` (down, raised); its parry stamp `ps.blockStartT` and its
break latch `ps._guardBrokenUntil` are written beside it, never alone.
Nine files wrote them in fifteen places; now only `_guardTo` does, by a way
of `GUARD_WAYS`:

| way | caller | to |
|---|---|---|
| `raise` | `movement.js _handleMove` (a move's `blocking`, up from down; stamped when the parry has re-armed, else unstamped); the sparring clone's shield (`spar.js _sparShieldStep`) | raised |
| `lower` | `movement.js _handleMove` (a move's `blocking` false, or inside the latch); `moveclaims.js _swingDropsGuard` (a sword's claim); `linger.js`, `bodytake.js`; the sparring clone (`spar.js`: its lower, its fall, its stand) | down |
| `break` | an empty bar: `index.js _tickPlayerRegen` (the hold's drain), `combat.js _resolvePvPAttack`, `pvpextras.js _strikePlayer`, `hits.js _hitStopped` (a blocked blow) | down, latched for `GUARD_BREAK_MS` |

- **Step 1 changes nothing a player sees**: a raise is refused while the
  latch is live, the check `movement.js` and the clone already made first;
  a lower and a break always write. A guard held up is not written again
  (its stamp stands). The phase a reader would name (`guardStateOf`): broken,
  parry, raised, down.
- **Not folded, notes beside it**: the swing's `_guardDownAt` (the parry's
  re-arm, `_guardDownNote`), the shield's facing `ba`.
- **Not the player's guard**: the clone's birth (`spar.js _sparSpawn`) and
  the tick's copy onto its entry (`tick.js`): the phase table's `besides`.
- **The switch**: `guarddoor: false` in the live flags lifts the latch rule,
  as the lines before the door. Its row is in card T's switch table.
- **The test**: §1 the door's rules and the switch; §2 a write of
  `.blocking`, `.blockStartT` or `._guardBrokenUntil` anywhere in
  `server/src` outside `_guardTo`, and each way's callers; §3 the real room:
  a move's raise, hold and lower, a sword's claim, the regen's break and a
  move inside its latch.

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
- **One import**, the page's switch reader (`game/switches.js`, itself of
  no imports; card T's), by a relative path, so a node test reads its rules
  (`?guarddoor=0` is read through it). The suite also
  loads `shieldToggle.js` itself and plays a raise, a toggle down, the
  cooldown, no shield, the water, each with its word to the worker read off
  the action door's transport. `playerActions.js` pulls in a `.jsx` node
  cannot load, so its unused raise is held by its text.

## The worker's break, on the page (v2.3.6554, card CT part 20)

The owner, 2026-11-25: "shield isn't working correctly during combat it stays
like it's showing up even when the energy has been exhausted and you take
damage." The worker breaks the guard at 0 stamina (`_guardTo(ps, 'break')`,
3 s, `GUARD_BREAK_MS`) and says so only by the stamina, 0, on its
`player_state`; the page's own drop at zero sits behind BroTown's
`BLOCK_COSTS_STAMINA`, false on purpose (v2.3.1731). So the shield stayed
drawn and the button lit through the break, every blow landing in full.

Now `src/game/guardBreak.js` `poolsLand` (then `followWorkerGuard`), where the worker's
pools land (wsClient.js `player_state`): the worker's stamina at 0 with the
page's shield up drops it through `dropShield` (why `stamina`), and holds the
button for the worker's 3 s (`_shieldCdUntil`, the button's cooldown face,
its arc now 3 s: ShieldButton.jsx `SHIELD_CD_MS`). It never comes back by
itself: a tap after the 3 s raises it. This answers the owner's list
(2026-10-26) section 10, shield questions 1 and 4 (the screen shows the drop;
the phone's cooldown is the worker's 3 s); question 2 (back by itself) and 3
(a daze stopping a raise on the worker) are untouched. Held by
`server/test/guard-break-page.test.mjs`; played by `mp-shielddrop` (red on
main in both control modes). A rare case left: a monster's blocked blow that
breaks the guard on the very tick the stamina regen runs is refilled before
the flush (tick.js: regen, then flush), so the page reads 7, not 0, and keeps
that one break's shield drawn (about one break in 30).

