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
 *
 * ═══ v2.3.3566: ...AND, WHERE THE OWNER HAS DRAWN ONE, ITS PICTURE ═══
 * The owner's ChatGPT entrances (src/data/dungeonArt.js `mouth`, cut by
 * tools/world/add-dungeon-art.mjs) -- the Goo Grotto's first: a mossy mound,
 * roots over it, blue slime dripping out of its dark mouth.  It STANDS: the
 * picture above its foot line (where the cave's floor meets the world, its
 * `foot`) is a Sprite in `entities`, sorted with everyone by that line
 * (depthSort.js), and what lies below the line -- the slime spilling out, the
 * ferns' feet -- is laid flat on the ground-loot layer, so you can walk up to
 * the cave's lip and stand on its slime.  The mound stops your boots there
 * (wheelMouthBlockers, handed to the walk test with the Wheel's objects'
 * footprints: wheelObjects.js) and casts the Wheel's sun's shadow
 * (wheelDoorCasters, lightfx/casters.js).
 * Its picture loads as you come near it and goes once you are well away
 * (LOAD_PAD, FREE_PAD, FREE_MS): the Wheel's objects' way, not the loading
 * screen's (CLAUDE.md, the Wheel's looks-as-you-walk clause) -- 1.5 MB
 * decoded a mouth, for one place in a world 140,000 px across.  Until it is
 * in, the mouth is drawn in code as before.
 */
import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture, Rectangle } from 'pixi.js';
import { WHEEL_DOOR_LOOK } from '@/data/wheelDungeons.js';
import { DUNGEON_ART } from '@/data/dungeonArt.js';
import { dungeonArtUrl } from '@/game/dungeonArt.js';
import { SHADE } from './formShade.js';

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

/* v2.3.3566: the picture -- game px a picture px; loaded within the drawing
   reach plus LOAD_PAD, let go once farther than the reach plus FREE_PAD for
   FREE_MS; its name LABEL_OVER above the mound's top */
const ART = 0.5;
const LOAD_PAD = 1400, FREE_PAD = 2600, FREE_MS = 10000;
const LABEL_OVER = 22;
/* the ground the mound stops your boots on (game px from its foot point):
   its base, as wide as the rock at the ground, back from the cave's lip */
const MOUND_BLOCK = { halfW: 0.43, back: 110, lip: 4 };
/* the shadow's columns start this far behind the foot line: the mound's own
   bulk takes most of it, and what shows falls off its sunless right */
const SHADOW_BACK = 90;

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* ── the pictures, by land ── */
const _pics = new Map();   /* home -> { url, state: 'loading'|'ready'|'failed', tex, stand, flat, far } */
let _picVer = 0;           /* bumped when a picture comes in or goes: the footprints change */
let _liveDoors = null;

function wantPicture(home) {
  if (!own(DUNGEON_ART, home)) return null;
  let p = _pics.get(home);
  if (p) { p.far = 0; return p; }
  const A = DUNGEON_ART[home].mouth;
  const url = dungeonArtUrl(A.url);
  p = { url, state: 'loading', tex: null, stand: null, flat: null, far: 0, A };
  _pics.set(home, p);
  Assets.load(url).then((tex) => {
    if (_pics.get(home) !== p) { Assets.unload(url).catch(() => {}); return; }
    const fy = Math.max(1, Math.min(A.h - 1, A.foot[1]));
    p.tex = tex;
    p.stand = new Texture({ source: tex.source, frame: new Rectangle(0, 0, A.w, fy) });
    p.flat = new Texture({ source: tex.source, frame: new Rectangle(0, fy, A.w, A.h - fy) });
    p.state = 'ready';
    _picVer++;
  }, () => { if (_pics.get(home) === p) p.state = 'failed'; });
  return p;
}
function dropPicture(home) {
  const p = _pics.get(home);
  if (!p) return;
  _pics.delete(home);
  for (const t of [p.stand, p.flat]) { if (t) { try { t.destroy(false); } catch (e) { /* gone */ } } }
  if (p.state !== 'failed') Assets.unload(p.url).catch(() => { /* a leak, not a crash */ });
  _picVer++;
}

export class WheelDoors {
  /** `layer` the ground-loot layer (the code-drawn mouth, and a picture's
      flat part); `standLayer` the depth-sorted `entities` a picture stands in. */
  constructor(layer, standLayer) {
    this.layer = layer;
    this.standLayer = standLayer || layer;
    this.doors = new Map();   /* id -> { c, glow, mouth, sparks, label, look } | { pic, c, stand, flat, label } */
    _liveDoors = this;
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

  /* v2.3.3566: the owner's picture: the mound standing at its foot, its name
     over it, the slime before it lying flat */
  _makePicture(d, p) {
    const look = WHEEL_DOOR_LOOK[d.id] || WHEEL_DOOR_LOOK.hollows;
    const A = p.A;
    const c = new Container();
    c.label = 'wheelDoorArt';
    c.x = d.x; c.y = d.y;
    const stand = new Sprite(p.stand);
    stand.anchor.set(A.foot[0] / A.w, 1);
    stand.scale.set(ART);
    stand._vShade = SHADE.prop;
    const label = new Text({ text: d.name, style: new TextStyle(Object.assign({ fill: look.label }, LABEL_STYLE)) });
    label.anchor.set(0.5, 1);
    label.y = -p.stand.frame.height * ART - LABEL_OVER;
    c.addChild(stand, label);
    this.standLayer.addChild(c);
    const flat = new Sprite(p.flat);
    flat.label = 'wheelDoorApron';
    flat.anchor.set(A.foot[0] / A.w, 0);
    flat.scale.set(ART);
    flat.x = d.x; flat.y = d.y;
    this.layer.addChildAt(flat, 0);
    return { pic: true, home: d.id, c, stand, flat, label, at: { x: d.x, y: d.y }, A };
  }

  /** `doors` the mouths to draw ([] lets every one go), `S` for the view. */
  update(doors, S, now) {
    const seen = new Set();
    const view = !!(S && S.camera && S._viewW > 0 && S._viewH > 0);
    const P = (S && S.player) || { x: 0, y: 0 };
    const cx = view ? S.camera.x + S._viewW / 2 : P.x, cy = view ? S.camera.y + S._viewH / 2 : P.y;
    const reach = (view ? Math.hypot(S._viewW, S._viewH) / 2 : 900) + NEAR_PAD;
    const t = Date.now();
    const keep = new Set();
    for (const d of doors) {
      const dist = Math.hypot(d.x - cx, d.y - cy);
      /* v2.3.3566: its picture, asked for on the way in (below), kept while
         within FREE_PAD of the view */
      if (own(DUNGEON_ART, d.id)) {
        if (dist <= reach + LOAD_PAD) wantPicture(d.id);
        if (dist <= reach + FREE_PAD) keep.add(d.id);
      }
      if (dist > reach) continue;
      seen.add(d.id);
      const p = _pics.get(d.id);
      const ready = !!(p && p.state === 'ready' && p.stand && !p.stand.destroyed);
      let e = this.doors.get(d.id);
      if (e && !!e.pic !== ready) { this._drop(e); this.doors.delete(d.id); e = null; }
      if (!e) { e = ready ? this._makePicture(d, p) : this._make(d); this.doors.set(d.id, e); }
      if (!e.pic) this._draw(e, now);
    }
    for (const [id, e] of this.doors) {
      if (seen.has(id)) continue;
      this._drop(e);
      this.doors.delete(id);
    }
    /* v2.3.3566: and a picture no mouth near the view has wanted for FREE_MS
       goes -- out of the Wheel (`doors` empty) too: inside its dungeon, or on
       the farm, nothing draws it */
    for (const [home, p] of _pics) {
      if (keep.has(home) || this.doors.has(home)) { p.far = 0; continue; }
      if (!p.far) p.far = t;
      else if (t - p.far > FREE_MS) dropPicture(home);
    }
    /* QA (mp-wheeldungeon), armed by the harness only: the mouths drawn now */
    if (typeof window !== 'undefined' && window.__btProbe) {
      window.__btWheelDoorsDrawn = [...this.doors.keys()];
      window.__btWheelDoorsArt = [...this.doors.values()].filter((e) => e.pic).map((e) => ({ id: e.home, x: e.at.x, y: e.at.y, w: Math.round(e.stand.width), h: Math.round(e.stand.height), apronH: Math.round(e.flat.height), layer: e.c.parent && e.c.parent.label }));
    }
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
      e.c.destroy({ children: true, texture: false, textureSource: false });
      if (e.flat) { if (e.flat.parent) e.flat.parent.removeChild(e.flat); e.flat.destroy({ texture: false, textureSource: false }); }
    } catch (err) { /* already gone */ }
  }

  clear() {
    for (const e of this.doors.values()) this._drop(e);
    this.doors.clear();
  }
}

/** v2.3.3566: the mounds drawn now, as footprints for the walk test (game px
    boxes { x0, y0, x1, y1, id, h }), and a number that changes when the set
    does (wheelObjects.js takes them with its own). */
export function wheelMouthBlockers() {
  const out = [];
  if (!_liveDoors) return out;
  for (const e of _liveDoors.doors.values()) {
    if (!e.pic || !e.stand || e.stand.destroyed) continue;
    const halfW = (e.A.w * ART) * MOUND_BLOCK.halfW;
    out.push({ x0: e.at.x - halfW, y0: e.at.y - MOUND_BLOCK.back, x1: e.at.x + halfW, y1: e.at.y - MOUND_BLOCK.lip,
      id: 'dungeon-mouth', h: Math.round(e.stand.height) });
  }
  return out;
}
/** Is a mouth's picture held (loaded, or loading)?  The effects renderer
    keeps calling update() until none is, so one left behind is let go. */
export function wheelDoorPicturesHeld() {
  return _pics.size > 0;
}
export function wheelMouthBlockVer() {
  return _picVer * 1000 + (_liveDoors ? [..._liveDoors.doors.values()].filter((e) => e.pic).length : 0);
}

/** v2.3.3566: the mounds' shadows, the Wheel's sun's (lightfx/casters.js),
    column by column from their foot line, as a building's. */
export function wheelDoorCasters(out) {
  if (!_liveDoors) return;
  for (const e of _liveDoors.doors.values()) {
    if (!e.pic || !e.stand || e.stand.destroyed || !e.stand.texture || e.stand.texture.destroyed) continue;
    let k = e._caster;
    if (!k) {
      k = e._caster = { key: 'door:' + e.home, depth: { spr: { texture: null, x: 0, y: 0, scale: { x: ART, y: ART } }, g: { base: 0, bottoms: null }, back: 0, pieces: null }, alive: true };
    }
    const d = k.depth, sp = d.spr;
    sp.texture = e.stand.texture;
    /* the mesh takes the picture's middle at x (anchor 0.5): the foot's
       offset from it, so the shadow stands under the picture */
    sp.x = e.at.x + (0.5 - e.A.foot[0] / e.A.w) * e.A.w * ART;
    sp.y = e.at.y;
    d.g.base = e.at.y;
    d.back = e.at.y - SHADOW_BACK;
    out.push(k);
  }
}
