/* ═══ v2.3.3016: THE WHEEL'S DUNGEON MOUTHS, DRAWN ═══
 *
 * A land's landmark is its dungeon's way in (game/wheelDungeons.js) -- and,
 * until now, nothing was drawn there: the plan stamps a landmark's ground
 * (layout.js `landmark`), and the ground composer lays it as the land's own
 * ground, so the Great Cave was a name on the map over plain grey rock.
 *
 * Until a picture of each is made (the Object Studio), the mouth is drawn in
 * code, the way the buildings' life is (wheelLife.js): a dark opening in the
 * ground, its rim lit in the land's light and breathing, sparks rising out of
 * it, and its name over it.  Nothing to load.  On the ground-loot layer, like
 * the Wheel's fish (wheelNodes.js), so whoever stands in it is drawn over it.
 * Only the mouths near the view hold a display.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { WHEEL_DOOR_LOOK } from '@/data/wheelDungeons.js';

/* the opening (world px): half-width and half-height, and its light round it */
const RX = 92, RY = 40, GLOW = 1.7;
/* drawn while the view's middle is within its half-diagonal plus this */
const NEAR_PAD = 520;
const SPARKS = 9;
/* its name, world px: big enough to read at the Wheel's zoom (a world px is
   about half a CSS px on a phone), and high enough over the mouth to clear
   the nameplate of someone standing at it, where the Enter button comes up */
const LABEL_STYLE = { fontFamily: 'monospace', fontSize: 26, fontWeight: 'bold', stroke: { color: 0x0b1014, width: 6 } };
const LABEL_Y = -RY - 150;

export class WheelDoors {
  constructor(layer) {
    this.layer = layer;
    this.doors = new Map();   /* id -> { c, glow, mouth, sparks, label, look } */
  }

  get size() { return this.doors.size; }

  _make(d) {
    const look = WHEEL_DOOR_LOOK[d.id] || WHEEL_DOOR_LOOK.hollows;
    const c = new Container();
    c.label = 'wheelDoor';
    c.x = d.x; c.y = d.y;
    const glow = new Graphics();
    const mouth = new Graphics();
    const sparks = new Graphics();
    c.addChild(glow, mouth, sparks);
    const label = new Text({ text: d.name, style: new TextStyle(Object.assign({ fill: look.label }, LABEL_STYLE)) });
    label.anchor.set(0.5, 1);
    label.y = LABEL_Y;
    c.addChild(label);
    this.layer.addChildAt(c, 0);
    return { c, glow, mouth, sparks, label, look, seed: (d.x * 7 + d.y * 13) % 1000 };
  }

  /** `doors` the mouths to draw ([] lets every one go), `S` for the view. */
  update(doors, S, now) {
    const seen = new Set();
    const view = !!(S && S.camera && S._viewW > 0 && S._viewH > 0);
    const P = (S && S.player) || { x: 0, y: 0 };
    const cx = view ? S.camera.x + S._viewW / 2 : P.x, cy = view ? S.camera.y + S._viewH / 2 : P.y;
    const reach = (view ? Math.hypot(S._viewW, S._viewH) / 2 : 900) + NEAR_PAD;
    for (const d of doors) {
      if (Math.hypot(d.x - cx, d.y - cy) > reach) continue;
      seen.add(d.id);
      let e = this.doors.get(d.id);
      if (!e) { e = this._make(d); this.doors.set(d.id, e); }
      this._draw(e, now);
    }
    for (const [id, e] of this.doors) {
      if (seen.has(id)) continue;
      this._drop(e);
      this.doors.delete(id);
    }
    /* QA (mp-wheeldungeon), armed by the harness only: the mouths drawn now */
    if (typeof window !== 'undefined' && window.__btProbe) window.__btWheelDoorsDrawn = [...this.doors.keys()];
  }

  _draw(e, now) {
    const t = now / 1000;
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.6 + e.seed);
    const { glow, mouth, sparks, look } = e;
    glow.clear();
    glow.ellipse(0, 0, RX * GLOW, RY * GLOW).fill({ color: look.glow, alpha: 0.07 + 0.07 * breathe });
    glow.ellipse(0, 0, RX * 1.3, RY * 1.3).fill({ color: look.glow, alpha: 0.10 + 0.08 * breathe });
    mouth.clear();
    /* the opening: near-black, its far lip lighter, as a hole seen from above */
    mouth.ellipse(0, 0, RX, RY).fill({ color: 0x06080a, alpha: 0.92 });
    mouth.ellipse(0, -RY * 0.18, RX * 0.82, RY * 0.62).fill({ color: 0x000000, alpha: 0.85 });
    mouth.ellipse(0, 0, RX, RY).stroke({ width: 5, color: look.rim, alpha: 0.95 });
    mouth.ellipse(0, 0, RX + 3, RY + 3).stroke({ width: 2.5, color: look.glow, alpha: 0.45 + 0.45 * breathe });
    /* the near lip, catching the light from inside */
    mouth.ellipse(0, RY * 0.55, RX * 0.7, RY * 0.22).fill({ color: look.glow, alpha: 0.10 + 0.12 * breathe });
    /* sparks rising out of it, each on its own clock, fading as they climb */
    sparks.clear();
    for (let i = 0; i < SPARKS; i++) {
      const ph = ((t * (0.35 + 0.05 * (i % 4)) + i / SPARKS + e.seed * 0.001) % 1 + 1) % 1;
      const a = (i * 2.399 + e.seed) % 6.283;
      const x = Math.cos(a) * RX * 0.6 * (0.4 + 0.6 * ((i * 37) % 10) / 10) + Math.sin(t * 2 + i) * 4;
      const y = Math.sin(a) * RY * 0.45 - ph * 90;
      sparks.circle(x, y, 2.4 - ph * 1.2).fill({ color: look.glow, alpha: (1 - ph) * 0.85 });
    }
  }

  _drop(e) {
    try {
      if (e.c.parent) e.c.parent.removeChild(e.c);
      e.c.destroy({ children: true });
    } catch (err) { /* already gone */ }
  }

  clear() {
    for (const e of this.doors.values()) this._drop(e);
    this.doors.clear();
  }
}
