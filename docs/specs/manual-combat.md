# Manual combat: every attack is a swipe (v2.3.4383)

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

## The switch

**It is OFF unless you turn it on.** Add `?manual=1` to the game's address:
that phone or computer plays manual combat from then on (it is remembered in
`localStorage` under `bt_manual`). `?manual=0` turns it off again. Without it
combat is exactly as it was: every change below sits behind `manualOn()`.

It is the phone's side only. The worker is not changed (see "The server").

**A second link, `?manual=2`**, is the same thing with the **slingshot bow**
(below). It is remembered the same way; `?manual=1` goes back to the plain
swipes and `?manual=0` turns either off.

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

### A bow, a staff: flick to shoot

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
  is left exactly as it points. A staff needs none: its bolts find their way.
- **A flick is always an arrow.** The held bow waited for its sight to be on
  something (`docs/specs/bow-sight-gate.md`); a flick cannot wait, and "I
  flicked and nothing happened" is worse than a miss. Without the switch the
  held bow's rule is unchanged.
- **The staff's bolt is still steered by your thumb** once it is launched,
  exactly as before: `projectiles.js` reads `S._aiming` / `S._aimAngle`, and
  the rules file writes neither. Flick to launch, touch and hold to steer.

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
- **A staff is still a flick, a sword still a stroke.**
- A computer is unchanged: a click is a shot at the cursor.
- One rule turns the shot round: `mcShotAngle` (the stick's drag in
  `rJoyAim`, the disc's pull in `bM`, the lift in `mcFlickEnd`).

### No faster than the weapon

- Each weapon keeps its own interval: the same number the held attack fired
  on (a staff's includes its 300 ms).
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
- A bow's special needs a line on something. A flick with no line is an
  ordinary arrow and the special stays armed for one that has.
- The button is always there in manual combat (it used to hide out of combat).
- A flick never makes a special (it did, before this).

### A computer

- **Each click is one attack**, at the cursor. Holding the button attacks
  once (held, it still steers a staff's bolt).
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
| `src/game/manualCombat.js` | The rules, with no imports so node tests them: the switch (`manualMode`: 0, 1, 2); `mcBowSling` / `mcShotAngle` (the slingshot bow); `mcSwipeStart` / `mcSwipeMove` (a sword's stroke) / `mcSwipeEnd` (a flick's lift); `mcAskShot`, `mcFireWaiting` / `mcFireDone`; `mcMeleeAsk`, `mcSwingWaiting` / `mcSwingDone`; `mcReadyIn`; `mcAssist`; `mcFrame` (the loop's word each frame: this weapon's interval); `mcArmToggle` / `mcTakeArmed`; `mcLockAllowed`. State on `S._mc`. |
| `src/game/monsterCombat.js` | The attack gate: in manual combat the loop shoots only when a flick asked (`mcFireWaiting`), never because the stick is held, and no sooner than the weapon's interval; a flick looses with or without a line; the armed special is taken there. |
| `src/game/targeting.js` | Chosen locks dropped each frame; the duel lock not kept. |
| `src/ui/BroTown.jsx` | `mcMeleeSwipe` (a stroke: the lunge, the armed special, or a swing), `mcFlickEnd` (a flick: writes the aim, asks the shot); the stick (`rS` / `rM` / `rE`), the disc (`bS` / `bM` / `bE`) and the mouse call them; no lock on a tap, a click or a double click. |
| `src/ui/panels/SpecialButton.jsx` | Arms and disarms; "ON". |

## The server

Not changed. It already drops a hit that comes sooner than its floors
(`combat.js`, `hitproof.js`), and nothing here attacks faster than the held
attack did. So this needs no cap and no kill switch: the switch is the
address.

## Not built

- **Reading attack timing and swipe shape on the server to find bots** (the
  owner: *"The timing intervals for manual human attacks will give a good
  fingerprint to identify bots"*). That is a worker change of its own. Swipes
  give more to read than a release did: their length, speed and angle.
- **Making it the default.** Today's combat stays until the owner says.
- A teaching card for the new controls; the combat tips still describe the
  old ones.
- No monster was changed (the owner: *"Don't do any monster adjustments"*).
- Not tried: a fight with a real monster on a phone (the tests swipe in the
  safe town); a duel between two players in manual combat.

## Tests

- `server/test/manual-combat.test.mjs`: the switch; a flick, a tap, a nudge,
  the cancel, a slow drag; no faster than the weapon (too soon, kept, the
  window's edges); a forced end; a sword's stroke, back and forth, the pause,
  the drift; a sword too soon; arming; `mcLockAllowed`; a weapon change; the
  quick flick's help (the angle, the reach, the seam); and that each caller
  is wired and nothing is drawn.
- `node tools/qa/mp/run.mjs manualcombat` (`mp-manualcombat.mjs`), a phone and
  a computer in the Wheel, then a second phone with `?manual=2`, 38 checks: holding fires nothing; the lift is one
  arrow the way the thumb pointed; a quick flick; a tap and a nudge; the
  cancel; a flick too soon and one kept; the special arms and is the next
  attack; a chosen lock does not last; a sword's tap, stroke, stroke back,
  stroke once ready, drift, and a stroke off the disc; a computer's click,
  held button, second click, right click, and a sword's click; the slingshot
  bow pulled and held (nothing shot, the aim already the other way),
  released, pulled off the disc, cancelled, and a sword still a stroke. The times that
  matter are held by the clock in one task: this box's timers run late.
- Not reached by the phone test: a flick with no line at all (in the town the
  bow's sight is always on something), so "a flick is always an arrow" and
  "the special stays armed with no line" are held by the rule test's reading
  of the loop only.
