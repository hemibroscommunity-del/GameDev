# A burning heap sets you on fire (v2.3.3748)

The owner, 2026-10-28:

> And if you stand in a burning pile of flames from a building prop getting
> destroyed you get on fire and take damage (same flame effect as the building)

![On fire in the Hotel's burning heap, on a phone](../shots/heapburn-onfire.webp)

## What a player sees

When one of BroTown's buildings is brought down burning (the building fire of
v2.3.3230), its pieces burn on where they lie. Step into a burning piece and:

- **you are on fire**: the building's own flames, the same pixel flames, coals,
  sparks and smoke, burning round your feet;
- **you take damage**: a burn tick about once a second, 3% of your health,
  with the flame on the number and your health bar dropping;
- **walk out** and the ticks stop at once and the flames on you die down.

**It can finish you off.** The owner: "Yeah let the fire finish you off". Stay
in it and you burn to death: "BURNED TO DEATH" over you, and you are back in
BroTown five seconds later, the flames gone. It hurts in BroTown although BroTown
is safe ground (no monster hurts you there): the owner asked for it.

While you stand in it the burn wins over BroTown's healing: every tick counts
as being hit, so the safe ground's quick healing waits (it heals only after 6 s
without a hit). Step out and, 6 s later, it heals you back up as it always does.

## A death in a heap: what it costs, and why it opens no trick

Checked against the death path as it is (`index.js` `_handlePlayerDeath`):

- **The ordinary death in the world.** The cause is `monster:heap`, through
  the one door like any monster's blow. Your bag (not your gold, not what you
  wear, not your tools or quest items) falls as your Remains where you died:
  yours alone for a minute, then anyone's, gone after its time. That is
  exactly what a death to a monster you provoked onto the safe ground has
  always done; only the old town's own zone drops none.
- **No killer.** No kill credit, no XP, no loot, no clan-war score, no bounty,
  no No man's land kill. A red skull loses what a monster's kill takes of it,
  as anywhere in the world. No achievement or counter counts a death or a hit
  taken (`achievements.js`, `codex.js`, `botfp.js` read none of them).
- **Nothing new to move or farm.** Dying to hand a friend your bag gives them
  nothing a trade or a drop could not already, and costs you the respawn. The
  fire is on YOUR screen under YOUR boots: nobody can light it under you or
  drag it to you, and the phone only says so for your own feet. No monster in
  BroTown can shove you in, and a player's shove needs a duel.
- **Kill switch** `heapburn: false`: no burning, no deaths.

## How

The fire is on each phone's screen only (`docs/specs/building-fire.md`: the
worker knows nothing of it), but damage is the worker's. So the phone says so:

- **The phone** (`src/game/heapBurn.js`, `BroTown.jsx`'s loop): while your
  boots stand within 34 px of a burning, landed piece of a fallen building's
  heap (`rendering/buildingFire.js` `burningAt`), it sends `heap_burn` (no
  fields) about once a second and sets `S._heapBurnUntil` for the look. Only
  against a worker that says `caps.heapburn`. `wsClient.js` lets the type out
  (TRAPS #18).
- **The look** (`buildingFire.js` `PersonFire`, owned by `EffectsRenderer`):
  one of the building fire's own `Blaze`s, a burning piece's spot of flames at
  your feet, sized with you, in the effects' overlay layer. Made the first time
  you burn and kept; its sprites are pooled, all from the campfire's atlas
  (nothing loaded or made); shown and hidden by `visible` only as you step in
  or out.
- **The worker** (`server/src/heapburn.js` `_handleHeapBurn`): it burns the
  SENDER only, through the one door (`hits.js` row `heap`: flame, nothing to
  block, roll or hide behind, no shelter), and only:
  - in the world, alive, on BroTown's ground (`_wheelSafeAt`, where every
    building stands), not harvesting;
  - one tick a second at most, however often it is asked;
  - 3% of max HP a tick, with no cap: it can kill.
- **Honest enough**: a phone that lies can only hurt itself. It names nobody
  else, and a tick pays no XP, no kill credit and no loot. A phone that never
  says so spares only itself. So it is no honesty check, and test mode is
  untouched. The worker does not check each building's own footprint (it holds
  none of them); the town check and the rate are the guard. A later hardening:
  a table of the buildings' footprints on the worker (from the bake), and the
  tick only within the one the phone names.
- **Cost**: one small message a second, only while you stand in fire; the
  vitals' coalesced save, as every hit. Nothing new is stored.

## Kill switch

`heapburn: false` in the live flags: `caps.heapburn` is false (the phone sends
nothing and draws no fire on you) and the worker burns nobody.

## Tests

- `heap-burn` suite: a tick through the wire (3%, flame, at your place,
  nobody else touched); the rate (thirty asks over three seconds, three
  ticks); it burns you to death from 70 HP, put down to `monster:heap`, the
  phone told, no burning a corpse; refused dead, off BroTown's ground, outside
  the world; the switch, and the cap at the next join.
- `hit-door` §11: the `heap` row lands on the safe ground and through a raised
  shield, leaves a harvester alone, and its tick at 1 HP is the death path.
- `mp-heapburn` (12, a phone in BroTown, a real worker): the Hotel brought
  down burning (four slime blasts through the game's own `blast`), its pieces
  burning where they lie; standing in one, the building's flames on you (from
  the campfire's atlas) and the worker's ticks (8 a second) taking your health;
  walked out, no more ticks and the flames out; the Hotel mended, its heap's
  fire gone and nothing burning where it lay; a second building's heap, stayed
  in to the end: burned to death (`monster:heap`, "BURNED TO DEATH"), back in
  BroTown alive with the flames off; no page errors.

A heap burns on as long as you stand in it: the game never mends a building on
top of you (`wheelBreak.js`: its mending waits while you stand in its
footprint), so it is the walk out, or the death, that ends it.
