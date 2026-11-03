# More than one design on a canvas, and Copy (v2.3.4157)

Owner, 2026-11: *"Also not a super big deal but I'd like to be able to place
more than one design on the character during character creator I wasn't able to
put two flames on the pants it would erase the previous one when I tried to add
another one. Also a copy button (for selected design) would be great"*.

## What was wrong

The stored look was never the limit. Every canvas (shirt front and back, pants
front and back, the five skin canvases) is ONE 256-character string
(`src/rendering/traits/playerArt.js`); that string is what is saved, sent to
the worker, kept in the character's record and drawn in the world. The editor
keeps it as a list of ops (`artOps.js`, v2.3.1967, editor-only, in
`bt-artops`), and since v2.3.2455 a placed design is ONE op with its own box.
Two flames are therefore just two ops that replay to one string.

The PANEL was the limit: `applyDesign` (PlayerPaint.jsx, v2.3.2444) replaced the
whole op list with the new design, on the reasoning "Replacing is what 'choose a
design' plainly means" -- written when a design was merged into pixels. So the
second flame erased the first. A second tap on the same design was also
deliberately a no-op (v2.3.2445).

**Case: flattened into pixels.** No change to the wire, the worker, the stored
record, a cap, a kill switch, a look key or memory: the world shows whatever the
editor's ops replay to, as it always did.

## What it does now

- **Picking a design ADDS it** on top of the list (`appendToDoc`, so the
  MAX_OPS collapse rule holds), held and selected, with the Select tool armed.
  One undo entry; Undo takes away only the new one. Whatever was held is placed
  first, not dropped.
- **The same design twice** would land invisibly on the first while that one is
  still where it landed, so it steps two cells aside (`copyOfOp`).
- **Copy** (the Select row, beside Place; for a design, a shape or a letter):
  the copy lands `COPY_STEP` = 2 cells away in the direction that keeps most of
  it on the grid (down-right first), never on a spot an identical op already
  holds, on top of the list, held (`isNew`, so Cancel takes it away). Each
  candidate passes `sanitizeOp`, so a copy can never be an op the next load
  refuses. A freehand stroke or a fill has no box and no Copy.
- **Delete** (the layer row's fifth button): takes off just the held piece. One
  undo entry, reusing the one a pick-up already banked.
- **Recolour a design**: a palette tap on a held design swaps its MAIN colour,
  the one it uses most apart from the near-black outline (index 1); an
  all-outline design swaps that. It used to set an `i` replay never read: a
  dead tap of Undo.

## Layout

The Select row grows a column (Copy) and the layer row a fifth button
(Delete). The panel is shrink-to-fit, and a grid of N equal tracks asks for N
times its widest label, so the held row's four buttons beside Mirror asked for
more width than the rest of the panel: picking a design up widened the panel
(398 -> 415 px at 1000x780, 371 -> 382 at 390x844) and slid the drawing under
the finger holding it, which `mp-shapelayer`'s "does not resize the panel"
caught. `.bt-paint-opts-main` now has `width:0` (it fills what the panel gives
it and asks for nothing), and its tracks are `minmax(0, 1fr)`, so "Keep shape"
wraps onto two lines instead. Measured after: the panel's box is the same
before and after a pick-up at all three sizes, as on main.

## Old looks

Nothing stored changed shape. An old one-design op list loads as it is (the
design stays selectable) and takes a second design on top; a flat drawing with
no op list (any look restored from the worker) becomes the base, as before.

## Tests

- `node tools/qa/mp/run.mjs manydesigns` (world: 'wheel', a phone): two flames on
  the pants, both kept and both separately pickable; Copy makes an identical
  one; Undo/Redo; recolour and Delete; the bro wears both in BroTown (the
  world's bake input `__btArtForFacing`, and flame red on him against a plain
  control on the same spot); after a reload; on a SECOND phone with the same
  Login Key, from his record (saved); an old one-design look.
  `H.figureBox` alone frames only his head and shirt in the Wheel at this zoom
  (the flames sat below its bottom edge), so the read widens it by its own
  scale and lets the control take the ground back out.
- `mp-designs`: its "re-applying changes nothing" check now asserts the
  opposite (a second design is added; one Undo takes only it).
- UI review: `creator-paint-designs` (two flames, the second held).
