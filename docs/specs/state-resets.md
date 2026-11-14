# The state's resets (v2.3.5203)

`src/game/resetOn.js`; held by `tools/guards/state-ledger.test.mjs` §6-7 and
`server/test/state-resets.test.mjs`. Grand plan step 5.3, step 2; card L PR 3
onwards.

## What it is

The state ledger (`src/state/`, card U) lists every field of `S` and every
top-of-file variable, and says "the sitting, never reset" for each until
someone decides otherwise. Card D's census suggests a reset for 484 of them
(`zone`, `death`, `rejoin`). Step 2 decides each one, a system at a time:

- a **reset**: the row goes back at an edge, and its `lifetime` names the
  edge;
- or **kept, and why**: the row stays for the sitting, and its `reset` column
  says why the suggestion does not hold.

A reset that each system writes by hand in its own place (its own zone check,
its own timer) is how the zone-local leftovers drifted. The 2026-11-03 sweep
found five of nine ways of changing place skipping the list (V11 G3-6). So a
reset is **registered beside its state**, in its own system's file, and the
**edge's one door** runs every reset registered for it:

```js
/* in the system's own file */
function forgetShotEnds(S) {
  S._shotEnds = null;
}
resetOn('zone', forgetShotEnds, 'audio');
```

A reset is a named function that writes its state itself. The census reads
each `resetOn` call and sees which rows the function writes, so a reset done
through another call is invisible to it.

## The doors

| Edge | Its one door | Called |
|---|---|---|
| `zone` | `changeZone` (`src/game/zoneTransitions.js`) | on a real change of place (`from !== to`); a flip to the zone you are in keeps what belongs to it. A death's respawn changes the zone too. |
| `rejoin` | `rejoinClear` (`src/game/rejoinSlots.js`) | once, at every `state_sync` (`wsClient.js`), whatever the worker's re-send count |
| `death` | **none on the page yet** | two respawns (`respawn.js applyLocalRespawn`, and `monsterCombat.js`'s own in the local-monster mode), and five places start a death (`S._dying = true`). No reset may name it. |

**The death's door** is the page's `life` row of the phase table
(`src/state/phases.js`, `todo`). It is the first of the page's doors in card
L's PR 5 list, before `connection`, `loading` and `window` (the planning
session, 2026-11-14). It will be one respawn, through `applyLocalRespawn`. The
death rows land with it.

**The rejoin's rule** (TRAPS §278). The phone clears its copy at `state_sync`
only together with the worker's re-send. A rejoin reset is allowed only for a
field the worker says again after the door (the join's train), and its `reset`
names the message; or for a field the worker forgets too, and its `reset`
names where. It is never allowed for a field that `state_sync` itself sets
before `rejoinClear` runs, which the reset would wipe (`S._testMode`,
`monsterMoves.js _caps`).

## A reset clears state

A reset never starts a sound, a screen or an effect (TRAPS §305). What it puts
back is the stale thing gone, nothing more. A reset that would change what a
player sees or hears beyond that is the owner's question, listed under Needs
in card L's status, and its row stays `sitting`.

A reset may BE the system's own end where the system already ended the state
itself, a frame later, on its own check. The pose (`interactions.js
endOwnPose`) ends at the door the frame the place changes, with its word to
the worker, as `updateOwnEmote`'s zone check did a frame later. That check
stays, and it is what ends the pose with the switch thrown.

## The switch a system

`?<system>reset=0`, in lower case with the system's hyphen dropped
(`?townsfolkreset=0`, `?pagethreadreset=0`), turns that system's resets off at
the door and no other system's. The plan's rule 4: `state-resets.test` plays
every system's resets once with its switch on and once thrown. Where a reset
replaced the system's own check, that check stays as the off-ramp.

Each switch is read by its literal name in `resetOn.js resetSwitches()`, where
card T's scanner sees it, and has its row in card T's switch table
(`tools/guards/lib/switches.mjs`, side `page`). Both go in the PR that
registers a system's first reset (the planning session's call, 2026-11-14).
`state-resets.test` fails a registered system with no line there. A system
with no line has no switch, and its resets always run.

## The ledger's two hand columns

| Column | Holds |
|---|---|
| `lifetime` | `sitting`, or the edges joined by `+` (`zone`, `zone+rejoin`) |
| `reset` | beside an edge: `value <v>` (the reset puts that value back) or `fn <name>` (a function does more than set a value); beside `sitting`: `kept: <why>`. Absent until someone decides. |

`state-census.mjs --ledger <system> --write` keeps both, as it keeps every
column it does not make. The page never imports a ledger.

## The guard (state-ledger.test)

- §1: `lifetime` and `reset` are in their form: an edge has a value or a fn,
  and `kept:` sits beside `sitting`.
- §6 (reading the script): every row whose lifetime names an edge is reset
  there, by a `resetOn` whose function writes it or by the door's own list
  (`changeZone` and `clearZoneLocalFx` for the zone, `rejoinClear` for the
  rejoin). Every reset writes only rows whose lifetime names its edge. A
  `resetOn` call not in the form `('<edge>', <a named function>,
  '<system>')` fails. The census's new `resets` output reads the calls (an
  output; card D's reading rules are unchanged).
- §7: the rows with a suggestion still `sitting` with no `kept:` may only
  fall. `SITTING_LINE` is lowered by each of card L's reset PRs to its count:
  484, then 468 after PR 3.

## The first systems (PR 3)

The card's thirteen systems with the fewest rows D suggests a reset for:
`life`, `liveops`, `debug`, `look`, `townsfolk`, `audio`, `memory`,
`page-thread`, `art`, `preload`, `input`, `quests`, `monsters`. That is 30
rows. 20 are outside the files that wait; 16 were decided:

| Row | Decided |
|---|---|
| `S._pose` (townsfolk) | `zone+rejoin`, `fn endOwnPose`: the door ends a held pose (its rejoin half is `rejoinClear`'s pose slot) |
| `S._shotEnds` (audio) | `zone`, `value null`: the balls' ends belong to the place they flew in |
| `S._iceAttack` (input) | kept: nothing reads it |
| `S._specialAttack` (input) | kept: the swing's own mark, ended with its swing |
| `S._shieldStamina`, `S.shieldActive` (input) | kept: never set, never read |
| `S._sootQueue` (monsters) | kept: drained every frame, and a mark from another place ends at once |
| `S.campfires`, `S.projectiles` (page-thread) | kept: never set |
| `S._testMode` (liveops), `monsterMoves.js _caps` (monsters) | kept: said again in `state_sync` itself, before the rejoin's door |
| `S._achv` (quests), `S._codex` (monsters) | kept: said again whole at the join, and they hold the banners and NEW marks still waiting, which a reset would drop |
| `S._pointsResetAskedAt` (quests) | kept: a throttle on asking, which runs out by itself |
| `questHandIn.js _pending` (quests) | kept: settled by the rejoin's own quest map |
| `questKept.js _kept` (quests) | kept: it is what a rejoin carries over |

Left `sitting`:

- the three death rows (`S._deathCard`, `S._cursedUntil`,
  `S._playerStunUntil`), until the death's door exists;
- `wheelMusic.js _m`: a zone reset would make a return to the Wheel pick its
  land's music at once, which is `resetWheelMusic`'s own wording, where today
  the last visit's wait may hold. That is the owner's question.
- the 9 rows under `src/rendering/**` (preload 3, art 3, memory 2, look 1),
  which wait for card H's `done`;
- `perfTracker.js zoneStats` (debug), which waits for card A.

The 40 `?` rows (nobody has read them yet) are outside the 484.

## PR 4 (v2.3.5204): desktop, social, movement

22 rows decided, which takes `SITTING_LINE` from 468 to 446. Three systems'
resets:

| Row | Decided |
|---|---|
| `S._climb`, `S._climbDrop`, `S._riseCross`, `S._nearChest` (movement) | `zone`, `value null`: `climbActions.js leaveRises`, the same four nulls BroTown's off-the-Wheel clear wrote a frame later (it stays, as the off-ramp) |
| `S._wheelSwim` (movement) | `zone`, `value null`: `wheelSwim.js leaveWheelWater`, as `updateWheelSwim`'s own off-the-Wheel clear (it stays) |
| `S._race`, `S._raceLil` (social) | `rejoin`, `fn forgetRace`: the worker forgets a race at a join and says nothing of it again; its card is told. Its zone half is the worker's: `race_end` `left` at the next move |
| `S._jump`, `S._jumpOver`, `S._sprint` (movement) | kept: each ends itself at a change of place, through `endJump` / `stopSprint`, which do more than clear it |
| `S._restAsked`, `S._riseChestAsk` (movement) | kept: an ask's throttle, and where the last ask was made |
| `S._nmlFoes`, `S._serverMutes`, `S._serverMuteNames`, `chatMute.js _kept` (social) | kept: a choice that lapses by itself; copies replaced whole by the rejoin's echo; what a rejoin carries |
| `S._teachNode` and the lesson's page elements, `_nextEnc` (desktop) | kept: set afresh every tick; made and removed by the tick itself; its own clock |

Left `sitting`:

- `deskTeach.js _armed`: a zone reset would drop the "Almost!" lesson that a
  change of place in a harvest's window gives today. That is a screen, so it
  is the owner's question.
- `S._spar`: the takeover's leave skips most duties, so whether the worker's
  clones outlive a reconnect needs reading first.
- `S._ride`: card SK is changing `ride.js`.
- `economy` and `skills` are the next tag's.

The suite's built resets may call a module's own helper (the race's
`raceBus.emit()`, a card told to hide). In the suite that helper is a no-op;
the census still holds that the reset writes its state itself.

## PR 5 (v2.3.5205): economy, skills

17 rows decided, which takes `SITTING_LINE` from 446 to 429.

| Row | Decided |
|---|---|
| `S._smithing` (skills) | `zone`, `value null`: `smithing.js leaveForge`, so a smelt's pose never runs on in the next place (switch `?skillsreset`) |
| `S._extraction`, `S._farmWork` (skills) | `zone`, `fn clearZoneLocalFx`: the zone door's own list already clears them |
| `S._farmArtHold`, `S._farmLeaving` (skills) | kept: they span the change of place by design (the farm trip) |
| `S._nearBed` (skills) | kept: worked out every frame |
| `S._petBook`, `S._fishBoard`, `dailyRewards.js _state`, `loginSpinWheel.js _st` | kept: the worker's last word, replaced whole by its next; a reset would blank a window on screen |
| `S._bank`, `S._bankPending` (economy) | kept: the join does not say the vault again; an op in flight lets go by itself |
| `S._t2Leave`, `S._t2QuietUntil` (economy) | kept: the rejoin's trade clear keeps a leave on purpose |
| `S._dailyRewards` (economy) | kept: never read |
| `revealBag.js _then`, `shardCrack.js _pending` | kept: asks in flight that let go by themselves |

Left `sitting`:

- `S._dropLines`, `S._dlCredits`, `S._trap`, `S._trapTries`: their renderers
  (`rendering/dropLines.js`, `rendering/trapFx.js`) keep their own copies.
  These are card H's family, and the rows are decided with it.
- `fishWeigh.js st`: whether a lost answer blocks the next weigh needs
  reading.

