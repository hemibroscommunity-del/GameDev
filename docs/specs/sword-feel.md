# The sword's feel, and the weapon feel kit (v2.3.4800)

> The owner, 2026-11-11: *"Instead of just copying what other games do I want
> to think about the 'feel' of the combat. Think about the sword swing. The
> bow pull back and release. The staff building power and blasting the
> orb."* Then, approving the design: *"Yes remove the timing bar. It needs to
> be something else entirely, and yes but build all of them (sword, bow,
> magic)."*

The sword went first; the bow and the staff reuse its kit ("For the bow and
staff", below). Everything here is the phone's: the worker is not changed
(`server/src/freeswing.js` still weighs each swing and judges the perfect
strike), so nothing here changes damage, damage a second, or what a hit on a
player does.

## What a player feels

Every attack has four beats: **touch** (the weapon answers the thumb at once),
**build** (tension, seen and heard on the weapon, never a gauge), **release**
(what happens matches what was built), **contact** (the payoff scales with
strength).

### The blade refills, and glints

- Right after a swing the sword is **dull** (its metal at half brightness). It
  brightens over the sword's cycle, the same cycle the worker weighs a swing
  by (600 ms x the Speed stat's cut).
- When it is full, **a glint runs down the edge**, grip to point, with a small
  bright ring, and a star sits at the point until the window closes. A cut
  in the glint is the **perfect strike**: exactly the worker's window, 60 ms
  before the full cycle to 300 ms after (`MANUAL.PERFECT_EARLY_MS` /
  `PERFECT_LATE_MS`, mirrors of the worker's). After it the blade rests full
  and bright.
- Nothing to hold: you choose when to cut. Fast swipes are a flurry of light
  cuts; waiting for the gleam is a cleave. The same damage a second.
- **The timing bar is gone** (it stood over the left joystick, v2.3.4625 to
  v2.3.4656). Its picture, the owner's sheet, stays on disk:
  `public/sprites/timingbar/weapons.png` (not loaded).

### Your swipe is the blade

- The swing starts **as the thumb moves**, not on the lift: a stroke is 24 px
  of travel inside 280 ms (`manualCombat.js` `mcSwipeMove`, unchanged), and
  the swing begins on the move that makes it.
- **The arc follows the thumb.** Left to right is a forehand, right to left a
  backhand: the trail turns the way the thumb went round the bro, and the
  bro's swing is drawn sweeping that way too. A short **flick** is a quick,
  narrow cut; a thumb that keeps going makes a **sweep**, the arc widening
  with it (from 1.0 to 2.5 radians between 24 and 140 px).
- It still **bends toward the nearest monster**: the swing's angle is the
  sword's automatic lock, as before. The thumb chooses the turn, not the
  target, so it connects without precise aim.
- Not a combo: a forehand and a backhand are the same cut, nothing
  multiplies (the owner removed the x1/x2/x3 chain).

### Weight in the contact

| the cut | its share of a full swing | what you see and hear |
|---|---|---|
| light (a quick cut) | under 0.8 | a small spark, a light tick over the hit, the monster barely moved (0.35 of the knock-back), a small shake, no debris |
| full | 0.8 or more | a bigger spark, the material's debris, today's knock-back, a thud under the hit, the camera pushed 4 px the swing's way |
| perfect (in the glint) | full, in the window | the biggest spark and a ring, the crit's bigger debris, 1.4 of the knock-back, a deep thud and a crack, the camera pushed 8 px |

The monster's number is still the worker's (sized by its share as before,
`mcNumberScale`), and so is its real shove (only a full swing carries one).

### A computer

Each click is a cut toward the cursor, as before; its arc comes from the
cursor's side (to the right a forehand, to the left a backhand).

## Switches

- **On for everyone** in the game's own combat (the free swing, against a
  worker advertising `caps.freeSwing`), with a sword in hand. The glint only
  against a worker that judges the perfect strike (`caps.perfectStrike`): it
  promises the worker's verdict.
- **`?swordfeel=0`** in the address turns it off on that one phone or
  computer, remembered (`localStorage` `bt_swordfeel`); **`?swordfeel=1`**
  brings it back. Off, the sword is exactly as it was before this.
- `?manual=1`, `?manual=2` and `?manual=0` (the plain swipes, the slingshot
  bow, the old combat) never meet it. The worker's `freeswing: false` takes
  it away with the free swing.
- No server part, so no cap and no live flag of its own.

## How it is built

| file | what |
|---|---|
| `src/game/weaponFeel.js` | THE KIT'S RULES, pure (imports only the manual-combat rules): readiness, the glint's phase and run, a build's share and stages, the contact's strength, the cut's arc, the bounded claim, the effects queue, the off-ramp |
| `src/game/swordFeel.js` | the sword's use of them: `swordFeelSwing` (swingAttack, as a swing begins), `swordFeelFrame` (the game loop, once a frame after the combat step), `swordFeelContact` (monsterCombat, on the contact frame), `swordCutDir` (the swing figure's turn) |
| `src/rendering/systems/weaponFeelFx.js` | the pictures, in a world layer of their own (`weaponFeel`, pixiApp.js: after the night's light, under the damage numbers): the effects queue drained each frame, and each weapon's drawer (the sword's: the glint on the blade) |
| `src/data/weaponFeelSound.js` | the sounds, made with WebAudio (no files): `ready`, `contact`, `release`, `stage`, `build`; played by `BT_AUDIO.feelSound`, each labelled in the Sound Studio |
| `src/rendering/systems/entityRenderer.js` | the blade's dullness: your sword's tint times the readiness, where its tint is set |
| `src/rendering/systems/effectsRenderer.js` | the backhand's figure: every authored swing sweeps counter-clockwise as drawn (measured off the weapon layers), so a cut the other way takes the mirrored twin for the front and back views (south, north) and runs the side view's frames (east, west) from last to first. No new pose: each is a facing and frames the game already draws. |
| `src/game/monsterCombat.js` | the contact: knock-back, shake and debris scaled by the cut's strength (the look before, unchanged, when the feel is off) |
| `src/game/manualCombat.js` | a stroke now says which way and how fast the thumb went (`S._mc.stroke`) and where the thumb is (`cx`, `cy`) |

## For the bow and staff

The kit is in three files beside the sword's, so the next lanes add theirs
without touching it. The API is written at the top of each file; in short:

**Rules** (`src/game/weaponFeel.js`, node-testable):

| function | gives |
|---|---|
| `feelReadiness(prevAt, cycleMs, now)` | 0..1, how far the weapon has refilled since its last attack (a bow's bend, an orb's size) |
| `feelPhase(prevAt, cycleMs, now)` | `'fill'`, `'glint'` (the perfect window, the worker's numbers) or `'rest'`. The staff has no window: treat `'glint'` as full. |
| `feelGlintT(prevAt, cycleMs, now)` | 0..1 the glint's run, -1 outside the window |
| `feelPerfect(...)` | the phone's guess of the worker's verdict |
| `feelShare(heldMs, fullMs)` | a build's share of a full one (the damage the worker should give: the free swing's rule) |
| `feelStage(r, n)` / `feelStageCrossed(prevR, r, n)` | the build stage (the staff: spark, orb, sphere = 1, 2, 3) and the moment one lands |
| `feelStrength(share, perfect)` | the contact's size: `{ tier, k, spark, debris, knock, push, shake, vol }` |
| `feelBuildRate(r)` | the rising build tone's rate, 1 to 2 (an octave) |
| `feelClaimMs(claimMs, sinceLastMs, allowMs)` | **the bounded claim**: a phone's draw or gather time as the worker must read it, never more than the worker's own time since that player's last attack plus `FEEL.CLAIM_ALLOW_MS` (150). The worker needs its own copy (a mirror pinned by a test). |
| `feelArc(stroke, aimAng)` / `feelArcGrow(arc, px)` | a swipe's turn, width and kind (the sword's; a staff's aim lean could use the same) |
| `feelDim(r)`, `feelTint(rgb, k)` | a weapon's brightness for readiness, and a tint scaled |
| `pushFeelFx(S, ev)` | queue an effect for the renderer (below) |
| `feelSwitch(name, key)` | the off-ramp: `feelSwitch('bowfeel', 'bt_bowfeel')`, `feelSwitch('stafffeel', 'bt_stafffeel')` |

**Pictures** (`src/rendering/systems/weaponFeelFx.js`): game code queues
effects with `pushFeelFx(S, ev)`:

| `ev.kind` | fields | draws |
|---|---|---|
| `'arc'` | `at, ang, arc: { dir, width, ms }, k, tier` | a cut's trail round the player |
| `'burst'` | `at, x, y, ang, k, color` | a contact's sparks, a cone about `ang`, sized by `k` |
| `'pulse'` | `at, x, y, k, color` | a ring that swells and fades (a stage landing, a perfect strike) |
| `'streak'` | `at, x, y, ang, len, k, color` | a flash along a line (a release: the bow's snap, the orb's blast) |

and per-frame looks go in a **drawer**: `registerFeelDrawer(fn)`, `fn(fx, S,
entityRenderer, now)`, calling `fx.glow(key, x, y, size, alpha, color)` (a
soft dot: a nock's gleam, the orb), `fx.line(key, x0, y0, x1, y1, thick,
alpha, color)` (an aim line, a string) and `fx.toLayer(obj, x, y)` (a point
on a sprite, in the layer's space). A key not drawn in a frame is hidden.
Register the drawer by importing its file from `weaponFeelFx.js` (one line).

**Sounds** (`BT_AUDIO.feelSound(kind, k, opts)`): `'release'` (a snap of air
sized by `k`), `'stage'` (`opts.stage` 1..3, a step deeper each), `'contact'`,
`'ready'`, and `'build'`, which returns `{ set(r), stop() }`: call `set(r)`
each frame while building (its pitch rises an octave), `stop()` on the
release or the cancel. A new kind gets its Sound Studio row
(`soundStudio.js` OTHER_PLAYS) in the same change.

**Rules the kit keeps** (and so must its users): one small layer, never a big
layer's draw list each frame (TRAPS §218); no picture fetched (the
placeholders are minted); every sound node let go when it ends; the worker
judges damage (a claim is bounded, never trusted); a staff has no timing
window (the owner); damage a second never moves.

## Art the owner could draw later

Each placeholder is a soft white picture tinted in code. To replace one,
draw it and say which; the code would load it behind the loading screen
(256 colours, `strip256.mjs`):

- **the blade's glint**: a small four-point star and a short bright streak,
  white, to run along the sword's edge (now `sword:glint`, `sword:tip`);
- **the cut's trail**: a crescent of air, forehand (the code mirrors it for a
  backhand), in three widths (flick, cut, sweep);
- **the contact's spark**: a burst of white-gold sparks in three sizes (light,
  full, perfect), and a ring for the perfect strike;
- **the sounds** are made in code (a ring, a tick, a thud, a crack): a
  recording of a blade's ring, a light cut and a heavy cleave would replace
  them (with its licence in CREDITS.md).

## Not built, and why

- **The follow-through half step** (the bro carried half a step forward by a
  full cut): moving the player is a move the worker bounds and the ground's
  collision decides, so it is the owner's call; today the camera's push in
  the swing's direction carries it.
- **Other players see your forehand only**: the relay of a swing
  (`player_swing`) carries its angle, not its turn. Adding the turn is a
  relay field (server `relay.js`), a worker change of its own.
- Not tried: a fight with a real monster on a phone (the scenario cuts in the
  safe town; the contact is driven by its probe).

## Tests

- `server/test/weapon-feel.test.mjs`: the kit's rules (readiness and the
  glint's edges, the strength tiers, the arc's turn for each direction and a
  click, stages, the bounded claim, the switch, the queue), the sounds (every
  WebAudio node let go), and the wiring.
- `server/test/manual-combat.test.mjs` §14: the timing bar gone (files, rules,
  CSS, preload, mount, scenario, review pictures) and the owner's sheet kept;
  a stroke's direction recorded.
- `node tools/qa/mp/run.mjs swordfeel` (`mp-swordfeel.mjs`): an upright phone
  in the Wheel playing the default combat -- the feel on, its layer, no bar;
  the glint following the cycle; the blade drawn dull and bright, the glint
  drawn; a forehand and a backhand, the figure sweeping each way; a flick
  widening to a sweep; light and full contacts; its work a frame under a
  quarter of held-budget's frame line; `?swordfeel=0` the look before.
