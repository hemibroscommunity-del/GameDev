/* ═══ v2.3.3852: EVERY FRAME, IS EACH HEAD PIECE YOU WEAR DRAWN? ═══
 *
 * The owner, 2026-10-29: "For disappearing traits sometimes it's a flicker",
 * and "keep trying to patch the causes of any flicker or missing traits
 * first."  The head-piece watch (entityRenderer _watchOwnHead, v2.3.3689)
 * reports a piece hidden for 2.5 s; a flicker is one frame, or a few.  So,
 * on a QA page (`?headframes` in the address; nothing at all otherwise), the
 * moment before each frame is drawn (pixiRenderer, beside app.render, the
 * renderer's own clock) this asks of your bro's every worn piece -- the hat,
 * the hair, the beard, the glasses, the eye style -- whether it is on screen:
 *   - on the walking figure, or on the stand-in that draws you while you
 *     swing, shoot or gather (effectsRenderer.skillTraits) -- either counts;
 *   - shown all the way up (every parent visible, renderable, not see-through),
 *   - with a picture that can draw (not freed, not the empty one, not 0 x 0,
 *     its source not freed).
 * A facing the piece does not ship ('design': a beard from behind) and a
 * roll frame with no head (flipHead.js) are not counted, nor a frame where
 * the whole bro is not drawn (a death, a zone's loading).  Every miss is
 * counted by its piece and its reason, the last 60 kept with the pose,
 * facing and frame: `window.__btHeadFrames()`, `window.__btHeadFrames(true)`
 * to start again.  mp-headframes plays a phone through it.
 */
import { Texture } from 'pixi.js';

export const HEAD_FRAMES_ON = typeof window !== 'undefined' && /[?&]headframes(=|&|$)/.test((window.location && window.location.search) || '');

/* the walking figure's sprite -> the stand-in set's (effectsRenderer) */
const PIECES = [
  ['headwear', '_headwearSprite', 'hat'],
  ['hair', '_hairSprite', 'hair'],
  ['facialhair', '_facialHairSprite', 'beard'],
  ['eyewear', '_eyewearSprite', 'eyewear'],
  ['eyestyle', '_eyeStyleSprite', 'eyestyle'],
];
const _hf = { frames: 0, counted: 0, missed: 0, byWhy: Object.create(null), log: [], bodyGone: 0 };

/* why `sp` draws nothing this frame, or null when it draws */
function whyNotDrawn(sp, stage) {
  if (!sp || sp.destroyed) return 'gone';
  if (!sp.visible) return 'hidden:' + (sp._btHide || '?');
  for (let p = sp.parent; p; p = p.parent) {
    if (!p.visible || p.renderable === false) return 'parent';
    if (p.alpha <= 0) return 'parent-alpha';
    if (p === stage) break;
  }
  if (!sp.parent) return 'unparented';
  if (sp.alpha <= 0.01) return 'alpha';
  const t = sp.texture;
  if (!t || t === Texture.EMPTY) return 'tex-empty';
  if (t.destroyed) return 'tex-freed';
  const s = t.source;
  if (!s || s.destroyed) return 'src-freed';
  if (!(t.frame && t.frame.width > 1 && t.frame.height > 1) || !(s.width > 1 && s.height > 1)) return 'tex-0';
  return null;
}

/**
 * Once a frame, before app.render.  `worn`: { headwear, hair, facialhair,
 * eyewear, eyestyle } -> id (entityRenderer's getters).
 */
export function headFrameTick(entityRenderer, effectsRenderer, stage, worn) {
  if (!HEAD_FRAMES_ON) return;
  const d = entityRenderer && entityRenderer.playerDisplay;
  if (!d || d.destroyed || !d._btHeadAt) return;
  _hf.frames++;
  const at = d._btHeadAt;
  const body = d._spriteBody;
  const standIn = effectsRenderer && effectsRenderer.skillTraits;
  /* the bro himself drawn? a walking body, or a stand-in carrying his pieces */
  const standInOn = !!standIn && PIECES.some(([, , k]) => standIn[k] && standIn[k].visible);
  if (!(body && body.visible && !whyNotDrawn(body, stage)) && !standInOn) { _hf.bodyGone++; return; }
  for (const [cat, field, sk] of PIECES) {
    const id = worn[cat];
    if (!id || id === 'none') continue;
    const sp = d[field];
    const hide = sp && sp._btHide;
    if (hide === 'design' || hide === 'dodge') continue;   /* not shipped / no head on this roll frame */
    _hf.counted++;
    const why = whyNotDrawn(sp, stage);
    if (!why) continue;
    const alt = standIn && standIn[sk];
    if (alt && !whyNotDrawn(alt, stage)) continue;   /* the stand-in draws it */
    _hf.missed++;
    const k = cat + ' ' + why;
    _hf.byWhy[k] = (_hf.byWhy[k] || 0) + 1;
    _hf.log.push({ f: _hf.frames, cat, id, why, standIn: alt ? whyNotDrawn(alt, stage) : null, pose: at.pose, dir: at.dir, mirror: at.mirror, frame: at.frameIdx, t: Math.round(performance.now()) });
    if (_hf.log.length > 60) _hf.log.shift();
  }
}

if (HEAD_FRAMES_ON && typeof window !== 'undefined') {
  window.__btHeadFrames = (reset) => {
    const out = { on: true, frames: _hf.frames, counted: _hf.counted, missed: _hf.missed, bodyGone: _hf.bodyGone, byWhy: { ..._hf.byWhy }, log: _hf.log.slice() };
    if (reset) { _hf.frames = 0; _hf.counted = 0; _hf.missed = 0; _hf.bodyGone = 0; _hf.byWhy = Object.create(null); _hf.log = []; }
    return out;
  };
}
