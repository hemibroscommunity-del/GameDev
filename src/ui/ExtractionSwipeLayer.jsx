import React, { useEffect, useRef } from 'react';
import { EXTRACT_REPS_TARGET, EXTRACT_REPS_DEFAULT, BT_AUDIO } from '@/data/gameSystems.js';

/* v2.3.229 / v2.4 — ExtractionSwipeLayer
 *
 * Captures the phase-2 ACTIVE gesture for resource extraction. Sits above the
 * game canvas as a transparent fixed-position layer, listening to native
 * pointer events (passive: false) so iOS Safari delivers preventDefault.
 *
 * Activation: only routes events while stateRef.current._extraction.status
 * === 'ready'. Otherwise pointer events fall through to the game / dashboard.
 *
 * Phase-2 is a SUSTAINED, per-skill gesture that fills a meter (reps):
 *   - mining:      up/down pump (vertical oscillation) -> 1 rep per full pump
 *   - woodcutting: horizontal chops toward the tree    -> 1 rep per tree-ward stroke
 *   - fishing:     clockwise circular reel             -> 1 rep per full turn
 * When the meter reaches REPS_TARGET we grade the gesture (perfect/good/ok by
 * how fast it filled) and call onSuccess(accuracy), which routes to BroTown's
 * _succeedExtraction. Lifting early just pauses — the accumulator lives on
 * S._extraction._gesture so a re-press resumes, and the game tick still fails
 * the attempt when the window closes.
 *
 * The recognizer reads the full sampled path (not just start->end) so the
 * oscillation/rotation shapes are detectable. Anti-bot entropy/fingerprint
 * (swipeFp) is preserved on success.
 */

const MIN_SWIPE_LEN = 30; /* px — ignore micro-jitters before any motion counts */
const STROKE_AMP = 40;    /* px — travel past the last turning point to count a half-stroke */
const TWO_PI = Math.PI * 2;
/* Start point must be within this many px of the on-screen cue to count.
   Stops joystick deflections (the left stick lives bottom-left) registering. */
const SWIPE_START_RADIUS = 160;

function sign(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

/* Wrap an angle delta into [-PI, PI] so cumulative rotation is continuous. */
function wrapPi(a) {
  while (a > Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

function vectorEntropy(samples) {
  /* "Is this a hand-drawn swipe vs a synthetic one" signal. Hand swipes show
     varying inter-sample angles; replayed bot swipes tend to be near-collinear. */
  if (samples.length < 4) return 0;
  let totalAngleDelta = 0;
  let prevAng = null;
  for (let i = 1; i < samples.length; i++) {
    const ax = samples[i].x - samples[i - 1].x;
    const ay = samples[i].y - samples[i - 1].y;
    if (ax === 0 && ay === 0) continue;
    const ang = Math.atan2(ay, ax);
    if (prevAng != null) {
      let d = Math.abs(ang - prevAng);
      if (d > Math.PI) d = 2 * Math.PI - d;
      totalAngleDelta += d;
    }
    prevAng = ang;
  }
  return totalAngleDelta / Math.max(1, samples.length - 2);
}

/* ── Anti-bot gesture fingerprint v2 (v2.3.694) ──────────────────────────
   Cheap scalar signals computed once at meter-full and shipped with
   node_strike (<200 bytes total).  A human hand produces irregular sample
   TIMING and a curved VELOCITY profile; a synthetic/replayed swipe converges
   to near-constant timing and collinear motion.  The server accumulates the
   DISTRIBUTION of these across a session — sophisticated agents can fake any
   single value, but matching a human's natural variance over hundreds of
   harvests is the hard part (see docs/ANTICHEAT-SPEC.md). */

/* Variance of inter-sample dt (ms²).  Bots emitting samples on a fixed clock
   → ~0; human input jitter → meaningfully positive. */
function timingVariance(samples) {
  if (samples.length < 4) return 0;
  const dts = [];
  for (let i = 1; i < samples.length; i++) dts.push(samples[i].t - samples[i - 1].t);
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  let v = 0;
  for (const d of dts) v += (d - mean) * (d - mean);
  return v / dts.length;
}

/* Curvature of the speed profile: variance of consecutive speed deltas,
   normalised by mean speed.  Constant-velocity synthetic drags → ~0. */
function velocityCurvature(samples) {
  if (samples.length < 5) return 0;
  const sp = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(1, samples[i].t - samples[i - 1].t);
    sp.push(Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) / dt);
  }
  const mean = sp.reduce((a, b) => a + b, 0) / sp.length || 1;
  let acc = 0;
  for (let i = 1; i < sp.length; i++) acc += Math.abs(sp[i] - sp[i - 1]);
  return Number(((acc / Math.max(1, sp.length - 1)) / mean).toFixed(3));
}

/* FNV-1a hash of the quantised path (8px grid) — a compact signature the
   server dedupes against to catch EXACT replays of a recorded swipe. */
function pathHash(samples) {
  let h = 0x811c9dc5;
  for (let i = 0; i < samples.length; i++) {
    const qx = (samples[i].x >> 3) & 0xff, qy = (samples[i].y >> 3) & 0xff;
    h ^= qx; h = Math.imul(h, 0x01000193);
    h ^= qy; h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/* Reps required to complete each skill's phase-2 gesture. */
function repsTargetFor(skill) {
  return EXTRACT_REPS_TARGET[skill] || EXTRACT_REPS_DEFAULT;
}

/* Convert the live accumulator into a rep count for the skill. */
function repsFromGesture(skill, g) {
  if (skill === 'fishing') return Math.max(0, g.totalAngle) / TWO_PI;
  if (skill === 'woodcutting') return g.treewardStrokes;
  if (skill === 'cooking') return g.cookStrokes || 0;   /* one up-flip = cooked */
  /* mining: a full up+down pump is two half-strokes */
  return g.halfStrokes / 2;
}

/* Map fill speed (within the open window) to a reward grade. */
function gradeGesture(fillFrac, ent) {
  const human = ent >= 0.04;            /* near-zero entropy => suspiciously straight */
  if (fillFrac <= 0.45 && human) return 'perfect';
  if (fillFrac <= 0.8) return 'good';
  return 'ok';
}

export const ExtractionSwipeLayer = ({ stateRef, onSuccess }) => {
  const swipeRef = useRef(null); /* { startX, startY, samples: [] } while pointer down */

  useEffect(() => {
    const target = window;

    const readyExtraction = () => {
      const S = stateRef && stateRef.current;
      if (!(S && S._extraction && S._extraction.status === 'ready')) return null;
      return S._extraction;
    };

    const nodeOf = (S, ex) =>
      (ex.nodeRef && ex.nodeRef.alive) ? ex.nodeRef
        : (S.gatherNodes && ex.nodeId ? S.gatherNodes.find(n => n.id === ex.nodeId) : null);

    const cueScreenPos = (S, ex) => {
      if (!S.camera) return null;
      /* v2.3.1123: world->CSS conversion is screenX = (worldX - camera.x) * worldScale.
         This gesture layer compared RAW world px to the touch's CSS px and dropped
         the worldScale factor -- on mobile the renderer shows 1.25x more world than
         CSS px (worldScale ~0.8), so the reel/gather cue landed ~20% off from where
         the icon actually renders.  The onPointerDown SWIPE_START_RADIUS check then
         rejected the touch and the gesture never started (fishing reel "not
         registering", no meter fill).  Mirrors BroTown's v2.3.1111 tap fix + the
         published S._worldScaleX/Y (pixiRenderer). Canvas is full-screen at the
         viewport origin, so no rect offset is needed. */
      const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
      /* Fishing centers the reel gesture on the CHARACTER (the rod's reel is
         at the hands), matching the cue render in effectsRenderer — the user
         circles their finger over the player to reel.  Resolved BEFORE the node
         lookup: fishing only needs the player, and requiring the fish node here
         meant a depleted/absent node returned null and bailed the gesture. */
      if (ex.skill === 'fishing' && S.player) {
        return { x: (S.player.x - S.camera.x) * sx, y: (S.player.y - 24 - S.camera.y) * sy };
      }
      const node = nodeOf(S, ex);
      if (!node) return null;
      /* v2.3.853: cooking centers the swipe-up over the campfire/pan. */
      if (ex.skill === 'cooking') {
        return { x: (node.x - S.camera.x) * sx, y: (node.y - 40 - S.camera.y) * sy };
      }
      const yOff = node.nodeType === 'tree' ? 96 : node.nodeType === 'oreVein' ? 36 : 30;
      return { x: (node.x - S.camera.x) * sx, y: (node.y - yOff - S.camera.y) * sy };
    };

    const onPointerDown = (e) => {
      const ex = readyExtraction();
      if (!ex) return;
      const S = stateRef.current;
      const cue = cueScreenPos(S, ex);
      if (!cue) return;
      const x = e.clientX, y = e.clientY;
      if (Math.hypot(x - cue.x, y - cue.y) > SWIPE_START_RADIUS) return;

      /* Tree-ward horizontal sign for woodcutting (where the tree sits relative
         to the player). 0 if (nearly) directly above/below -> accept either. */
      let treeward = 0;
      const node = nodeOf(S, ex);
      if (node && S.player) treeward = sign(node.x - S.player.x);

      /* Resume the accumulator if this is a re-press within the same window,
         otherwise start fresh. Lives on the extraction record so progress and
         the cue meter persist across lifts. */
      if (!ex._gesture) {
        ex._gesture = {
          axisRef: (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x, /* value at last turning point */
          dir: 0,
          halfStrokes: 0,
          treewardStrokes: 0,
          treeward,
          cueX: cue.x, cueY: cue.y,
          nodeX: node ? node.x : null, nodeY: node ? node.y : null,
          lastAngle: Math.atan2(y - cue.y, x - cue.x),
          totalAngle: 0,
          startT: performance.now(),
        };
        ex.progress = 0;
        ex.reps = 0;
        ex.repsTarget = repsTargetFor(ex.skill);
        ex.treewardSign = treeward;
      } else {
        /* re-seed the per-press anchors so a resumed stroke measures cleanly */
        ex._gesture.cueX = cue.x; ex._gesture.cueY = cue.y;
        ex._gesture.lastAngle = Math.atan2(y - cue.y, x - cue.x);
        ex._gesture.axisRef = (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x;
        ex._gesture.dir = 0;
      }
      swipeRef.current = { startX: x, startY: y, samples: [{ x, y, t: performance.now() }] };
    };

    /* Oscillation counter with hysteresis: counts a half-stroke each time the
       finger reverses past STROKE_AMP from the running extreme on the axis. */
    const stepOscillation = (g, v, skill) => {
      if (g.dir === 0) {
        /* establish the first direction once moved STROKE_AMP from the anchor */
        if (v - g.axisRef >= STROKE_AMP) { g.dir = 1; g.axisRef = v; countHalf(g, 1, skill); }
        else if (g.axisRef - v >= STROKE_AMP) { g.dir = -1; g.axisRef = v; countHalf(g, -1, skill); }
      } else if (g.dir === 1) {
        if (v > g.axisRef) g.axisRef = v;                          /* still moving +, extend */
        else if (g.axisRef - v >= STROKE_AMP) { g.dir = -1; g.axisRef = v; countHalf(g, -1, skill); }
      } else { /* dir === -1 */
        if (v < g.axisRef) g.axisRef = v;
        else if (v - g.axisRef >= STROKE_AMP) { g.dir = 1; g.axisRef = v; countHalf(g, 1, skill); }
      }
    };
    const countHalf = (g, d, skill) => {
      g.halfStrokes += 1;
      /* woodcutting: only the tree-ward swing scores a rep (return swing is free).
         treeward 0 (tree directly above/below) -> accept either horizontal stroke. */
      if (skill === 'woodcutting' && (g.treeward === 0 || d === g.treeward)) g.treewardStrokes += 1;
      /* mining: the DOWN half-stroke (d===1, screen y increasing) is the slam --
         spark + clink at the ore so the hit reads. */
      if (skill === 'mining' && d === 1) onSlam(g);
      /* v2.3.853: cooking — an UP stroke (d===-1, screen y decreasing) flips
         the fish; one flip = cooked. */
      if (skill === 'cooking' && d === -1) g.cookStrokes = (g.cookStrokes || 0) + 1;
    };

    /* Spark burst + clink at the ore on a pickaxe slam. */
    const onSlam = (g) => {
      const S = stateRef && stateRef.current;
      if (!S || g.nodeX == null) return;
      /* v2.3.1443 (owner effect sheets): painted rock-debris burst at the
         ore on every slam — effectsRenderer._updateFxBursts plays it. */
      if (!S._fxBursts) S._fxBursts = [];
      if (S._fxBursts.length < 6) S._fxBursts.push({ kind: 'rocks', t0: Date.now(), x: g.nodeX, y: g.nodeY + 14 });   /* renderer clock is Date.now() */
      if (S.hitParticles) {
        for (let i = 0; i < 7; i++) {
          S.hitParticles.push({
            x: g.nodeX, y: g.nodeY,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 3 - 1,        /* mostly upward chips */
            life: 0.45,
            color: i % 2 ? '#ffd27a' : '#fff2c0',
            size: 1.6,
          });
        }
      }
      /* v2.3.1423 (owner: the sample must play when the MARKER hits the
         rock): the slam fires on every down-pump reversal — the moment the
         marker visually bottoms out — so the pickaxe-on-stone sample lives
         HERE (alternating its two strikes).  The 0.9-phase burst in
         effectsRenderer is particles-only now (sounding both doubled the
         hit on full drags). */
      try {
        if (BT_AUDIO && BT_AUDIO.play) {
          g._slamSndAlt = !g._slamSndAlt;
          BT_AUDIO.play('mine-strike', { offset: g._slamSndAlt ? 0.08 : 0.6, duration: 0.45, vol: 0.6 });
        }
      } catch (e) {}
    };

    const onPointerMove = (e) => {
      const sw = swipeRef.current;
      if (!sw) return;
      const ex = readyExtraction();
      if (!ex || !ex._gesture) return;
      const x = e.clientX, y = e.clientY;
      sw.samples.push({ x, y, t: performance.now() });
      if (e.cancelable) e.preventDefault();

      const g = ex._gesture;
      if (ex.skill === 'fishing') {
        const ang = Math.atan2(y - g.cueY, x - g.cueX);
        const _dAng = wrapPi(ang - g.lastAngle);
        g.totalAngle += _dAng;   /* clockwise (screen y-down) = + */
        g.lastAngle = ang;
        /* v2.3.1422: stamp active cranking so the reel-loop SFX
           (effectsRenderer) plays only while the handle is turning. */
        if (Math.abs(_dAng) > 0.02) ex._reelSpinAt = performance.now();
      } else {
        stepOscillation(g, (ex.skill === 'mining' || ex.skill === 'cooking') ? y : x, ex.skill);
      }

      /* v2.3.1417: GESTURE-TOOL FRAME DRIVER — the painted tool sprite in
         the world cue (effectsRenderer._updateExtractionCue) plays its
         8-frame sheet from this phase, so the tool physically follows the
         finger (owner: "a pickaxe that moves frames depending on where
         your finger moves when mining, or a reel that rotates when
         fishing").  Fishing maps the accumulated circle angle straight to
         the crank rotation (one finger-circle = one crank turn); the
         stroke skills scrub the swing with signed finger deltas — mining
         swings on the DOWN stroke, cooking flips on the UP flick, the axe
         chops TOWARD the tree — and rewind on the return stroke. */
      if (ex.skill === 'fishing') {
        ex.cueFrame01 = ((g.totalAngle / (Math.PI * 2)) % 1 + 1) % 1;
      } else {
        const _n = sw.samples.length;
        const _prev = _n > 1 ? sw.samples[_n - 2] : null;
        if (_prev) {
          const SPAN = ex.skill === 'cooking' ? 130 : 110; /* px of travel for a full swing */
          let _d;
          if (ex.skill === 'mining') _d = (y - _prev.y) / SPAN;
          else if (ex.skill === 'cooking') _d = (_prev.y - y) / SPAN;
          else _d = ((x - _prev.x) * (g.treeward || 1)) / SPAN;
          ex.cueFrame01 = Math.max(0, Math.min(1, (ex.cueFrame01 || 0) + _d));
        }
      }

      const reps = repsFromGesture(ex.skill, g);
      const target = ex.repsTarget || repsTargetFor(ex.skill);
      ex.reps = reps;
      ex.progress = Math.max(0, Math.min(1, reps / target));

      if (ex.progress >= 1) {
        /* Meter full — grade, fingerprint, and fire success once. */
        const windowDur = Math.max(1, ex.windowClosesAt - ex.windowOpensAt);
        const fillFrac = (performance.now() - g.startT) / windowDur;
        let pathLen = 0;
        for (let i = 1; i < sw.samples.length; i++) {
          pathLen += Math.hypot(sw.samples[i].x - sw.samples[i - 1].x,
                                sw.samples[i].y - sw.samples[i - 1].y);
        }
        const ent = Number(vectorEntropy(sw.samples).toFixed(3));
        const dur = sw.samples.length
          ? sw.samples[sw.samples.length - 1].t - sw.samples[0].t : 0;
        /* v2.3.694: richer fingerprint for the server's anomaly accumulator.
           n = sample count, tv = timing variance, vc = velocity curvature,
           h = replay-detection hash. */
        ex.swipeFp = {
          len: Math.round(pathLen), ent, dur: Math.round(dur),
          n: sw.samples.length,
          tv: Math.round(timingVariance(sw.samples)),
          vc: velocityCurvature(sw.samples),
          h: pathHash(sw.samples),
        };
        const accuracy = gradeGesture(fillFrac, ent);
        swipeRef.current = null;
        if (typeof onSuccess === 'function') onSuccess(accuracy);
      }
    };

    const onPointerUp = () => {
      /* Pause: drop the active press but keep ex._gesture so a re-press resumes
         and the cue meter holds its progress. */
      swipeRef.current = null;
    };

    target.addEventListener('pointerdown', onPointerDown, { passive: false });
    target.addEventListener('pointermove', onPointerMove, { passive: false });
    target.addEventListener('pointerup', onPointerUp, { passive: false });
    target.addEventListener('pointercancel', onPointerUp, { passive: false });
    return () => {
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
    };
  }, [stateRef, onSuccess]);

  /* No DOM output — pointer events are captured at window level, gated on
     extraction status. Exists purely for the useEffect lifecycle. */
  return null;
};
