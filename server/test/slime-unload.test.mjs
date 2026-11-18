/* ═══ v2.3.6041: THE SLIME'S UNLOAD LETS THE STRIPS GO AND KEEPS THE SINGLES (card V6 PR 2, TRAPS §49) ═══
 *
 * TRAPS §49: an unload and its module's state are checked against each other
 * as a list.  slimeSprites.js's unload (unloadSlimeSprites, v2.3.5256) lets
 * the four walking strips go when no slime is near; the splat, the orb and the
 * hit's still are loaded once behind the first loading screen and kept for
 * the page's life (`singlesPromise`, `_stillSet`: each declared `kept:`, which
 * tools/guards/traps-phone-memory.test.mjs reads).  This runs the real module
 * in node (pixi.js and the strip door stood in for) and holds both halves:
 *   1. the singles load once: the splat and the orb have their frame, the
 *      hit's still is in;
 *   2. the strips load through the strip door, into the 'slime' bundle;
 *   3. the unload empties the four strips and lets the 'slime' bundle go,
 *      and leaves the splat, the orb and the still as they were;
 *   4. after it the singles are not asked for again (the same promise, no
 *      new load), and the still is the same picture;
 *   5. a load after the unload fills the strips again, the same count, never
 *      stacked on what went (§49's 16 frames for 8).
 * Break proofs (2026-11-18, each tried in a scratch copy, then undone):
 *   `singlesPromise = null;` in unloadSlimeSprites          -> FAIL 4 (asked again)
 *   `SHEETS.remnants.frames = [];` in unloadSlimeSprites    -> FAIL 3 (the splat gone)
 *   the strips' `frames = []` gone from unloadSlimeSprites  -> FAIL 3 (the strips kept)
 */
import { register } from 'node:module';

/* Server CI installs only server/'s packages: pixi.js is stood in for, and
   the strip door (zoneTextures.js) and the picture keeper (picsOnce.js) are
   the test's own, so what the module asks of them is counted */
const PIXI_STUB = `
export class Rectangle { constructor(x, y, w, h) { Object.assign(this, { x, y, w, h }); } }
export class Texture {
  constructor(o) { this.source = (o && o.source) || {}; this.frame = o && o.frame; }
  static from(b) { const t = new Texture({ source: { bitmap: b } }); return t; }
}
export const Assets = { load: async (url) => { globalThis.__slimeT.assets.push(url); return { source: { width: 128, url } }; } };
export const Cache = { has: () => false, remove: () => {} };
`;
const ZONE_STUB = `
export async function loadTrackedStrip(bundle, url, w, h) {
  globalThis.__slimeT.strips.push(bundle + ' ' + url);
  return Array.from({ length: 8 }, (_, i) => ({ url, i, alive: true }));
}
export async function unloadBundle(b) { globalThis.__slimeT.unloads.push(b); return 0; }
`;
const PICS_STUB = 'export function keepPageCopy() {}';
globalThis.__slimeT = { assets: [], strips: [], unloads: [], fetches: [] };
register('data:text/javascript,' + encodeURIComponent(
  `const stub = (src) => ({ url: 'data:text/javascript,' + encodeURIComponent(src), shortCircuit: true });
   export async function resolve(s, c, next) {
     if (s === 'pixi.js') return stub(${JSON.stringify(PIXI_STUB)});
     if (c.parentURL && c.parentURL.endsWith('/slimeSprites.js')) {
       if (s === './zoneTextures.js') return stub(${JSON.stringify(ZONE_STUB)});
       if (s === './picsOnce.js') return stub(${JSON.stringify(PICS_STUB)});
     }
     return next(s, c);
   }`));
globalThis.fetch = async (url) => { globalThis.__slimeT.fetches.push(String(url)); return { ok: true, blob: async () => ({}) }; };
globalThis.createImageBitmap = async () => ({ bitmap: true });

const M = await import('../../src/rendering/slimeSprites.js');
const T = globalThis.__slimeT;

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const STRIPS = ['idle', 'shoot', 'hit', 'death'];
const counts = () => Object.fromEntries(['idle', 'shoot', 'hit', 'death', 'remnants', 'projectile'].map((k) => [k, M.frameCount(k)]));

check('0: the walking road is the default (guard)', M.SLIME_WALK === true);

/* 1. the singles, once */
const p1 = M.loadSlimeSingles();
await p1;
const still1 = M.getHitStill();
check('1: the singles load once: the splat and the orb have their frame, the hit\'s still is in',
  M.frameCount('remnants') === 1 && M.frameCount('projectile') === 1 && !!still1 && T.assets.length === 2 && T.fetches.length === 1,
  { counts: counts(), assets: T.assets, fetches: T.fetches });

/* 2. the strips, through the strip door */
await M.loadSlimeSprites();
const firstCount = M.frameCount('idle');
check('2: the strips load through the strip door into the \'slime\' bundle',
  STRIPS.every((k) => M.frameCount(k) === 8) && T.strips.length === 4 && T.strips.every((x) => x.startsWith('slime ')), { counts: counts(), strips: T.strips });

/* 3. the unload */
const splat = M.getFrame('remnants', 0), orb = M.getFrame('projectile', 0);
await M.unloadSlimeSprites();
check('3: the unload empties the four strips and lets the \'slime\' bundle go',
  STRIPS.every((k) => M.frameCount(k) === 0 && M.getFrame(k, 0) === null) && T.unloads.join() === 'slime', { counts: counts(), unloads: T.unloads });
check('3: ...and leaves the splat, the orb and the still as they were',
  M.getFrame('remnants', 0) === splat && M.getFrame('projectile', 0) === orb && M.getHitStill() === still1, counts());

/* 4. the singles are kept, not asked again */
const assetsBefore = T.assets.length, fetchesBefore = T.fetches.length;
const p2 = M.loadSlimeSingles();
await p2;
check('4: after the unload the singles are not asked for again (the same promise, no new load), the still the same picture',
  p2 === p1 && T.assets.length === assetsBefore && T.fetches.length === fetchesBefore && M.getHitStill() === still1,
  { same: p2 === p1, assets: T.assets.length - assetsBefore, fetches: T.fetches.length - fetchesBefore });

/* 5. back again: the strips refill, never stacked */
await M.loadSlimeSprites();
check('5: a load after the unload fills the strips again, the same count (never stacked on what went)',
  STRIPS.every((k) => M.frameCount(k) === firstCount) && T.strips.length === 8, { counts: counts(), strips: T.strips.length });

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
