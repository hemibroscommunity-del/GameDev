/* ═══ v2.3.2991: AN ARROW STUCK IN THE SCENE'S SLIME RIDES ITS ANIMATION ═══
 *
 * Owner: "make sure arrows stick in the monster too."  In the world a stuck
 * arrow is PINNED to a texel of the monster's art and carried frame to frame
 * with it (arrowPin.js, v2.3.2930) -- which matters on a slime above all: its
 * idle bounce moves the top of the blob 30px.  The scene's slime is a DOM
 * strip of the same sheets, stepped by CSS, so the pin is carried the same way
 * and played the same way:
 *   - the strips' pixels are read once (the URLs the scene already shows, so
 *     the browser's cache answers);
 *   - a shot flies a straight line from where it leaves (the bow's grip) to a
 *     point inside the blob, and it goes in where the world's own move puts it
 *     (pinEntry: on along the line until the art is solid, a texel and a half
 *     deeper) on the frame on screen when it lands -- the hit strip's first;
 *   - the pin is carried through every frame of every strip the slime plays
 *     with arrows in it (hit, then idle, then shoot) with the world's other
 *     move (pinCarry: the patch round it followed, snapped back onto art);
 *   - and each track becomes a CSS @keyframes of `step-end` translates, one
 *     key per frame at the same fractions the strip's own steps(N, jump-none)
 *     shows them -- so an arrow mounted with the slime's span starts with it
 *     and steps with it, with no frame loop and no drift.
 *
 * A few FIXED rows to aim at (PIN_V), not one per shot: a stuck arrow's track
 * is three strips of keyframes, and arrows on different lines read as
 * different arrows, which is the point.  Shots take them in turn, from the
 * first, on each fresh slime.
 */
import { pinEntry, pinCarry, frameDataOf } from '@/rendering/arrowPin.js';
import { SLIME, SLIME_PX } from '@/data/statDemoAssets.js';

/* the rows the shots aim at, in turn (the blob at rest spans rows ~46-86): the
   middle, below, above -- then between, so a fourth arrow does not go into
   the first one's hole */
export const PIN_V = [62, 69, 56, 66, 59];
/* the column they aim at: inside the blob, so a line in from the left meets
   its edge on the way */
const AIM_U = 60;
const STRIPS = ['hit', 'idle', 'shoot'];

let _fd = null;             /* { strip: [frame data] }, once read */
let _loading = null;
const _sets = new Map();    /* launch-point key -> its pins */

function stripFrames(url, n) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const out = [];
        for (let i = 0; i < n; i++) {
          out.push(frameDataOf(SLIME_PX, SLIME_PX, g.getImageData(i * SLIME_PX, 0, SLIME_PX, SLIME_PX).data));
        }
        resolve(out);
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Read the strips' pixels, the first time.  Resolves true once pins can be
 *  worked out, false when the strips cannot be read (the scene then lets its
 *  arrows vanish on arrival, as before, rather than float). */
export function loadSlimePins() {
  if (_fd) return Promise.resolve(true);
  if (_loading) return _loading;
  if (typeof document === 'undefined') return Promise.resolve(false);
  _loading = Promise.all(STRIPS.map((k) => stripFrames(SLIME[k].url, SLIME[k].frames))).then((all) => {
    if (all.some((f) => !f || !f.length)) { _loading = null; return false; }
    const fd = Object.create(null);
    STRIPS.forEach((k, i) => { fd[k] = all[i]; });
    _fd = fd;
    return true;
  });
  return _loading;
}

/** Whether the strips are read (the render path never waits). */
export function slimePinsReady() { return !!_fd; }

/** The pins for shots that leave from `from` -- [u, v] in the slime cell's
 *  texels, i.e. the stage point the shots leave from less the cell's corner
 *  -- or null until the strips are read.  Per aimed row: where the line from
 *  `from` to (AIM_U, row) goes in, that line's angle, and the pin carried
 *  through the strips; the keyframes go in the first time a launch point is
 *  asked for.  `ang` is the first line's, to a fiftieth of a radian -- what
 *  the film of the stuck shaft is taken at (one take; the other lines are
 *  within a few degrees of it). */
export function slimePinsFrom(from) {
  if (!_fd || !from) return null;
  const fu = Math.round(from[0]), fv = Math.round(from[1]);
  const key = (fu + 1000) + '_' + (fv + 1000);
  const had = _sets.get(key);
  if (had) return had;
  const pins = [], tracks = [];
  for (const row of PIN_V) {
    let du = AIM_U - fu, dv = row - fv;
    const dl = Math.hypot(du, dv) || 1;
    du /= dl; dv /= dl;
    /* the walk starts 40 texels short of the aim point (pinEntry looks ~45
       ahead), on the line: the edge it meets is the edge the shot meets */
    const pin = pinEntry(_fd.hit[0], AIM_U - du * 40, row - dv * 40, du, dv) || [44, row];
    pins.push({ u: pin[0], v: pin[1], ang: Math.atan2(dv, du) });
    /* lands in the hit strip; the idle that follows picks up from the hit's
       last frame, a throw from the idle's first */
    const tr = Object.create(null);
    let prev = null;
    for (const k of STRIPS) {
      const f = _fd[k];
      const t = [prev ? pinCarry(prev.f, f[0], prev.at[0], prev.at[1]) : [pin[0], pin[1]]];
      for (let i = 1; i < f.length; i++) t.push(pinCarry(f[i - 1], f[i], t[i - 1][0], t[i - 1][1]));
      tr[k] = t;
      prev = k === 'hit' ? { f: f[f.length - 1], at: t[t.length - 1] } : { f: f[0], at: t[0] };
    }
    tracks.push(tr);
  }
  injectKeyframes(key, tracks);
  const set = { key, pins, ang: Math.round(pins[0].ang * 50) / 50 };
  _sets.set(key, set);
  return set;
}

/* sdpin-<key>-<line>-<strip>: frame k's texel centre at k/N of the run */
function injectKeyframes(key, tracks) {
  if (typeof document === 'undefined') return;
  const id = 'bt-sd-pins-' + key;
  if (document.getElementById(id)) return;
  let css = '';
  tracks.forEach((tr, vi) => {
    for (const k of STRIPS) {
      const t = tr[k], n = t.length;
      css += `@keyframes sdpin-${key}-${vi}-${k}{`;
      for (let i = 0; i < n; i++) css += `${(i * 100 / n).toFixed(4)}%{transform:translate(${t[i][0] + 0.5}px,${t[i][1] + 0.5}px)}`;
      css += `100%{transform:translate(${t[n - 1][0] + 0.5}px,${t[n - 1][1] + 0.5}px)}}`;
    }
  });
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

/** The CSS `animation` for an arrow on line `vi` of `set` while the slime
 *  plays `kind` -- the same duration and repeat as the slime's own strip for
 *  it (game.css .bt-sd-slime--*).  null for a kind with no arrows in it (the
 *  splat: a dead slime drops them). */
export function pinAnimation(set, vi, kind) {
  if (!set || kind === 'death') return null;
  const strip = kind === 'hit' ? 'hit' : kind === 'shoot' ? 'shoot' : 'idle';
  const dur = kind === 'hit' ? '.8s' : kind === 'shoot' ? '.42s' : kind === 'swell' ? '.6s' : '1.2s';
  const rep = (kind === 'hit' || kind === 'shoot') ? '1 forwards' : 'infinite';
  return `sdpin-${set.key}-${((vi % PIN_V.length) + PIN_V.length) % PIN_V.length}-${strip} ${dur} step-end ${rep}`;
}
