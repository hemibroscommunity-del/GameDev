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
 *
 * v2.3.2987 (owner: "Yes do dodges and walking too"): the dodge roll and the
 * jog come the same way, off the OTHER renderer -- they are not stand-ins
 * but the player's own figure in two of its poses, so they are photographed
 * off EntityRenderer.capturePoseFrames (the note there says how).
 */
let _effects = null;
let _entities = null;

/** pixiRenderer, once, after the renderers exist. */
export function setFighterEffects(effects, entities) {
  _effects = effects || null;
  _entities = entities || null;
}

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
    grip: cap.grip ? [cap.grip[0] - x0 / res, cap.grip[1] - y0 / res] : null,   /* v2.3.2991 */
    k: cap.k || null, arrowLen: cap.arrowLen || null, arrowLead: cap.arrowLead || null,   /* v2.3.2991: the figure's scale; the bow's arrow at it */
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

/**
 * v2.3.2987: the hero's dodge roll or his jog, frame by frame, as the world
 * draws his own figure.
 *   kind  'dodge' | 'jog'
 *   opts  { bodyH, res, weapon, shield } -- see capturePoseFrames
 * Returns what captureAttack returns, or null.
 */
export function capturePose(kind, opts) {
  if (!_entities || typeof _entities.capturePoseFrames !== 'function') return null;
  let cap = null;
  try { cap = _entities.capturePoseFrames(kind, opts); } catch (e) { cap = null; }
  if (!cap || !cap.frames || !cap.frames.length) return null;
  try { return cropToPaint(cap); } catch (e) { return null; }
}

/* ═══ v2.3.2991: FILMS -- THE WORLD'S EFFECTS ROUND A HIT ═══
 * Owner: "Also special attacks need to animate ... make it so the slime shows
 * the hit effect (green gunk coming out after getting hit) ... make sure
 * arrows stick in the monster too."  The spray, the stuck shaft and its
 * wound, the white-hot special and the staff's crash, filmed off private
 * copies of the world's own effect classes (EffectsRenderer.captureFxFilm --
 * the note there says how).  Here they are cropped and turned into what the
 * scene's DOM can play: a horizontal STRIP per layer, stepped by the same CSS
 * (`bt-sd-strip`, steps()) the slime's own strips are -- so a film costs the
 * scene no frame loop and no React render per frame.
 *
 * Cropped to the union of what EVERY layer of EVERY frame paints, so the
 * layers keep one box (the spray behind the slime and in front of it are one
 * spray).  The strip is a data URL, made once per window: synchronous, and a
 * same-origin image the stage can use at once.  Wider than 4096 device px is
 * a texture older iPhones cannot hold, so a film that would be is refused. */
function cropFilm(cap) {
  const res = cap.res || 1;
  const fw = cap.layers[0][0].width, fh = cap.layers[0][0].height;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const layer of cap.layers) {
    for (const cv of layer) {
      let px = null;
      try { px = cv.getContext('2d').getImageData(0, 0, fw, fh).data; } catch (e) { px = null; }
      if (!px) continue;
      for (let y = 0; y < fh; y++) {
        const row = y * fw * 4;
        for (let x = 0; x < fw; x++) {
          if (px[row + x * 4 + 3] > 8) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
    }
  }
  if (x1 < x0 || y1 < y0) return null;
  const pad = 1;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(fw - 1, x1 + pad); y1 = Math.min(fh - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  /* too wide for one strip: every other frame, until it fits -- the film
     keeps its length and loses smoothness, never its end */
  let pick = cap.layers[0].map((_, i) => i);
  while (cw * pick.length > 4096 && pick.length > 4) pick = pick.filter((_, i) => i % 2 === 0);   /* evenly spaced, as steps() plays them */
  if (cw * pick.length > 4096) return null;
  const n = pick.length;
  /* one strip per layer: frame i at x = i * cw */
  const strips = cap.layers.map((layer) => {
    const c = document.createElement('canvas');
    c.width = cw * n; c.height = ch;
    const g = c.getContext('2d');
    pick.forEach((fi, i) => g.drawImage(layer[fi], x0, y0, cw, ch, i * cw, 0, cw, ch));
    let painted = false;
    try {
      const d = g.getImageData(0, 0, c.width, c.height).data;
      for (let j = 3; j < d.length; j += 4) if (d[j] > 8) { painted = true; break; }
    } catch (e) { painted = true; }
    return painted ? c.toDataURL('image/png') : null;
  });
  return {
    strips, frames: n, ms: cap.ms, res,
    w: cw / res, h: ch / res,
    origin: [cap.origin[0] - x0 / res, cap.origin[1] - y0 / res],
    /* the stuck films' point of entry, and the flying arrow's point ahead of its pivot */
    entry: cap.entry ? [cap.entry[0] - x0 / res, cap.entry[1] - y0 / res] : [cap.origin[0] - x0 / res, cap.origin[1] - y0 / res],
    tip: cap.tip || 0,
  };
}

/* A film depends on nothing but what it is asked for -- not on the
   character, whose look only the swing carries -- so it is kept: the second
   window opened on a lane plays at once instead of photographing again (a
   film is a few tens of ms of drawing and a GPU readback).  `take` tells two
   otherwise identical asks apart (the gunk's two takes).  A few at most. */
const FILM_KEEP = 16;
const _films = new Map();

/**
 * v2.3.2991: one of the world's effects round a hit, as strips.
 *   kind  'gunk' | 'stuck' | 'hotArrow' | 'hotStuck' | 'crash'
 *   opts  see EffectsRenderer.captureFxFilm (texelPx, arrowLen, res, weapon, at, ...)
 * Returns { strips: [dataURL|null per layer], frames, ms, w, h, origin: [x, y] }
 * in the caller's px, or null.
 */
export function captureFilm(kind, opts) {
  if (!_effects || typeof _effects.captureFxFilm !== 'function') return null;
  let key = null;
  try { key = kind + ':' + JSON.stringify(opts || {}); } catch (e) { key = null; }
  if (key && _films.has(key)) {
    const kept = _films.get(key);
    _films.delete(key); _films.set(key, kept);   /* most recent last */
    return kept;
  }
  let cap = null;
  try { cap = _effects.captureFxFilm(kind, opts); } catch (e) { cap = null; }
  if (!cap || !cap.layers || !cap.layers.length || !cap.layers[0].length) return null;
  let film = null;
  try { film = cropFilm(cap); } catch (e) { film = null; }
  if (film && key) {
    _films.set(key, film);
    while (_films.size > FILM_KEEP) _films.delete(_films.keys().next().value);
  }
  return film;
}

/* QA probe (mp-statdemo): the capture on demand, so a rig can photograph the
   swing itself and hold the window's frames to it.  v2.3.2987: the roll and
   the jog by the same door.  v2.3.2991: and the films, by __btFighterFilm. */
if (typeof window !== 'undefined') {
  window.__btFighterCapture = (kind, opts) => ((kind === 'dodge' || kind === 'jog') ? capturePose(kind, opts) : captureAttack(kind, opts));
  window.__btFighterFilm = (kind, opts) => captureFilm(kind, opts);
}
