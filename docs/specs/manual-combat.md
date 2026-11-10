# Manual combat: every attack is a swipe (v2.3.4395)

> The owner, 2026-11-09: *"I want to make the system more manual. I think only
> making an attack after manual input is better than auto-attacking at
> precisely the correct interval. ... Remove the tap to target system for now.
> All combat types (melee, bow, staff) will no longer be able to tap and lock
> on monster. I think this system will be easily botted and abused. The timing
> intervals for manual human attacks will give a good fingerprint to identify
> bots. For melee, keep the invisible targeting system where it automatically
> faces the closest monster."* *"Yes for computer controls."* *"Yes duels lose
> tap lock."* *"Don't do any monster adjustments."* *"Just keep in mind magic
> uses your finger to control the projectile once launched so none of the new
> controls should interfere with that."*

## How it got here

The first cut was **draw and release**: hold the right stick, a build-up fills
over the weapon's interval, let go at full to shoot; a sword waited for its
build-up and then took a tap. The build-up needed something to watch, and
three places were tried and turned down:

1. On the attack button: *"The thumb covers the indicator and the indicator
   itself is too subtle. Same for bow and staff."*
2. A ring round the character: *"It's too obnoxious having it circle the
   player. Maybe north of the right joystick can be a ready bar."*
3. A bar over the joystick: *"I don't like it. Especially for bow and staffs.
   Is there any alternatives? I still like the no lock on monster for bow and
   staff, but maybe the sword you have to make a swipe motion each attack?"*

Offered three ways on (swipes for every weapon; the old held attack without
the lock; a slingshot pull), the owner, 2026-11-10: ***"Try version a."***

## The decision (2026-11-10)

Having tried both links, the owner: *"Ok I think I've decided. Keep tap to
lock on monster off. Keep the staff the old way (prior to any of these
changes) where it keeps auto-attacking as long at the finger is held in
whatever direction and you can steer the projectile. For bow keep this new
flick mechanism but make attack speed 25% faster (in terms of when the next
shot can fire again). Also for sword keep the new flick mechanism."*

| weapon | with the switch |
|---|---|
| sword | a swipe each swing |
| bow | a flick each shot, and the next shot a quarter sooner |
| staff | **as it was before any of this**: it fires by itself while the thumb is held, and the bolt is steered |
| all three | no lock a player chose |

## It is the game's combat (v2.3.4396)

Asked whether to switch it on for everyone, the owner, 2026-11-10: *"Yes do
the new combat."*

- **On for everybody.** A phone or computer with nothing in its address and
  nothing remembered plays it.
- **`?manual=0`** is the old combat (the held attack, the tap lock) for that
  one device, remembered in `localStorage` under `bt_manual`. The same shape
  as a memory saver's off-ramp. **`?manual=1`** comes back to the game's own
  and forgets. **`?manual=2`** is the slingshot bow (below), remembered.
- It was behind `?manual=1` while it was being found (v2.3.4395).
- It is the phone's side only. The worker is not changed (see "The server").

What tells a player how to attack now says the new way:

- The controls tour (Settings; `ControlsTutorial.jsx`): "Sword: swipe across
  it, or anywhere on the right side, for each swing. Bow: flick the way you
  want to shoot. Staff: hold a direction and it keeps casting." and "Aiming
  and specials" in place of "Your target" (the tap lock).
- The phone's arrow at the special's button after a first kill
  (`guideArrow.js`): "Tap, then attack: your special" for a sword or a bow.
- A computer's COMBAT TIPS card (`deskTeach.js`): "Right-click  Special: then
  attack" for a sword or a bow.
- The key list (`deskKeyList.js`): the "2xClick Lock on" row only in the old
  combat.
- **The old way, made near a monster, is answered with the new one.** A press
  on a phone that ended having made no attack gesture at all (a tap, a hold:
  `mcPressIdle`) while the attack button is up for a fight says "Swipe to
  swing" (a sword) or "Flick to shoot" (a bow) over the bro's head, no
  oftener than every 2.5 s (`BroTown.jsx` `mcTeach`). Not for a staff, not
  over a harvest's button. It is the game's own floating words, nothing new
  drawn.
- The first-time coach needed nothing: its "Hold to attack" and "A quick
  swipe" lessons were retired long before this (`QuestCoach.jsx` `RETIRED`),
  and the Mayor's first quest is finished by 4 Slime Remains, not a gesture.

Left as they were, and wrong in the new combat: two lines of older quests'
talk in `gameSystems.js` ("Auto-attack applies one element, swipe the other",
"Lock on and tap the trap"). Not checked: whether those quests are offered
today.

**The phone tests play the old combat unless they ask.** `H.newPlayer` adds
`manual=0` to every scenario's address that does not name `manual=` itself
(`tools/qa/mp/harness.mjs`). About 120 scenarios drive the held attack and the
tap lock directly (`S.autoAttack`, `S.lockedTarget`, a press of the disc), and
those are still in the game behind the off-ramp. `mp-manualcombat` plays
`manual=1`, `manual=2` and `manual=default` (what a new player gets). So the
new combat is tested by its own scenario and its rule test, and the old one by
everything written before it. Moving the old scenarios over is not done.

## What a player does

### A sword: each swipe is a swing

- **Swipe your thumb** on the right side of the screen, or across the attack
  button. Each stroke is one swing. Any direction: the sword still turns to
  the nearest monster by itself (the automatic lock, `src: 'auto'`).
- **Back and forth without lifting** is a swing each stroke.
- A stroke is 24 px of travel inside 280 ms (`SWIPE_PX`, `SWIPE_MS`). A thumb
  that only drifts is followed, not counted.
- **A tap swings nothing.** Holding swings nothing.
- The opening lunge (the sword dash) is made by the first stroke, as it was
  by the first press.

### A bow: flick to shoot

- **Flick**: thumb down, moved, lifted 24 px or more from where it touched.
  One shot, the way the thumb went.
- **A slow drag is the same gesture made carefully.** Hold the thumb out and
  the aim turns with it, as it always has; the lift is the shot.
- **Holding fires nothing**, however long.
- **Cancel**: bring the thumb back to where it touched (inside 8 px) and lift.
- **A tap shoots nothing.**
- **A quick flick is helped a little** (a bow only): one over in 350 ms is
  turned to a monster within 12 degrees of its line and inside the bow's reach
  (`mcAssist`). A thumb is not a mouse. A drag that took longer was aimed and
  is left exactly as it points.
- **A flick is always an arrow.** The held bow waited for its sight to be on
  something (`docs/specs/bow-sight-gate.md`); a flick cannot wait, and "I
  flicked and nothing happened" is worse than a miss. Without the switch the
  held bow's rule is unchanged.
- **A quarter sooner.** A flicked bow's next shot may leave after three
  quarters of the held bow's interval (`MANUAL.BOW_FASTER` 0.75,
  `mcBowInterval`): 495 ms becomes 371 ms on a new character. Never under
  215 ms (`BOW_MIN_MS`): the worker drops a hit that comes sooner than 210 ms
  after the last on the same monster. Damage a shot is unchanged, so a flicked
  bow does about a third more damage a second than a held one if every flick
  is made on time and lands. The item card's damage-a-second still shows the
  held bow's.

### A staff: as it was

- **Hold the stick in a direction and it fires by itself**, at its own
  interval, for as long as the thumb is down. The bolt in flight is steered by
  the held thumb (`projectiles.js` reads `S._aiming` / `S._aimAngle`; the
  rules file writes neither).
- Its tap is one bolt, its flick is its special, its special's button is the
  special itself (it arms nothing), and on a computer it fires while the
  mouse button is held. All as before.
- What is NOT as before: it keeps no lock a player chose, like the others.
- How: every manual branch of the handlers asks `mcSwipes(S)` (true for a
  sword and a bow with the switch, false for a staff), and the loop's
  `_mcOn` is false for a staff, so each line it reaches is the old one.

### The slingshot bow, a variation to try (`?manual=2`)

> The owner, 2026-11-10: *"I'm actually thinking of the pull back and release
> slingshot method. Try adding that as a variation I can try in a new link
> (just for bow - magic stays as flick)."*

- **Pull back, let go.** With a bow, drag your thumb AWAY from what you want
  to hit, and lift. The arrow leaves the opposite way.
- **While you pull, the bro and his sight already point where the arrow will
  go**, so the pull is aimed, not guessed. From the right side of the screen
  and from the attack button alike (the button does not aim in any other
  mode; here it does while a bow is pulled).
- Everything else of the bow is as above: holding shoots nothing, 24 px is a
  pull, back to where the thumb touched cancels, no faster than the bow, a
  quick pull is helped to a monster within 12 degrees.
- **How far you pull changes nothing yet**: any pull past 24 px is the same
  arrow. Range or speed by pull length would be a balance change, and the
  worker's.
- A sword is still a stroke, and a staff is as it was.
- A computer is unchanged: a click is a shot at the cursor.
- One rule turns the shot round: `mcShotAngle` (the stick's drag in
  `rJoyAim`, the disc's pull in `bM`, the lift in `mcFlickEnd`).

### No faster than the weapon

- A sword keeps its own interval, the number the held attack swung on; a
  flicked bow's is three quarters of the held bow's (above).
- **A swipe that comes sooner attacks nothing and costs nothing.** The weapon
  is ready when it would have been.
- A swipe within 180 ms of ready (`EARLY_MS`) is kept for that moment, so a
  steady rhythm never drops an attack.
- (The draw-and-release version, for one evening, restarted a sword's
  build-up on an early tap. With swipes the owner's version A says an early
  swipe "just doesn't attack"; say if the restart should come back.)

### Specials: arm, then attack

- The special's button **arms** the special for the next attack. Press it
  again to disarm. It wants enough mana to arm, and reads **ON** while armed.
- The next attack made (a stroke, a flick, a click) **is** the special.
- A sword and a bow only. A staff's special is as it was.
- A bow's special needs a line on something. A flick with no line is an
  ordinary arrow and the special stays armed for one that has.
- The button is always there in manual combat (it used to hide out of combat).
- A flick never makes a special (it did, before this).

### A computer

- A sword, a bow: **each click is one attack**, at the cursor. Holding the
  button attacks once.
- A staff fires while the button is held, as it did.
- The right click arms and disarms the special.

### No tap to target

- Tapping or clicking a monster locks nothing, for any weapon.
- A duel's lock is dropped too.
- Any lock a player chose is removed every frame (`mcLockAllowed`); only the
  sword's own automatic lock is kept.

## Nothing is drawn for it

There is no gauge, bar or ring. The one thing on the screen is the special's
button reading ON while armed.

## How it is built

| file | what |
|---|---|
| `src/game/manualCombat.js` | The rules, with no imports so node tests them: the switch (`manualMode`: 0, 1, 2); `mcSwipes` (a sword and a bow swipe; a staff does not); `mcBowInterval`; `mcBowSling` / `mcShotAngle` (the slingshot bow); `mcSwipeStart` / `mcSwipeMove` (a sword's stroke) / `mcSwipeEnd` (a flick's lift); `mcAskShot`, `mcFireWaiting` / `mcFireDone`; `mcMeleeAsk`, `mcSwingWaiting` / `mcSwingDone`; `mcReadyIn`; `mcAssist`; `mcFrame` (the loop's word each frame: this weapon's interval); `mcArmToggle` / `mcTakeArmed`; `mcLockAllowed`. State on `S._mc`. |
| `src/game/monsterCombat.js` | The attack gate: in manual combat the loop shoots only when a flick asked (`mcFireWaiting`), never because the stick is held, and no sooner than the weapon's interval; a flick looses with or without a line; the armed special is taken there. |
| `src/game/targeting.js` | Chosen locks dropped each frame; the duel lock not kept. |
| `src/ui/BroTown.jsx` | `mcMeleeSwipe` (a stroke: the lunge, the armed special, or a swing), `mcFlickEnd` (a flick: writes the aim, asks the shot); the stick (`rS` / `rM` / `rE`), the disc (`bS` / `bM` / `bE`) and the mouse call them; no lock on a tap, a click or a double click. |
| `src/ui/panels/SpecialButton.jsx` | Arms and disarms; "ON". |

## The server

Not changed. It already drops a hit that comes sooner than its floors
(`combat.js`, `hitproof.js`), and nothing here attacks faster than the held
attack did. So this needs no cap and no kill switch: the switch is the
address. (The free-swing trial below is the worker's, with a cap and switches
of its own.)

## The free-swing trial (`?manual=3`) (v2.3.4520)

> The owner, 2026-11-10: *"What if the attack speed was uncapped (you can
> swipe as many times as you want to hit) but the DPS is prorated by the time
> elapsed relative to the full swing cycle? Thinking that might be better."*
> Then: *"Yes pass it on. I'd like to try."*

**A trial on one device, for the sword only.** A bow, a staff, the opening
lunge and the armed special are exactly as above. A phone or computer that
has not asked for it meets nothing new.

### How to try it

- **`?manual=3`** in the address turns it on for that device, and it is
  remembered (`bt_manual` '3', as `?manual=2` is). **`?manual=1`** comes back
  to the game's own swipes and forgets.
- **`?swingbonus=1`** adds the full-swing bonus (below), remembered in
  `bt_swingbonus`; **`?swingbonus=0`** forgets it.
- The phone asks the worker in its join (`fs: 1`, or `fs: 2` with the bonus:
  `freeSwingAsk`), and the trial runs only when the worker advertises
  **`caps.freeSwing`**. An older worker, or one with the switch off, keeps
  this device on the untried swipes.

### The rules (the worker's: `server/src/freeswing.js`)

1. **Every swipe swings at once.** No early refusal and no 180 ms hold.
2. **Each swing's damage is its share of a full one**, `f = min(1, time since
   this player's last counted sword swing / their full cycle)`, measured on
   the worker's clock, never the phone's. Waiting a full cycle is a full hit;
   quicker swings add up to the same damage a second. The cycle is the
   sword's own: 600 ms x the Speed stat's cut (`prog3.js` aspd; an older
   character's Tempo), never under 300 ms. It reads no amulet, because the
   sword's swipe never did.
3. **Nothing a hit carries multiplies with mashing.** Only a swing with
   `f >= FULL_SWING_SHARE` (0.8) carries the shove (30 px, a crit's 45),
   the gem's status, its collision and the mana that returns, and a storm
   gem's spark. A lighter swing is its damage and nothing else. A crit's
   damage scales by `f` like the rest. Against a player, a blocker's stamina
   (10 a blocked hit) scales by `f` too. Fight XP is paid by damage, kill
   credit is shared by damage, and lifesteal is paid on a kill, so none of
   them multiplies.
4. **A quiet floor, and no rounding tricks.** The worker counts one swing at
   most every `MIN_SWING_GAP_MS` (100). A swing sooner is dropped silently
   and costs nothing: the clock is not touched, so the next swing's share is
   larger by it. The phone swings no sooner than `FREE_GAP_MS` (150), because
   the blade lands 120 ms into its swing. The fraction a light hit leaves is
   carried to the player's next one. It is never rounded up, and never
   floored at 1: the roll's floor of 1 applies to the full hit, before its
   share.
5. **One swing, several targets.** The swing names itself (`sw`, its own
   clock) on its `monster_damage`, as it already does on its claim at a
   player. Every target of one swing takes that swing's share, each once.
6. **The bonus (a second switch to compare).** With `?swingbonus=1`, a swing
   after a full cycle (`f = 1`) is `FULL_SWING_BONUS` (0.12) harder, on a
   monster only. Nothing is held and nothing is shown: it is not a charge
   attack. Against a player there is no bonus.
7. **A paid special swing is counted as a swing.** Its own hit is untouched,
   and the next swing's share runs from it, as the untried sword's interval
   does.

**Fair against a player who is not trying it.** Damage a second is the same
however the swings are cut up, and against a player there is no bonus. A
sword's hits on a player keep their 250 ms lane (`pvpbalance.js`): a swing
sooner than that is dropped there, and that costs nothing either.

### On the screen

**Nothing new is drawn.** A light swing's damage number is smaller, sized by
the share the worker sends (`pw` on `monster_hit` and `pvp_hit`:
`mcNumberScale`, a quarter swing 0.7 of the size). A full swing's number is
as today. A light swing's hit sound is the same sample, quieter
(`mcHitVol`). A light crit does not play the crit ring.

### Switches (live flags, lower case)

| flag | what `false` does |
|---|---|
| `freeswing` | No device gets the trial: today's sword for everyone. `caps.freeSwing` is un-advertised, and every phone is told at once (`free_swing`, privileged) and goes back to the untried swipes. |
| `freeswingbonus` | The bonus is never given, even when a device asks for it. |

The constants are `FREE_SWING` in `server/src/freeswing.js`
(`FULL_SWING_SHARE`, mirrored in `MANUAL.FULL_SWING_SHARE`) and
`MANUAL.FREE_GAP_MS`. The state lives on the player and is never saved
(`ps._fs`). It goes when the player leaves.

## Not built

- **Reading attack timing and swipe shape on the server to find bots** (the
  owner: *"The timing intervals for manual human attacks will give a good
  fingerprint to identify bots"*). That is a worker change of its own. Swipes
  give more to read than a release did: their length, speed and angle.
- Moving the older phone scenarios to the new combat (above).
- A first-time lesson that SHOWS the swipe and the flick (a moving hand, a
  picture). A player who presses the old way near a monster is told the new
  one in words (above), and the controls tour in Settings says them.
- No monster was changed (the owner: *"Don't do any monster adjustments"*).
- Not tried: a fight with a real monster on a phone (the tests swipe in the
  safe town); a duel between two players in manual combat.

## Tests

- `server/test/free-swing.test.mjs` (v2.3.4520): the trial on the real
  GameRoom (its header lists the checks); `manual-combat.test.mjs` §13 its
  phone rules and wiring.
- `server/test/manual-combat.test.mjs`: the switch; a flick, a tap, a nudge,
  the cancel, a slow drag; no faster than the weapon (too soon, kept, the
  window's edges); a forced end; a sword's stroke, back and forth, the pause,
  the drift; a sword too soon; arming; `mcLockAllowed`; a weapon change; the
  quick flick's help (the angle, the reach, the seam); and that each caller
  is wired and nothing is drawn.
- `node tools/qa/mp/run.mjs manualcombat` (`mp-manualcombat.mjs`), a phone and
  a computer in the Wheel (with `manual=default`: what a new player gets), then
  a second phone with `?manual=2`, 44 checks: holding fires nothing; the lift is one
  arrow the way the thumb pointed; a quick flick; a tap and a nudge; the
  cancel; a flick too soon and one kept; the special arms and is the next
  attack; a chosen lock does not last; a sword's tap, stroke, stroke back,
  stroke once ready, drift, and a stroke off the disc; a computer's click,
  held button, second click, right click, and a sword's click; the slingshot
  bow pulled and held (nothing shot, the aim already the other way),
  released, pulled off the disc, cancelled, and a sword still a stroke; the
  flicked bow's interval (371 ms); a staff held (it fires by itself), lifted
  (it stops), and its button (arms nothing). The times that
  matter are held by the clock in one task: this box's timers run late.
- Not reached by the phone test: a flick with no line at all (in the town the
  bow's sight is always on something), so "a flick is always an arrow" and
  "the special stays armed with no line" are held by the rule test's reading
  of the loop only.
