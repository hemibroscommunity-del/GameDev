/**
 * slimeSplat.js -- v2.3.4127: A SLIME DIES AS A SPLAT, NEVER IN CHUNKS.
 *
 * The owner (2026-11-03): "remove the chunks form the electric slime death
 * (and any other chunks like that from slime deaths - doesn't match the art
 * aesthetic."  Every slime-sheet body (the slime and its stage looks such as
 * the Storm Slime, the moss and blue slimes, the mire wisp: the renderer's
 * `isFodder`) used to die one of three ways, and every one threw pieces:
 * its death strip (slime-death-v10, a cloud of goo flecks over 15 frames),
 * the cuts (slice, decap) and its own zone death (two gobs flung off its
 * crown).  Now it squashes flat where it sat, in its OWN pixels -- the last
 * frame it lived in, so its own colour and recolour -- spreads a little,
 * and fades: about half a second, no debris of any kind, no material
 * bursts.  Nothing is drawn by code (no ground blob: the owner's v2.3.2226
 * "remove code drawn impact areas for slime death" stands).  The killing
 * hit's own effects (its element's flash, the hit spray) belong to the hit
 * and are untouched.
 *
 * One Sprite of the live texture in one Container: no new texture, no mask,
 * nothing to cap.  `dispose()` destroys both the moment it ends (the memory
 * law); the texture is the look's and is never destroyed here.
 *
 * `?slimesplat=0` brings the old deaths back on one phone (the off-ramp).
 * Its shape over time is src/game/slimeSplatPose.js (node tests it).
 */
import { Container, Sprite } from 'pixi.js';
import { SPLAT_MS, splatPose } from '@/game/slimeSplatPose.js';

export { SPLAT_MS };

const _on = (() => {
  try {
    const v = typeof location !== 'undefined' ? new URLSearchParams(location.search || '').get('slimesplat') : null;
    return v !== '0';
  } catch (e) { return true; }
})();
/** v2.3.4127: on unless `?slimesplat=0` (or QA's window.__btSlimeSplat = false). */
export function slimeSplatOn() {
  try {
    if (typeof window !== 'undefined' && window.__btSlimeSplat === false) return false;
  } catch (e) { /* no window: node */ }
  return _on;
}

/**
 * Build one slime's splat.  `kit` is monsterDeathFx's (coverage, deathRoot,
 * qaSlow): its root copies the body sprite's place, mirror and scale (the
 * blue slime's swell included) without the killing blow's squash.  Returns
 * the death's state, or null when there is no body to flatten.
 */
export function buildSlimeSplat(kit, display, m, now) {
  const sb = display && display._spriteBody;
  const tex = sb && sb.texture;
  if (!tex || !tex.source) return null;
  const ow = (tex.orig && tex.orig.width) || tex.width, oh = (tex.orig && tex.orig.height) || tex.height;
  /* its foot: the lowest row with body in it (the cuts' cached coverage
     grid), else the frame's bottom -- the splat stays on the ground there */
  let footY = (1 - sb.anchor.y) * oh, cx = (0.5 - sb.anchor.x) * ow;
  try {
    const cov = kit.coverage(tex);
    if (cov) { footY = cov.y1 - sb.anchor.y * oh; cx = (cov.x0 + cov.x1) / 2 - sb.anchor.x * ow; }
  } catch (e) { /* the frame's own box */ }
  const root = kit.deathRoot(display, sb);
  const c = new Container();
  const spr = new Sprite(tex);
  spr.anchor.set(sb.anchor.x, sb.anchor.y);
  /* its own colour, never the killing blow's red flash (v2.3.3499) */
  spr.tint = sb._btBaseTint != null ? sb._btBaseTint : sb.tint;
  c.addChild(spr);
  c.pivot.set(cx, footY);
  c.position.set(cx, footY);
  root.addChild(c);
  const st = {
    kind: 'splat', splat: true, root, c, spr, born: now, slow: kit.qaSlow(), dur: SPLAT_MS,
    freed: false, matBursts: null,
  };
  st.dispose = () => {
    if (st.freed) return;
    st.freed = true;
    try { if (!root.destroyed) root.destroy({ children: true }); } catch (e) { /* gone with the display */ }
  };
  return st;
}

/* Its own clock.  v2.3.4127: QA's window.__btSplatHold = ms holds every
   splat at that moment (mp-deathzones' pictures: this box takes seconds a
   screenshot, longer than the whole splat). */
function splatT(st, now) {
  const t = (now - st.born) / st.slow;
  let hold = null;
  try { hold = (typeof window !== 'undefined') ? window.__btSplatHold : null; } catch (e) { hold = null; }
  return typeof hold === 'number' && hold >= 0 ? Math.min(t, hold) : t;
}

/** Over yet? */
export function slimeSplatOver(st, now) { return st.freed || splatT(st, now) >= st.dur; }

/** One frame of a splat. */
export function stepSlimeSplat(st, now) {
  if (st.freed) return;
  const p = splatPose(splatT(st, now));
  st.c.scale.set(p.sx, p.sy);
  st.root.alpha = p.a;
}

/** QA probe: what a splat is doing. */
export function slimeSplatProbe(st) {
  return {
    kind: 'splat', pieces: 0, parts: 0, chunks: 0, done: !!st.freed,
    alpha: st.freed ? 0 : +st.root.alpha.toFixed(2),
    flat: st.freed ? null : [+st.c.scale.x.toFixed(3), +st.c.scale.y.toFixed(3)],
    tints: st.freed ? [] : [st.spr.tint],
    children: st.freed ? 0 : st.root.children.length,
  };
}
