/* ═══ v2.3.5007: A BATCH'S TEXTURE IDS EMPTIED WHEN PIXI EMPTIES THE BATCH ═══
 *
 * Pixi 8's BatchTextureArray (rendering/batcher/shared/BatchTextureArray.mjs)
 * keeps, for one batch, the textures it draws (up to 16) and `ids`: each
 * texture source's uid -> its slot.  `clear()` sets each id back to null but
 * never removes it, so the table keeps EVERY source uid that batch has ever
 * drawn, for the session.  Batches are pooled and reused across every layer's
 * rebuild, and the game makes new sources all the time (each Text, each damage
 * number's page, a look's frames), so the tables only grow: at the memory
 * check's third fight 99 of them held ~0.35 MB of null ids (heap snapshots,
 * docs/specs/heap-trim-2026-11-13.md), and more with every minute of play.
 *
 * Pixi reads `ids` in two places (Batcher.mjs): break() writes the slot of a
 * source it adds, and checkAndUpdateTexture() reads the slot of a source
 * already in that batch -- `!id && id !== 0` is "not here" for null and for a
 * missing key alike.  So `clear()` here REMOVES each id it clears, as it
 * clears it: the same answers, the table no bigger than its batch.
 *
 * Installed once, as the renderer module loads (pixiRenderer.js).
 * `?heaptrim=0` leaves Pixi's own clear() (rendering/heapTrim.js).
 */
import { BatchTextureArray } from 'pixi.js';
import { heapTrimOn } from './heapTrim.js';

const _stats = { on: false, cleared: 0, fresh: 0 };
try { if (typeof window !== 'undefined') window.__btBatchIdsLean = _stats; } catch (e) { /* no page */ }

export function installBatchIdsLean() {
  const P = BatchTextureArray && BatchTextureArray.prototype;
  if (!P || P.__btLean || !heapTrimOn()) return false;
  P.__btLean = true;
  P.clear = function clear() {
    const ids = this.ids, tex = this.textures;
    for (let i = 0; i < this.count; i++) {
      const t = tex[i];
      tex[i] = null;
      if (t) delete ids[t.uid];
    }
    /* a removed key leaves its room in the engine's table (a dictionary
       never shrinks on delete): every 512 ids let go, a fresh table, empty
       as this one now is (each id is set again by break() before it is read) */
    this._btGone = (this._btGone || 0) + this.count;
    if (this._btGone > 512) { this.ids = Object.create(null); this._btGone = 0; _stats.fresh++; }
    this.count = 0;
    _stats.cleared++;
  };
  _stats.on = true;
  return true;
}
