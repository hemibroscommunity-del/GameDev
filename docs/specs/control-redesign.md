# Control redesign — the contextual right button (v2.3.2229 → v2.3.2232)

Owner directive, 2026-09-03. Quoted in full because every decision below
is measured against it:

> The right thumbstick no longer acts as independent rotation angle. It
> becomes a slightly larger contextual button. Combat will rely on the auto
> targeting system. The contextual button will say "attack" on it to engage
> the enemy and begin the existing targeting system (currently tap to lock
> on monster). The shield will also change. No longer double tap and hold
> on the right button. It'll be its own shield button that appears below
> the right button during combat. Tapping it once holds the shield, tapping
> it again disengages it. Shield will automatically disengage upon
> receiving damage (successful block). Right button will be held down to
> auto attack. The swipe on button will continue to be the special attack.
> Dodge will be a swipe on the left side of the screen as it already is and
> will cancel any blocking action by doing so. Magic attack radius will be
> nerfed to be same as bow. Monsters will have a circular perimeter around
> them for targeting zone. It'll be same for all weapon types. If multiple
> monsters in same perimeter there will be arrows above the dashboard on
> that right side beneath the right button that allows you to switch
> targets. Otherwise the target stays locked on the same monster. Monsters
> per zone will increase to 6, but be spaced out more evenly over the zone
> area to prevent too much monster overlap. Snowman burrow speed will
> decrease by 50% and target to the player again (move towards them) but
> this time when the snowman touches you you will take damage (at a max
> rate of 1 time being damaged per second you remain in contact with it).
> Life skills will also change. No resource extraction button in the
> middle of the screen or needing to tap on the resource or perform the
> gestures in the middle of the screen area. Resource extraction will be
> detected by perimeter and contextual button will be tapped to begin
> harvest. The gesture will be performed on that right button (same
> gestures per resource). Another change is that the animation frames will
> play at the speed the user is performing the gesture (capped at a maximum
> speed not faster than a leisurely gesture pace). The gesture cues will be
> on the right button. For any issues requiring clarification go with your
> recommended solution for now. Make mental note of them to flag it for
> review later.

The last sentence is why §5 exists. Every place the directive leaves a
choice open is listed there with the choice that was made and the reason.
Nothing in §5 is settled; all of it is one word from the owner away from
changing.

---

## 1. What exists today (the parts being replaced)

Read first-hand for this document; line numbers are as of v2.3.2228.

| Thing | Where | What it does now |
|---|---|---|
| Right stick | `TouchControls.jsx` (visuals), `BroTown.jsx` `rS/rM/rE` ~8125-8340 + `handleRJoyMove/End` ~7677 | The **whole right half** of the screen is the touch zone (`rZoneRef`, z6). A touch anywhere there is a relative drag from its origin: deflection >8px writes `S._aimAngle`, `S._facing`, `S._aiming`, `S.autoAttack = true`. Touch-start also calls `doSwing()`. |
| Auto attack | `monsterCombat.js` ~1285 | While `S.autoAttack`, the loop swings/shoots every `effectiveSwingCd` (≥200ms; server floor 210ms per (player, monster), `combat.js:777`). Aim priority: locked target → `_aimAngle` → `_facing`. |
| Special | `rE` flick detection (`spd > 0.15px/ms`, `dist > 8`, `dur < 400`) → `doSpecialAttack()`; sets `_aimAngle` from the flick direction | 1500ms client cooldown, mana cost, server special lane ≤3 hits/1200ms. |
| Shield | `rS` double-tap (220ms window, 50px) + hold; `BlockRing.jsx` (orbiting glyph, z10); `LockOnActions.jsx` Block button (hold); desktop `Q` toggles | Sets `S._shieldUp`, `S._shieldAngle`; `player_shield` broadcast; `blocking`/`ba` ride every `move` packet (`wsClient.js:3245`). The server resolves the ±60° arc at IMPACT and emits `monster_attack {blocked:true}`. Stamina cost is OFF (`BLOCK_COSTS_STAMINA`). |
| Lock-on | canvas tap → nearest monster within 40 CSS px of body centre (`BroTown.jsx` ~9270 mobile, ~9425 desktop) | `S.lockedTarget = {type:'monster', id, ref}`; dropped on death/zone change/tap-empty. `LockOnActions` raises Block/Dodge/Special buttons on an arc around the disc while locked (v2.3.1952). |
| Dodge | left-zone swipe → `handleCanvasSwipe` → `triggerContextualDodge` (`dodge.js`) | 250ms+ i-frames, moves the player directly. Does **not** touch the shield today. |
| Magic vs bow | `projectiles.js` ~250-300: bolt hit radius per archetype (staff 30/38/40/44/50 vs arrow 18/27/26/32/40) ×3 on a special; `WEAPON_TYPES.staff.range 120` vs `bow 200`; flight `life` 68 vs 90 ticks | The staff's identity is a wider splash (Detonation channel scales it further). |
| Monster count | `server/src/data.js ZONES` (3 per wilderness zone, 1+1+1 in sky) mirrored in `src/data/zones.js` (pinned by `zones.test.mjs` arch+count+order); `_spawnZoneMonsters` places each uniformly at random inside a 4-tile margin | Nothing keeps two spawns apart. `spawnscale.js` adds more with player count. |
| Snowman pile | `telegraph.js BURROW` / `_resolveBurrow` | Pile grinds toward the target at `m.spd × SPEED_MULT(3)` = 1.2px/tick ≈ 54px/s, harmless and intangible, ends on arrival (≤60px, after the 2.4s floor) or at the 8s cap. |
| Life skills | `BroTown.jsx` proximity scan ~5124 (`S._proxNode` = nearest node in reach); tap on the node art (`_tapResourceAt`) opens the mid-screen shell (`.bt-interact-prompt`, 132×40, moved onto the node); its tap calls `startExtraction`; `ExtractionSwipeLayer.jsx` reads window-level pointer events **starting within 160px of the world cue** and counts reps; `effectsRenderer._updateExtractionCue` draws the floating tool + cue at the node; the character's mine/fish frames are **time-driven** (`now / cycle`), the chop/cook stand-ins likewise | The wind-up (`computeOpenDelay`, 2-10s) is server-validated: a `node_strike` earlier than the jittered window is dropped (`gathering.js:598`). |

Everything else — the left stick, weapon-swap double tap, the ability
column, the element-burst button, the charge pie, desktop keys — is
untouched by this redesign except where §4 says so.

---

## 2. The new control surface

### 2.1 The right button (PR 1)

The disc stays exactly where it is (`right:50`, `bottom: sheet-h + 70`,
class `.bt-rjoy-base` kept so every coach mark, tutorial ring and QA rect
that anchors on it keeps anchoring) and grows from 75/90 to **96/108 px**
(portrait/landscape) — "slightly larger". It is now a real touch target
(`pointerEvents:auto`, own handlers, `stopPropagation`) rather than a
visual over a half-screen zone.

| Input on the button | Result |
|---|---|
| **touchstart** | acquire a target if none (§2.3), `S.autoAttack = true`, one `doSwing()` — identical to today's touch-start minus the aim |
| **held** | the existing auto-attack loop keeps swinging/shooting at the locked target (or facing, if nothing is in range) |
| **touchend** | `S.autoAttack = false` |
| **swipe** (the same flick classifier as today) | special attack; the flick direction still seeds `_aimAngle` for an unlocked special |
| **tap** while a harvest is possible and no monster is in range | Harvest (PR 4) |

**No rotation.** The stick/knob sprites, `handleRJoyMove`'s angle math,
`S._aiming`, `_lastAimAngle` writes from the stick, and the `rShieldGesture`
double-tap branch are removed. The button's face carries a **label**
("ATTACK" / "HARVEST", Lantern Slate caption type) and, in the Attack
state, the special-charge ring already drawn inside the disc.

**Facing.** With no free aim, the body faces the locked target while
attacking (the swing/projectile code already prefers the lock; the
renderer's facing ladder already prefers `_aimAngle` during `autoAttack`,
so the loop writes `_aimAngle = angle-to-lock` each frame while a lock is
held — one line, and the caret/shield/facing all follow).

**The right half of the screen** (`rZoneRef`) keeps ONE job: a short tap
is forwarded to the canvas as today (tap a monster to lock manually, tap
yourself to chat, tap a resource — §5.9). Drags there do nothing; the
owner's dodge is the left-side swipe and stays there.

### 2.2 The shield button (PR 1)

A **48/54 px** round button (`data-shield`) centred **directly below the
disc**, in the 70px band between the disc and the dashboard
(`bottom: sheet-h + 12`). Lantern Slate: raised slate, brass edge when
live, the wood-shield glyph BlockRing already loads.

- Appears **during combat** (§5.3) and only if a shield is equipped
  (`raiseShield` has always required `S.rpg.shield`).
- **Tap** → shield up: `S._shieldUp = true`, `_shieldAngle` = angle to the
  locked target (else the current facing), `player_shield up`,
  `blockRingBus.beginBlock()`. The angle **follows the locked target every
  frame** while up (BlockRing's lerp, kept), so a block is always toward
  the thing you are fighting.
- **Tap again** → shield down (same release path the double-tap gesture
  used, minus the gesture).
- **Auto-disengage on a successful block**: the client already receives
  `monster_attack {blocked:true, targetId:me}` (and the PvP equivalent);
  that handler now drops the shield. One block, one hit, then it is down
  until you tap again — that is the owner's rule.
- **Dodge cancels it**: `triggerContextualDodge` drops the shield before
  rolling.
- Attacks while the shield is up: the button still auto-attacks (§5.4).

`BlockRing.jsx`'s orbiting glyph and drag-to-steer, `LockOnActions.jsx`
(Block/Dodge/Special arc), the legacy hidden `shieldJoyRef` element and
its `sS/sM/sE` handlers all go. Desktop `Q` (already a toggle) is
unchanged and gains the auto-disengage for free because it shares the
same client state.

### 2.3 Targeting (PR 2)

Every monster has a **targeting perimeter**: a circle of
`TARGET_PERIMETER_PX` (**220** world px, §5.5) around its body centre,
the same for every weapon. A monster is a **candidate** when it is alive,
not intangible (`isIntangible`), in the current zone, and the player is
inside its perimeter.

- **Engage**: pressing Attack with no lock (or a lock that is no longer a
  candidate) locks the **nearest** candidate. Nothing in range → the press
  still swings (a swing at air is allowed today), no lock.
- **Persistence**: the lock holds while its monster stays a candidate,
  with hysteresis (`× 1.25`) so a target dancing on the edge does not
  flicker; it drops on death, zone change, or leaving the hysteresis
  ring. "Otherwise the target stays locked on the same monster."
- **Switching**: when **two or more** candidates exist, two arrow buttons
  (`data-target="prev"|"next"`, 40/44 px) appear **flanking the shield
  button** in the same band beneath the disc (§5.6). They step through
  the candidates in **screen-x order** (left → right), so ◀ always means
  "the one to the left of this one".
- The perimeter is drawn as a faint ring around each candidate (the
  existing lock-reticle graphics layer) so the player can see who is in
  play; the locked one keeps its reticle.

**Magic radius = bow.** The staff bolt's per-archetype hit radius becomes
the arrow's (18/27/26/32/40), the special multiplier the same as the bow
special's, `WEAPON_TYPES.staff.range` 120 → 200 to match `bow`. Detonation
still scales the (now smaller) base. Flight distance is left alone (§5.7).

### 2.4 Monsters per zone, and the snowman (PR 3 — server)

- Every wilderness zone spawns **6** (sky: 2 stalker / 2 hexer / 2
  volatile; mist: 4 fodder / 2 brute). Client `zones.js` changes in
  lockstep — `zones.test.mjs` compares the two tables field by field.
- Placement is **best-of-K farthest-point** sampling: each spawn draws 12
  candidate points inside the 4-tile margin and keeps the one farthest
  from every monster already placed. Cheap, no walkable-mask needed
  (there is none server-side), and it turns "three slimes on one tile"
  into a spread. `spawnscale.js` mid-session additions use the same
  picker. Respawn keeps returning to `spawnX/Y`, so the spread survives.
- **Snowman pile**: `SPEED_MULT` 3 → **1.5** (half). The pile keeps
  grinding toward the target for its **whole duration** — arrival no
  longer ends it (§5.8) — and while the target is within `CONTACT_PX`
  (**40**, same dy×1.5 ellipse the snowman's melee ring uses) it calls
  `_monsterStrikePlayer` at most **once per 1000ms**
  (`m._burContactNextAt`). That helper is the one choke point every
  monster→player hit already funnels through, so the block arc (at
  impact), the harvest shield, thorns, hexer curse, defense XP and the
  `monster_attack` event all come for free. The client needs no change:
  the pile stays intangible to the player's attacks, and the hit it deals
  arrives as an ordinary `monster_attack` from within 160px.

### 2.5 Life skills on the button (PR 4)

- **Detection is by perimeter**: `S._proxNode` (the nearest node within
  `nodeReachDist`, which already exists for the desktop E key) is the
  node the button offers. `_tapResourceAt`, `S._tapNode`, the mid-screen
  shell and its "Too far away" popup are removed.
- **The button reads HARVEST** (skill icon + label) when a node is in
  reach and no monster candidate exists (§5.10). Tap → `startExtraction`
  exactly as the shell's tap did. The server contract
  (`extraction_start` → wind-up → `node_strike`) is unchanged.
- **The gesture is performed on the button.** `ExtractionSwipeLayer`
  keeps its recognizer (pump / chop / reel / flip, the anti-bot
  fingerprint, `cueFrame01`) but its start gate becomes "began on the
  button" and its cue centre becomes the button centre. Chop accepts
  either horizontal direction on the button (there is no tree-ward on a
  disc). Moves and ups stay window-level so a stroke may run off the
  disc.
- **The cue is on the button**: the tool strip (`GESTURE_TOOLS` — the
  same PNG strips the world cue used) as a frame-stepped background on
  the disc, the reps ring around the rim, and during the wind-up a
  countdown ring. The world cue, the floating tool and the `isGestureTouch`
  ceding in the joystick handlers go.
- **Animation follows the hand.** While `status === 'ready'`, the
  character's mine/fish frames derive from the gesture phase
  (`cueFrame01`) instead of the clock, and the chop/cook stand-ins do the
  same. The display phase **chases** the raw phase (the v2.3.1435 pattern
  the reel and pan already use) at a cap of **one full swing per 700ms /
  one crank per 450ms** — "not faster than a leisurely pace". During the
  wind-up (`waiting`) the existing slow loop plays (§5.11).

---

## 3. PR sequence

One system per PR, each mergeable alone, client and server deployable in
either order.

| # | Tag | Side | Scope | Depends on |
|---|---|---|---|---|
| 1 | v2.3.2229 | client | §2.1 + §2.2: the button, hold-to-auto-attack, swipe special, shield toggle + auto-disengage, dodge cancels block, tutorial/coach copy, `mp-lockon` rewrite | — |
| 2 | v2.3.2230 | client | §2.3: perimeter, engage-on-Attack, hysteresis, switch arrows, perimeter ring, magic radius = bow | 1 (the arrows live in the shield band) |
| 3 | v2.3.2231 | server (+ `zones.js` mirror) | §2.4: six per zone, spread placement, pile half speed + contact damage | — |
| 4 | v2.3.2232 | client | §2.5: harvest on the button, gesture on the button, cue on the button, gesture-speed animation | 1 |

**Deploy order.** PRs 1, 2, 4 send nothing new to the server: `blocking`
and `ba` ride `move` as before, `player_shield` is the same broadcast,
`node_strike` is unchanged. PR 3 emits nothing new either: contact damage
is an ordinary `monster_attack`, and `zones.test.mjs` fails the build if
the client table is not updated in the same PR. No caps flag is needed
anywhere.

---

## 4. Everything that has to change, by file

**PR 1**
- `src/ui/panels/TouchControls.jsx` — disc becomes the button (size, label,
  `pointerEvents:auto`); stick/knob/preview/legacy shield elements removed;
  shield button added (or its own `ShieldButton.jsx`).
- `src/ui/BroTown.jsx` — `rS/rM/rE` rewritten (no drag, no double tap, no
  aim); `handleRJoyMove/End` reduced; `sS/sM/sE` + `handleShieldMove` +
  `shieldJoyRef` removed; the loop writes `_aimAngle` toward the lock while
  auto-attacking; `raiseShield`/drop paths become the toggle.
- `src/networking/gameEvents.js` — `monster_attack {blocked}` (and the PvP
  blocked path) drop the shield.
- `src/game/dodge.js` — drop the shield before any dodge/lunge/retreat.
- `src/ui/mobile/BlockRing.jsx`, `src/ui/panels/LockOnActions.jsx` — removed
  (BlockRing's parry-flash bus stays for the server's `parried` event).
- `src/ui/mobile/ControlsTutorial.jsx`, `src/ui/mobile/QuestCoach.jsx`,
  Mayor Bro's `tut_1` dialogue — copy: "Hold to attack. A quick swipe is
  your special." / "Tap the shield to raise it. It drops after one block."
- `tools/qa/mp/mp-lockon.mjs` → rewritten around the shield button;
  `mp-questcoach.mjs` wording asserts; `mp-tutspecial.mjs` still fires the
  desktop key (fine).

**PR 2**
- `src/data/gameSystems.js` — `TARGET_PERIMETER_PX`, `TARGET_HYST`, staff
  `range`.
- `src/game/monsterCombat.js` — candidate scan each tick (`S._targetCands`),
  lock persistence/hysteresis, `S._aimAngle` toward lock.
- `src/ui/panels/TargetArrows.jsx` (new) — the two arrows.
- `src/game/projectiles.js` — staff `_hitR` table = arrow's; special mult.
- `src/rendering/systems/effectsRenderer.js` — candidate rings.
- `tools/qa/mp/mp-target.mjs` (new).

**PR 3**
- `server/src/data.js`, `src/data/zones.js` — counts.
- `server/src/index.js` `_spawnZoneMonsters` + `spawnscale.js` — placement.
- `server/src/telegraph.js` — `BURROW.SPEED_MULT`, `CONTACT_PX`,
  `CONTACT_CD_MS`, `_resolveBurrow` contact branch, arrival rule.
- `server/test/burrow.test.mjs`, `zones.test.mjs`, new `spawn-spread`
  assertions; `docs/specs/snowman-snow-pile.md` durations table.

**PR 4**
- `src/ui/BroTown.jsx` — shell + `_tapResourceAt` + `isGestureTouch` gone;
  button context.
- `src/ui/ExtractionSwipeLayer.jsx` — anchored on the button.
- `src/ui/panels/TouchControls.jsx` — harvest face (tool strip, rings).
- `src/rendering/systems/effectsRenderer.js` — world cue removed;
  chop/cook stand-in frames from gesture phase.
- `src/rendering/systems/entityRenderer.js` — mine/fish frames from gesture
  phase with the chase cap.
- `tools/qa/mp/mp-harvest.mjs`, `mp-fishhand.mjs` — drive the button.

---

## 5. Ambiguities — resolved by recommendation, flagged for review

The owner said: go with the recommended solution, note it for later. This
is the note.

| # | Question the directive leaves open | Decision taken | Why |
|---|---|---|---|
| 5.1 | Does **tapping a monster** still lock on, now that Attack does? | **Yes, kept** as a manual override. | It is "the existing targeting system" the directive says Attack begins; removing it would take away the only way to pick a specific monster before it is in the perimeter. Cheap to keep, nothing conflicts. |
| 5.2 | Attack pressed with **nothing in range** | Swings anyway, no lock, label dimmed. | Matches today (a swing at air is allowed) and keeps the button honest — it never silently does nothing. |
| 5.3 | What is "**during combat**" for the shield button? | Any monster candidate in range **or** a lock held **or** damage taken in the last 5s; and a shield equipped. | The renderer's own `_combatTriggers` predicate, minus `autoAttack`, so the button shows the moment a fight could start and lingers through a lull. |
| 5.4 | **Attacking while the shield is up** | Allowed; the button keeps auto-attacking. | v2.3.97 chose "you do not fight and block at once" because both lived on one stick. They no longer do; two buttons, two hands' worth of intent. (Shield Bash keeps its own button; the old "tap attack while blocking = bash" gesture is gone with the double tap.) |
| 5.5 | **Perimeter radius** | 220 world px. | ≈ the visible half-width of a phone in world units (390 CSS px / 0.8 scale ≈ 490 px across), so "in the perimeter" reads as "on screen and near me"; comfortably inside bow flight (340-675) and outside melee (50-72). One constant, easy to retune. |
| 5.6 | Where exactly the **arrows** go vs the **shield button** — both are "beneath the right button" | ◀ [shield] ▶ in one row in the 70px band under the disc. | The band has room for three 40-48px targets (disc is 96 wide at right:50); it keeps everything thumb-reachable and reads as one cluster. |
| 5.7 | "Magic attack **radius** … same as bow" — hit splash, flight range, or both? | Hit splash radius (and the special's multiplier) = arrow's; `WEAPON_TYPES.staff.range` = bow's; **flight distance untouched** (staff 340px, bow 675px). | "Radius" names the splash; the staff is already the shorter-flying weapon, and shortening it further would be a nerf the directive did not ask for. |
| 5.8 | Snowman pile: does **arrival still end** the pile? | **No** — the pile runs its full duration (`PILE_MAX_MS`, 8s) and emerges at the cap or when the target is gone. | "When the snowman touches you you will take damage… while you remain in contact" only makes sense if touching does not end the move. At half speed he crosses ~65px in the 2.4s floor, so with arrival-ends-pile the contact rule would almost never fire. |
| 5.9 | Contact **damage amount** and **blocking** it | Full `m.dmg` per touch (the same number as his swing), once per second; the shield arc blocks it like any hit. | The directive names a rate, not an amount; routing through `_monsterStrikePlayer` is what gives the hit every existing rule (block at impact, harvest shield, no-one-shot rails) without a second damage path. |
| 5.10 | Button **priority** when a monster and a resource are both in range | Attack wins. | A slime walking up to a miner is the more urgent thing; the node is still there when it is dead. |
| 5.11 | The harvest **wind-up** (2-10s, server-validated) has no gesture to drive the animation | The existing slow loop plays during `waiting`; the gesture takes over at `ready`. | A frozen character for up to ten seconds reads as a hang. The cap ("not faster than a leisurely pace") is applied to the gesture-driven phase, which is the one the directive describes. |
| 5.12 | **Desktop** parity for target switching | `Tab` cycles candidates; everything else on desktop is unchanged (click attacks toward the mouse, `Q` toggles the shield, right-click special). | The directive is about the touch surface; desktop already has the toggle semantics it asks for. |
| 5.13 | Pets, arena, duels, dungeon bosses | Unchanged. A duel opponent is still locked by tapping; the perimeter scan only considers monsters. | Out of the directive's scope; noted so nobody assumes otherwise. |
| 5.14 | Six per zone vs the **crowd scaler** (`spawnscale.js`: +1.5 monsters per extra player, hard ceiling 24) | Base 6, ramp and ceiling unchanged — so a zone now hits its 24-monster ceiling at 13 players instead of 15, and per-head kills/minute in a crowd fall below the old "≥60% of solo" floor past ~10 players. | The 24 ceiling is a **load** number (`load-tick.mjs` proved 25/zone × 7 zones); a content change should not move it silently. Raising it to keep crowds at parity needs its own load run — the owner's call. |

---

## 6. What the QA harness proves per PR

- **PR 1** `mp-lockon` (rewritten): the button exists at the old anchor,
  hold → repeated swings at cadence, release → stop, flick → special,
  shield tap toggles `_shieldUp` and puts `blocking:true` on the wire
  (read from the worker, the mp-block way), a blocked `monster_attack`
  drops it, a dodge drops it. `mp-questcoach`: the coach names the new
  gestures. Global: the render-throw guard.
- **PR 2** `mp-target`: two fodder in range → arrows appear; one → they do
  not; ▶ moves the lock in x-order; walking out of the ring drops the lock;
  staff bolt radius equals the arrow's per archetype (a pin in
  mirror-audit).
- **PR 3** server suites: `zones` lockstep at 6; a placement test (min
  pairwise distance over 200 seeded spawns ≥ the floor); `burrow`:
  half-speed step, contact hit at ≤40px, exactly one hit per second while
  standing on him, blocked when facing him, none when out of contact,
  pile runs to the cap.
- **PR 4** `mp-harvest`: no shell in the DOM; walking into reach makes the
  button read HARVEST; tapping it starts the extraction and the worker
  records `extraction_start`; a pump gesture on the button fills reps and
  lands a `node_strike`; the mine frame index tracks `cueFrame01`, and a
  synthetic fast pump does not exceed the cap.
