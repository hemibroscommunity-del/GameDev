/* ═══ v2.3.3152: PIXI'S TEXTURE POOL GIVES BACK WHAT IT IS NOT USING ═══
 *
 * Owner, 2026-10-11: "Push these to main then continue headless testing to
 * catch memory leaks."  The leak hunt listed what the GPU holds at home in the
 * Wheel after Great Cave trips: render textures 2.3 -> 8 -> 10 MB, as dozens of
 * power-of-two pictures nobody draws -- 31 of 512 x 64 after one cave trip.
 *
 * They are Pixi's TexturePool: the scratch textures its filters draw into
 * (the shadows, the armour's shine, every sprite mask) and the textures every
 * canvas Text is drawn on (a monster's name plate, a damage word, a chat
 * bubble), handed out by size and handed back when done -- and kept, on the
 * GPU, for ever.  So the pool holds the most of each size ever in use at once:
 * a cave wave puts ~30 name plates on screen together, and after it the pool
 * keeps ~30 plate-sized textures for the rest of the visit.
 *
 * Now a texture handed back is stamped, and one nobody has taken again for
 * IDLE_MS is destroyed (`sweepTexturePool`, from the render loop every few
 * seconds), and a zone change -- behind its loading screen -- lets go of every
 * texture in the pool.  A texture in the pool is free by Pixi's own contract
 * (whoever handed it back no longer draws it), and a destroyed picture still
 * bound in a Pixi bind group is swapped for the empty one (bindGroupFix.js),
 * so the filter system's own group, which keeps its last input, survives it.
 * A size wanted again is made again: a new GPU texture, as the first fight
 * made it -- not a picture to load, so nothing the preloading law covers.
 *
 * `?poolkeep` in the address keeps the pool as Pixi ships it, to compare. */
import { TexturePool } from 'pixi.js';
import { bindGroupFixOn } from './bindGroupFix.js';

const IDLE_MS = 30000;
let _installed = false;
const _stats = { swept: 0, sweptMB: 0, lastSweep: 0 };

function urlOff() {
  try { return /[?&]poolkeep(=|&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

export function installTexturePoolTrim() {
  /* never without the bind-group fix: the filter system's own bind group keeps
     its last input texture, and Pixi destroys a group whose texture goes */
  if (_installed || urlOff() || !bindGroupFixOn()) return false;
  const pool = TexturePool;
  if (!pool || typeof pool.returnTexture !== 'function' || !pool._texturePool) return false;
  const orig = pool.returnTexture;
  pool.returnTexture = function (texture, resetStyle) {
    const r = orig.call(this, texture, resetStyle);
    try { texture._btPooledAt = performance.now(); } catch (e) { /* a frozen texture */ }
    return r;
  };
  _installed = true;
  return true;
}

/* Destroy every pooled texture handed back at least `idleMs` ago (0: all of
   them).  Returns the MB let go of. */
export function sweepTexturePool(now, idleMs = IDLE_MS) {
  if (!_installed) return 0;
  const pool = TexturePool._texturePool, keys = TexturePool._poolKeyHash;
  if (!pool) return 0;
  let bytes = 0;
  for (const k in pool) {
    const arr = pool[k];
    if (!arr || !arr.length) continue;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      if (!t || t.destroyed) continue;
      if (t._btPooledAt == null) t._btPooledAt = now;   /* pooled before the install: its clock starts now */
      if (now - t._btPooledAt >= idleMs) {
        const s = t.source;
        bytes += s ? (s.pixelWidth || 0) * (s.pixelHeight || 0) * 4 : 0;
        if (keys) delete keys[t.uid];   /* never handed back again */
        /* a text's texture is handed back wearing the POOL's one sampler
           (returnTexture's resetStyle), and destroying a source destroys its
           sampler: unhooked first, or every pooled text would lose it */
        if (s && s._style && s._style === TexturePool.textureStyle) {
          try { s._style.off('change', s._onStyleChange, s); } catch (e) { /* not hooked */ }
          s._style = null;
        }
        try { t.destroy(true); } catch (e) { /* gone */ }
        _stats.swept++;
      } else {
        arr[w++] = t;
      }
    }
    arr.length = w;
  }
  _stats.sweptMB += bytes / 1048576;
  _stats.lastSweep = now;
  return bytes / 1048576;
}

/* QA (mp-sceneleak): what the pool holds now, and what has been let go */
export function texturePoolProbe() {
  const pool = TexturePool._texturePool;
  let n = 0, bytes = 0;
  for (const k in pool || {}) {
    for (const t of pool[k] || []) {
      if (!t || t.destroyed) continue;
      n++;
      const s = t.source;
      bytes += s ? (s.pixelWidth || 0) * (s.pixelHeight || 0) * 4 : 0;
    }
  }
  return { installed: _installed, off: urlOff(), pooled: n, pooledMB: +(bytes / 1048576).toFixed(2), swept: _stats.swept, sweptMB: +_stats.sweptMB.toFixed(2) };
}
if (typeof window !== 'undefined') {
  window.__btTexPool = texturePoolProbe;
  window.__btTexPoolSweep = (idleMs) => sweepTexturePool(performance.now(), idleMs == null ? 0 : idleMs);
}
