/**
 * Per-frame hand anchors + weapon grip points for the Pixi renderer.
 *
 * Mirrors the data the Canvas 2D path fetches at BroTown.jsx ~1367/1375.
 * Loaded once at startup, exposed via getAnchor / getWeaponHandle so
 * entityRenderer can pin a weapon sprite to the actual hand pixel
 * each frame instead of a rough hardcoded offset.
 *
 * Anchor file shape (current — dual-hand):
 *   { 'jog-east': [{ "r": [x,y], "l": [x,y] }, ...], ... }
 *
 * Anchor file shape (legacy — right-hand only):
 *   { 'jog-east': [[x, y], [x, y], ...], ... }
 *
 * Both shapes are accepted.  Coordinates in the JSON are stored in
 * 64×64 sprite space (legacy).  v2.3.163 bumped player sheets to
 * 128×128 per frame; rather than re-key every entry in the JSON, the
 * getAnchor function multiplies by ANCHOR_SCALE on return so the
 * caller sees coords in the current 128-px space.
 * Per-direction frame counts vary (24 / 25 / 31 / 32 / 34);
 * requesting an out-of-range frame clamps to the last available entry.
 *
 * Why two hands per frame: with a single anchor, mirroring a sprite
 * horizontally to render the opposite direction (W from E, NW from NE,
 * SE from SW) makes the same pixel data appear on the opposite screen
 * side — which the viewer reads as the wrong hand.  Storing the LEFT
 * hand on the unmirrored sheet lets the renderer pick the left anchor
 * for mirrored facings; after the mirror flip it lands on the visual
 * right-hand side of the mirrored character.  For unmirrored facings
 * the right anchor is used as before.
 *
 * Handle file shape:
 *   { sword: [hx, hy], bow: [hx, hy], staff: [hx, hy] }
 *   Coordinates are in the weapon icon's own pixel space (typically
 *   64×64).  Used as the grip pivot — Pixi's Sprite.anchor lets us
 *   express this directly as anchor.set(hx/srcW, hy/srcH).
 */

const ANCHORS_URL = '/sprites/player/anchors.json?v=12';
const HANDLES_URL = '/sprites/weapons/handles.json?v=5';

/* v2.3.174: session-2 sprite pipeline shipped 256-px frames and the
   per-direction size bumps meant the old 64-px anchor JSON no longer
   tracks the new hand positions even after the 4x scale-up. The
   anchor.html tool was bumped to FRAME_W=256 so it now writes coords
   directly in 256-px space -- no multiplication needed here. Any
   legacy 64-px JSON that hasn't been replaced will misalign by 4x
   until re-annotated. */
const ANCHOR_SCALE = 1;

let anchors = null;
let weaponHandles = null;
let loadPromise = null;

export function loadPlayerAnchors() {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.allSettled([
    fetch(ANCHORS_URL).then(r => r.ok ? r.json() : null).then(j => { if (j) anchors = j; }),
    fetch(HANDLES_URL).then(r => r.ok ? r.json() : null).then(j => { if (j) weaponHandles = j; }),
  ]);
  return loadPromise;
}

/** Returns [x, y] in CURRENT sprite-frame space (128×128 as of
 *  v2.3.163), or null if no anchor for this pose+dir or no data
 *  loaded yet.  Frame index clamped to list length.
 *
 *  JSON values are stored in legacy 64×64 space; this function
 *  multiplies by ANCHOR_SCALE on return so callers always work in
 *  the current sheet's coordinate space.
 *
 *  When `mirror` is true, returns the LEFT hand position (which after
 *  the body's mirrored render lands on the visual right-hand side).
 *  Falls back to the right hand if no left data is present (legacy
 *  single-anchor shape).  When `mirror` is false (or omitted), always
 *  returns the right hand. */
export function getAnchor(pose, dir, frame, mirror) {
  if (!anchors) return null;
  const list = anchors[pose + '-' + dir];
  if (!list || list.length === 0) return null;
  const idx = Math.min(frame, list.length - 1);
  const entry = list[idx];
  if (!entry) return null;
  let raw = null;
  // Legacy shape: bare [x, y] — treat as right hand only.
  if (Array.isArray(entry)) {
    raw = entry.length === 2 ? entry : null;
  } else if (typeof entry === 'object') {
    // New shape: { r: [x,y], l: [x,y] }.
    if (mirror && entry.l && entry.l.length === 2) raw = entry.l;
    else if (entry.r && entry.r.length === 2) raw = entry.r;
    else if (mirror && entry.r && entry.r.length === 2) raw = entry.r;
  }
  if (!raw) return null;
  return [raw[0] * ANCHOR_SCALE, raw[1] * ANCHOR_SCALE];
}

/** Returns [hx, hy] in the weapon icon's own pixel space, or null.
 *  v2.3.172: optional gearBase picks a tier-specific grip when one is
 *  registered (e.g. sword:wood). Falls back to the bare-type entry. */
export function getWeaponHandle(type, gearBase) {
  if (!weaponHandles) return null;
  if (gearBase) {
    const variantKey = `${type}:${gearBase}`;
    if (weaponHandles[variantKey]) return weaponHandles[variantKey];
  }
  return weaponHandles[type] || null;
}
