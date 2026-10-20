# Combat feel, from the playtest notes of 2026-10-19 (v2.3.3499)

The owner's notes after more play, the ones about fighting and moving, and
one asked for while this was being built. Everything here is the phone's
own; nothing on the worker changes, so it ships in either order.

| The owner said | What changed |
|---|---|
| "when you do the whirlwind (wind up period after tapping the button) it would be helpful if the monsters were highlighted ... to show if they're in the whirlwind effective area" | Every monster the whirlwind will catch wears a bright ring at its feet, beating with the wind-up, and a chevron pointing at you |
| "Try making jump 25% higher. Gets stuck on some props sometimes that it should be clearing." | 85 px instead of 68, a little longer in the air; a crossing once started is never stopped half way; minecarts and rowboats can be jumped |
| "You can get stuck targeted to a monster way across the map" | Any lock goes once its monster is 1,700 px off, or 1.5 s off the part of the world that is drawn |
| "Make it so you can place a trap while jogging" | The TRAP button answers a touch, not only a click |
| "More detailed trap for the roll after monster dies. Put "Missed!" instead of "it broke free"" | The owner's own box trap picture is the trap in the world; a miss breaks it into pieces and says "Missed!" |
| "Make a sound when a trap gets placed on an enemy. Make a sound when a monster gets trapped (your pet)" | A latch when it is set, a rattle each shake, a snap and a win on a catch (and the new pet's own voice), a splinter on a miss |
| "Don't turn enemies red on the final death flow ... make the edges more jagged ... Remove the death where the enemy is frozen in place" | The pieces keep the monster's colour and shape, the cut is jagged enough to see, and a monster with no death animation topples over |
| "Make dropped items 50% larger (hard to see)" | A dropped item (and a dead player's pile) is drawn 1.5x |

## The whirlwind's catch

- The worker strikes, when the wind-up ends, the 16 nearest damageable
  monsters within 240 px (x the depth scale) of where it has you
  (`server/src/abilities.js`, the whirl's scan).
- Every frame of the wind-up, `effectsRenderer._markWhirlCatch` asks the same
  question of the monsters this screen holds -- nearest first, at most the
  wind-up's own `max` (`data/abilities.js` `maxTargets`, carried on
  `S._whirlWindup`) -- measured where each is drawn, as the ring is drawn
  round where you are drawn.
- Each caught monster: a dark keyline, a bright gold ring and a smaller
  orange one at its feet, filled faintly, pulsing with the wind-up's 700 ms
  beat and thickening as the strike comes; a gold chevron on the ground
  between it and you, pointing at you (the vortex pulls them in).
- Rings, not a tint: the tint is the hit flash's (and the death's), and an
  outline filter is a pass in the middle of the frame (TRAPS §221).
- A caught monster's ordinary engage ring stands aside (`_whirlCaught`): one
  monster, one ring.
- Probe: `window.__btWhirlCatch()` -> `{ n, inside, r, ids }` while a wind-up
  is up, else null.

## The jump

- `JUMP_PEAK` 68 -> 85, `JUMP_MS` 560 -> 625 (a height goes with the square
  of the time, so 25% higher is 1.118x as long under the same gravity),
  `JUMP_CLEAR` 0.45 -> 0.36 (a crossing starts at the same ~31 px off the
  ground; the window is 500 ms where it was 415).
- Stuck on a prop, two ways: the crossing was judged afresh every frame, so a
  slowed frame half way over a fence froze the feet in it; and a jump taken a
  stride too far back reached the fence just after its last moment and
  stopped dead at its edge.
- Now the first frame a jump may pass a low thing LATCHES it on the jump
  (`jumpLatch`, `jumpLatched`), a crossing that would land up to 160 ms short
  is let start (`JUMP_LAND_GRACE_MS`), and the latches outlive the jump by
  450 ms (`JUMP_LATCH_MS`, `landedOver`) so feet that came down inside walk
  out -- only feet already inside: a step into a fence you just cleared is
  refused as ever.
- `JUMP_OVER_H` 87 (70 x 1.25): the minecart and the rowboat join the list.
  Shots fly over what you can jump (v2.3.3206), so arrows and bolts fly over
  them too unless aimed at them.
- docs/specs/jumping.md "v2.3.3499".

## No lock across the map

- In the Wheel (one zone) a bow or staff tap lock was never released by
  range, a sword's only after it had been inside 220 px (and the ATTACK
  press's promoted lock never had), and past 2,400 px the worker stops
  sending a monster while its copy stays: a frozen ghost your bro kept facing
  and aiming at.
- `targeting.js` `lockTooFar`: ANY monster lock goes (`_lockDroppedWhy`
  `'far'`) past `LOCK_FAR_PX` 1,700 (25% past the longest bow a Range stat
  makes), or after `LOCK_UNDRAWN_MS` 1,500 off the circle the renderer draws
  monsters in (the view's half-diagonal + 400; zones with `homes` only).
- The promoted lock carries the latch (`near: true`), so a sword's lets go at
  275 px like any other.

## The trap

- TRAP while jogging: iPhone Safari makes no click for a tap while another
  finger is down, so the button acted for nobody on the move. A touch is its
  own tap now (same finger, within 14 px and 600 ms), the touchend's
  preventDefault taking the tap's mouse events with it; a click is still a
  click, its echo of a touch ignored (`TrapButton.jsx`).
- The picture: `/icons/items/trap-box.webp` (the owner's, already the bag's
  and the button's), loaded with the effects on the loading screen
  (`effectsRenderer` `_fxLoad`, ~0.26 MB decoded), drawn by `trapFx.js` in
  the mark's disc over the health bar and as the springing box: dropping,
  tipping on each shake, squashed shut on a catch with the flash and stars.
  On a miss it breaks into pieces of itself (`WheelShatter`, the mined rock's
  way) with a puff of dust; the code-drawn box stays as the stand-in.
- "Missed!" for every miss; three shakes adds "So close!" under it.
- Sounds (`data/eventSounds.js`): `trapSet` the latch (~0.7 of a hit) on the
  worker's "set"; `trapShake` each shake (~0.4); `trapSnap` the door, the
  rattle and the coin flip's win (~1.6), then the new pet in its own voice
  (`petVoice`, a beat later); `trapMiss` the box splintering and the flip's
  loss (~1.1). A golden catch adds the quest fanfare.

## Deaths

- The pieces were made on the first dead frame -- inside the killing blow's
  120 ms red flash and its squash -- and kept both. They take the tint
  without the flash (`_btBaseTint`) and the root takes the squash back out
  (`_btSquash`, stamped beside the scale in entityRenderer).
- Jagged: teeth 8% of the body's height (11% ragged), a tooth every 1/16th of
  it (`JAG_STEP`), never flatter than half a tooth, a deep notch one in
  seven; no `clean` style.
- Frozen: the fishman, rock monster, thorn shambler and bog lurker have no
  death strip, so their `normal` death held the last living frame for up to
  three seconds. For a look with no strip (`noStrip`) `normal` is never rolled
  -- a cut is, or TOPPLE, the whole body tipping over about its foot and
  fading -- and a cut that cannot be made topples.

## Dropped items

- `DROP_GROW` 1.5: `DROP_ICON_WORLD` 40 -> 60, its count's type 16 -> 22, the
  picture made at 128 px (`dropIcons.js` `ICON_PX`, ~1.5 MB at most for the
  24 kept); a dead player's pile -- its ring, skull, timer and count -- the
  same. Monster loot is untouched (2x since v2.3.2316). Pickup reach does not
  move (groundLoot.js's own numbers).

## Tests

- `tools/world/test-world-core.mjs` "jumping": the new numbers, the latch, the
  grace, the landing pass, the longer list.
- `mp-whirlwind` §5: the monsters inside the ring wear the mark through the
  wind-up and every monster the worker's strike hit wore it.
- `mp-jump`: the peak read as 85; the fence is now cleared on this slow test
  machine too.
- `mp-lockfar` (new): a 500 px snipe kept, a lock past the drawn circle
  dropped 'far' ~1.5 s later, one 2,200 px off at once, the promotion latched.
- `mp-deathcut`: killed inside a held hit flash and squash, the pieces wear
  the monster's colour at its shape, no `clean` cut; the rock monster's
  `normal` topples, one piece, on the ground.
- `mp-itemdrop`: the picture over 50 world px. `mp-trapping`, `mp-target`,
  `mp-tapswing` unchanged and green. `mp-cuelevels`: the four trap cues at
  their promised levels.
