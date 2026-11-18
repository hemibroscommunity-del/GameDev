/* ═══ v2.3.6220: THE UI SYSTEM'S LEAVES OF effectsRenderer.js (card FX) ═══
 *
 * Top-level functions of src/rendering/systems/effectsRenderer.js that read
 * no `this` and reach no module state (the code census, part 5 of
 * docs/plan/census/M-tables.md), moved here VERBATIM -- each body byte for
 * byte, its comment with it; only `export` and the imports are new -- and
 * imported back by name.  A constant only they read came with them.
 *
 * A leaf imports nothing from the renderers (four-lines' IMPORT_CYCLE_FILES
 * has no room): only what the renderer itself imported, from the same files. */
import { swHas } from '@/game/switches.js';
import { readSourceRect } from '../heldNumbers.js';
import { Texture, Rectangle } from 'pixi.js';

/* ═══ v2.3.3192: ...AND ONE SIZE ON THE SCREEN, WHATEVER THE ZOOM ═══
   Owner, offered numbers and messages pinned to one size on the screen like
   the name plates: "Yes do fixed size instead".

   Every size and distance in this popup code is in world px AS DRAWN AT
   POPUP_ZOOM: the world's scale on the 390 x 844 phone with the dashboard
   folded (VIEW_OUT 0.77 x its 806 px canvas / 1024 -- the bro 64 px tall,
   v2.3.3020), the zoom every one of them was tuned at (v2.3.3033): a plain
   hit's type 22.3 CSS px, a crit's 40.3.  Each frame the world's own scale is
   divided back out -- `Z` = POPUP_ZOOM / S._worldScaleX, as the name plates
   (v2.3.2513) and the chat bubble (v2.3.2247) do theirs -- so with the
   dashboard up (scale 0.4625) a popup is drawn 1.31x the world px and is the
   same on the screen, and on a bigger phone, sideways or in the desktop shell
   it is that CSS size too.  Z scales a popup's size AND everything measured
   from where it was pushed -- its lift, its place in a stack, its climb, its
   mark and the gap before it, its wrap and its margin from the screen's edge
   -- so it looks at every zoom as it does at POPUP_ZOOM; only the spot it was
   pushed at (over a bar, over your head) stays the world's.  `?popupworld`
   draws them in the world as before, to compare. */
export const POPUP_ZOOM = 0.606;
export const POPUP_Z_MIN = 0.25, POPUP_Z_MAX = 3;   /* a sanity bound (a near-zero scale from a mid-rebuild frame), never a design term */
export const POPUP_WORLD = typeof location !== 'undefined' && swHas('popupworld');
export function popupZoomK(S) {
  const w = S && S._worldScaleX;
  if (POPUP_WORLD || !(w > 0.01)) return 1;
  return Math.min(POPUP_Z_MAX, Math.max(POPUP_Z_MIN, POPUP_ZOOM / w));
}
/* ═══ v2.3.3192: ...AND A LONG ONE WRAPS, NEVER SHRINKS ═══
   At that size a long message is wider than a phone: "Element Burst needs an
   enchanted weapon" is ~750 world px, a "📢" announcement (60 characters)
   ~1,000, and an upright phone sees ~640 world px across in the Wheel (the
   bro 64 px tall, worldViewport).  So a message wider than MSG_WRAP_W is
   broken at its spaces into as few lines as fit, as even as they can be,
   centred (msgLines) -- the type stays the numbers' size.  520 is about 26
   characters a line, so the common ones keep one ("Return to Mayor Bro",
   "Requires Woodcutting Lv 10"), and at most MSG_MAX_LINES; on a narrower
   screen no wider than MSG_WRAP_SCREEN of it (popups being one CSS size, a
   320 px phone gets ~21 characters a line).  And it is kept inside the view,
   MSG_EDGE_PX clear of its sides (_updateDamageNumbers): over you against a
   dungeon's wall the camera stops following, and half of a centred message
   would be off the screen. */
export const MSG_WRAP_W = 520;
export const MSG_WRAP_SCREEN = 0.82;
/* The widest a message may be laid out, in popup px: MSG_WRAP_W, or less where
   the screen (its CSS width = the view x the world's scale) is narrower. */
export function msgWrapW(S) {
  const cssW = S && S._viewW > 0 && S._worldScaleX > 0.01 ? S._viewW * S._worldScaleX : 0;
  return cssW > 0 && !POPUP_WORLD ? Math.min(MSG_WRAP_W, MSG_WRAP_SCREEN * cssW / POPUP_ZOOM) : MSG_WRAP_W;
}
/* `words` laid in `n` lines whose longest is as short as it can be, by
   characters (within one message its letters are near enough one width), each
   line at least one word.  A message is a dozen words at most, so every way of
   cutting it is tried. */
export function msgLines(words, n) {
  const m = words.length;
  n = Math.min(n, m);
  if (n <= 1) return [words.join(' ')];
  const pre = [0];
  for (let i = 0; i < m; i++) pre.push(pre[i] + words[i].length);
  const len = (i, j) => pre[j] - pre[i] + (j - i - 1);   /* words[i..j-1] with a space between each */
  /* best[l][j]: the shortest possible longest line, laying the first j words in l lines; cut[l][j]: where that l-th line starts */
  const best = [], cut = [];
  for (let l = 0; l <= n; l++) { best.push(new Array(m + 1).fill(Infinity)); cut.push(new Array(m + 1).fill(0)); }
  best[0][0] = 0;
  for (let l = 1; l <= n; l++) {
    for (let j = l; j <= m; j++) {
      for (let i = l - 1; i < j; i++) {
        const v = Math.max(best[l - 1][i], len(i, j));
        if (v < best[l][j]) { best[l][j] = v; cut[l][j] = i; }
      }
    }
  }
  const lines = [];
  for (let l = n, j = m; l > 0; l--) { const i = cut[l][j]; lines.unshift(words.slice(i, j).join(' ')); j = i; }
  return lines;
}
export function _tightPopupIcon(tex) {
  try {
    const src = tex && tex.source;
    const img = src && src.resource;
    const w = src && (src.pixelWidth || src.width), h = src && (src.pixelHeight || src.height);
    if (!img || !(w > 0) || !(h > 0) || w > 1024 || h > 1024 || typeof document === 'undefined') return tex;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    if (!readSourceRect(g, src, 0, 0, w, h, 0, 0, 'popup-cut')) { cv.width = cv.height = 0; return tex; }   /* v2.3.5250: a popup kept as colour numbers too (p256.js, the world's icons): its resource is never drawn as a picture */
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (d[row + x * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    cv.width = cv.height = 0;
    if (x1 < x0 || y1 < y0) return tex;
    const r = src.resolution || 1;
    const cut = new Texture({ source: src, frame: new Rectangle(x0 / r, y0 / r, (x1 - x0 + 1) / r, (y1 - y0 + 1) / r) });
    cut._tight = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];   /* for the QA probe */
    return cut;
  } catch (e) { return tex; }   /* the whole picture, as before */
}
/* Cheap ASCII test — anything outside 0x20-0x7E is treated as emoji. */
export function isAsciiOnly(s) {
  if (typeof s !== 'string') return true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c > 0x7E) return false;
  }
  return true;
}
