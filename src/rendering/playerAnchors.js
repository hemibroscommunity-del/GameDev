/**
 * Per-frame hand anchors + weapon grip points for the Pixi renderer.
 *
 * Mirrors the data the Canvas 2D path fetches at BroTown.jsx ~1367/1375.
 * Loaded once at startup, exposed via getAnchor / getWeaponHandle so
 * entityRenderer can pin a weapon sprite to the actual hand pixel
 * each frame instead of a rough hardcoded offset.
 *
 * Anchor file shape:
 *   { 'jog-east': [[x, y], [x, y], ...], 'stand-east': [[x, y]], ... }
 *   Coordinates are in 64×64 source-sprite space.  Per-direction frame
 *   counts vary (24 / 25 / 31 / 32 / 34); requesting an out-of-range
 *   frame clamps to the last available anchor.
 *
 * Handle file shape:
 *   { sword: [hx, hy], bow: [hx, hy], staff: [hx, hy] }
 *   Coordinates are in the weapon icon's own pixel space (typically
 *   64×64).  Used as the grip pivot — Pixi's Sprite.anchor lets us
 *   express this directly as anchor.set(hx/srcW, hy/srcH).
 *
 * Frame keys map to playerSprites.js dirs: east / north / northeast /
 * south / southwest.  Mirrored facings (W = mirrored E, NW = mirrored NE,
 * SE = mirrored SW) reuse the same anchor with x flipped:
 *   ax = mirror ? (64 - anchor[0]) : anchor[0]
 */

const ANCHORS_URL = '/sprites/player/anchors.json?v=2';
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
 *  pose+dir or no data loaded yet.  Frame index clamped to list length. */
export function getAnchor(pose, dir, frame) {
  if (!anchors) return null;
  const list = anchors[pose + '-' + dir];
  if (!list || list.length === 0) return null;
  const idx = Math.min(frame, list.length - 1);
  const a = list[idx];
  return (a && a.length === 2) ? a : null;
}

/** Returns [hx, hy] in the weapon icon's own pixel space, or null. */
export function getWeaponHandle(type) {
  if (!weaponHandles) return null;
  return weaponHandles[type] || null;
}
