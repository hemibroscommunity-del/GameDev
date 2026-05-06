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
 * Both shapes are accepted.  Coordinates are in 64×64 source-sprite
 * space.  Per-direction frame counts vary (24 / 25 / 31 / 32 / 34);
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

const ANCHORS_URL = '/sprites/player/anchors.json?v=3';
const HANDLES_URL = '/sprites/weapons/handles.json?v=2';

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

/** Returns [x, y] in 64×64 sprite space, or null if no anchor for this
 *  pose+dir or no data loaded yet.  Frame index clamped to list length.
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
  // Legacy shape: bare [x, y] — treat as right hand only.
  if (Array.isArray(entry)) return entry.length === 2 ? entry : null;
  // New shape: { r: [x,y], l: [x,y] }.
  if (typeof entry === 'object') {
    if (mirror && entry.l && entry.l.length === 2) return entry.l;
    if (entry.r && entry.r.length === 2) return entry.r;
    if (mirror && entry.r && entry.r.length === 2) return entry.r;
  }
  return null;
}

/** Returns [hx, hy] in the weapon icon's own pixel space, or null. */
export function getWeaponHandle(type) {
  if (!weaponHandles) return null;
  return weaponHandles[type] || null;
}
