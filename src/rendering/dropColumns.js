/* ═══ v2.3.3616: THE DROP COLUMNS, DRAWN ═══
 *
 * game/dropColumns.js says what a kill dropped (S._dropCols: groups of
 * columns at the monster); this draws them on the damage numbers' layer, the
 * owner's ask: "show gold icon, number 5 beneath it, and "Normal" beneath the
 * number. If two items are dropped it will be spaced apart as two columns
 * appearing simultaneously. Rising briefly then disappearing."
 *
 * Each column: the drop's picture, its amount, its rarity in the rarity's
 * colour, side by side COL_GAP apart and centred on the monster.  A group pops
 * in (POP_S), rises RISE over its whole life, holds, and fades over its last
 * FADE_S.  Every size is popup px drawn x Z (effectsRenderer popupZoomK), so a
 * column is the same size on the screen at any zoom, as the damage numbers
 * are (v2.3.3192).
 *
 * THE PICTURES are the codex's (data/codexDrops.js), every one a kill can
 * drop, shrunk to ICON_PX once and PRELOADED behind the loading screen
 * (preloadDropColumnIcons, in preloadWorldAnimations: the law -- a kill is the
 * moment a blank first frame would be seen).  ~20 pictures of 64 px, ~16 KB
 * each on the graphics chip.  A picture that failed to load leaves its column
 * with its words.
 *
 * WORDS ARE TEXT, made with the group and destroyed with it (CLAUDE.md: a Text
 * gone for good is destroyed, never only hidden): two a column, a few a kill. */
import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { DROP_COLS, dropColumnIconUrls } from '@/game/dropColumns.js';
import { CODEX_ENTRIES } from '@/data/monsterCodex.js';

export const DROP_COL_LOOK = Object.freeze({
  ICON: 40,        /* popup px: the picture */
  QTY_PX: 26,      /* the amount */
  LABEL_PX: 17,    /* the rarity */
  COL_GAP: 78,     /* centre to centre */
  RISE: 46,        /* popup px over the whole life */
  POP_S: 0.16,     /* the pop in */
  FADE_S: 0.55,    /* the fade out, at the end */
});
const ICON_PX = 64;

const TEX = new Map();   /* url -> Texture */
let _pre = null;

function shrink(img) {
  const cv = document.createElement('canvas');
  cv.width = ICON_PX; cv.height = ICON_PX;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const iw = img.naturalWidth || ICON_PX, ih = img.naturalHeight || ICON_PX;
  const k = Math.min(ICON_PX / iw, ICON_PX / ih);
  const w = Math.round(iw * k), h = Math.round(ih * k);
  c.drawImage(img, Math.round((ICON_PX - w) / 2), Math.round((ICON_PX - h) / 2), w, h);
  return Texture.from(cv);
}
function loadOne(url) {
  if (TEX.has(url) || typeof Image === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { try { TEX.set(url, shrink(img)); } catch (e) { /* its words still show */ } resolve(); };
      if (typeof img.decode === 'function') img.decode().then(done, done); else done();
    };
    /* never fail the loading gate */
    img.onerror = () => resolve();
    img.src = url;
  });
}
/** Behind the loading screen (preloadWorldAnimations): every picture a kill's
 *  column can show -- each codex kind's whole drop table. */
export function preloadDropColumnIcons() {
  if (!_pre) _pre = Promise.all(dropColumnIconUrls(Object.keys(CODEX_ENTRIES)).map(loadOne));
  return _pre;
}
/** QA: the pictures held. */
export function dropColumnIconsLoaded() { return TEX.size; }
if (typeof window !== 'undefined') {
  try { window.__btDropColIcons = dropColumnIconsLoaded; } catch (e) { /* no window */ }
}

const QTY_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif', fontSize: DROP_COL_LOOK.QTY_PX, fontWeight: '900',
  fill: '#FFFFFF', stroke: { color: '#0B161B', width: 4 }, align: 'center',
});
const LABEL_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif', fontSize: DROP_COL_LOOK.LABEL_PX, fontWeight: '800',
  fill: '#E5EDE9', stroke: { color: '#0B161B', width: 4 }, align: 'center', letterSpacing: 0.5,
});

export class DropColumnsFx {
  constructor(layer) {
    this.layer = layer;
    this.live = [];   /* { g, box, cols: [{ icon, qty, label }] } */
    if (typeof window !== 'undefined') {
      /* QA probe: what is on the screen now */
      window.__btDropCols = () => this.live.map((v) => ({
        monsterId: v.g.monsterId, x: Math.round(v.box.x), y: Math.round(v.box.y), alpha: Math.round(v.box.alpha * 100) / 100,
        cols: v.cols.map((c) => ({ id: c.id, icon: !!(c.icon && c.icon.texture && c.icon.texture !== Texture.EMPTY), qty: c.qty.text, label: c.label.text,
          color: typeof c.label.style.fill === 'string' ? c.label.style.fill : null,
          iconY: Math.round(c.icon ? c.icon.y : 0), qtyY: Math.round(c.qty.y), labelY: Math.round(c.label.y), x: Math.round(c.qty.x) })),
      }));
    }
  }

  _build(g, Z) {
    const box = new Container();
    box.label = 'drop-columns';
    const L = DROP_COL_LOOK;
    const n = g.cols.length;
    const cols = g.cols.map((c, i) => {
      const x = (i - (n - 1) / 2) * L.COL_GAP * Z;
      const tex = c.icon ? TEX.get(c.icon) : null;
      let icon = null;
      if (tex && !tex.destroyed) {
        icon = new Sprite(tex);
        icon.anchor.set(0.5, 1);
        icon.width = L.ICON * Z; icon.height = L.ICON * Z;
        icon.x = x; icon.y = 0;
        box.addChild(icon);
      }
      const qs = QTY_STYLE.clone(); qs.fontSize = L.QTY_PX * Z; qs.stroke = { color: '#0B161B', width: 4 * Z };
      const qty = new Text({ text: String(c.qty), style: qs });
      qty.anchor.set(0.5, 0);
      qty.x = x; qty.y = 2 * Z;
      const ls = LABEL_STYLE.clone(); ls.fontSize = L.LABEL_PX * Z; ls.fill = c.color || '#E5EDE9'; ls.stroke = { color: '#0B161B', width: 4 * Z };
      const label = new Text({ text: c.label, style: ls });
      label.anchor.set(0.5, 0);
      label.x = x; label.y = qty.y + L.QTY_PX * Z * 1.02;
      box.addChild(qty, label);
      return { id: c.id, icon, qty, label };
    });
    this.layer.addChild(box);
    return { g, box, cols, Z };
  }

  _destroy(v) {
    if (v.box && !v.box.destroyed) v.box.destroy({ children: true });   /* the Texts with it; the pictures are shared */
  }

  update(S, now, Z) {
    const list = (S && S._dropCols) || [];
    this._list = list;
    /* new groups, and any a late nugget added a column to */
    for (const g of list) {
      let v = this.live.find((q) => q.g === g);
      if (v && g.dirty) { this._destroy(v); this.live.splice(this.live.indexOf(v), 1); v = null; g.dirty = false; }
      if (!v && !g.gone && now - g.ts < DROP_COLS.TTL_MS) this.live.push(this._build(g, Z));
    }
    const L = DROP_COL_LOOK;
    const ttl = DROP_COLS.TTL_MS / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const v = this.live[i];
      const age = (now - v.g.ts) / 1000;
      if (v.g.gone || age > ttl || list.indexOf(v.g) < 0) {
        this._destroy(v);
        this.live.splice(i, 1);
        const at = list.indexOf(v.g);
        if (at >= 0 && age > ttl) list.splice(at, 1);
        continue;
      }
      const t = Math.max(0, age);
      const pop = t < L.POP_S ? 0.6 + 0.4 * (1 - Math.pow(1 - t / L.POP_S, 3)) : 1;
      const rise = L.RISE * Z * (1 - Math.pow(1 - Math.min(1, t / ttl), 2));
      v.box.x = v.g.x;
      v.box.y = v.g.y - rise;
      v.box.scale.set(pop);
      v.box.alpha = t > ttl - L.FADE_S ? Math.max(0, (ttl - t) / L.FADE_S) : Math.min(1, t / 0.08);
    }
  }

  /* a zone change (effectsRenderer.clear): every group goes, and is not made
     again at the last zone's spot */
  clear() {
    for (const v of this.live) this._destroy(v);
    this.live = [];
    if (this._list) { for (const g of this._list) g.gone = true; this._list.length = 0; }
  }
}
