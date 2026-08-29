# Quest path guide, and the World View glass — v2.3.2141

Two pieces of on-the-ground guidance, changed in one pass because the owner
asked about both in the same breath and they answer the same question: *where
am I, and which way do I go?*

Prior art this builds on, all still true unless contradicted below:
`questRoute.js` (v2.3.1817, which portal the quest wants), the road itself
(v2.3.2121), the World View magnifier (v2.3.2124) and its stray-arc fix
(v2.3.2137).

---

## 1. The path guide can be turned off, and it has a shape

> Owner: "Add an option to turn off the path guide for the quest. Also explore
> different options than the bead snake (effective path but beads a little
> strange)."

### One setting, four values

`Settings → Quest path`: **Arrows · Ribbon · Beads · Off**.

Off is a *value of the picker*, not a separate toggle beside it. A player who
wants the guide gone and a player who wants it different are reaching for the
same control, and splitting them into two rows makes both harder to find.

| Value | What it draws | Spacing |
|---|---|---|
| **Arrows** *(default)* | Chevrons rotated to the leg they sit on | 1.3 tiles |
| **Ribbon** | One tapering line, round-capped into a continuous road | 0.28 tiles (a sampling rate, not a gap) |
| **Beads** | The v2.3.2121 row of gold motes, unchanged | 0.9 tiles |
| **Off** | Nothing | — |

### Why the default moved off Beads

Changing a default changes it for everyone who never opens Settings, so it
needs a better reason than taste. A chevron carries the one thing the feature
exists to deliver — a **direction** — in its shape, at a glance, with nothing
to compare against and no animation to wait for. A dot carries none: a row of
dots reads identically from either end, so "which way along it" came only from
the travelling shimmer, and a player who glances once never sees a shimmer
travel. Beads remain one tap away.

### What Off does and does not silence

Off returns from `_drawQuestTrail` **before the route is walked** — no work,
not invisible work.

It does **not** gate the gold quest-exit beam (v2.3.2121). That is the
portal's own colour and the minimap star's answer rendered in the world; the
owner asked to be rid of "the path guide", which is the thing drawn on the
ground under your feet.

### Where the value lives

`src/game/questTrailStyle.js`, cached in a module variable and written only by
the setter. `_drawQuestTrail` runs every frame, and `localStorage.getItem` is a
synchronous main-thread call — 60 a second, forever, on iPhone Safari, for a
value that changes when somebody taps a settings row. Same shape and same
reason as `chatChannel.js` (v2.3.2139).

An unknown id is refused rather than stored: a bad value that reached storage
would come back on every future load and the renderer would have to defend
against it forever.

### Drawing notes worth keeping

- **The walk is shared, the shape is not.** Sampling the polyline — which leg,
  how far along it, which way it points — is identical for every style and is
  the part that goes subtly wrong (motes bunching on a corner). It happens
  once; each style is only a shape. `u`, the unit direction of the leg, is what
  a chevron needs and what a bead never had.
- **Three passes, not three-per-mark.** Every backing first, then every face.
  One pass per mark lets the *next* mark's ink land on the previous mark's
  gold wherever they overlap on a tight corner — a gap chewed out of the road
  for arrows, a scalloped edge for the ribbon.
- **The ink is heavier for strokes than for discs.** Town's ground is painted
  gold cobble, which is why the beads carry an ink ring at all. A disc's
  backing is a whole ring around it; a stroke's is two pixels either side. The
  first cut of the chevrons reused the beads' alphas and photographed as pale
  scratches. Ink went 0.45 → 0.85, the face to full, and the chevrons grew
  from 0.34 to 0.45 tiles (the world renders at 1/1.5, so a third of a tile is
  about seven screen pixels).

---

## 2. The World View: tiny again, centred in the glass

> Owner: "Change the character back to tiny on worldview and center them
> inside the magnifying glass (that'll be enough)."

v2.3.2124 read "the character is too small on the World View" as *make him
bigger*, and took the local player off the vista's perspective curve with
`playerLens.scale = 0.9`. That reads as a character who forgot to shrink, and
it flattens the depth at the one spot your eye is always on.

The finding underneath was still right, and so is what is left of it: what you
need on the World View is to **know where you are**, and a ring does that
without touching the depth.

- `playerLens.scale` is **gone**. Your figure takes the same `_zonePscale` as
  every peer — 0.69 of full size at the plateau, 0.12 out toward the rim.
- The **ring stays full size** (~120px across) around a speck. That is what a
  magnifier held over a map looks like, and it is what keeps you findable at
  the rim where the curve takes the figure to 3%.
- `playerLens.cy` became **`cyUnits`**, multiplied by the figure's live render
  scale. A constant pixel lift is only ever right at one figure size; the same
  -26 over a 14px speck hangs the glass a whole body above it.

`cyUnits = -45` is derived, not eyeballed: the body cell is 256px tall with the
figure in rows 23..223, so its visual middle is 100 cell-px above the feet —
0.39 of the cell — and the drawn body measures 114.6 container units.
0.39 × 114.6 = 44.8. The old -26 landed a quarter of the way up the figure.

`entityRenderer` publishes `S._figureScaleY` for this. Published rather than
imported: tileRenderer importing entityRenderer closes a cycle, and copying
`PLAYER_SIZE_MULT` plus the build scale into the other file is the exact drift
the v2.3.1574 `zonePlayerScale` extraction was made to end. Read a frame late
at worst, which at 3% per step is invisible; missing falls back to 1.

---

## Testing

`tools/qa/mp/mp-pathstyle.mjs` — 17 assertions, two real browsers against a
real worker.

The load-bearing one is **"Off draws nothing while the route is still there"**.
"Nothing was drawn" and "the road had nowhere to point" look identical from
outside and only one of them is the feature working, so `__btQuestRoad` reports
`to` *before* the off switch is consulted and the scenario holds both halves at
once. Without that ordering an off switch would pass just as well in a town
where the quest system was broken.

The styles are separated by **mark count over the same road** (arrows 5, beads
7, ribbon 20) — same path, same falloff, different spacing, so a style that
renamed itself without changing the drawing reports identical counts. The
Settings row is driven through the real panel, including the 44pt touch floor
on its chips, because a preference with no control on it is a preference nobody
has.

`tools/qa/mp/mp-wvglass.mjs` — 11 assertions, at three distances across the
vista, because the whole bug class is "correct at one size". The figure's
visual middle is derived in the scenario from the drawn body's own size and the
sheet's frame rows, **not** from the zone's `cyUnits` — otherwise it would be
the config checking itself and a wrong constant would sail through. Measured
offset: 0px at all three distances (the shipped -26 measured 15px high on the
plateau).

Both scenarios leave shots in `tools/qa/mp/out/` — one per style, and the glass
itself cropped on the ring rather than on the screen.
