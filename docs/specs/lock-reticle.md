# The lock you chose wears a reticle (v2.3.3876)

The owner, playtesting on a computer: *"Show some kind of lock on reticle if
you double click a monster to lock on. Right now it's unclear that your aim is
locked on to a monster."*

## What it is

- Every monster lock already wears the orange chip over its head (the owner's
  own pick, v2.3.2295, which replaced an older ground reticle). That includes
  the AUTOMATIC lock a sword takes on the nearest monster, so a double-click
  lock looked no different from no choice at all.
- A lock you **chose** (a click, a double click or a tap: `src: 'tap'`) now also
  wears **four orange corner brackets round the monster's body**, following it.
  The automatic lock keeps the chip alone (v2.3.3973: but see below, a monster
  in your melee reach wears the reticle softer). The brackets say "you picked this
  one".
- Phones get it too: a tap on a monster is the same chosen lock.
- It goes when the lock does: the monster dies, a click on empty ground lets it
  go, another lock replaces it, or the zone changes.

## How it is drawn (TRAPS §218)

`src/rendering/lockReticle.js`, owned by `effectsRenderer` on the
`overlayWorld` layer:

- four small Graphics, each an L drawn **once** and mirrored by its scale;
- a frame only **moves** them (positions);
- `visible` flips only when a chosen lock starts or ends;
- the L's are redrawn only if the world's zoom changes, because their line is
  sized in screen pixels;
- destroyed with the renderer.

The box comes from the same shared body table (`monsterBodyOffsetY`,
`bossSizeK`) that the chip, the aim and the hit test read, so a boss gets a
bigger box. QA probe: `window.__btLockReticle()` gives `{shown, id, cx, cy,
hw, hh}`.

## Test

`mp-lockreticle` (a computer, the wide layout, at Frost Ridge, with the real
mouse):

1. nothing locked: no reticle;
2. a double click on a snowman: the brackets stand round it;
3. a second and a half later they are still on it;
4. a click on empty ground: the lock and the brackets are gone;
2b. (v2.3.3973) the lock's lines are thin (1 px, a 0.5 px rim), roomier, and
   grow and shrink by their scale;
5. (v2.3.3973) a sword in hand and no lock chosen: walked up to a snowman, the
   softer reticle stands on it once it is inside your melee reach, and walked
   away it goes (was: "a sword's automatic lock: no brackets");
6. no page errors.

UI review: the `lock-reticle` screen (Fighting).

## v2.3.3973: thin, pulsing, and when a monster is in reach

The owner: *"Thin the reticle when you lock on target so it's just a thin
larger line that grows and shrinks while on target. Right now it's tighter and
has a thick border. Whenever a monster first comes in range for melee attack
this same reticle should appear too. It'll help you to know when you're within
distance for the first melee attack."*

- **Thin and roomier.** The line is 1 CSS px (was 2.2) with a faint 0.5 px
  dark rim each side (was 1.6 px at 0.8), so it still reads on snow and sand;
  the arms 14 px (were 11); the box 15% bigger round the body (`BOX`).
- **It pulses.** The whole reticle grows and shrinks by ±7% every 1.4 s
  (`PULSE_AMP`, `PULSE_MS`), by its root container's SCALE: the corners sit
  round the root's origin, the root on the body centre, so a frame moves and
  scales and never redraws (TRAPS §218).
- **In reach.** With a melee weapon in hand (not a bow or a staff) and no lock
  you chose, the nearest live monster inside your melee reach wears the same
  reticle at 60% (`REACH_ALPHA`), for as long as it is in reach. The reach is
  the reach ring's own sum in `effectsRenderer` (your reach × your depth + its
  hit radius × its depth and a boss's size, measured to its body centre), never
  the server's lenient `PVE_MELEE_RANGE`. `nearestInMeleeReach` in
  `lockReticle.js` picks it. A lock you chose always wins.
- The probe adds `mode` (`'lock'` or `'reach'`), `scale`, `alpha`, `line` and
  `rim`; `hw`/`hh` are the drawn box.
