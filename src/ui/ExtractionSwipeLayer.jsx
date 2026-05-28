import React, { useEffect, useRef } from 'react';

/* v2.3.229 — ExtractionSwipeLayer
 *
 * Captures the dynamic-event swipe for the new resource extraction loop.
 * Sits above the game canvas as a transparent fixed-position layer.
 * Listens to native pointer events (passive: false) so iOS Safari
 * actually delivers preventDefault on touchmove.
 *
 * Activation: only routes events while stateRef.current._extraction.status
 * === 'ready'. Otherwise it lets every pointer event fall through to the
 * underlying game canvas / dashboard.
 *
 * On a valid swipe (per-skill direction + length), calls onSuccess()
 * which routes to BroTown's _succeedExtraction and clears the state.
 * On invalid / no swipe, the game tick handles the miss when the
 * window closes.
 */

const MIN_SWIPE_LEN = 30; /* px in screen space */
const FISHING_UP_THRESHOLD = -30; /* dy must be at least this negative */
/* Start point must be within this many pixels of the on-screen cue
   to count as an extraction swipe. Stops joystick deflections from
   accidentally registering as swipes (the left stick lives at the
   bottom-left corner; an upward drag there is "move north", NOT
   "reel in the fish"). */
const SWIPE_START_RADIUS = 160;

function isValidSwipe(skill, dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < MIN_SWIPE_LEN) return false;
  if (skill === 'fishing') {
    /* Upward swipe: vertical component dominates, dy clearly negative. */
    return dy <= FISHING_UP_THRESHOLD && Math.abs(dy) >= Math.abs(dx);
  }
  /* Woodcutting / mining -- any direction with enough length. */
  return true;
}

function vectorEntropy(samples) {
  /* Rough "is this a hand-drawn swipe vs a synthetic one" signal.
     Hand swipes show varying inter-sample angles; replayed bot
     swipes tend to be near-collinear. Returns 0..~1. */
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

export const ExtractionSwipeLayer = ({ stateRef, onSuccess }) => {
  const swipeRef = useRef(null); /* { startX, startY, samples: [] } */

  useEffect(() => {
    /* Native listeners so we can call preventDefault on iOS Safari --
       React's synthetic onTouchMove is silently passive there. */
    const target = window;
    const isExtractionReady = () => {
      const S = stateRef && stateRef.current;
      return !!(S && S._extraction && S._extraction.status === 'ready');
    };

    const cueScreenPos = () => {
      const S = stateRef && stateRef.current;
      if (!S || !S._extraction || !S.camera) return null;
      const ex = S._extraction;
      const node = (ex.nodeRef && ex.nodeRef.alive) ? ex.nodeRef
                 : (S.gatherNodes && ex.nodeId
                    ? S.gatherNodes.find(n => n.id === ex.nodeId)
                    : null);
      if (!node) return null;
      const yOff = node.nodeType === 'tree' ? 96 : node.nodeType === 'oreVein' ? 36 : 30;
      return {
        x: node.x - S.camera.x,
        y: (node.y - yOff) - S.camera.y,
      };
    };

    const onPointerDown = (e) => {
      if (!isExtractionReady()) return;
      const cue = cueScreenPos();
      if (!cue) return;
      const x = e.clientX, y = e.clientY;
      const dx = x - cue.x, dy = y - cue.y;
      if (Math.sqrt(dx * dx + dy * dy) > SWIPE_START_RADIUS) return;
      swipeRef.current = { startX: x, startY: y, samples: [{ x, y, t: performance.now() }] };
    };

    const onPointerMove = (e) => {
      if (!swipeRef.current) return;
      const x = e.clientX, y = e.clientY;
      swipeRef.current.samples.push({ x, y, t: performance.now() });
      /* Allow scrolling to be prevented during an active swipe so
         the page doesn't pull-to-refresh under the swipe motion. */
      if (e.cancelable) e.preventDefault();
    };

    const onPointerUp = (e) => {
      const sw = swipeRef.current;
      swipeRef.current = null;
      if (!sw) return;
      const S = stateRef && stateRef.current;
      if (!S || !S._extraction || S._extraction.status !== 'ready') return;
      const skill = S._extraction.skill;
      const dx = e.clientX - sw.startX;
      const dy = e.clientY - sw.startY;
      if (!isValidSwipe(skill, dx, dy)) return;
      /* Compute fingerprint features for the anti-bot payload. Stashed
         on the extraction record so _applyXReward (or the node_strike
         payload added in Phase 5) can pick them up. */
      const dur = sw.samples.length
        ? sw.samples[sw.samples.length - 1].t - sw.samples[0].t
        : 0;
      let pathLen = 0;
      for (let i = 1; i < sw.samples.length; i++) {
        const px = sw.samples[i].x - sw.samples[i - 1].x;
        const py = sw.samples[i].y - sw.samples[i - 1].y;
        pathLen += Math.sqrt(px * px + py * py);
      }
      S._extraction.swipeFp = {
        len: Math.round(pathLen),
        ent: Number(vectorEntropy(sw.samples).toFixed(3)),
        dur: Math.round(dur),
      };
      if (typeof onSuccess === 'function') onSuccess();
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

  /* No DOM output — pointer events are captured at window level and
     gated on extraction status. This component exists purely for the
     useEffect lifecycle. */
  return null;
};
