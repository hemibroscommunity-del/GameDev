/* ═══ v2.3.4800: THE SWORD'S FEEL -- momentum and the cut ═══
 *
 * The owner's approved brief (2026-11-11, FEEL-SPEC; docs/specs/sword-feel.md):
 *   - The blade refills by itself: dull right after a swing, brightening over
 *     the sword's cycle (the free swing's share), and when full a glint runs
 *     down the edge.  A cut on the glint is the perfect strike (the worker's
 *     window, server/src/freeswing.js, unchanged).  No hold: you choose when.
 *   - Your swipe is the blade: the swing starts the instant the thumb moves
 *     (manualCombat.js mcSwipeMove: a stroke is 24 px of travel, on the MOVE,
 *     never the lift), and the arc follows the thumb -- left-to-right a
 *     forehand, right-to-left a backhand, a long sweep a wide arc, a short
 *     flick a quick cut.  It still bends toward the nearest monster (the
 *     swing's angle is the automatic lock's, monsterCombat.js baseAngle).
 *   - Weight in the contact: a quick cut a light tick and a small spark; a
 *     full, gleaming cut a heavy thud, debris, knock-back, a small push of the
 *     camera in the swing's direction.
 *   - A computer's click is a cut toward the cursor, the arc from its side.
 *   - Rhythm without a meter: fast swipes a flurry of light cuts, waiting for
 *     the gleam a cleave -- the same damage a second (the worker's share).
 *
 * WHERE IT IS CALLED (three lines, no more):
 *   playerActions.js swingAttack   swordFeelSwing(S, prev, now) as a swing
 *                                  begins (its share and its glint, judged on
 *                                  this phone's clock, and the stroke it came
 *                                  from);
 *   BroTown.jsx game loop          swordFeelFrame(S, now) once a frame after
 *                                  the combat step: the blade's readiness and
 *                                  glint (S._sf.view, which the renderer
 *                                  draws), the glint's ring, and the cut's arc
 *                                  once monsterCombat has given the swing its
 *                                  angle -- then widened while the thumb keeps
 *                                  going;
 *   monsterCombat.js contact       swordFeelContact(S, m, ang) on the blade's
 *                                  contact frame for each monster it meets:
 *                                  the spark, and (once a swing) the sound and
 *                                  the camera's push; it returns the strength
 *                                  the loop scales its knock-back, shake and
 *                                  debris by (null: the look before this).
 *
 * ON ONLY WHERE IT MEANS SOMETHING: the game's own combat (the free swing,
 * `caps.freeSwing`) with a sword in hand and `?swordfeel` not 0.  The glint
 * only against a worker that judges the perfect strike (caps.perfectStrike):
 * it promises the worker's verdict.  `?manual=1`, `?manual=2`, `?manual=0`
 * and `?swordfeel=0` meet the look before it.  Nothing here changes damage.
 *
 * QA: window.__btWeaponFeel() (below). */
import { FEEL, feelReadiness, feelPhase, feelGlintT, feelStrength, feelArc, feelArcGrow, feelDim, pushFeelFx, swordFeelWanted } from './weaponFeel.js';
import { MANUAL, mcFreeSwing, mcPerfectOn } from './manualCombat.js';
import { BT_AUDIO } from '@/data/index.js';

let _wanted = null;
/** Is the sword's feel on for this hand now? */
export function swordFeelOn(S) {
  if (_wanted === null) _wanted = swordFeelWanted();
  return !!(_wanted && S && S.rpg && S.rpg.weapon && mcFreeSwing(S));
}
/** QA and the tests: turn it on or off for this page (null: the address's). */
export function setSwordFeel(v) { _wanted = v == null ? null : !!v; }

function sf(S) {
  if (!S._sf) S._sf = { view: null, cur: null, lastPhase: '', glints: 0, swings: 0, contacts: 0, arcs: 0, last: null, cost: { max: 0, sum: 0, n: 0 } };
  return S._sf;
}
function cycleOf(S) { return (S && S._mc && S._mc.meleeNeed) || MANUAL.NEED_DEFAULT_MS; }
const _perf = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
function cost(f, t0) {
  const ms = _perf() - t0;
  f.cost.n++; f.cost.sum += ms; if (ms > f.cost.max) f.cost.max = ms;
}

/** A swing begins (swingAttack, before it stamps S.swingTimer).  `prev` the
 *  last swing's stamp.  Its share and whether it is in the glint, on this
 *  phone's clock: the look and the sound are instant, the worker's verdict
 *  (`pw`, `pf` on the hit) is the truth for the number. */
export function swordFeelSwing(S, prev, now) {
  if (!S) return;
  if (!swordFeelOn(S)) { if (S._sf) S._sf.cur = null; return; }
  const f = sf(S);
  const c = cycleOf(S);
  const share = prev > 0 ? Math.max(0, Math.min(1, (now - prev) / c)) : 1;
  const perfect = !!mcPerfectOn(S) && prev > 0 && feelPhase(prev, c, now) === 'glint';
  /* the stroke that made it -- this very moment's (a computer's click has
     none: its arc comes from the cursor's side) */
  const m = S._mc;
  const st = m && m.stroke && now - m.stroke.at <= 80 ? m.stroke : null;
  f.cur = { at: now, share, perfect, strength: feelStrength(share, perfect), stroke: st, arc: null, hit: false };
  f.swings++;
}

/** Once a frame, after the combat step.  Writes S._sf.view for the renderer:
 *  { r, phase, glintT, dim } -- readiness 0..1, 'fill' | 'glint' | 'rest',
 *  how far the glint has run, the blade's brightness. */
export function swordFeelFrame(S, now) {
  if (!S) return;
  if (!swordFeelOn(S)) { if (S._sf) { S._sf.view = null; S._sf.lastPhase = ''; } return; }
  const t0 = _perf();
  const f = sf(S);
  const c = cycleOf(S);
  const prev = S.swingTimer || 0;
  const glints = !!mcPerfectOn(S);
  const r = feelReadiness(prev, c, now);
  let phase = feelPhase(prev, c, now);
  if (!glints && phase === 'glint') phase = 'fill';
  /* the glint opens: its small ring, once (quiet: the sound does most of the
     work on a phone that cannot vibrate, but it must never nag) */
  if (phase === 'glint' && f.lastPhase !== 'glint') {
    f.glints++;
    f.glintAt = now;
    try { BT_AUDIO.feelSound('ready', 1, { vol: 0.8 }); } catch (e) { /* sound only */ }
  }
  f.lastPhase = phase;
  const v = f.view || (f.view = { r: 1, phase: 'rest', glintT: -1, dim: 1 });
  v.r = r; v.phase = phase; v.glintT = glints ? feelGlintT(prev, c, now) : -1; v.dim = feelDim(r);
  /* THE CUT'S ARC: once the loop has given this swing its angle (the nearest
     monster's way, or the cursor's), the arc is fixed in its turn and starts
     drawing; while the thumb keeps going it widens */
  const cur = f.cur;
  if (cur && cur.at === prev) {
    if (!cur.arc && S.isSwinging && typeof S._swingAng === 'number' && isFinite(S._swingAng)) {
      cur.arc = feelArc(cur.stroke, S._swingAng);
      cur.ang = S._swingAng;
      f.arcs++;
      f.last = { at: cur.at, dir: cur.arc.dir, hand: cur.arc.hand, kind: cur.arc.kind, width: cur.arc.width, ang: cur.ang,
        share: cur.share, perfect: cur.perfect, tier: cur.strength.tier, click: !!cur.arc.click };
      pushFeelFx(S, { kind: 'arc', at: cur.at, ang: cur.ang, arc: cur.arc, k: cur.strength.spark, tier: cur.strength.tier, who: 'self' });
    }
    if (cur.arc && cur.stroke && S._mc && S._mc.down && now - cur.at < FEEL.SWEEP_MS && typeof S._mc.cx === 'number') {
      const tr = Math.hypot(S._mc.cx - cur.stroke.x0, S._mc.cy - cur.stroke.y0);
      feelArcGrow(cur.arc, tr);
      if (f.last && f.last.at === cur.at) { f.last.width = cur.arc.width; f.last.kind = cur.arc.kind; }
    }
  }
  cost(f, t0);
}

/** The blade meets monster `m` on its contact frame (monsterCombat.js),
 *  `ang` the swing's angle.  The spark (each monster), the sound and the
 *  camera's push (once a swing).  Returns feelStrength's answer for the loop
 *  to scale its knock-back, shake and debris by -- or null (the feel is off,
 *  or this is not the swing it saw begin: the look before this). */
export function swordFeelContact(S, m, ang) {
  const f = S && S._sf, cur = f && f.cur;
  if (!cur || cur.at !== (S.swingTimer || 0) || !swordFeelOn(S) || !m) return null;
  const t0 = _perf();
  const k = cur.strength;
  const now = Date.now();
  const mx = typeof m.renderX === 'number' ? m.renderX : m.x, my = typeof m.renderY === 'number' ? m.renderY : m.y;
  pushFeelFx(S, { kind: 'burst', at: now, x: mx, y: my - 22, ang, k: k.spark, tier: k.tier, color: k.tier === 'perfect' ? 0xffe9a8 : 0xffffff });
  if (!cur.hit) {
    cur.hit = true;
    f.contacts++;
    if (f.last && f.last.at === cur.at) f.last.hit = k.tier;
    try { BT_AUDIO.feelSound('contact', k.k, { vol: 0.9 * k.vol }); } catch (e) { /* sound only */ }
    if (k.push > 0 && typeof ang === 'number') S._camPunch = { dx: Math.cos(ang) * k.push, dy: Math.sin(ang) * k.push, ts: now };
    if (k.tier === 'perfect') pushFeelFx(S, { kind: 'pulse', at: now, x: mx, y: my - 22, k: 1, color: 0xffe9a8 });
  }
  cost(f, t0);
  return k;
}

/** The turn of YOUR swing being drawn now: +1 clockwise on screen, -1 the
 *  other way, 0 when the feel has none for it (off, a special, a swing it did
 *  not see begin, its angle not given yet).  effectsRenderer's swing figure
 *  sweeps this way (forehand / backhand). */
export function swordCutDir(S) {
  const cur = S && S._sf && S._sf.cur;
  if (!cur || !cur.arc || cur.at !== (S.swingTimer || 0) || S._specialAttack || !swordFeelOn(S)) return 0;
  return cur.arc.dir;
}

/* QA (mp-swordfeel): what the sword's feel holds right now */
if (typeof window !== 'undefined') {
  try {
    window.__btWeaponFeel = function () {
      const g = window._gameState, S = g && g.current;
      const f = S && S._sf;
      return {
        on: !!(S && swordFeelOn(S)), wanted: swordFeelWanted(),
        view: f && f.view ? Object.assign({}, f.view) : null,
        glints: f ? f.glints : 0, swings: f ? f.swings : 0, arcs: f ? f.arcs : 0, contacts: f ? f.contacts : 0,
        last: f && f.last ? Object.assign({}, f.last) : null,
        cost: f ? { max: +f.cost.max.toFixed(3), mean: f.cost.n ? +(f.cost.sum / f.cost.n).toFixed(4) : 0, n: f.cost.n } : null,
        fx: window.__btWeaponFeelFx ? window.__btWeaponFeelFx() : null,
      };
    };
    window.__btWeaponFeel.set = setSwordFeel;
    /* the contact the loop makes, on a monster the test names (the town has none to hit) */
    window.__btWeaponFeel.contact = function (m, ang) { const g = window._gameState; return swordFeelContact(g && g.current, m, ang); };
    /* the loop's own call, run now (this box draws a few frames a second) */
    window.__btWeaponFeel.tick = function () { const g = window._gameState; swordFeelFrame(g && g.current, Date.now()); };
  } catch (e) { /* no window */ }
}
