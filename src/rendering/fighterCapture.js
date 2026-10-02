/* ═══ v2.3.2986: THE HERO'S ATTACK FRAMES, FOR THE STAT SCENE ═══
 *
 * Owner, on the Points window's little fight: "play the animation for
 * attacking as if the player and slime were in that little window having a
 * fight.  Right now it's just the static character standing and getting
 * nudged to the right and back to position."
 *
 * The frames are not drawn here.  They are PHOTOGRAPHED off the world's own
 * sword-swing and bow-shot stand-ins (EffectsRenderer.captureAttackFrames --
 * see the note there for why that, and not a second compositor), so the
 * figure in the window swings in the armour, hair, hat, cape and metal it
 * swings in on the map.  This module is only the hand-off: pixiRenderer
 * registers the effects renderer at start-up (the deathCrumble.setRenderer
 * pattern), and StatDemo -- a React component with no business holding a
 * renderer -- asks for frames by kind.
 *
 * Null whenever the world cannot supply them (no renderer yet, the strips
 * not in, a corpse on screen): the caller keeps its standing figure.
 */
let _effects = null;

/** pixiRenderer, once, after the EffectsRenderer exists. */
export function setFighterEffects(effects) { _effects = effects || null; }

/* Crop every frame to the UNION of what any frame paints.  The box the
   stand-in is photographed in is its authored frame plus headroom, and most
   of it is air on any one frame -- held for the life of the window, that air
   is real memory on a phone.  One box for all frames, so the feet stay put
   from frame to frame. */
function cropToPaint(cap) {
  const res = cap.res || 1;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  const data = [];
  for (const cv of cap.frames) {
    const w = cv.width, h = cv.height;
    let px = null;
    try { px = cv.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { px = null; }
    data.push(px);
    if (!px) continue;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (px[row + x * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  /* nothing painted on any frame: the photograph missed the figure, which is
     a failure, not an empty swing -- report it as one */
  if (x1 < x0 || y1 < y0) return null;
  const pad = 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(cap.frames[0].width - 1, x1 + pad); y1 = Math.min(cap.frames[0].height - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const frames = cap.frames.map((src) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
    return c;
  });
  return {
    frames, res, times: cap.times, dur: cap.dur,
    w: cw / res, h: ch / res,
    feet: [cap.feet[0] - x0 / res, cap.feet[1] - y0 / res],
  };
}

/**
 * The hero's attack, frame by frame, as the world draws it.
 *   kind  'sword' (every melee weapon swings the sword stand-in, as on the
 *         map) | 'bow'
 *   opts  { bodyH, res, weapon, shield } -- see captureAttackFrames
 * Returns { frames: [canvas], w, h, feet: [x, y], times: [ms], dur, res } in
 * the caller's px, or null.
 */
export function captureAttack(kind, opts) {
  if (!_effects || typeof _effects.captureAttackFrames !== 'function') return null;
  let cap = null;
  try { cap = _effects.captureAttackFrames(kind, opts); } catch (e) { cap = null; }
  if (!cap || !cap.frames || !cap.frames.length) return null;
  try { return cropToPaint(cap); } catch (e) { return null; }
}

/* QA probe (mp-statdemo): the capture on demand, so a rig can photograph the
   swing itself and hold the window's frames to it. */
if (typeof window !== 'undefined') window.__btFighterCapture = (kind, opts) => captureAttack(kind, opts);
