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

## The held combat is the game's again (v2.3.5018)

> *"One more thing is that I like combat better the old way. You just move the
> right joystick towards the enemy and it attacks as long as it is held down.
> A swipe on the right joystick activates the special attack."* -- the owner,
> 2026-11-13.

That is the old combat (`?manual=0`: the held attack, a flick its special), but
the old combat also has the **tap lock**, which the owner took out on
2026-11-10 ("Remove the tap to target system ... easily botted") and did not ask
back. So the default is a fifth choice, **4, the held combat**:

| choice | what it plays | tap lock | remembered |
|---|---|---|---|
| **4** (the default) | the held attack: hold the right stick toward an enemy and it keeps attacking; a flick is the special; the staff fires while held and its bolt is steered; a computer attacks while the button is held | **none** (a tap or double click on a monster locks nothing; a duel keeps no lock) | `?manual=4` forgets, back to the default |
| 0 | the old combat, as it was | yes | yes |
| 1 / 2 / 3 | the swipes / the slingshot bow / the free-swing trial (the default from v2.3.4655 to v2.3.5018) | none | yes (3 too, now that it is a choice) |

- `manualOn()` is false for 4, so every handler, the attack loop, the bow and
  the staff take the old combat's lines; `tapLockOn()` (new) is true only for
  0, and is what targeting.js, BroTown.jsx's tap and double click, the key list
  and the controls tour ask about the lock.
- The phone tests are unchanged: they play `?manual=0` unless they name one
  (`harness.mjs`). The four that test the swipes' feel (`mp-manualcombat`,
  `mp-swordfeel`, `mp-bowfeel`, `mp-stafffeel`) asked for "the default" and now
  ask for `?manual=3` by name.
- What the trial's worker-side rules (the free swing, the perfect strike, the
  bow's draw, the staff's gather) need is untouched: they answer a phone on the
  trial, as they always did.

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

> **v2.3.4802: the game's own bow is DRAWN now** (`bow-feel.md`): thumb down
> nocks, pull back to draw, lift to loose, each arrow its share of a full
> draw. What follows is the flick, which `?bowfeel=0`, `?manual=1` and a
> worker without `caps.bowDraw` still play.

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

> **v2.3.4803: in the game's own combat the staff GATHERS now** (thumb down
> gathers power through a spark, an orb and a sphere; the lift blasts it; a
> quick tap fires a spark; its special is its button): `docs/specs/staff-feel.md`.
> What follows is the held staff, still what `?manual=0/1/2`, `?stafffeel=0`
> and a worker without `caps.staffGather` play.

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
- A staff fires while the button is held, as it did. (v2.3.4803: in the
  game's own combat, the button held GATHERS and its release blasts at the
  cursor: `docs/specs/staff-feel.md`.)
- The right click arms and disarms the special.

### No tap to target

- Tapping or clicking a monster locks nothing, for any weapon.
- A duel's lock is dropped too.
- Any lock a player chose is removed every frame (`mcLockAllowed`); only the
  sword's own automatic lock is kept.

## Nothing is drawn for it

There is no gauge, bar or ring. The one thing on the screen is the special's
button reading ON while armed. (v2.3.4615 to v2.3.4656 the free-swing trial
had the owner's timing bar; v2.3.4800 removed it, the owner: *"Yes remove the
timing bar. It needs to be something else entirely"*. Readiness is shown on
the weapon itself now: the sword's blade refills and glints,
docs/specs/sword-feel.md.)

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

**v2.3.4655: EVERYONE'S DEFAULT.** The owner, 2026-11-11, asked whether the
timing bar should be for everyone and not only `?manual=3`: *"Yeah
everyone. It's still a demo btw only me is testing all this."* A device with
nothing chosen plays the trial now (manualMode's default is 3);
`?manual=1` is the plain swipes, remembered; `?manual=3` comes back to the
default and forgets; the worker's `freeswing: false` takes it from every
phone at once. Below, "on the trial" means every phone that has not chosen
another combat.

**A trial on one device, for the sword only** (until v2.3.4655). A bow, a
staff, the opening lunge and the armed special are exactly as above. A phone
or computer that has not asked for it meets nothing new.

### How to try it

- **`?manual=3`** in the address turns it on for that device, and it is
  remembered (`bt_manual` '3', as `?manual=2` is). **`?manual=1`** comes back
  to the game's own swipes and forgets.
- **`?swingbonus=1`** adds the full-swing bonus (below), remembered in
  `bt_swingbonus`; **`?swingbonus=0`** forgets it. (v2.3.4615: the bonus is
  the perfect strike's now and ON by default on the trial; `?swingbonus=0`
  turns it off, remembered: "The timing bar and the perfect strike".)
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
   monster only. (v2.3.4615: only a PERFECT strike's now, a swing timed to
   the full cycle; see "The timing bar and the perfect strike".) Nothing is held and nothing is shown: it is not a charge
   attack. Against a player there is no bonus.
7. **A paid special swing is counted as a swing.** Its own hit is untouched,
   and the next swing's share runs from it, as the untried sword's interval
   does.

**Fair against a player who is not trying it.** Damage a second is the same
however the swings are cut up, and against a player there is no bonus. A
sword's hits on a player keep their 250 ms lane (`pvpbalance.js`): a swing
sooner than that is dropped there, and that costs nothing either.

### On the screen

**Nothing new is drawn** (v2.3.4800: the blade's own readiness and glint, and the cut's weight, docs/specs/sword-feel.md; the timing bar of v2.3.4615 is gone). A light swing's damage number is smaller, sized by
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

## The perfect strike, and the timing bar that was (v2.3.4615; the bar removed v2.3.4800)

> The owner, 2026-11-10: *"Yeah rising pitch on quick hits and something that
> benefits the player if they swipe just around the time their swing is back
> to full again."* Then: *"I like the idea of a sword silhouette laying
> horizontally that refills as a bar and once the bar reaches the top it
> glints. During this glinting must attack to get the bonus. Same with the
> bow. Make the arrow silhouette fill up as the timing bar. It would need to
> be north of the right joystick. For magic I think it should be skipped for
> now."* And: *"I also like the idea of the bar freezing in place a moment so
> you could see where you decided to swing. It doesn't slow down the recovery
> of the next attack though."*

The free-swing trial's second step. **All of it is behind the trial**
(`?manual=3`, and a worker advertising `caps.freeSwing` and
`caps.perfectStrike`): a device not on it meets nothing new. The perfect
strike, its mana and the sound are in the game. **v2.3.4800: the bar is
gone** (below); the blade's glint shows the same window
(docs/specs/sword-feel.md).

### The perfect strike (the worker's: `server/src/freeswing.js`)

1. **A sword swing or a bow shot whose time since your last counted attack
   with that weapon lands from `PERFECT_EARLY_MS` (60) before its full cycle
   to `PERFECT_LATE_MS` (300) after it is a perfect strike.** Judged on the
   worker's clock: a sword on its counted swings (the trial's own clock); a
   bow at its arrow's `player_projectile` relay, the moment it leaves (its
   hit claim comes after the flight), each claim naming its shot (`sw`, the
   shot's own stamp) so every monster it takes is judged by the shot that
   hit it. The bow's cycle is the flicked bow's, mirrored from the phone:
   `max(200, 600 x the Speed stat's cut x 0.825 / a storm amulet)`, then
   `x 0.75`, never under 215: **371 ms** for a new character.
2. **It gets the bonus**, `FULL_SWING_BONUS` (0.12): a perfect sword swing's
   share x 1.12, a perfect arrow x 1.12. This is the bonus that went to any
   full swing in v2.3.4520; **a full swing outside the window is an
   ordinary full hit now.** A perfect cadence anywhere in the window is the
   same damage a second (a swing at 0.95 of a cycle is 0.95 x 1.12).
3. **And a little mana**, `PERFECT_MANA` (an eighth) of the special's cost.
   The special costs one mana block (`abilities.js blockSize`): **20 mana**
   of a new character's 100, so a perfect strike is 2.5, the half carried,
   and **eight perfect strikes pay one sword special**. Once a strike,
   however many monsters it takes. Saved as every mana write is (coalesced).
4. **On monsters only.** Against a player the trial stays a fair fight:
   damage a second is the untried sword's, no bonus, no mana.
5. A paid special (a sword's, a bow's volley) and a retreat's arrow restart
   the clock and are never perfect. A staff's bolt touches nothing.
6. The phone is told in the hit's own event: `pf: 1` on `monster_hit` (no
   new message).

**Switches.** `?swingbonus` is the device's switch for the perfect bonus:
**on by default on the trial now** (`fs: 2` in the join); `?swingbonus=0`
asks without it (remembered), `?swingbonus=1` comes back. The live flags:
`freeswingbonus: false` turns every bonus off (the damage and the mana, both
weapons); `perfectbow: false` the bow's part only; `freeswing: false` the
whole trial, the blade's glint with it (`caps.perfectStrike` goes with
`freeSwing`).

### The timing bar (v2.3.4625 to v2.3.4656; REMOVED v2.3.4800)

The owner's design (*"a sword silhouette laying horizontally that refills as
a bar and once the bar reaches the top it glints"*), drawn with their own
sheet standing over the left joystick, with a frozen copy where you struck.
Removed on the owner's word, 2026-11-11: *"Yes remove the timing bar. It
needs to be something else entirely"*: readiness is shown ON THE WEAPON now,
never a gauge (docs/specs/sword-feel.md). Gone with it: `TimingBar.jsx`,
`timingBarArt.js`, `timingBarPreload.js`, its CSS (`.bt-tbar`), its rules in
manualCombat.js (`mcBarWeapon`, `mcBarCycle`, `mcBarTimes`, `mcBarAttack`,
`timingBarWanted`, `?timingbar`), `mp-timingbar`, its two UI-review pictures.
The owner's sheet stays on disk (`public/sprites/timingbar/weapons.png`, not
loaded). The window's numbers stay (`MANUAL.PERFECT_EARLY_MS`,
`PERFECT_LATE_MS`): the blade glints for exactly them.

### The sound (the phone's)

- **Rising pitch:** each of your sword's or bow's hits within
  `PITCH_GAP_MS` (1200) of your last plays the hit sound a semitone higher,
  up to +5 (`mcHitPitch`, the hit voice's playback rate); a pause brings it
  back. Hits within 50 ms (one swing's several monsters) share a step.
- **A perfect strike** plays the drop roll's glint (`rollWin`, an existing
  cue) quietly over the hit, from the worker's `pf`.

### Not the same, and why

- **A swing that hits nothing never reaches the worker**, so the worker
  times the next swing from the last one that hit, while the blade (until
  v2.3.4800 the bar) restarts at
  every swing. In a steady fight they agree; right after a miss the glint
  can promise a strike the worker does not count.
- **A script times perfectly.** The bonus is 12% and a little mana; reading
  the timing as a bot's fingerprint is still the worker's next step (below).

## The bow's draw and the staff's gather: the worker's half (v2.3.4801)

> The owner, 2026-11-11: *"Think about the sword swing. The bow pull back and
> release. The staff building power and blasting the orb."* Approving the
> design: *"build all of them (sword, bow, magic)"*; of the staff, *"For magic
> I think it should be skipped for now"* (no timing window).

The worker ships first (`server/src/drawgather.js`, its header has every
rule). **Nothing changes for a player until the phone sends the new fields**:
a shot without them is today's, exactly. The phone's rules, which its bow and
staff lanes import: `src/game/drawGather.js` (no imports; pinned to the
worker's copy by `draw-gather.test` §1).

### The wire

| what | where | meaning |
|---|---|---|
| `dr` | an arrow's `player_projectile` relay | the draw, whole ms, nock to release (`buildWire`) |
| `ga` | a bolt's relay (`isStaff: true`) | the gather, whole ms, thumb down to blast |
| `ts` | both relays (as today) | the shot's own stamp |
| `sw` | every hit claim of that arrow or bolt: `monster_damage` and `pvp_attack` | names the shot (`sw: ts`) |
| `caps.bowDraw`, `caps.staffGather` | `state_sync` | the worker counts `dr` / `ga` (off with `bowdraw: false` / `staffgather: false`) |
| `pw`, `pf`, `gs` | `monster_hit` | the share (when not a plain full one), a perfect draw, a gathered bolt's stage (0 spark, 1 orb, 2 sphere). Display only |

The relayed copy carries the build the worker COUNTED, so the others draw what
lands.

### The rules

1. **The bound.** A claim counts at most the time since your last counted
   bow shot or bolt (ONE clock for both weapons, or a weapon switch would
   build a full arrow and a full bolt in the same second) plus 100 ms of
   slack for the network, LENT: what a shot takes past its time is owed by
   the next, so over any run the builds sum to the time that passed plus
   100 ms once. A negative, NaN, a string or Infinity is a build of nothing;
   a huge number is the bound; `dr` on a bolt, `ga` on an arrow, a shot with
   no such weapon in the worker's slot, a special's or a retreat's shot, a
   shot with no `ts`: nothing kept (today's).
2. **The share**: damage = bounded build / full build, at most 1, the
   fraction carried. Full draw = the flicked bow's cycle (371 ms on a new
   character: today's bow, so a full draw a cycle is today's damage a
   second); full gather = the held staff's interval + 300 (900 ms).
3. **A share of 0.8 or more** carries the extras (the shove, the gem's
   status, its collision and mana, the spark), as a sword's swing.
4. **The perfect draw**: released from full draw to 300 ms after it, not cut
   by the bound: x1.12 and an eighth of the special's mana once a shot, on a
   monster only, to whom today's perfect arrow pays (`fs: 2`, the phone's
   default; `freeswingbonus`, `perfectbow`). No perfect for the staff.
5. **The staff's stage**: spark under 0.4, orb, sphere from 0.8 (the pulses
   at 360 and 720 ms of 900). The splash's reach is 0, 0.6 and 1 x the basic
   bolt's 60 px (x Detonation), its damage the bolt's share of today's half
   (whole, the fraction carried); a ring of force throws the monsters the
   splash takes outward from the impact, 0, 15 and 30 px (x the zone's depth,
   a debt they walk back; a braced monster stays). Monsters only.
6. **The floors**: one counted shot at most every 100 ms (a quicker one lands
   nothing; the clock is untouched). A named shot's claims are held to the
   210 ms lane a monster and the 300 ms lane a player by their WORTH (a full
   one a whole lane, a light one its share, one lane early at most:
   v2.3.4799), and spend their SHARE of the bow's or staff's hits-a-second
   allowance (`hitproof.js`). Each target once a shot; an arrow 4 (or its
   Piercing's), a bolt 1.
   **A shot with NO field** (today's whole arrow or bolt) is charged to the
   one clock as a full build (v2.3.4799). Before, it touched nothing, and a
   modified phone mixing the two (a field-less arrow, a full draw 1 ms
   later, every cycle) landed 35,044 a minute with 312 perfects, past
   today's best forged rhythm (29,068), and 1.8x today's in a duel (the
   combined feel's review, F1).
7. **Against a player** the share lands as a sword's does; no perfect, no
   mana, no ring; a bolt's splash by its stage.

### The balance (draw-gather.test §9, a minute against a dummy, a roll of 100)

| rhythm | bow | staff (monster / two neighbours' splash) |
|---|---|---|
| today (bow on the trial: every arrow perfect) | 18,132 | 6,700 / 6,700 |
| today, a bow off the trial | 16,200 | |
| full builds | 18,144 perfect (the first draw is timed by itself: one bonus) / 16,200 off the trial | 6,700 / 6,700 |
| 0.8 spheres | | 6,720 / 6,720 |
| tap-spam (120 ms draws / 150 ms sparks) | 16,172 | 6,666 / 0 |
| forged (a billion ms every 120 ms) | 16,267 (the slack once) | |
| today's best forged (no field, every 210 ms lane) | 29,068 (39 perfect) | 12,500 |
| MIXED, no field + a full draw 1 ms later a cycle (v2.3.4799) | 18,132 (161 perfect; was 35,044 / 312) | 6,800 (was 12,400) |
| MIXED, no field every lane + a draw between | 29,096 (one lane once; was 31,956) | 12,433 |
| duels: today's best forged (300 ms) / the worst mix | 20,000 / 20,000 (was 36,272; staff was 26,766) | |

Building pays over a pack (sparks splash nothing); no weapon's best damage a
second moves. The same holds with the worker's own roll.

## The bow's draw: the phone's half (v2.3.4802)

The bow lane built what a player feels on top of it: `bow-feel.md` (the
nock, the draw's bend and creak, the settle's gold line and click, the tired
arm, the twang, the let-down; a computer's held button). The phone sends `dr`
on a drawn arrow's relay and names the arrow on every claim (`sw` on
`monster_damage` and `player_attack`), gated on `caps.bowDraw`; the gesture is
a hook in this file (`mcSetBowHook`), so the touch handlers carry it unchanged.
`?bowfeel=0` is the flick above on one device.

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
- `server/test/draw-gather.test.mjs` (v2.3.4801): the draw and the gather on the
  real GameRoom, every shot through the real router (its header lists the
  checks), with the balance proof.
- `server/test/bow-feel.test.mjs` (v2.3.4802): the bow's draw on the phone,
  its claim through the real GameRoom; `node tools/qa/mp/run.mjs bowfeel`.
- `server/test/perfect-strike.test.mjs` (v2.3.4615): the perfect strike on
  the real GameRoom, the bow's arrows through the real router (its header
  lists the checks); `manual-combat.test.mjs` §14 the perfect strike's
  wiring, the pitch and (v2.3.4800) the bar's absence. The blade's glint:
  `weapon-feel.test`, `mp-swordfeel` (docs/specs/sword-feel.md).
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
