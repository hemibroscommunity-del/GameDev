/* ═══ v2.3.4802: THE BOW'S FEEL -- tension, stillness, the snap ═══
 *
 * The owner's approved brief (2026-11-11; docs/specs/bow-feel.md): thumb down
 * nocks (the bro raises the bow); drag BACK to draw (the bow bends, the string
 * creaks rising in pitch, a faint aim line grows forward, wide and loose,
 * narrowing as the draw fills); full draw settles (a crisp gold line, a quiet
 * click, the walk slows); held too long the arm tires (the line trembles, the
 * sweet spot passes); lift to loose (a sharp twang, the arm's recoil, a beat
 * of quiet, the streak); a half draw is weaker but quicker; slide back to the
 * touch point to let the string down.  A computer: hold the left button to
 * draw (the cursor aims), let go to loose.
 *
 * THE RULES are game/bowDraw.js (pure, node-tested: one phase field, one
 * transition, the worker's numbers from game/drawGather.js).  This file is
 * their wiring:
 *
 *   manualCombat.js (the hook)   the touch handlers' own mcSwipeStart / Move
 *                                / End / mcAbort / mcAskShot reach bowStep
 *                                through mcSetBowHook -- no touch handler has
 *                                a line of its own for the bow;
 *   BroTown.jsx                  bowFeelFrame(S, now) once a frame (the view,
 *                                the creak's pitch, the click, the pose),
 *                                bowFeelWalkMult(S) in the walk, and a
 *                                computer's press (bowFeelDeskDown; its
 *                                release is heard on the window, below);
 *   monsterCombat.js             bowFeelGapMs (a drawn bow looses at once, for
 *                                its share), bowFeelWire (the shot's `dr` on
 *                                its relay), bowFeelLoosed (the arrow leaves
 *                                now: the twang, the streak, the recoil);
 *   projectiles.js               bowFeelSw (every claim of a drawn arrow names
 *                                its shot: `sw` on monster_damage and
 *                                player_attack) and bowFeelContact (the hit's
 *                                spark and sound, sized by the draw);
 *   entityRenderer.js            reads S._bfPose: the bow raised (nocked) and
 *                                drawn, the stand-in's frame held;
 *   rendering/systems/bowFeelFx.js  the string's bend and the aim line.
 *
 * ON ONLY WHERE IT MEANS SOMETHING: the game's own combat (nothing chosen:
 * the free swing), a bow in hand, a worker that counts a draw
 * (`caps.bowDraw`; its `bowdraw: false` takes it away), and `?bowfeel` not 0.
 * Off -- `?bowfeel=0` on one phone, `?manual=0/1/2`, an older worker -- the
 * bow is today's flick, exactly.  NOTHING HERE DECIDES DAMAGE: the worker
 * counts the draw (server/src/drawgather.js), the phone only claims it.
 *
 * QA: window.__btBowFeel() (below). */
import { BOW_FEEL, bowState, bowStep, bowView, bowWire, bowWalkMult, bowPoseFrame } from './bowDraw.js';
import { feelSwitch, feelStrength, pushFeelFx } from './weaponFeel.js';
import { MANUAL, manualFreeSwing, mcSetBowHook, mcAskShot, mcFireChance } from './manualCombat.js';
import { BT_AUDIO } from '@/data/index.js';

export var BOW_FEEL_KEY = 'bt_bowfeel';
/** The bow's feel on this device?  `?bowfeel=0` brings back today's flick
 *  bow, remembered (localStorage bt_bowfeel); `?bowfeel=1` forgets. */
export function bowFeelWanted(search, store) { return feelSwitch('bowfeel', BOW_FEEL_KEY, search, store); }

let _wanted = null;
/** QA and the tests: on or off for this page (null: the address's). */
export function setBowFeel(v) { _wanted = v == null ? null : !!v; }

/** Is the bow drawn, not flicked, for this hand now? */
export function bowFeelOn(S) {
  if (_wanted === null) _wanted = bowFeelWanted();
  return !!(_wanted && S && S.rpg && S.rpg.activeSlot === 'ranged' && S.rpg.rangedWeapon
    && manualFreeSwing() && S._serverCaps && S._serverCaps.bowDraw);
}

/* mirror of entityRenderer BOW_RELEASE_MS (110): the shot pose's release
   frame and the arrow leaving the grip.  A drawn bow is drawn already, so its
   arrow leaves on the loose, not 110 ms after (the load and pull played out
   while the thumb drew) */
const RELEASE_MS = 110;
const _perf = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();

function bf(S) {
  if (!S._bf) {
    S._bf = { st: bowState(), view: null, lastPhase: '', creak: null, last: null, settles: 0, tires: 0, looses: 0, contacts: 0,
      cost: { max: 0, sum: 0, n: 0 } };
  }
  return S._bf;
}
function cost(f, t0) { const ms = _perf() - t0; f.cost.n++; f.cost.sum += ms; if (ms > f.cost.max) f.cost.max = ms; }
function fullOf(S) { return (S && S._mc && S._mc.need) || MANUAL.NEED_DEFAULT_MS; }
function stopCreak(f, fast) { if (f.creak) { try { f.creak.stop(fast); } catch (e) { /* sound only */ } f.creak = null; } }
function grip(S) {
  const P = S && S.player;
  if (!P) return null;
  const dx = S._bowGripDX, dy = S._bowGripDY;
  return (typeof dx === 'number' && typeof dy === 'number' && isFinite(dx) && isFinite(dy)) ? { x: P.x + dx, y: P.y + dy } : { x: P.x, y: P.y };
}

/** THE STEP, as the hook (manualCombat.js) and a computer's press call it:
 *  bowStep, then what each answer sounds like.  Returns bowStep's answer. */
export function bowFeelStep(S, ev) {
  if (!S || !ev) return 'none';
  const f = bf(S);
  const was = f.st.phase;
  const a = bowStep(f.st, ev);
  if (a === 'nock') {
    try { BT_AUDIO.bowSound('nock', 1, { vol: 0.7 }); } catch (e) { /* sound only */ }
  } else if (a === 'draw') {
    stopCreak(f);
    try { f.creak = BT_AUDIO.bowSound('creak', 1, { vol: 0.8 }) || null; } catch (e) { f.creak = null; }
  } else if (a === 'letdown' || (a === 'cancel' && was === 'drawing')) {
    stopCreak(f);
    try { BT_AUDIO.bowSound('letdown', 1, { vol: 0.8 }); } catch (e) { /* sound only */ }
  } else if (a === 'loose') {
    /* the creak cut dead: the beat of quiet before the twang (bowFeelLoosed,
       when the arrow leaves on the loop's next frame) */
    stopCreak(f, true);
    const L = f.st.loose, now = ev.now || Date.now();
    const v = bowView({ phase: 'drawing', drawAt: now - L.drawMs }, now, fullOf(S), S.swingTimer || 0);
    L.r = v ? v.r : 0; L.perfect = !!(v && v.perfect); L.counted = v ? v.counted : 0;
  } else if (a === 'cancel') {
    stopCreak(f);
  }
  return a;
}

/* the hook: the touch handlers' own manual-combat calls reach the draw */
mcSetBowHook({ on: bowFeelOn, step: bowFeelStep, gap: BOW_FEEL.GAP_MS });

/** A computer's left button went down (BroTown onMouseDown): the bow is
 *  nocked and drawing at once, the cursor its aim.  False when the bow's
 *  feel is off (the click shoots, as before). */
export function bowFeelDeskDown(S, now) {
  if (!bowFeelOn(S)) return false;
  bowFeelStep(S, { type: 'deskdown', now: now || Date.now() });
  return true;
}
/** ...and let go: loosed at the cursor. */
export function bowFeelDeskUp(S, now) {
  const f = S && S._bf;
  if (!f || f.st.phase !== 'drawing' || !f.st.desk) return 'none';
  const t = now || Date.now();
  if (!bowFeelOn(S)) { bowFeelStep(S, { type: 'abort', now: t }); return 'cancel'; }
  if (typeof S._mouseAimAngle === 'number') { S._aimAngle = S._mouseAimAngle; S._lastAimAngle = S._mouseAimAngle; }
  return bowFeelStep(S, { type: 'deskup', now: t }) === 'loose' ? mcAskShot(S, t) : 'cancel';
}
/* the release is heard on the window: a button let go over a panel, or
   outside the canvas, still looses; the window losing focus lets it down */
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('mouseup', (e) => {
      if (e && e.button !== 0) return;
      const g = window._gameState, S = g && g.current;
      if (S && S._bf && S._bf.st.desk) bowFeelDeskUp(S, Date.now());
    });
    window.addEventListener('blur', () => {
      const g = window._gameState, S = g && g.current;
      if (S && S._bf && S._bf.st.phase !== 'idle') bowFeelStep(S, { type: 'abort', now: Date.now() });
    });
  } catch (e) { /* no window */ }
}

/** Once a frame (BroTown's loop, after the combat step): the view (S._bf.view,
 *  which the renderer draws), the creak's pitch, the click as the draw
 *  settles, the arm tiring, and the pose (S._bfPose: entityRenderer). */
export function bowFeelFrame(S, now) {
  if (!S) return;
  const f = S._bf;
  if (!bowFeelOn(S)) {
    if (f) {
      if (f.st.phase !== 'idle') bowFeelStep(S, { type: 'abort', now });
      stopCreak(f);
      f.view = null; f.lastPhase = '';
    }
    S._bfPose = null;
    mcFireChance(S);   /* v2.3.4799: a loose asked for before the feel went off waits no longer than a flick's */
    return;
  }
  const t0 = _perf();
  const g = bf(S);
  if (g.qaPin != null && g.st.phase === 'drawing') g.st.drawAt = now - g.qaPin;   /* QA (mp-bowfeel): the draw held at a chosen time, frame after frame */
  /* the press ended some other way than a lift: the shield raised (a slide
     on to it), a harvest, a zone's load, a death -- no shot */
  if (g.st.phase !== 'idle' && (S._shieldUp || S._extraction || S._zoneLoading || S._dying || (S.rpg && S.rpg.hp <= 0))) bowFeelStep(S, { type: 'abort', now });
  const v = bowView(g.st, now, fullOf(S), S.swingTimer || 0);
  g.view = v;
  const ph = v ? v.phase : '';
  if (ph === 'full' && g.lastPhase === 'draw') {
    /* SETTLED: the quiet click and a small gold breath at the grip */
    g.settles++;
    try { BT_AUDIO.bowSound('click', 1, { vol: 0.8 }); } catch (e) { /* sound only */ }
    const gp = grip(S);
    if (gp) pushFeelFx(S, { kind: 'pulse', at: now, x: gp.x, y: gp.y, k: 0.45, color: 0xffd44a });
  }
  if (ph === 'tired' && g.lastPhase !== 'tired') g.tires++;
  g.lastPhase = ph;
  if (g.creak && v) { try { g.creak.set(v.r, v.tireT); } catch (e) { /* sound only */ } }
  if (!v && g.creak) stopCreak(g);
  /* the pose: the bow raised at the nock, drawn from a third of a draw, and
     held drawn until the loop takes the loose (then the shot's own pose) */
  const L = g.st.loose;
  /* v2.3.4799: the loop (run before this) has had its first chance at the
     loose: from now on it waits only LOOSE_HOLD_MS -- before, a frame later
     than that lost it, or sent the arrow with no `dr` (a whole arrow the
     worker charges a full draw for) (the review's N3) */
  if (L && !L.taken && L.tried && now - L.at > BOW_FEEL.LOOSE_HOLD_MS) g.st.loose = null;
  else if (L && !L.taken) L.tried = true;
  mcFireChance(S);
  /* the way the bow is raised: the aim, the last aim, the way he faces (a new
     bro has aimed nowhere yet) */
  const ang = (S._aimAngle != null) ? S._aimAngle : (S._lastAimAngle != null) ? S._lastAimAngle
    : (typeof S._facingAngle === 'number' && isFinite(S._facingAngle)) ? S._facingAngle : Math.PI / 2;
  const frame = v ? bowPoseFrame(v) : (g.st.loose && !g.st.loose.taken ? 1 : -1);
  S._bfPose = (frame >= 0 && typeof ang === 'number' && isFinite(ang)) ? { frame, ang } : null;
  cost(g, t0);
}

/** The walk's multiplier (BroTown's walk): slower drawn, planted settled. */
export function bowFeelWalkMult(S) {
  const f = S && S._bf;
  return f && f.view ? bowWalkMult(f.view) : 1;
}

/** The gap a drawn bow looses on (monsterCombat's cadence gate), or null:
 *  the flicked bow's own interval. */
export function bowFeelGapMs(S) { return bowFeelOn(S) ? BOW_FEEL.GAP_MS : null; }

function looseWaiting(S, now) {
  const f = S && S._bf, L = f && f.st.loose;
  return (L && !L.taken && (!L.tried || now - L.at <= BOW_FEEL.LOOSE_HOLD_MS)) ? L : null;   /* v2.3.4799: its first chance, however late */
}
/** The `dr` of the arrow leaving now (monsterCombat's player_projectile
 *  relay): the draw, whole ms -- or undefined (not a drawn bow's loose; the
 *  relay is today's). */
export function bowFeelWire(S, isStaff) {
  if (isStaff || !bowFeelOn(S)) return undefined;
  const L = looseWaiting(S, Date.now());
  return L ? bowWire(L.drawMs) : undefined;
}

/** The arrow left (monsterCombat, after it stamps the shot pose): it leaves
 *  the grip NOW, the shot pose is on its release frame (the arm's recoil),
 *  the twang sized by the draw, the streak, a small push back. */
export function bowFeelLoosed(S, ang) {
  const now = Date.now();
  const L = looseWaiting(S, now);
  if (!L) return;
  L.taken = true;
  const f = S._bf;
  const a = S.arrows && S.arrows[S.arrows.length - 1];
  const dr = bowWire(L.drawMs);
  if (a && !a.isStaff && !a.isSpecial) {
    a._bfDr = dr; a._bfShare = L.r; a._bfPerfect = !!L.perfect;
    a._bornTs = now - RELEASE_MS;   /* projectiles.js: released at once, from the grip the draw held */
  }
  S._bowShotAt = now - RELEASE_MS;   /* the stand-in straight to its release frame */
  const k = feelStrength(L.r, L.perfect);
  try { BT_AUDIO.bowSound('twang', k.k, { vol: 0.9 }); } catch (e) { /* sound only */ }
  const gp = grip(S);
  if (gp && typeof ang === 'number') {
    pushFeelFx(S, { kind: 'streak', at: now, x: gp.x, y: gp.y, ang, len: 36 + 64 * Math.min(1, L.r), k: k.spark, color: L.perfect ? 0xffe9a8 : 0xffffff });
    if (L.perfect) pushFeelFx(S, { kind: 'pulse', at: now, x: gp.x, y: gp.y, k: 0.6, color: 0xffe9a8 });
    /* the recoil: the camera nudged back against the shot, a full draw's only */
    const back = k.tier === 'perfect' ? 3 : k.tier === 'full' ? 2 : 0;
    if (back > 0) S._camPunch = { dx: -Math.cos(ang) * back, dy: -Math.sin(ang) * back, ts: now };
  }
  f.looses++;
  f.last = { at: now, ts: a && a._shotTs, dr, r: +L.r.toFixed(3), counted: L.counted, perfect: !!L.perfect, tier: k.tier, ang };
}

/** The shot a drawn arrow's claims name (`sw`), or undefined. */
export function bowFeelSw(a) {
  return (a && a._bfDr != null && !a.isSpecial && typeof a._shotTs === 'number') ? a._shotTs : undefined;
}

/** A drawn arrow lands on monster `m` (projectiles.js, the claim's moment):
 *  its spark, and its sound sized by the draw (the worker's `pw` / `pf` on
 *  the hit then size its number, as a sword's). */
export function bowFeelContact(S, a, m) {
  if (!S || !a || a._bfShare == null || !m) return;
  const f = S._bf;
  if (!f) return;
  const k = feelStrength(a._bfShare, a._bfPerfect);
  const mx = typeof m.renderX === 'number' ? m.renderX : m.x, my = typeof m.renderY === 'number' ? m.renderY : m.y;
  pushFeelFx(S, { kind: 'burst', at: Date.now(), x: mx, y: my - 22, ang: typeof a.ang === 'number' ? a.ang : 0, k: k.spark, tier: k.tier, color: k.tier === 'perfect' ? 0xffe9a8 : 0xffffff });
  if (!a._bfHit) {
    a._bfHit = true;
    f.contacts++;
    try { BT_AUDIO.feelSound('contact', k.k, { vol: 0.75 * k.vol }); } catch (e) { /* sound only */ }
    if (f.last && f.last.ts === a._shotTs) f.last.hit = k.tier;
  }
}

/* QA (mp-bowfeel): what the bow's feel holds right now */
if (typeof window !== 'undefined') {
  try {
    window.__btBowFeel = function () {
      const g = window._gameState, S = g && g.current;
      const f = S && S._bf;
      return {
        on: !!(S && bowFeelOn(S)), wanted: bowFeelWanted(), cap: !!(S && S._serverCaps && S._serverCaps.bowDraw),
        phase: f ? f.st.phase : 'idle', view: f && f.view ? Object.assign({}, f.view) : null,
        full: S ? fullOf(S) : 0, pose: S && S._bfPose ? Object.assign({}, S._bfPose) : null,
        walk: S ? bowFeelWalkMult(S) : 1, creak: !!(f && f.creak),
        n: f ? Object.assign({}, f.st.n) : null, settles: f ? f.settles : 0, tires: f ? f.tires : 0, looses: f ? f.looses : 0, contacts: f ? f.contacts : 0,
        loose: f && f.st.loose ? Object.assign({}, f.st.loose) : null, last: f && f.last ? Object.assign({}, f.last) : null,
        cost: f ? { max: +f.cost.max.toFixed(3), mean: f.cost.n ? +(f.cost.sum / f.cost.n).toFixed(4) : 0, n: f.cost.n } : null,
      };
    };
    window.__btBowFeel.set = setBowFeel;
    /* the draw held at `ms` on every frame until unpinned (null): the box draws a few frames a second, so a
       chosen moment of the draw is pinned rather than timed */
    window.__btBowFeel.pin = function (ms) { const g = window._gameState, S = g && g.current; if (S) bf(S).qaPin = ms == null ? null : +ms; };
    /* the loop's own call, run now (this box draws a few frames a second) */
    window.__btBowFeel.tick = function () { const g = window._gameState; bowFeelFrame(g && g.current, Date.now()); };
  } catch (e) { /* no window */ }
}
