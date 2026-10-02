/* ═══ v2.3.2932: STREAMED GROUND — the world trial's map, a piece at a time ═══
 *
 * Every zone today is ONE picture (tileRenderer's single-image path): fine for
 * a 1024 px spoke, impossible for a 13,312 px island -- decoded that would be
 * ~700 MB.  The seamless world is instead cut into pieces (512 art px =
 * 665.6 world px each, the same chunks the World Builder stores) and only the
 * pieces round the camera are kept:
 *
 *   NEEDED   every piece the view touches, plus MARGIN world px beyond it --
 *            loaded nearest-first, at most MAX_IN_FLIGHT at a time
 *   KEPT     anything within one more piece of that -- so walking back and
 *            forth across a line does not load and free the same piece
 *   FREED    everything else: sprite destroyed, texture unloaded (the
 *            ZONE-ASSET rule in CLAUDE.md: drop the reference, don't hide it)
 *
 * On a portrait phone that is about 6-12 pieces, ~1 MB of texture each --
 * the same memory whether the island is 13 thousand px across or 130.
 *
 * Under the pieces sits the whole island at 1/13 scale (overview.webp,
 * warmed by the zone gate), so a piece that has not arrived yet shows as a
 * blurry version of itself instead of a black hole.  How often that happens
 * is exactly what the trial is for: worldTrialStats.popIns counts it.
 *
 * NEAREST sampling, as every painted zone map is drawn (tileRenderer: linear
 * shimmers at sub-pixel camera steps), and each piece is drawn one world px
 * oversize so neighbours overlap instead of leaving a hairline between them
 * at fractional camera offsets.
 */
import { Container, Sprite, Assets } from 'pixi.js';
import { worldTrialManifest, chunkUrl, worldTrialStats, worldTrialLeft, WORLD_TRIAL_BASE } from '../game/worldTrial.js';

const MAX_IN_FLIGHT = 4;
const MARGIN = 360;
const KEEP = 1;

export class ChunkGround {
  constructor(parent) {
    this.root = new Container();
    this.root.label = 'chunkGround';
    parent.addChild(this.root);
    this.under = null;
    this.pieces = new Map();   /* "i,j" -> { i, j, url, sprite, ready, t0, popped } */
    this.inFlight = 0;
    this.dead = false;
    this._underUrl = WORLD_TRIAL_BASE + 'overview.webp';
  }

  _placeUnder(m) {
    if (this.under || !Assets.cache.has(this._underUrl)) return;
    const tex = Assets.cache.get(this._underUrl);
    if (!tex || tex.destroyed) return;
    if (tex.source) tex.source.scaleMode = 'linear';   /* 13x blow-up: blur, not blocks */
    const s = new Sprite(tex);
    s.x = 0; s.y = 0; s.width = m.worldW; s.height = m.worldH;
    this.root.addChildAt(s, 0);
    this.under = s;
  }

  update(cx, cy, viewW, viewH) {
    const m = worldTrialManifest();
    if (!m || this.dead) return;
    /* A camera that jumped more than a screen since last frame is in flight
       (a snap that has not settled, a teleport): stream nothing until it
       lands, or every piece along its path is loaded and thrown away. */
    const jumped = this._lastCx != null && Math.abs(cx - this._lastCx) + Math.abs(cy - this._lastCy) > 400;
    this._lastCx = cx; this._lastCy = cy;
    this._placeUnder(m);
    const cs = m.worldW / m.cols;
    const clampI = (v) => Math.max(0, Math.min(m.cols - 1, v));
    const clampJ = (v) => Math.max(0, Math.min(m.rows - 1, v));
    const i0 = clampI(Math.floor((cx - MARGIN) / cs)), i1 = clampI(Math.floor((cx + viewW + MARGIN) / cs));
    const j0 = clampJ(Math.floor((cy - MARGIN) / cs)), j1 = clampJ(Math.floor((cy + viewH + MARGIN) / cs));
    const vi0 = clampI(Math.floor(cx / cs)), vi1 = clampI(Math.floor((cx + viewW) / cs));
    const vj0 = clampJ(Math.floor(cy / cs)), vj1 = clampJ(Math.floor((cy + viewH) / cs));
    const mx = cx + viewW / 2, my = cy + viewH / 2;

    const want = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const rec = this.pieces.get(i + ',' + j);
      if (!rec) {
        const dx = (i + 0.5) * cs - mx, dy = (j + 0.5) * cs - my;
        want.push({ i, j, d: dx * dx + dy * dy });
      } else if (!jumped && !rec.ready && !rec.popped && i >= vi0 && i <= vi1 && j >= vj0 && j <= vj1) {
        /* on screen, and still not here */
        rec.popped = true;
        worldTrialStats.popIns++;
      }
    }
    want.sort((a, b) => a.d - b.d);
    if (jumped) want.length = 0;
    for (const w of want) {
      if (this.inFlight >= MAX_IN_FLIGHT) break;
      this._load(w.i, w.j, m, w.i >= vi0 && w.i <= vi1 && w.j >= vj0 && w.j <= vj1);
    }

    let resident = 0;
    for (const [key, rec] of this.pieces) {
      if (rec.i < i0 - KEEP || rec.i > i1 + KEEP || rec.j < j0 - KEEP || rec.j > j1 + KEEP) this._free(key, rec);
      else if (rec.ready) resident++;
    }
    worldTrialStats.resident = resident;
    worldTrialStats.loading = this.inFlight;
  }

  _load(i, j, m, onScreen) {
    const key = i + ',' + j, url = chunkUrl(i, j);
    const warm = Assets.cache.has(url);
    const rec = { i, j, url, sprite: null, ready: false, t0: performance.now(), popped: false };
    if (onScreen && !warm) { rec.popped = true; worldTrialStats.popIns++; }
    this.pieces.set(key, rec);
    this.inFlight++;
    Assets.load(url).then((tex) => {
      this.inFlight--;
      /* freed (or the whole ground torn down) while it was on its way */
      if (this.dead || this.pieces.get(key) !== rec) { Assets.unload(url).catch(() => {}); return; }
      if (!tex || tex.destroyed) { this.pieces.delete(key); return; }
      if (tex.source) tex.source.scaleMode = 'nearest';
      const cs = m.worldW / m.cols;
      const s = new Sprite(tex);
      s.x = i * cs; s.y = j * cs;
      s.width = cs + 1; s.height = cs + 1;
      this.root.addChild(s);
      rec.sprite = s;
      rec.ready = true;
      if (!warm) {
        const ms = performance.now() - rec.t0;
        worldTrialStats.loads++;
        worldTrialStats.lastMs = Math.round(ms);
        worldTrialStats.maxMs = Math.max(worldTrialStats.maxMs, Math.round(ms));
        worldTrialStats.sumMs += ms;
        worldTrialStats.bytes += m.meanChunkBytes || 0;
      }
    }).catch(() => {
      this.inFlight--;
      if (this.pieces.get(key) === rec) this.pieces.delete(key);
    });
  }

  _free(key, rec) {
    this.pieces.delete(key);
    if (rec.sprite) { try { rec.sprite.destroy(); } catch (e) { /* already gone */ } rec.sprite = null; }
    /* a piece still in flight is unloaded by its own .then, which sees it is
       no longer the live record for its key */
    if (rec.ready) Assets.unload(rec.url).catch(() => {});
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    for (const [key, rec] of [...this.pieces]) this._free(key, rec);
    if (this.under) { try { this.under.destroy(); } catch (e) { /* ignore */ } this.under = null; }
    Assets.unload(this._underUrl).catch(() => {});
    try { this.root.destroy(); } catch (e) { /* ignore */ }
    worldTrialStats.resident = 0;
    worldTrialStats.loading = 0;
    worldTrialLeft();
  }
}
