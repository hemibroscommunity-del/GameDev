/* ═══ v2.3.3627: THE DROP LINES, DRAWN ═══
 *
 * game/dropLines.js says what a kill dropped (S._dropLines: groups of lines at
 * the monster); this draws them on the damage numbers' layer, the owner's ask:
 * "the name of the item to float upwards with quantity in parenthesis and the
 * color of the font indicating rarity ... coins (5) rising and disappearing in
 * white, slime remains (1) rising beneath that message then disappearing".
 *
 * Each line is a message of the game's own: the type, weight and black
 * outline every message has, at a message's size (effectsRenderer
 * MSG_FONT_PX, handed in -- the owner's v2.3.3192 rule, a message as big as a
 * damage number), in its rarity's colour.  The first line is at the group's
 * spot and each one after it under it; each comes in STAGGER_MS after the one
 * above (a small pop), and the group rises RISE over the first line's life,
 * each line fading over the last FADE_S of its own.  Over you (a kill off your
 * screen) the lines stand over the spot instead, the last one's foot on it,
 * so they never cover your head.  A group is kept EDGE inside the screen's
 * sides by its widest line, as a message is (MSG_EDGE_PX).  Every size is
 * popup px drawn x Z (effectsRenderer popupZoomK), so the lines are the same
 * size on the screen at any zoom, as the damage numbers are.
 *
 * WORDS ARE TEXT, made with the group and destroyed with it (CLAUDE.md: a Text
 * gone for good is destroyed, never only hidden): a line a drop, two or three
 * a kill.  No pictures: v2.3.3616's columns loaded every drop's picture on the
 * loading screen, and those are gone. */
import { Container, Text, TextStyle } from 'pixi.js';
import { DROP_LINES, dropGroupMs } from '@/game/dropLines.js';

export const DROP_LINE_LOOK = Object.freeze({
  PITCH: 1.06,     /* line to line, x the font size */
  RISE: 92,        /* popup px over the first line's life */
  POP_S: 0.16,     /* a line's pop in */
  FADE_S: 0.5,     /* a line's fade out, at the end of its life */
  EDGE: 12,        /* popup px kept clear of the screen's sides (effectsRenderer MSG_EDGE_PX) */
});

const LINE_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif', fontSize: 36, fontWeight: '800',
  fill: '#FFFFFF', stroke: { color: '#000000', width: 5 }, align: 'center',
});

export class DropLinesFx {
  /* `look`: { fontPx, strokePx } -- a message's size and outline in popup px
     (effectsRenderer MSG_FONT_PX, DMG_STROKE_PX x DMG_SCALE) */
  constructor(layer, look) {
    this.layer = layer;
    this.fontPx = (look && look.fontPx) || 36;
    this.strokePx = (look && look.strokePx) || 5;
    this.live = [];   /* { g, box, lines: [{ id, t, i }], half } */
    if (typeof window !== 'undefined') {
      /* QA probe: what is on the screen now, in world px */
      window.__btDropLines = () => this.live.map((v) => ({
        monsterId: v.g.monsterId, over: v.g.over, x: Math.round(v.box.x), y: Math.round(v.box.y),
        lines: v.lines.map((l) => ({
          id: l.id, text: l.t.text, color: typeof l.t.style.fill === 'string' ? l.t.style.fill : null,
          y: Math.round(v.box.y + l.t.y), alpha: Math.round(l.t.alpha * 100) / 100, fontPx: Math.round(l.t.style.fontSize * 10) / 10,
          w: Math.round(l.t.width),
        })),
      }));
    }
  }

  _build(g, Z) {
    const box = new Container();
    box.label = 'drop-lines';
    const fs = this.fontPx * Z;
    const pitch = fs * DROP_LINE_LOOK.PITCH;
    const n = g.lines.length;
    let half = 0;
    const lines = g.lines.map((l, i) => {
      const st = LINE_STYLE.clone();
      st.fontSize = fs;
      st.fill = l.color || '#FFFFFF';
      st.stroke = { color: '#000000', width: this.strokePx * Z };
      const t = new Text({ text: l.text, style: st });
      t.anchor.set(0.5, 0.5);
      t.y = g.over === 'you' ? -(n - 1 - i) * pitch : i * pitch;
      t.alpha = 0;
      box.addChild(t);
      half = Math.max(half, t.width / 2);
      return { id: l.id, t, i };
    });
    this.layer.addChild(box);
    return { g, box, lines, half };
  }

  _destroy(v) {
    if (v.box && !v.box.destroyed) v.box.destroy({ children: true });   /* the Texts with it */
  }

  update(S, now, Z) {
    const list = (S && S._dropLines) || [];
    this._list = list;
    /* new groups, and any a late nugget added a line to */
    for (const g of list) {
      let v = this.live.find((q) => q.g === g);
      if (v && g.dirty) { this._destroy(v); this.live.splice(this.live.indexOf(v), 1); v = null; g.dirty = false; }
      if (!v && !g.gone && now - g.ts < dropGroupMs(g.lines.length)) this.live.push(this._build(g, Z));
    }
    const L = DROP_LINE_LOOK;
    const ttl = DROP_LINES.TTL_MS / 1000;
    const stag = DROP_LINES.STAGGER_MS / 1000;
    /* the screen's sides in world px (the camera's box) */
    const cam = S && S.camera;
    const vw = S && S._viewW > 0 ? S._viewW : 0;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const v = this.live[i];
      const age = (now - v.g.ts) / 1000;
      const whole = dropGroupMs(v.lines.length) / 1000;
      if (v.g.gone || age > whole || list.indexOf(v.g) < 0) {
        this._destroy(v);
        this.live.splice(i, 1);
        const at = list.indexOf(v.g);
        if (at >= 0 && age > whole) list.splice(at, 1);
        continue;
      }
      const t = Math.max(0, age);
      const rise = L.RISE * Z * (1 - Math.pow(1 - Math.min(1, t / ttl), 2));
      let x = v.g.x;
      if (cam && vw > 0) {
        const pad = v.half + L.EDGE * Z;
        if (vw > pad * 2) x = Math.min(cam.x + vw - pad, Math.max(cam.x + pad, x));
      }
      v.box.x = x;
      v.box.y = v.g.y - rise;
      for (const l of v.lines) {
        const la = t - l.i * stag;   /* this line's own age */
        if (la <= 0) { l.t.alpha = 0; continue; }
        const pop = la < L.POP_S ? 0.7 + 0.3 * (1 - Math.pow(1 - la / L.POP_S, 3)) : 1;
        l.t.scale.set(pop);
        l.t.alpha = la > ttl - L.FADE_S ? Math.max(0, (ttl - la) / L.FADE_S) : Math.min(1, la / 0.08);
      }
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
