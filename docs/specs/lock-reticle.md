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
  The automatic lock keeps the chip alone. The brackets say "you picked this
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
5. a sword's automatic lock: no brackets;
6. no page errors.
