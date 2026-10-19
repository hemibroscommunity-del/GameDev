/* ═══ v2.3.3486: LIL BRO'S RACE COURSE, IN THE WORLD ═══
 *
 * The four corner flags and the finish of the tour's race (game/race.js; the
 * worker's course, server/src/race.js, sent in race_state), drawn in code --
 * nothing to load.  Each a pole and a pennant with its number over it: the
 * one to touch next GOLD with a ring breathing round its foot, the touched
 * ones GREEN, the rest pale, the finish a chequered pennant.  On the
 * ground-loot layer, like the dungeon mouths (wheelDoors.js), so a runner is
 * drawn over a flag he passes.
 *
 * NOTHING IS REDRAWN A FRAME (CLAUDE.md, "a structural change rebuilds its
 * layer's draw list"): a flag's pennant is drawn again only when its state
 * changes (next, touched); the wave and the ring's breath are transforms.
 * Made at the race's start, destroyed when it is over.
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const POLE_H = 118;
const PEN_W = 46, PEN_H = 28;
const C_POLE = 0x3a2a1a, C_NEXT = 0xf2c25a, C_DONE = 0x6fcf7f, C_LATER = 0xe9e4d6, C_RING = 0xf6d38b;
const LABEL = { fontFamily: 'monospace', fontSize: 22, fontWeight: 'bold', stroke: { color: 0x0b1014, width: 5 } };

function pennant(g, state, finish) {
  g.clear();
  const col = state === 'next' ? C_NEXT : state === 'done' ? C_DONE : C_LATER;
  if (finish) {
    /* chequered, four by two, in the state's colour and near-black */
    const cw = PEN_W / 4, ch = PEN_H / 2;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      g.rect(i * cw, -POLE_H + j * ch, cw, ch).fill((i + j) % 2 ? 0x141a1e : col);
    }
    g.rect(0, -POLE_H, PEN_W, PEN_H).stroke({ color: 0x0b1014, width: 2 });
    return;
  }
  g.poly([0, -POLE_H, PEN_W, -POLE_H + PEN_H / 2, 0, -POLE_H + PEN_H]).fill(col);
  g.poly([0, -POLE_H, PEN_W, -POLE_H + PEN_H / 2, 0, -POLE_H + PEN_H]).stroke({ color: 0x0b1014, width: 2 });
}

export class RaceFlags {
  constructor(layer) {
    this.layer = layer;
    this.root = null;
    this.flags = [];
    this._key = '';
  }

  _make(points) {
    const root = new Container();
    root.label = 'raceFlags';
    this.flags = points.map((p, i) => {
      const c = new Container();
      c.x = p[0]; c.y = p[1];
      const ring = new Graphics();
      ring.ellipse(0, 0, 54, 22).stroke({ color: C_RING, width: 4, alpha: 0.9 });
      ring.visible = false;
      const pole = new Graphics();
      pole.rect(-3, -POLE_H, 6, POLE_H).fill(C_POLE);
      pole.ellipse(0, 0, 10, 4).fill({ color: 0x000000, alpha: 0.35 });
      const pen = new Graphics();
      pen.x = 3;
      const finish = i === points.length - 1;
      const label = new Text({ text: finish ? 'FINISH' : String(i + 1), style: new TextStyle(Object.assign({ fill: 0xf7f2e7 }, LABEL)) });
      label.anchor.set(0.5, 1);
      label.y = -POLE_H - 10;
      c.addChild(ring, pole, pen, label);
      root.addChild(c);
      return { c, ring, pen, finish, state: '' };
    });
    this.layer.addChildAt(root, 0);
    this.root = root;
  }

  _drop() {
    if (!this.root) return;
    try { this.root.destroy({ children: true }); } catch (e) { /* gone */ }
    this.root = null;
    this.flags = [];
    this._key = '';
  }

  /** Once a frame from the effects renderer: draws S._race's flags while it
   *  has any, and lets them go when it has none. */
  update(S, now) {
    const r = S && S._race;
    const pts = r && Array.isArray(r.flags) && r.flags.length ? r.flags : null;
    if (!pts || r.phase === 'asked' || S.currentZone !== 'wheel') { this._drop(); return; }
    const key = pts.map((p) => p[0] + ',' + p[1]).join(';');
    if (key !== this._key) { this._drop(); this._make(pts); this._key = key; }
    const next = Math.max(0, r.next || 0);
    const t = (now || Date.now()) / 1000;
    for (let i = 0; i < this.flags.length; i++) {
      const f = this.flags[i];
      const st = i < next ? 'done' : i === next && r.phase !== 'done' ? 'next' : 'later';
      if (st !== f.state) { pennant(f.pen, st, f.finish); f.state = st; f.ring.visible = st === 'next'; }
      /* the wave and the breath: transforms only */
      f.pen.skew.y = Math.sin(t * 5 + i) * 0.12;
      if (f.ring.visible) { const k = 1 + 0.12 * Math.sin(t * 4); f.ring.scale.set(k, k); }
    }
    if (typeof window !== 'undefined' && window.__btProbe) {
      window.__btRaceFlags = this.flags.map((f) => ({ x: f.c.x, y: f.c.y, state: f.state }));
    }
  }
}
