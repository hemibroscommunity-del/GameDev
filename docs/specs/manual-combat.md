# Manual combat: an attack is made by your hand, never a timer (v2.3.4357)

> The owner, 2026-11-09: *"I want to make the system more manual. I think only
> making an attack after manual input is better than auto-attacking at
> precisely the correct interval. So maybe for bow and magic the system becomes
> a timing game where the right joystick is held at a certain direction and
> there's some kind of visual cue of build-up happening (like a bow icon on the
> right joystick button with a bow string that gets progressively pulled back
> more until it lights up at full draw). ... the timing of the attack is based
> on when you release. Special attacks now require you to tap the special
> attack button prior to buildup of the next attack and upon release the
> special attack is active for that attack. Remove the tap to target system
> for now. ... For melee, keep the invisible targeting system where it
> automatically faces the closest monster ... the sword will be an icon on the
> button and need to build up before you tap the button to attack."*
>
> And his answers the same day: *"I want the timer to reset if the user lets go
> of the held direction. The exception to this is melee."* *"Hold as long as you
> like."* *"Tapping early does nothing. You need to tap once it's ready."* *"Yes
> for computer controls."* *"Yes duels lose tap lock."* *"Don't do any monster
> adjustments."* *"Just keep in mind magic uses your finger to control the
> projectile once launched so none of the new controls should interfere with
> that."*

## The switch

**It is OFF unless you turn it on.** Add `?manual=1` to the game's address:
that phone or computer plays manual combat from then on (it is remembered in
`localStorage` under `bt_manual`). `?manual=0` turns it off again. Without it
combat is exactly as it was: every change below sits behind `manualOn()`.

It is the phone's side only. The worker is not changed (see "The server").

## What a player does

### The bow and the staff: draw, then let go

- **Hold** the right stick toward what you want to hit (anywhere on the right
  half of the screen, or the attack disc). On a computer, hold the mouse
  button. The build-up starts the moment the thumb is down.
- **It is full** after the weapon's own attack interval: the same number the
  held attack used to fire on (a staff's includes its 300 ms).
- **Let go at full**: one shot, at once, the way the thumb last pointed (on a
  computer, at the cursor).
- **Turning the aim never resets the draw.**
- **Hold as long as you like**: a full draw stays full.
- **Let go before it is full**: nothing is fired and the draw is lost. The
  next press starts from nothing.
- **A slip is not letting go**: a thumb back on the glass within a tenth of a
  second (`MANUAL.SLIP_MS` 100) carries on with the same draw.
- **Cancel**: bring the thumb back to where it first touched (inside the
  stick's 8 px dead zone) and lift. No shot. Touch stick only: the disc and a
  computer have no cancel yet.
- **The staff's bolt is still steered by your thumb** once it is launched,
  exactly as before: `projectiles.js` reads `S._aiming` / `S._aimAngle`, and
  manual combat writes neither. Lift to launch, touch again to steer; the next
  draw builds under that same thumb.
- The bow keeps its old rule that it looses only when its sight is on
  something (`docs/specs/bow-sight-gate.md`).

### The sword: it builds by itself, then a tap

- There is no hold. After each swing the sword builds up by itself over its
  own interval.
- **A tap once it is ready swings.** A tap on the right half of the screen or
  on the disc; a click on a computer.
- **A tap before it is ready does nothing.** It is not kept for later.
- A held thumb is one tap: nothing swings by itself, ever.
- The sword still turns to the nearest monster by itself (the automatic lock,
  `src: 'auto'`, in `targeting.js`).

### Specials: arm, then attack

- The special's button **arms** the special for the next attack. Press it
  again to disarm. It can be pressed before the build-up or part-way through.
- It wants enough mana to arm.
- The next attack made (the lift at full, the sword's tap) **is** the special,
  and the button is armed no longer.
- The button is always there in manual combat (it used to hide out of
  combat), and reads **ON** while armed.
- On a computer the right click arms and disarms.
- A flick of the stick no longer makes a special.

### No tap to target

- Tapping or clicking a monster locks nothing, for any weapon.
- A duel's lock is dropped too.
- Any lock a player chose is removed every frame (`mcLockAllowed`); only the
  sword's own automatic lock is kept.

## The build-up you can see (`src/ui/panels/ManualGauge.jsx`)

> The owner, on the first cut (the gauge on the attack button): *"Needs
> improvement. The thumb covers the indicator and the indicator itself is too
> subtle. Same for bow and staff."*

It is **round the character**, not on the button. A thumb is on the button for
the whole of a draw, so nothing on or near it can be the cue, and the eyes are
on the bro and what he is fighting.

- **A ring round the bro**, 112 px across, fills clockwise with the build-up:
  a thick cream band on a wider dark one while it builds (it reads on sand,
  grass and snow).
- **At full it lights up**: the band turns bright yellow, a wide soft band
  breathes behind it, and one ring bursts outward at the moment it fills.
- **A badge under his feet**, 44 px, the weapon in hand:
  - the **bow**, whose string is pulled back as the draw fills, an arrow on it;
  - the **staff's orb**, which swells;
  - the **sword**, which fills from its hilt to its point.

  It grows a little and takes a gold rim at full.
- **A small star** beside the badge while a special is armed.
- It is drawn only while there is something to say: a draw under way, a sword
  not yet ready and for 1.5 s after it is, a special armed. At rest nothing is
  drawn.
- The same on a phone and on a computer.
- A phone that can buzz (Android) ticks once at full. An iPhone cannot: Safari
  has no vibration.
- It is one SVG drawn in code: no picture loaded, no memory kept. It takes no
  touch. Its own animation frame writes one transform on its own box and an
  attribute only when a value changes; no React render after the first, no CSS
  filter. The breathing band and the burst are opacity and transform
  (`game.css` `.bt-mc-halo`, `.bt-mc-pop`), still under
  `prefers-reduced-motion`.
- It sits in its own `position: fixed; inset: 0` layer and is placed with
  `fixedBox(layer)`: on a computer the game's box is not the window's.

## How it is built

| file | what |
|---|---|
| `src/game/manualCombat.js` | The rules, with no imports so node tests them: the switch, `mcPress` / `mcLift` / `mcAbort`, the slip, `mcFrame` (the loop's word each frame: this weapon's interval), `mcFireWaiting` / `mcFireDone`, `mcFrac` / `mcReady`, `mcMeleeMay`, `mcArmToggle` / `mcTakeArmed`, `mcLockAllowed`. State on `S._mc`. |
| `src/game/monsterCombat.js` | The attack gate: in manual combat the loop attacks only when a full draw was just let go (`mcFireWaiting`), never because the stick is held; the armed special is taken there. |
| `src/game/targeting.js` | Chosen locks dropped each frame; the duel lock not kept. |
| `src/ui/BroTown.jsx` | The right stick, the disc and the mouse call the rules; `mcMeleeTap` (the sword's tap); no lock on a tap, a click or a double click. |
| `src/ui/panels/SpecialButton.jsx` | Arms and disarms; "ON". |
| `src/ui/panels/ManualGauge.jsx` | The ring round the bro, the badge, the star. |

## The server

Not changed. It already drops a hit that comes sooner than its floors
(`combat.js`, `hitproof.js`), and a draw can only space a player's shots
further apart than the held attack did. So this needs no cap and no kill
switch: the switch is the address.

## Not built

- **Reading attack timing on the server to find bots** (the owner: *"The
  timing intervals for manual human attacks will give a good fingerprint to
  identify bots"*). That is a worker change of its own.
- **Making it the default.** Today's combat stays until the owner says.
- A cancel on the disc or on a computer.
- A sound at full draw. It would be the strongest cue of all (the eyes are
  on the monster), and needs a new sound and its Sound Studio label.
- A teaching card for the new controls; the combat tips still describe the
  old ones.
- No monster was changed (the owner: *"Don't do any monster adjustments"*).
- Not tried: a duel between two players in manual combat (the lock is
  dropped; how the fight feels without it is the owner's to judge).

## Tests

- `server/test/manual-combat.test.mjs`: the switch (on, remembered, off); a
  draw to full and its one shot; an early lift loses the draw; the slip;
  cancel; hold as long as you like; a weapon change mid-draw; the sword's
  early tap; arming; `mcLockAllowed`; and that each caller is wired.
- `node tools/qa/mp/run.mjs manualcombat` (`mp-manualcombat.mjs`), a phone and
  a computer in the Wheel, 27 checks: holding fires nothing; nothing drawn at
  rest; the ring fills and lights round the bro, 100 px or more across, its
  band 7 px or more thick, clear of the attack disc; one arrow on the lift at
  full; none on an early lift; the slip; cancel; the special arms and is the
  next shot; a chosen lock does not last; the sword's ready tap, early tap,
  held thumb; the mouse held and released; the ring round the bro on a
  computer; the right click arms.
- Pictures: `docs/shots/manual-combat-{full-draw,armed,sword,computer}.webp`.
