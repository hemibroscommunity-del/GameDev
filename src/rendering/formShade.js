/* ═══ v2.3.2767: FORM SHADING -- LIGHT FROM ABOVE, ON EVERY FIGURE AND PROP ═══
 *
 * Owner: "I love gradient colors to make things 'pop' more.  I'm wondering if
 * there's a way you can add that kind of subtle shadowing on the game's
 * geometry, including the character."
 *
 * WHAT IT DOES.  Every shaded object gets a vertical colour gradient: its top
 * as painted (a breath warmer), its base a cool shade.  Light from the sky,
 * shadow pooling toward the ground -- the "form shading" the painted art
 * already has inside each object, restated across the WHOLE object so it
 * reads as one lit form standing on the ground rather than a cut-out.
 *
 * HOW, AND WHY NOT A FILTER OR A BAKE.  The research for this (v2.3.2767) went
 * through the three obvious routes and each fails somewhere:
 *   - a Pixi Filter per figure: one render-target switch and an extra pass
 *     per figure per frame, 20-40 figures in town, on iPhone Safari;
 *   - baking the gradient into each sheet at load: a character is ~20 layered
 *     sprites from sheets of different frame geometry (the bow sheets are 642
 *     x 241, the body strips 256-square, hats and hair crown-anchored), so a
 *     per-file gradient lands at a different height on each layer and the
 *     figure comes out banded;
 *   - one overlay layer: cannot respect the depth buckets (depthSort.js).
 * Instead this uses what the GPU already does for free.  Every sprite quad is
 * sent to the batcher with a colour per CORNER, and the fragment colour is
 * interpolated between them -- the same four colours are normally identical
 * (the sprite's tint).  Giving the two bottom corners a darker, cooler colour
 * than the two top ones IS a linear vertical gradient, at zero extra cost:
 * same batch, same draw call, no extra pass, no texture.  It is a patch on
 * DefaultBatcher.packQuadAttributes, the single function that writes those
 * corners.
 *
 * ONE GRADIENT PER FIGURE, NOT PER PIECE.  A character's container carries
 * `_vShadeRef` (its spriteBody, whose frame spans head to feet), and every
 * sprite inside it (directly, or one group down -- never its `_uiLayer`) is
 * shaded by where its corners sit in THAT span,
 * in render-group space.  So body, clothes, gear, hair, hat, weapon and
 * shield all take the same colour at the same height -- no band at a hat
 * brim or a belt.  A single-sprite object (prop, tree, rock, monster, NPC,
 * the combat stand-ins) is shaded across its own quad via `_vShade`.
 *
 * WHAT IT CANNOT TOUCH.  Scenery painted into a map image (the image zones'
 * ground and the World View) is one big sprite, not separate objects.
 *
 * Off switches: `?shade=0` on the URL (per load), `window.__btShadeOff = true`
 * (live, for an on/off pixel diff; since v2.3.3449 a flip rebuilds every draw
 * list, drawLists.js, as a still sprite is packed only then).  Probe:
 * `window.__btShade`.
 */
import { DefaultBatcher } from 'pixi.js';
import { liveSwitch } from './drawLists.js';

/* [top rgb multipliers, bottom rgb multipliers].  Top: as painted, a hair
   warm.  Bottom: a cool shade.  Figures lighter than props: a character is
   small on screen and must not lose its face or its feet to the shade. */
export const SHADE = {
  figure: { top: [1.0, 0.99, 0.95], bot: [0.72, 0.75, 0.90] },
  prop:   { top: [1.0, 1.0, 0.97],  bot: [0.64, 0.67, 0.84] },
  /* ═══ v2.3.2893: SNOW IS NOT SHADED BLUE-VIOLET IN DAYLIGHT ═══
     Owner: "the prop has a very strong bluish tint that doesn't match the
     background during daytime -- in snow level."  `prop`'s base multiplies
     blue down least of the three channels, which on warm town stone reads as
     a cool shadow -- and on WHITE snow is a plain colour cast: the lower half
     of every Frost Ridge snowbank came out lilac against the painted snow
     round it, which is white with only a breath of blue in its shade.  A
     snow prop keeps some weight toward the ground (the form shading's point)
     but near-neutral, a touch of blue at most, the way the painting's own
     snow shadows are. */
  propSnow: { top: [1.0, 1.0, 1.0],  bot: [0.86, 0.87, 0.90] },
};
/* ═══ v2.3.3624: ONE FIGURE'S SHADE, LAID ON ANOTHER'S QUAD ═══
   A sprite shaded across its own quad (`_vShade`) takes `{top, bot}` at its
   quad's top and bottom.  This gives a quad from world y `qTop` to `qBot` the
   values `spec` has at those heights when it runs over a figure's span `span`
   ([top, bottom], world y) -- the gradient is linear, so the quad shades
   exactly as that figure would there; past the span's ends it is held to
   0..1 (a multiplier over 1 would carry into the next colour byte).  `out` is
   filled and returned. */
export function spanSpec(spec, span, qTop, qBot, out) {
  const o = out || { top: [1, 1, 1], bot: [1, 1, 1] };
  const h = span[1] - span[0];
  const at = (y, dst) => {
    const t = h > 0 ? (y - span[0]) / h : 0;
    for (let j = 0; j < 3; j++) dst[j] = Math.max(0, Math.min(1, spec.top[j] + (spec.bot[j] - spec.top[j]) * t));
  };
  at(qTop, o.top); at(qBot, o.bot);
  return o;
}

/* Which prop shade a zone's props take.  Frost is the snow map; every other
   zone keeps `prop`. */
const SNOW_ZONES = Object.assign(Object.create(null), { frost: true });
export function propShade(zoneId) {
  return (zoneId && SNOW_ZONES[zoneId]) ? SHADE.propSnow : SHADE.prop;
}

let _on = true;
try {
  if (typeof location !== 'undefined' && /[?&]shade=0\b/.test(location.search)) _on = false;
} catch (e) { /* no location: on */ }
export const formShadeOn = () => _on;

let _count = 0;
/* v2.3.3449: window.__btShadeOff, read below as a plain field */
const _liveOff = liveSwitch('__btShadeOff');

function mul(c, k) {
  /* aColor is 0xAABBGGRR (little-endian RGBA bytes); alpha untouched */
  const r = Math.round((c & 255) * k[0]);
  const g = Math.round(((c >>> 8) & 255) * k[1]);
  const b = Math.round(((c >>> 16) & 255) * k[2]);
  return ((c & 0xff000000) | (b << 16) | (g << 8) | r) >>> 0;
}
function mix(k0, k1, t) {
  return [k0[0] + (k1[0] - k0[0]) * t, k0[1] + (k1[1] - k0[1]) * t, k0[2] + (k1[2] - k0[2]) * t];
}

/* The figure's head-to-feet span in render-group y, from its spriteBody's
   frame: the container's group transform, the reference sprite's LOCAL
   position/scale and its texture height.  Read from the container, not the
   reference, because the reference is invisible and an invisible node's own
   transform is not guaranteed fresh. */
function figureSpan(p) {
  const ref = p._vShadeRef;
  const tex = ref && ref.texture;
  const h = tex && tex.orig ? tex.orig.height : 0;
  if (!h) return null;
  const sy = ref.scale.y;
  const top = ref.y - ref.anchor.y * h * sy;
  const bot = top + h * sy;
  const gt = p.groupTransform;
  const y0 = gt.ty + gt.d * top, y1 = gt.ty + gt.d * bot;
  return y1 > y0 ? [y0, y1] : [y1, y0];
}

/* ═══ v2.3.3449: A FIGURE'S PIECES ARE SHADED AGAIN WHEN ITS SPAN CHANGES ═══
   A piece is shaded when Pixi packs it into its batch, and Pixi packs it
   again only when IT changes (it moves, its picture or its tint changes).
   The span it is shaded over comes from the figure's spriteBody, which is
   invisible, so a new frame on it packs nothing again.  Until v2.3.3449 that
   never showed: the world's whole draw list was rebuilt, every quad packed
   again, every frame (drawLists.js).  Since each layer keeps its own list, a
   piece that stands still keeps the span it was packed with -- so once a
   frame, before the draw, every figure whose span has moved has its pieces
   packed again, through Pixi's own update (no rebuild): the pieces this
   batcher shades by the span, the figure's sprites and those one group down
   but its name plate's (`_uiLayer`).  A figure is listed the first time one
   of its pieces is shaded by its span, and dropped once destroyed. */
const _figs = new Set();
let _refreshed = 0;
function noteSpan(p) {
  const ref = p._vShadeRef;
  const tex = ref && !ref.destroyed ? ref.texture : null;
  const h = tex && tex.orig ? tex.orig.height : 0;
  const top = h ? ref.y - ref.anchor.y * h * ref.scale.y : 0;
  const bot = h ? top + h * ref.scale.y : 0;
  if (ref === p._shadeRef && top === p._shadeTop && bot === p._shadeBot) return false;
  p._shadeRef = ref; p._shadeTop = top; p._shadeBot = bot;
  return true;
}
function repackFigure(p) {
  const k = p.children;
  for (let i = 0; i < k.length; i++) {
    const c = k[i];
    if (c.renderPipeId === 'sprite') { c.onViewUpdate(); _refreshed++; continue; }
    if (c === p._uiLayer || !c.children) continue;
    const g = c.children;
    for (let j = 0; j < g.length; j++) if (g[j].renderPipeId === 'sprite') { g[j].onViewUpdate(); _refreshed++; }
  }
}
/** pixiRenderer.js, once a frame after the figures are posed, before the
 *  draw.  Returns how many figures were packed again. */
export function refreshFigureShades() {
  if (!_on || _figs.size === 0) return 0;
  let n = 0;
  for (const p of _figs) {
    if (p.destroyed) { _figs.delete(p); continue; }
    if (noteSpan(p)) { repackFigure(p); n++; }
  }
  return n;
}

if (_on && DefaultBatcher && DefaultBatcher.prototype && DefaultBatcher.prototype.packQuadAttributes) {
  const orig = DefaultBatcher.prototype.packQuadAttributes;
  DefaultBatcher.prototype.packQuadAttributes = function (el, f32, u32, idx, tid) {
    orig.call(this, el, f32, u32, idx, tid);
    const r = el.renderable;
    if (!r) return;
    let spec = r._vShade;
    let span = null;
    if (!spec) {
      let p = r.parent;
      if (!p) return;
      /* one level of nesting too (the weapon holder, the block arm group),
         but never the name plate / bars layer -- UI is not lit by the sun */
      if (!p._vShadeKids) {
        const g = p.parent;
        if (!g || !g._vShadeKids || p === g._uiLayer) return;
        p = g;
      }
      spec = p._vShadeKids;
      /* v2.3.3449: listed, its span noted (refreshFigureShades) -- before the
         span is asked for, so a figure whose body has no picture yet is
         packed again when it has one */
      if (!p._shadeListed) { p._shadeListed = true; _figs.add(p); noteSpan(p); }
      span = figureSpan(p);
      if (!span) return;
    }
    if (_liveOff.on) return;
    const c = el.color;
    if (!span) {
      /* own quad: corners 0,1 are the top edge, 2,3 the bottom (see
         DefaultBatcher: h1 = bounds.minY, h0 = bounds.maxY) */
      /* v2.3.2859: a CROPPED frame's quad is only the painted part of the
         frame (Pixi bounds a trimmed sprite by `trim`), so the gradient would
         run top-to-bottom of the art rather than of the frame, and a cropped
         figure would shade differently from the same figure uncropped.  Give
         the corners the values the whole frame has at the crop's rows -- the
         gradient is linear, so this is exactly the uncropped shading. */
      const tx = el.texture || r.texture;
      const tr = tx && tx.trim, og = tx && tx.orig;
      let kTop = spec.top, kBot = spec.bot;
      if (tr && og && og.height > 0) {
        kTop = mix(spec.top, spec.bot, tr.y / og.height);
        kBot = mix(spec.top, spec.bot, (tr.y + tr.height) / og.height);
      }
      const top = mul(c, kTop), bot = mul(c, kBot);
      u32[idx + 4] = top; u32[idx + 10] = top;
      u32[idx + 16] = bot; u32[idx + 22] = bot;
    } else {
      const y0 = span[0], inv = 1 / (span[1] - span[0]);
      for (let v = 0; v < 4; v++) {
        const o = idx + v * 6;
        let t = (f32[o + 1] - y0) * inv;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        u32[o + 4] = mul(c, mix(spec.top, spec.bot, t));
      }
    }
    _count++;
  };
}

/* The combat / gathering stand-ins: loose sprites the effects renderer draws
   while the player's own display is hidden (lightfx/casters.js lists them).
   Marked here each frame rather than at each of their many creation sites --
   a flag write on a few dozen fields, and nothing if already marked.  The
   shared trait set (hair, hat) is deliberately NOT marked: those quads are
   small and near the top, where the gradient is as painted anyway, and an
   own-quad gradient would darken a hat's brim. */
export function markStandIns(fx, fields, peerMaps) {
  if (!_on || !fx) return;
  for (let i = 0; i < fields.length; i++) {
    const sp = fx[fields[i]];
    if (sp && !sp._vShade) sp._vShade = SHADE.figure;
  }
  for (let i = 0; i < peerMaps.length; i++) {
    const m = fx[peerMaps[i]];
    if (!m) continue;
    for (const id in m) markTree(m[id], 0);
  }
}
function markTree(o, depth) {
  if (!o || depth > 2) return;
  if (o.texture !== undefined && o.anchor) { if (!o._vShade) o._vShade = SHADE.figure; return; }
  if (typeof o !== 'object') return;
  for (const k in o) {
    if (k === 'traits' || k === 'hair' || k === 'hat') continue;
    const v = o[k];
    if (v && typeof v === 'object') markTree(v, depth + 1);
  }
}

if (typeof window !== 'undefined') {
  window.__btShade = () => ({ on: _on, off: _liveOff.on, quadsShadedTotal: _count, figures: _figs.size, piecesRefreshed: _refreshed });
}
