# Control redesign — the contextual right button (v2.3.2242 → v2.3.2245)

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
| Snowman pile | `telegraph.js BURROW` / `_resolveBurrow` | When this plan was written the pile ground toward the target at `m.spd × SPEED_MULT(3)` ≈ 54px/s and ended on arrival (≤60px, after the 2.4s floor) or at the 8s cap. **v2.3.2236 (PR #543, a parallel session, merged while this branch was in review) reversed it:** the pile FLEES at `FLEE_PX_S` 190px/s and ends at `ESCAPE_PX` 420. The directive's "target to the player *again*" was written against that build. Harmless and intangible either way. |
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
- ~~**Auto-disengage on a successful block**~~ — **REVERSED in v2.3.2248, see
  §8.** The owner played it and overruled the original directive: "Instead of
  dropping the shield at first hit I want it to keep being held." A landed
  block no longer lowers the guard.
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
- **Snowman pile**: chases **toward** the player again (v2.3.2236's flee
  reversed) at `PILE_PX_S` **95 px/s** — half the 190 px/s it fled at
  (§5.15), kept in v2.3.2236's px/s-against-the-room-clock form. The pile
  keeps grinding toward the target for its **whole duration** — neither
  arrival nor escape ends it (§5.8) — and while the target is within `CONTACT_PX`
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
| 1 | v2.3.2242 | client | §2.1 + §2.2: the button, hold-to-auto-attack, swipe special, shield toggle + auto-disengage, dodge cancels block, tutorial/coach copy, `mp-lockon` rewrite | — |
| 2 | v2.3.2243 | client | §2.3: perimeter, engage-on-Attack, hysteresis, switch arrows, perimeter ring, magic radius = bow | 1 (the arrows live in the shield band) |
| 3 | v2.3.2244 | server (+ `zones.js` mirror) | §2.4: six per zone, spread placement, pile half speed + contact damage | — |
| 4 | v2.3.2245 | client | §2.5: harvest on the button, gesture on the button, cue on the button, gesture-speed animation | 1 |

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
  your special." / "Tap the shield to block." (v2.3.2248 rewrote the second
  half: "It stays up until you attack or tap again.")
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
- `server/src/telegraph.js` — `BURROW.PILE_PX_S` (replaces v2.3.2236's
  `FLEE_PX_S`/`ESCAPE_PX`), `CONTACT_PX`, `CONTACT_CD_MS`, `_resolveBurrow`
  bearing + contact branch, end rule (cap or target gone).
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
| 5.2 | Attack pressed with **nothing in range** | ~~Swings anyway~~ → **the button is not on screen** (v2.3.2246). | REVISED by the owner: "right button ... should not be a standalone attack button anymore" + "just show the right contextual button when there's input that can be interacted with". The two together answer this one — with nothing in range there is nothing to press. The swing-at-air path survives for exactly one case, and only because the button is visible there: onboarding holds it on screen in town to teach it, and a lesson you cannot perform is worse than no lesson. See §7.1. |
| 5.3 | What is "**during combat**" for the shield button? | Any monster candidate in range **or** a lock held **or** damage taken in the last 5s; and a shield equipped. | The renderer's own `_combatTriggers` predicate, minus `autoAttack`, so the button shows the moment a fight could start and lingers through a lull. |
| 5.4 | **Attacking while the shield is up** | ~~Allowed~~ → **REFUSED, both ways** (v2.3.2246). | OVERRULED by the owner: "you can both swing and block at the same time. That is not right." v2.3.97's original rule was right and this PR's reasoning (two buttons, two intents) was wrong. Enforced at the source in three places, not at the button: `swingAttack` and `specialAttack` refuse while `_shieldUp`, and so does the auto-attack gate in `monsterCombat` — which is the one bow and staff go through, so gating only the press would have left ranged builds shooting from behind a raised shield. And the other direction: `raiseShieldToggle` cancels an attack already in flight, so whichever the player asks for LAST is the one they get. Shield Bash is deliberately exempt — see §7.3. |
| 5.5 | **Perimeter radius** | 220 world px. | ≈ the visible half-width of a phone in world units (390 CSS px / 0.8 scale ≈ 490 px across), so "in the perimeter" reads as "on screen and near me"; comfortably inside bow flight (340-675) and outside melee (50-72). One constant, easy to retune. |
| 5.6 | Where exactly the **arrows** go vs the **shield button** — both are "beneath the right button" | ◀ [shield] ▶ in one row in the 70px band under the disc. | The band has room for three 40-48px targets (disc is 96 wide at right:50); it keeps everything thumb-reachable and reads as one cluster. |
| 5.7 | "Magic attack **radius** … same as bow" — hit splash, flight range, or both? | Hit splash radius (and the special's multiplier) = arrow's; `WEAPON_TYPES.staff.range` = bow's; **flight distance untouched** (staff 340px, bow 675px). | "Radius" names the splash; the staff is already the shorter-flying weapon, and shortening it further would be a nerf the directive did not ask for. |
| 5.8 | Snowman pile: does **arrival still end** the pile? | **No** — the pile runs its full duration (`PILE_MAX_MS`, 8s) and emerges at the cap or when the target is gone. | "When the snowman touches you you will take damage… while you remain in contact" only makes sense if touching does not end the move. With arrival-ends-pile the contact rule could fire at most once, and only by accident, however fast he moves. |
| 5.9 | Contact **damage amount** and **blocking** it | Full `m.dmg` per touch (the same number as his swing), once per second; the shield arc blocks it like any hit. | The directive names a rate, not an amount; routing through `_monsterStrikePlayer` is what gives the hit every existing rule (block at impact, harvest shield, no-one-shot rails) without a second damage path. |
| 5.10 | Button **priority** when a monster and a resource are both in range | A resource **in reach** wins over a monster merely **in the perimeter**; a **held lock** wins over the resource. | Revised while building: the first cut let any monster within 220px win, and with six spread monsters a snowman on the far side of a tree turned every chop into a swing. Standing at a node is a deliberate act and monsters leave a harvester alone by rule (v2.3.1704); a lock (tap the monster, or press Attack before stepping up to the node) is the more deliberate act of the two, so it takes the button back. |
| 5.11 | The harvest **wind-up** (2-10s, server-validated) has no gesture to drive the animation | The existing slow loop plays during `waiting`; the gesture takes over at `ready`. | A frozen character for up to ten seconds reads as a hang. The cap ("not faster than a leisurely pace") is applied to the gesture-driven phase, which is the one the directive describes. |
| 5.12 | **Desktop** parity for target switching | `T` cycles candidates (`Shift+T` backwards; `Tab` was already the weapon cycle); everything else on desktop is unchanged (click attacks toward the mouse, `Q` is hold-to-block with `Q`+`E` = Shield Bash, right-click special). | The directive is about the touch surface; desktop already has the toggle semantics it asks for. |
| 5.13 | Pets, arena, duels, dungeon bosses | Unchanged. A duel opponent is still locked by tapping; the perimeter scan only considers monsters. | Out of the directive's scope; noted so nobody assumes otherwise. |
| 5.14 | Six per zone vs the **crowd scaler** (`spawnscale.js`: +1.5 monsters per extra player, hard ceiling 24) | Base 6, ramp and ceiling unchanged — so a zone now hits its 24-monster ceiling at 13 players instead of 15, and per-head kills/minute in a crowd fall below the old "≥60% of solo" floor past ~10 players. | The 24 ceiling is a **load** number (`load-tick.mjs` proved 25/zone × 7 zones); a content change should not move it silently. Raising it to keep crowds at parity needs its own load run — the owner's call. |
| 5.15 | "Burrow speed will **decrease by 50%**" — half of *which* speed? | Half of **190 px/s** (v2.3.2236's flee speed, on the owner's build when the directive was written) → `PILE_PX_S` **95 px/s**, toward the player; not half of the original 54 px/s crawl. | "Target to the player *again*" dates the directive after v2.3.2236, so the speed the owner had just watched is the one being halved. 95 is under a default character's 150 px/s, so you can always walk away, and it is fast enough that standing still gets you touched — which the contact rule needs. Half the original crawl (27 px/s) would leave contact damage almost unreachable against anyone who moves. One constant to change if this is the wrong reading. |
| 5.16 | **Fire trail** (v2.3.2238, merged from main during review) burns through its own damage path (`firetrail.js` → `_applyDamage`), never `_monsterStrikePlayer`: no block arc, no `blocked`, no harvest-shield check. | Left as main shipped it: fire under your feet is **unblockable**, so it never counts as a "successful block" and **does not lower the shield toggle**; it **does** count as being in combat (the shield button appears). | The directive ties auto-disengage to a *successful block*; a burn is not one. The harvest-shield gap (a harvester standing in fire takes the burn) is that feature's own question and is flagged here rather than patched from this PR: it weakens §5.10's "monsters leave a harvester alone" only near a fire goblin. |
| 5.17 | The **snowman throws from 300px** (`MONSTER_RANGED_BY_ARCH`), outside the 220px perimeter — Attack cannot lock a thrower until he closes. | Tap-to-lock (§5.1) is the way to pick him early; the shield button now appears the moment a server-zone hit lands (`S.lastDamageTaken` is stamped from `monster_attack`/`pvp_hit`, which it never was before), so the block is available even with nothing in the perimeter. | Raising the perimeter to 300 to cover one archetype's throw band would make every other lock feel long-range; the snowman and the slime are the only ranged archetypes. If the owner wants the thrower lockable from the button, `TARGET_PERIMETER_PX` is the one number. |
| 5.18 | **Pet capture** range is 200px (`pets.js CAPTURE_RANGE`) — Attack can lock a monster at 200–220px that Capture then refuses as "too far". | Unchanged; flagged. | Tap-to-lock could already lock at any distance, so this is not new; the fix is either `CAPTURE_RANGE ≥ 220` server-side or dimming Capture past 200px, and both belong to the pets system. |
| 5.19 | **Dungeon** waves: does "six per zone, spread out" apply? | No — dungeon waves keep their own counts and uniform placement (`dungeon.js`). | The directive says "monsters per zone"; dungeon waves are a different pacing system with their own numbers, and the spread picker has no walkable mask for dungeon rooms. Flagged so it is a decision, not an omission. |
| 5.20 | **Peer shield visibility** rides the unprivileged `player_shield` relay with no expiry (`_shieldTs` is stamped, never read). With the toggle dropping on every blocked hit, more relays flow, and a lost `up:false` leaves a party-mate's shield drawn up until their next raise/drop. | Unchanged; cosmetic, and not new (the hold-to-block relay had the same loss mode). | An expiry would hide a legitimately long-held toggle; the honest fix is reading the `blocking` flag the worker already receives on every move packet, which needs a tick-wire field — its own small PR. |

---

### 5b. Folded in after the understand-workflow critique (same tags)

A 13-map subsystem read of the merged tree (`wf_a2af8236-cf8`) turned up
gaps the four commits had not covered. All are small and were folded into
the same PR rather than left for a follow-up:

- **The shield button never vanishes with the shield up** (`shieldButtonLive`):
  a lock dropping or the last monster dying used to hide the button and
  leave the shield raised — a slower walk with no way down but a dodge.
  `mp-rbutton` now pins it.
- **Death and duel end lower the shield and clear the lock** (`wsClient`
  `player_died`, `respawn.js`, `gameEvents` `duel_end`): a corpse had kept
  sending `blocking:true` on every move packet, and the first swing after
  respawn aimed at a monster in the old zone.
- **A server-zone hit counts as combat**: `S.lastDamageTaken` was only ever
  stamped by the client-local legacy AI, so the "damage in the last 5s" leg
  of the shield button's liveness rule was dead in every real zone (§5.17).
- **The "block 10 hits" quest can complete in a server zone**: its counter
  (`_questFlags.blocksLanded`) was likewise only written by the legacy AI
  path; a worker-confirmed `monster_attack {blocked}` now counts.
- **The snow pile is not a wall** (`_monBlock` skips `isIntangible`): the
  client body-block held you at arm's length from a thing that is
  intangible by rule and now hurts to touch, so contact was reachable only
  when he moved into you.
- **The client's burrow-phase ceiling** (`Math.min(6000, ms)`) predated
  v2.3.2225's 8s pile, so the renderer's self-clear surfaced him on the
  client 1.5s before the worker did; it is 9000 now.
- **The tutorial's shield and target steps** ring their button when it is
  on screen and read as a plain card when it is not (`anchorOptional`), so
  `mp-ctltut`'s rule that no declared step silently vanishes still holds.

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
- **Second pass (v2.3.2246)** `mp-rbutton` (extended): both discs dark with
  nothing to do and the right one declining taps, while their boxes stay in
  the layout so a coach mark can still measure them; the left disc paints on
  a thumb and fades on release; press ONE engages and lands no swing, press
  TWO attacks; the shield thumbnail is loaded, filter-free and readable while
  the toggle is off; holding Attack with the shield up lands nothing over two
  cadences; raising the shield mid-attack cancels it. `mp-engage` (new): the
  indicator is marked on the candidate at the right coordinate (`__btAtkMark`)
  and really painted (two frames of one crop differenced against a locked
  control, because town cobble defeats a brass classifier — TRAPS §21);
  away/toward/strafe around a held lock with no finger on the button; the
  no-lock control where the stick owns the facing again; and the 400ms linger
  that stops the button strobing on the perimeter edge.

## 7. Second pass — what the owner reported after playing it (v2.3.2246)

Six things, in the owner's words, and what each turned into.

> "The right joystick button isn't an attack button anymore. There is an
> attack indicator that will appear for nearby monsters (while in a monster's
> detectable perimeter). Once you tap 'attack' (the contextual label that
> appears on the joystick) the auto-targeting engages. Every move you make is
> now relative to that target (just like the old targeting behavior when you
> tap on a monster to lock on target)."
>
> "...right button (former right joystick) should not be a standalone attack
> button anymore. After you engage with an enemy by pressing attack within
> perimeter of it you auto lock on target and the button turns into an attack
> button at that point. Player movement (backwards, left, right) should
> revolve around the targeted monster so if you move backwards you should be
> doing a backwards jog (just like behavior of former controls moving down but
> angling up directionally with the right joystick)."

### 7.1 The press is two-step

v2.3.2242 collapsed engage and attack into one press — it locked, swung, AND
started the auto-attack — which is precisely what made it read as a standalone
attack button: with nothing in range it swung at air, and with something in
range the engage was invisible underneath the swing.

| State | Press does |
|---|---|
| Monster lock held | **ATTACK.** Swing now, auto-attack while held, flick = special. Unchanged. |
| Candidate in the perimeter, no lock | **ENGAGE only.** Locks the nearest and stops. No swing, no auto-attack — and the release is not read as a flick, or a brisk tap-to-engage would spend mana on a special aimed at a monster you had not picked yet. |
| Neither | Not on screen (§5.2). Reachable only while onboarding holds the button visible to teach it, where it swings as before. |

The label stays **ATTACK** throughout: the owner named it as "the contextual
label that appears on the joystick" for the pre-lock state, so it is not
renamed to ENGAGE. What tells the two states apart is the world — the
indicator on candidates (7.2) versus the red reticle on the lock.

`targeting.heldMonster()` is the question the handler asks. It exists because
`engageNearest` cannot answer it: it returns the same monster whether it just
locked one or found one already locked, and "still locked" means inside the
hysteresis ring, not merely non-null.

### 7.2 The attack indicator

There already was one and it was the wrong shape: a `TARGET_PERIMETER_PX`
ring stroked around **every** candidate — a 440px-diameter circle centred on
a monster, ~350 CSS px across on a 390px phone, six of them overlapping in a
pack at alpha .14. It read as ambient noise, which is the likeliest reason
the owner asked for an indicator that already existed.

Now, per candidate: a small brass caret over the monster's head, bobbing, its
height taken from `monsterBodyOffsetY` (the shared table the aim, the swing
sweep and the projectiles all read, so it cannot drift per archetype). The
NEAREST candidate — the one an ENGAGE press actually takes — gets a brighter
caret plus a tight foot ring, and keeps the perimeter ring, alone, at alpha
.08 so the boundary is still legible. Every mark is drawn with a dark keyline
under the brass: the first cut was legible on grass and snow and all but
vanished on the town cobble, which is nearly the same warm yellow. Graphics
rather than a sprite, per CLAUDE.md's preloading law.

### 7.3 Movement is relative to the target

The backpedal flag (which reverses the jog cycle) and the aim-relative facing
were computed only `if (S.autoAttack)` — only while the attack button was
physically held. That was faithful to the OLD controls, where deflecting the
right stick set `autoAttack` in the same handler, and wrong for a lock that
outlives the finger. Three edits, one fact:

- `monsterCombat` writes `_aimAngle` from the lock whenever a **monster** lock
  is held, not only while attacking. `_aiming` stays gated on `autoAttack`,
  deliberately: desktop's mousemove does `if (autoAttack || _aiming) _aimAngle
  = _mouseAimAngle`, so setting it here would let a hovering cursor fight the
  lock inside one frame.
- `entityRenderer.aimAttackActive` gains a held-monster-lock term, which is
  what makes the whole 8-way circle target-relative: before, moving TOWARD the
  lock or strafing across it left the ladder to fall through to the joystick
  and the body turned to follow the thumb.
- BroTown's movement step computes the backpedal on a held lock too. The
  **0.5x speed stays under `autoAttack`** — the owner asked for a direction,
  not a slowdown, and halving a merely engaged player's walk is a nerf nobody
  requested.

NPC locks are excluded: tapping a shopkeeper locks one, and walking away from
the mayor while staring at him is not a combat stance. There is no sideways
strafe strip in the art (forward frames plus a reversed cycle), so a sideways
push resolves to whichever of the two the dot product picks — exactly as the
old right-stick controls did.

### 7.4 Swing and block are exclusive — see §5.4 (overruled)

### 7.5 The shield icon was painted black on black — see TRAPS §42

> "Block button appears without an thumbnail icon until you actually tap block"

`filter: brightness(0) opacity(.55)` on a `#34444B → #202C32` button. No
filter in either state now; opacity carries idle. Inherited from `BlockRing`,
where the same silhouette read against the world rather than against a dark
button.

### 7.6 The joystick overlays hide themselves — see LANTERN-SLATE-SPEC §10

> "Hide the joystick overlays. Just show the left joystick when you're moving
> the character. Just show the right contextual button when there's input that
> can be interacted with."

One per-frame resolver, in the same block that already decides what the
button's LABEL says, because that block is the only place that knows the
button's context; deciding visibility anywhere else would be a second copy of
that list. Plus a 400ms linger (candidacy is a hard 220px test, so a monster
pacing the boundary would strobe the button), `pointer-events` switched with
the opacity (a hidden button must not take taps), and an explicit hold
registry for onboarding (TRAPS §41).

### 7.7 The snowman — no code defect; the worker has not shipped yet

> "Snowman behavior isn't acting right (idk if it's because of the server or if
> you misunderstood) but the snowman burrow should have its movement speed
> reduced by 50% and move to attack you ... instead of running away from you
> while burrowing."

**It is the deploy order, and the owner named the possibility themselves.**
`origin/main` — which is what the production worker is built from — carries
PR #543's `FLEE_PX_S: 190` and `m.x - ps.x` (AWAY). This branch carries
`PILE_PX_S: 95` and `ps.x - m.x` (TOWARD) with contact damage. A Pages preview
of this branch talks to the **deployed** worker, so the pile the owner watched
was #543's, not this one's. Verified rather than assumed: the client only
animates the burrow phase (`gameEvents` stamps `_burPhase`/`_burUntil`,
`entityRenderer` plays the strip) and never moves or predicts the pile, so
direction is entirely server-side. The `burrow` suite pins the sign, the
speed, the 40px contact ring, exactly one hit per second, the block arc and
the full-duration pile. **Nothing to change; it starts working the moment this
merges and `deploy-worker.yml` runs.**

`PILE_PX_S` is left at **95** and §5.15's reading stands: the owner is
describing the flee build ("instead of running away"), so 190 is still the
speed being halved. One number if that is the wrong reading.

### 7.8 New judgement calls (same tag)

| # | Question | What was done |
|---|---|---|
| 7.a | Attack pressed while the shield is up: refuse, or drop the shield and swing? | **Refuse.** The shield is a deliberate toggle and auto-dropping it on an attack press would make the toggle feel unreliable — you would lose a guard by fumbling the other button. The escape is the one the player already knows: tap the shield off. |
| 7.b | Shield raised mid-swing: refuse, or cancel? | **Cancel** (`autoAttack`, `isSwinging` and the pending swing SFX all cleared). "Not at the same time" has to include the 250ms a swing is in the air, or the exclusion is only true between swings. |
| 7.c | Does **Shield Bash** still work from a raised shield? | **Yes, unchanged.** Bash-out-of-a-block is its signature use and `resolveCastAngle` reads the raised shield's angle for it by design. The owner's complaint is the basic swing, and an ability with its own button, cost and cooldown is not that. |
| 7.d | Server enforcement of the exclusion? | **None; flagged.** `ps.blocking` is written from every `move` packet, so a forged client re-asserts it each tick — a server gate would have to either drop honest in-flight hits (a raise racing a swing already sent) or invent a "no guard for N ms after a swing" rule the client cannot mirror. The gap is not new: §5.4 *sanctioned* attacking while blocking until now, and blocking buys mitigation, not damage. The honest fix is the tick-wire field already flagged in §5.20. |
| 7.e | Desktop parity for the two-step press? | **Unchanged.** Desktop has no contextual button; a click aims at the cursor and always has. The directive is about the touch surface. `Q` still toggles, and the exclusion reaches desktop for free — `_desktopShieldOn` goes through `raiseShieldToggle`, and the click path goes through `swingAttack` and the same auto-attack gate. |
| 7.f | Should a held lock also halve movement speed? | **No** — see 7.3. |
| 7.g | The weapon-swap preview draws INSIDE the left disc, which is now hidden on release | The disc is held up for the preview's own window (`_lJoyPreviewUntil`). Without it the single-tap confirmation — the entire point of the two-tap swap — would have opened inside an invisible parent. |
| 7.i | A monster hitting you from OUTSIDE the perimeter (the snowman throws from 300px) and no attack button on screen | **Left hidden**, on the owner's own rule: a monster you cannot engage is not "input that can be interacted with". You are not defenceless — the SHIELD button uses the "hit in the last 5s" leg and does appear, dodge is unchanged, and §7.9 restored tap-to-lock at range so you can lock the thrower by tapping it and the attack button then appears for the held lock. Closing the distance or leaving are the intended answers (§5.17). |
| 7.h | Onboarding teaches both controls in town, where neither has anything to do | An explicit hold registry (`game/controlVisibility.js`). ControlsTutorial holds both sides for its whole open (a short modal; a hold that cannot desync beats one that is precise); QuestCoach holds per-mark, and takes the hold *before* measuring — see TRAPS §41 for the closed loop that forces that ordering. |

### 7.9 Found while doing this pass — tap-to-lock had lost its range

Not something the owner reported; found because the hidden button made it
matter. §5.1 says a tapped lock "outside the perimeter is left alone by the
persistence rule" and the code did not do that: `updateTargeting` cleared
**any** monster lock outside the hysteresis ring, however it was made. So
tap-to-lock silently stopped working past 275px — and a bow plants at 675px
(1350 with Longshot), so locking a distant monster and sniping it, which
worked before v2.3.2243, dropped the lock on the next frame. It went
unnoticed because the button swung at air anyway.

With the button hidden unless it can do something, a tapped lock is now the
**only** way to engage anything beyond the perimeter — including the snowman,
which throws from 300px (§5.17) — so the gap had to close. The two writers in
`targeting.js` (an Attack press, the switch arrows) stamp `viaPerimeter` on
the lock they make, and the range rule only clears locks carrying that mark. A
tapped lock keeps its old lifetime: it ends when the monster dies, on zone
change, or on another tap. `heldMonster` counts a tapped lock at any distance,
so a press with one held is press TWO — an attack, not a re-engage.


---

## 8. The shield is HELD, not spent (v2.3.2248)

> Owner: "Instead of dropping the shield at first hit I want it to keep being
> held. So whenever you touch the shield button the shield just stays up until
> you attack (thus breaking the shield hold) or you tap the shield button
> again. (The shield won't be overpowered because it costs stamina and can't be
> held indefinitely)"

This reverses §2's auto-disengage, which came from the owner's own earlier
directive and did not survive contact with playing it. A guard that fell down
after one hit meant a two-monster fight was mostly re-tapping the button.

**The hold now ends on exactly three things**, and the owner's balance argument
is the third:

| Ends the hold | Where |
|---|---|
| You attack — swing, special, or holding auto-attack | `playerActions.swingAttack` / `.specialAttack`, and the auto-attack gate in `monsterCombat` |
| You tap the shield button again | `shieldToggle.toggleShield` |
| Stamina runs out | BroTown's auto-release (unchanged) |

A landed block is now just a landed block. Dying, respawning, finishing a duel
and dodging still lower it; none of those are the owner's list, and all of them
are states where a raised shield is meaningless rather than a player decision.

### The v2.3.2246 exclusion is intact — the yielding side swapped

"You can both swing and block at the same time. That is not right" still holds.
v2.3.2246 achieved it by making the attack **bounce off** a raised shield
(`if (S._shieldUp) return`). That is now a **transition**: the shield comes
down and the attack goes through on the same press. The two are still never
both true on any frame — `mp-rbutton` asserts exactly that, and asserts the
`droppedWhy === 'attack'` that proves which one yielded.

Reading the owner's sentence: "until you attack (thus breaking the shield
hold)" makes the attack the event and the drop its consequence, so the attack
**lands** rather than being spent unlocking the shield. One press, not two.

### 8.1 Judgement calls

| # | Question | What I did |
|---|---|---|
| 8.1 | Does the attack press land, or is it consumed lowering the guard? | **It lands.** One press. |
| 8.2 | Does a dodge still drop it? | **Yes, kept.** Not in the owner's list, but you cannot roll from behind a raised shield, and it was never the complaint. |
| 8.3 | Does the special break it too? | **Yes** — a special is an attack, and it shares the button. |
| 8.4 | Does the "block 10 hits" quest still count? | **Yes** — it counts blocks, and a block still happens; only the drop went away. |
| 8.5 | Shield Bash from a raised shield? | **Unchanged**, still exempt — it is the one move whose whole point is bashing out of a block. |

---

## 9. Targeting is automatic; the tap is the override (v2.3.2251)

> Owner, after playing §8:
> - "there should be a subtle visual perimeter around each monster that shows you when your contextual attack button can engage"
> - "Change the auto targeting system to always be nearest enemy. Only way to pick target and lock it on is to tap on the monster"
> - "The attack button isn't lit up when it becomes available (font hard to see)"
> - "tutorial might need to change with the new attack system and lack of right joystick"

### 9.1 The engage press is gone

§7.1 made the press two-step: engage, then attack. Automatic acquisition removes
the first step entirely — there is nothing left to engage, so **the right button
is a plain attack button again**. `updateTargeting` is now the single writer of
the automatic lock and runs every frame.

`S.lockedTarget.src` replaces `viaPerimeter`, with the polarity flipped:

| `src` | Who wrote it | Lifetime |
|---|---|---|
| `'auto'` | `updateTargeting`, every frame | re-points at the nearest; cleared past the hysteresis ring |
| `'tap'` | the canvas tap, and only it | survives at **any** distance until it dies or you tap again |

**The hysteresis survived the rewrite** and is load-bearing: an empty candidate
list does not clear an auto lock, because the lock holds out to
`TARGET_PERIMETER_PX × TARGET_HYST` (275px). Clearing at 220 makes a monster
pacing the boundary flip the target several times a second, and every flip moves
the reticle, the facing, the shield angle and the next shot's aim. `mp-target`
pins this.

Deleted with the cycling they served: `engageNearest`, `heldMonster`,
`hasCandidate`, `candidatesByX`, `cycleTarget`, `TargetArrows.jsx`, the desktop
`T` key, and the tutorial's "Switch target" step.

### 9.2 A lock is no longer evidence of intent

This is the trap in the change. Six sites used a bare `S.lockedTarget` as a
proxy for "the player is fighting this" — fair while a lock only existed because
the player asked for one. With acquisition automatic a lock is present whenever
**any** monster is within 220px, so those sites would read "in combat" while you
walk past a slime. The worst of them was the harvest button's priority rule,
which would have suppressed **HARVEST** for good.

`targeting.engagedStance(S)` is the replacement — *your thumb is on the attack
button, or you tapped this target yourself* — and it gates: the harvest priority,
the backpedal/target-relative movement, the rendered locked facing, the aim
write, and the dodge's retreat-shot context. Sites that genuinely mean "point at
the current target" (`shieldAimAngle`, `lockAimPoint`, the melee base angle,
projectiles) keep reading the bare lock: they want the target, not the intent.

### 9.3 The perimeter is painted on the ground

§7.2 rejected a `TARGET_PERIMETER_PX` ring around every candidate — six 440px
circles overlapping into background haze. The owner now wants a perimeter back,
so it is a **different shape, not a fainter version of the rejected one**:

- a small ellipse at each candidate's **feet**, sized from the shared
  `monsterMeleeHitRadius` table (~68px across for a slime, ~120 for a skeleton),
  not from the 220px engage radius;
- drawn in the **`telegraphs` layer, below `entities`** — the rejected version
  lived in `overlayWorld`, the topmost world layer, so it crossed every sprite
  on screen. Down here nothing it draws ever crosses a monster or the player;
- alpha ramped by distance, brightest at your feet, so the ring itself says how
  close to engageable you are;
- the current target's ring takes the reticle red when you **tapped** it and
  brass when it is merely the nearest, so "pinned" and "automatic" look
  different.

At the ~250–320px spacing the server's farthest-point spawn placement produces,
two of these can only touch when two monsters are standing on each other — and
then their sprites overlap too, so the overlap is information rather than noise.

The caret changed job with acquisition: it now marks the candidates that are
**not** the target ("tap this one instead"). The target itself carries the
ground ring and the reticle. Both are recorded in `__btAtkMark`.

### 9.4 The button lights up

Availability moved the wrap's opacity and nothing else, so the button faded in
still wearing the joystick-era `0.5` resting opacity — a faint disc with faint
text, exactly as reported. Now, stamped **inline** by the resolver:

| | |
|---|---|
| opacity | `0.5` at rest → `1` when a press would do something |
| border | transparent → brass, brighter focus tone when there is something to hit |
| shadow | a hard brass spread ring, **zero blur** (LANTERN-SLATE: "no blur anywhere") |
| label | 11px → 13px, with a real dark halo rather than a 1px drop |

**Inline, not `game.css`**, and this is not a style preference: the disc's own
`border` and `transform` are inline, and an inline declaration beats an author
stylesheet without `!important` — a CSS tier ladder would simply never paint.
**And never `background-color`**: `base.webp` is opaque edge to edge, so a fill
paints *under* the sprite and is never seen. Both were caught by rendering the
proposal in a real browser before it shipped.

### 9.5 Judgement calls

| # | Question | What I did |
|---|---|---|
| 9.1 | Does target-relative movement follow the AUTO target? | **No** — only `engagedStance`. Otherwise walking past a monster puts you in a backwards jog. |
| 9.2 | Does tapping the same monster clear the target, or release it to auto? | **Release to auto.** With acquisition automatic, `null` means "resume", and the next frame re-acquires. |
| 9.3 | How much nearer must a rival be before auto switches? | **12%** (`AUTO_SWITCH_MARGIN`). Pure nearest-every-frame flip-flops between two monsters at equal distance. |
| 9.4 | Does the target keep the perimeter ring, or only the caret? | Ring **and** reticle; the caret goes to the others. |
| 9.5 | Is "3 seconds" the pile or the whole burrow? | **The pile** (total move 4200ms), the same reading v2.3.2225 used. `PILE_MAX_MS 1800` makes the whole move 3s. |
| 9.6 | Is "20 seconds" start-to-start or end-to-start? | **Both** — stamped at the start as the re-entry guard and re-stamped at the end, so 20s is a floor on downtime. Start-stamp alone gives 15.8s. |
