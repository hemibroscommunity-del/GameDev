# The owner's test panel (v2.3.2240)

> Owner: "Is there a test suite you can build that allows me to test features
> directly without needing to play through the quest line? Having to play
> through slows down development greatly."

## The problem, concretely

The fire trail (v2.3.2238) lives in ember. Ember is gated behind `tut_4`.
`tut_4` is the fourth link of a chain that runs through three other zones. So
the only way to *look* at a new ember mechanic on a phone was to replay the
tutorial — and a feature you cannot look at is a feature you cannot judge.
The headless harness could reach ember, but it reports into a session, not
into the owner's hand.

## What it is

A panel inside the game with four operations:

| | what it does |
|---|---|
| **Unlock every gated zone** | sets each zone-gating quest to `active` |
| **Warp** | stands you on a zone's trail-head on the World View |
| **Give weapons + levels** | the tutorial's three starter weapons, plus levels |
| **Heal / God mode** | refill the bars; stop taking damage, on a timer |

**Opened by a 1.2-second press on the zone name** in the header. That target
was chosen because it is always on screen in the world, nobody press-and-holds
a title by accident, and it needs no new furniture in a HUD the owner has
repeatedly asked to keep clear. The panel's code is lazily imported, so it is
not on the bundle's critical path.

## Why this is not a cheat surface

**It adds no client→server websocket message.** That is the whole security
argument, not a detail. The socket is deny-by-default (CLAUDE.md's wire
section) precisely because anything a client can *say*, a cheater can say
too — a `dev_warp` message would be exactly the forgeable lever that list
exists to prevent.

Every privileged action is an HTTP call to the **existing** operator API
(`server/src/admin.js`), authenticated with `Authorization: Bearer
<ADMIN_KEY>` and audited in `admin_log` like every other mutating admin op.
Without the owner's key the panel is inert scaffolding: the worker answers
401, or 404 when no key is configured at all — the same fail-closed posture
that makes the whole admin surface indistinguishable from a route that does
not exist.

The key is typed once and kept in `localStorage` on the owner's own device.
It is never bundled and never sent anywhere but the worker's admin routes.
"Forget key on this device" removes it.

`server/test/mirror-audit.test.mjs` pins this posture, because a future
session could add a convenient `dev_warp` message and no functional test
would notice — the feature would still work, and every client would have the
zone gate.

## Design decisions worth keeping

### There is no warp endpoint

A server-side teleport was the obvious shape and it is wrong twice over.

The zone-entry sequence lives inside `_handleMove`: clear per-zone lifesteal
tracking, spawn monsters and nodes, re-scale the zone's population, stamp the
entry grace window, send the snapshot on **both** protocol versions, replay
the fire trail, and send empty state for a safe zone so stale entities do not
render on the town map. A second caller means duplicating eight obligations
or refactoring a load-bearing path for a dev tool. (That refactor was written
and then reverted once this design appeared — it was change on a critical
path with no remaining reason.)

And the **client** owns `S.currentZone`. A server that moved the player
without being asked would leave the browser rendering the zone it still
thinks it is in.

So: unlock the gate, and let the ordinary move the client already sends do
the travelling.

### Warp is "stand me at the door"

For the same family of reason on the client side. Entering a zone runs
per-zone asset preload behind the loading overlay (CLAUDE.md's ZONE-ASSET
EXCEPTION), frees the previous map, sets zone dimensions, starts the ambient
audio, records encyclopedia discovery and quest flags, resets depth, and
sends the server move — all inside `handleZoneTransitions`. A dev button that
re-implemented that would drift from the real path and start reporting bugs
that do not exist; one that skipped the preload would break the
animation-preloading law outright.

So the button puts the player on the trail-head (`WORLDVIEW_EXITS`) and lets
the game walk through its own front door. It works from the World View, and
says so plainly anywhere else rather than half-working.

### Unlock sets `active`, not `turnedIn`

`active` is all `_zoneUnlocked` asks for. Marking a quest **complete** would
hand over its rewards' worth of progress and rewrite the tutorial's dialogue
state, making the owner's save unrepresentative of the players being tested
for.

The list is derived from `QUEST_ZONE_GATE` — the same table `_zoneUnlocked`
reads — so it cannot drift: a quest that starts gating a zone tomorrow is
unlocked by this tomorrow, with no edit here.

### Levels go through the real award path

`_prog3AwardXp(..., { flat: true })` — the same function a real kill calls.
The level-ups therefore mint allocation points, cross milestones, recompute
maxes and notify the client exactly as earned ones do. Writing `prog3`
internals by hand would have produced a character in a state the real game
can never reach, which is the classic way a dev tool starts reporting bugs
that do not exist.

### God mode is in-memory and always expires

It rides `ps._godUntil`, a timestamp on `playerState` and never on the
persisted rpg blob (handoff rule 1), so it dies on reconnect, on a deploy and
on its own timer, capped at two hours. There is no way to leave it on by
accident and no way for it to reach a save file.

It reuses the **exact** short-circuit shape `_zoneEntryGraceUntil` already
has in `_applyDamage` rather than inventing a second immunity mechanism — one
place damage can be zeroed — and returns `graced`, so damage tracking, kill
credit and lifesteal behave as they do during the entry window.

## Where it lives

| file | what |
|---|---|
| `server/src/devtools.js` | the four operations + route handling |
| `server/src/admin.js` | routes `/dev/*` first, inheriting auth and the audit log |
| `server/src/combat.js` | the god-mode short-circuit in `_applyDamage` |
| `server/src/movement.js` | exports `QUEST_ZONE_GATE` |
| `src/ui/panels/DevPanel.jsx` | the panel |
| `src/ui/mobile/ZoneHeader.jsx` | the long-press trigger |

## Setup

The panel needs `ADMIN_KEY` set on the worker — the same secret the rest of
the operator toolkit uses. See `docs/OPERATIONS.md`; if you already have a key
for the admin commands, that is the one to paste.

## Testing

**`server/test/devtools.test.mjs`** (36 assertions). The security half is
pinned first: no key → 404, wrong key → 401, and five shapes of forged
websocket message change nothing. The rest asserts against the gate the game
actually consults (`_zoneUnlocked`, then a real `_handleMove` into ember) and
against `_applyDamage`, rather than against the fields this module writes — a
test that only checked its own writes would pass on a kit that unlocked
nothing. Negative-controlled: removing the `_applyDamage` hook fails god mode
only; writing `turnedIn` fails the "active, not complete" pair; a no-op
unlock fails four separate reachability assertions.

**`tools/qa/mp/mp-devpanel.mjs`** (15 assertions) drives a real touch client:
a short tap must *not* open the panel, a 1.2s press must, it asks for a key,
it reaches the worker cross-origin, and — the assertion the whole feature is
for — a character that was gated out of ember at the start of the run ends it
standing in ember, with no quest played.

### A measurement trap recorded here

The admin `/player` summary carries **no `z` field**. An earlier version of
the scenario asserted on it and reported a working warp as broken. Every zone
assertion now reads `/api/admin/dev/state`, which returns the server's own
`zone`.
