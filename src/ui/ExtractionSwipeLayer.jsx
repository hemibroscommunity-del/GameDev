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
      const node = nodeOf(S, ex);
      if (!node || !S.camera) return null;
      /* Fishing centers the reel gesture on the CHARACTER (the rod's reel is
         at the hands), matching the cue render in effectsRenderer — the user
         circles their finger over the player to reel.  A node-centered angle
         would be measured around a point up to ~100px away and fail to
         accumulate when the finger circles over the player instead. */
      if (ex.skill === 'fishing' && S.player) {
        return { x: S.player.x - S.camera.x, y: (S.player.y - 24) - S.camera.y };
      }
      const yOff = node.nodeType === 'tree' ? 96 : node.nodeType === 'oreVein' ? 36 : 30;
      return { x: node.x - S.camera.x, y: (node.y - yOff) - S.camera.y };
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
          axisRef: ex.skill === 'mining' ? y : x, /* value at last turning point */
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
        ex._gesture.axisRef = ex.skill === 'mining' ? y : x;
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
    };

    /* Spark burst + clink at the ore on a pickaxe slam. */
    const onSlam = (g) => {
      const S = stateRef && stateRef.current;
      if (!S || g.nodeX == null) return;
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
      try { if (BT_AUDIO) BT_AUDIO.beep(620, 0.045, 0.06, 'square'); } catch (e) {}
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
        g.totalAngle += wrapPi(ang - g.lastAngle);   /* clockwise (screen y-down) = + */
        g.lastAngle = ang;
      } else {
        stepOscillation(g, ex.skill === 'mining' ? y : x, ex.skill);
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
