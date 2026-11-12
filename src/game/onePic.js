/* ═══ v2.3.4885: ONE PICTURE PER PLAYER, STAGE 1 -- WHO, AND WHERE ═══
 *
 * Owner, 2026-11-12: "I'd rather just take the heavy work head on first" and
 * "I want to make this game ultra efficient".  Every other player on the
 * screen is a stack of ~31-43 layers (body, head, hair, hat, armour, weapon,
 * name plate...), posed, sorted and drawn every frame.  A STANDING player's
 * stack does not change from frame to frame (a stand is frame 0 until they
 * turn), so stage 1 paints it ONCE into a slot of one shared picture
 * (rendering/peerImpostor.js) and draws them as one sprite until it changes.
 *
 * Measured first (the prototype, docs/specs/crowd-lanes.md "One picture per
 * player"): the page's main-thread time a second, layered against one
 * picture, 50 players standing 982 -> 258 ms, 100 standing 1005 -> 373 (30 fps
 * back to 60); walking only 969 -> 647 (a jog changes picture ~26 times a
 * second), which is why stage 1 takes the standing ones.  The picture is the
 * figure to the pixel (0 of 160,000 differ).
 *
 * This file is the part with no Pixi in it, so node can test it
 * (server/test/one-pic.test.mjs): the switch, who becomes a picture, and the
 * whole-device-pixel arithmetic that keeps the picture exact.
 *
 * No imports.
 */

export const ONE_PIC = Object.freeze({
  /* the nearest drawn players always stay layered: they are the ones you are
     looking at, and the ones most likely to move next */
  NEAR_FULL: 10,
  /* a picture is painted again at least this often whatever the change
     signal says (a look's colour row repacked in place changes no counter
     Pixi keeps); staggered by slot so they never come all at once */
  REFRESH_MS: 10000,
  /* slots in the shared picture, and the most a frame paints (the rest wait
     their turn: a crowd arriving costs a few figures a frame, never all) */
  SLOTS: 24,
  PAINTS_A_FRAME: 4,
  /* a slot's size in CSS px (x the device's pixel ratio on the chip): a
     figure, its hat and weapon, and the name plate above it.  A figure whose
     bounds do not fit stays layered (counted in `tooBig`). */
  SLOT_CSS_W: 96,
  SLOT_CSS_H: 140,
});

/** The switch.  Stage 1 is OFF unless the address says `?onepic=1`; `?onepic=0`
    is off too (the off-ramp once it is the default). */
export function onePicFromQuery(search) {
  const m = /[?&]onepic=([01])\b/.exec(search || '');
  return !!(m && m[1] === '1');
}

/** QA: `?onepicnear=N` keeps only the nearest N layered (0 makes every calm
    player a picture), so a test with a few players can see one.  Else
    ONE_PIC.NEAR_FULL. */
export function onePicNearFromQuery(search) {
  const m = /[?&]onepicnear=(\d{1,3})\b/.exec(search || '');
  return m ? Number(m[1]) : ONE_PIC.NEAR_FULL;
}

/** Whether a drawn player's figure is calm enough to be a picture: standing,
    on foot, in no pose, effect or light that moves it on its own every frame.
    `f` is a plain record the renderer fills (no Pixi in it):
      pose, moving, held (a sit/sleep/dance pose), gathering, riding, swimming,
      masked, graded (a grade glow, whose filter is a pass of its own and,
      godly, a rainbow that moves), standIn (a swing/chop/... figure in its
      place), layerOk (in the sorted world layers, not the gesture layer),
      settling (v2.3.4885: stopped, but the drawn place still easing onto the
      real one -- a new place inside a pixel every frame, so a paint every
      frame: the first crowd measurement, 9 paints a frame and the frame
      slower; a picture is made once the figure is at rest). */
export function calmFigure(f) {
  return !!f && f.pose === 'stand' && !f.moving && !f.settling && !f.held && !f.gathering && !f.riding
    && !f.swimming && !f.masked && !f.graded && !f.standIn && !f.faded && f.layerOk !== false;
}

/** A grade glow on either piece?  The worker's `eqg` is two letters, torso then
    greaves: n normal, r rare, e elite, g godly (glint.js peerGrade). */
export function gradedWire(eqg) {
  return typeof eqg === 'string' && /[reg]/.test(eqg.slice(0, 2));
}

/** Who becomes a picture this frame.  `cands`: [{ id, d2, always, calm }] for
    every DRAWN player (d2: squared distance to you).  The nearest `nearFull`
    stay layered whatever they do; past them, a calm one that is not always
    drawn in full (your party, target, duel, whoever is fighting you) becomes
    a picture.  `cap` slots at most, nearest first, so the ones that miss out
    are the farthest.  Fills and returns `out` (a Set of ids).  Sorts `cands`
    in place. */
export function pickPictures(cands, nearFull, cap, out) {
  const keep = out || new Set();
  keep.clear();
  cands.sort((a, b) => (a.d2 - b.d2) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = nearFull; i < cands.length && keep.size < cap; i++) {
    const c = cands[i];
    if (c.calm && !c.always) keep.add(c.id);
  }
  return keep;
}

/** Where a picture goes so it lands on whole device pixels, as the figure did.
    The camera sits on whole device pixels (TRAPS §231), so where a figure
    falls inside a device pixel depends on its own place alone: `x` (world
    units) times `k` (device px a world unit).  The figure is painted into its
    slot `pad` px in, plus that same fraction; the sprite is put at the whole
    device pixel it starts on.  Returns { i, f }: the whole device pixel and
    the fraction (0 <= f < 1). */
export function deviceSplit(x, k) {
  const d = x * k;
  const i = Math.floor(d);
  let f = d - i;
  if (f < 0) f = 0;
  if (f >= 1) f = 0;
  return { i, f };
}

/** The slot grid: `n` slots of `w` x `h` device px, as many to a row as fit in
    `maxW`.  Returns { cols, rows, W, H } or null when they do not fit in
    `maxW` x `maxH` (the chip's texture limit). */
export function slotGrid(n, w, h, maxW, maxH) {
  if (!(n > 0 && w > 0 && h > 0)) return null;
  const cols = Math.max(1, Math.min(n, Math.floor(maxW / w)));
  const rows = Math.ceil(n / cols);
  const W = cols * w, H = rows * h;
  if (W > maxW || H > maxH) return null;
  return { cols, rows, W, H };
}

/** The bytes the shared picture holds on the chip (RGBA): `grid` in the
    picture's own units, `res` its resolution (texels a unit). */
export function sheetBytes(grid, res = 1) {
  return grid ? Math.round(grid.W * res) * Math.round(grid.H * res) * 4 : 0;
}
