/* ═══ v2.3.3062: BROTOWN'S SIGNPOSTS, NAMED ═══
 *
 * The town's four signposts (one where every street leaves town, their boards
 * left blank in the picture) each get two plates over them when you come near
 * -- the land straight on down the road you are on, and the land whose trail
 * forks off it further out (src/data/wheelSignposts.js) -- each an arrow the
 * way that land lies, its element's icon and its name in its colour, as the
 * top bar and the land banner say them (src/data/wheelLands.js).
 *
 * WORLD-SIZED, like the dungeon mouths' names (wheelDoors.js): they belong to
 * the signpost and move with the world.  A world px is about 0.6 CSS px on a
 * phone at the Wheel's zoom, so the name's 22 px read at about 13.  On the
 * monster-UI layer, over the buildings and trees round the gates and under the
 * player.  Only near (SIGNPOST_SHOW_R), fading in over the last
 * SIGNPOST_SHOW_FADE: the owner wants the screen quiet ("I just don't want
 * the screen to be too busy with text").
 *
 * v2.3.3146: and only CLOSE -- the owner: "Change the signage in the town to
 * proximity based so it only pops up when you get close".  The plates came up
 * from 640 px, about a phone's whole view, so whenever a signpost was on
 * screen its plates were too; now from 300 (src/data/wheelSignposts.js has
 * the street's numbers), and they POP UP out of the post (POP_FROM): the pair
 * grows to its size as it fades in, from the post's top, where the container
 * stands.
 *
 * v2.3.3089: and each plate ends in the levels its land holds, "Lv 1–20"
 * (WHEEL_LAND_LEVELS), the owner's yes to "Show levels on the signposts?".
 *
 * The eight icons are loaded behind the Wheel's own loading screen
 * (preloadAnimations.js preloadZoneAssets -> loadSignpostIcons) -- the same
 * files the top bar and the banner show, each drawn down to ICON_PX on a
 * canvas as it lands (the pictures are 256 px; eight of those decoded are
 * 2 MB for a mark ~48 device px tall) -- and let go on leaving the Wheel
 * (freeSignpostIcons).  A plate whose icon did not load is drawn without it,
 * never fetched on sight (the preloading LAW).
 */
import { Container, Graphics, Sprite, Text, TextStyle, Texture, CanvasSource } from 'pixi.js';
import { WHEEL_LAND_LOOK, WHEEL_LANDS } from '../data/wheelLands.js';
import { WHEEL_GATE_ROADS, gateOf, SIGNPOST_TOWN_R, SIGNPOST_SHOW_R, SIGNPOST_SHOW_FADE, landLevelsText } from '../data/wheelSignposts.js';

const ICON_PX = 64;                   /* the icons' canvas, px a side */
const PLATE_H = 40, PLATE_R = 9, PAD_L = 10, PAD_R = 14, GAP = 7, STACK = 7;
const ARROW_W = 22, ICON_W = 28, NAME_PX = 22;
/* v2.3.3089: the levels the land holds, after its name ("Lv 1–20"): smaller,
   in the plate's brass, so the land's name stays what you read first */
const LEVEL_PX = 17, LEVEL_GAP = 12, C_LEVEL = 0xe3cf98;
const ABOVE = 168;                    /* world px from the post's foot to the lower plate's bottom: over its picture (~150 tall) */
/* v2.3.3146: the size the pair pops up from, a share of its own -- it grows to
   1 as it fades in, about the post's top (the container's origin) */
const POP_FROM = 0.82;
const C_PLATE = 0x111e23, C_RIM = 0xd8aa58, C_KEY = 0x0b161b, C_ARROW = 0xeac675;

/* ── the icons ── */
const _icons = Object.create(null);   /* land -> Texture */
let _iconsLoading = null;
function iconUrl(land) {
  const look = WHEEL_LAND_LOOK[land];
  return look && look.icon ? look.icon : null;
}
function loadOne(land) {
  const url = iconUrl(land);
  if (!url || _icons[land] || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = cv.height = ICON_PX;
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, ICON_PX, ICON_PX);
        _icons[land] = new Texture({ source: new CanvasSource({ resource: cv }) });
      } catch (e) { /* drawn without it */ }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}
/** Behind the Wheel's loading screen (preloadZoneAssets('wheel')). */
export function loadSignpostIcons() {
  if (!_iconsLoading) _iconsLoading = Promise.all(WHEEL_LANDS.map(loadOne)).then(() => undefined);
  return _iconsLoading;
}
/* every drawer, so freeing the icons takes their plates down first: a sprite
   left holding a destroyed texture throws in the next render (CLAUDE.md, the
   ZONE-ASSET rule: "drop its texture reference on the way out") */
const _live = new Set();
/** On leaving the Wheel (freeZoneAssets). */
export function freeSignpostIcons() {
  for (const d of _live) { try { d.clear(); } catch (e) { /* gone */ } }
  _iconsLoading = null;
  for (const k of Object.keys(_icons)) {
    try { _icons[k].destroy(true); } catch (e) { /* gone */ }
    delete _icons[k];
  }
}
export function signpostIconsLoaded() { return Object.keys(_icons).length; }
/* v2.3.3108: the minimap's name plate wears the same icon before the land's
   name (wheelMinimap.js) -- the texture, or null while it is not loaded;
   `holder.clear()` is called before the icons go, as the plates' is */
export function landIconTexture(land) { return (land && _icons[land]) || null; }
export function holdLandIcons(holder) { if (holder) _live.add(holder); }
export function releaseLandIcons(holder) { _live.delete(holder); }

/* ── the signposts: the town's, from the worker's placed objects ── */
let _found = { src: null, posts: [] };
/** The town's signposts in `objects` (wheelObjectsInfo()), each with its gate
 *  and the lands its road leads to; `town` the town's middle, game px. */
export function findGateSignposts(objects, town) {
  if (!objects || !objects.kinds || !objects.n) return [];
  if (_found.src === objects && _found.town === town) return _found.posts;
  const k = objects.kinds.indexOf('signpost');
  const posts = [];
  if (k >= 0 && town) {
    for (let i = 0; i < objects.n; i++) {
      if (objects.kind[i] !== k) continue;
      const dx = objects.x[i] - town.x, dy = objects.y[i] - town.y;
      if (Math.hypot(dx, dy) > SIGNPOST_TOWN_R) continue;
      const gate = gateOf(dx, dy);
      posts.push({ i, x: objects.x[i], y: objects.y[i], gate, lands: WHEEL_GATE_ROADS[gate] || [] });
    }
  }
  _found = { src: objects, town, posts };
  return posts;
}

/* the land's colour lifted toward white, to read on the dark plate (as the
   banner's and the top bar's) */
function lift(hex, k = 0.42) {
  const v = parseInt(String(hex || '#d8cba0').slice(1), 16);
  const f = (c) => Math.round(c + (255 - c) * k);
  return (f((v >> 16) & 255) << 16) | (f((v >> 8) & 255) << 8) | f(v & 255);
}

export class WheelSignposts {
  constructor(layer) {
    this.layer = layer;
    this.posts = new Map();   /* object index -> { c, plates, gate } */
    _live.add(this);
  }

  get size() { return this.posts.size; }

  _plate(land, info) {
    const look = WHEEL_LAND_LOOK[land] || {};
    const c = new Container();
    c.label = 'signpost-plate';
    const bg = new Graphics();
    const arrow = new Graphics();
    /* an arrow pointing +x, turned to where the land lies (north is up) */
    arrow.rect(-9, -2, 11, 4).fill(C_ARROW)
      .poly([1, -7.5, 10, 0, 1, 7.5]).fill(C_ARROW);
    arrow.rotation = info ? Math.atan2(info.uy, info.ux) : 0;
    const name = new Text({ text: info ? info.name : land, resolution: 2, style: new TextStyle({
      fontFamily: 'Source Sans 3, sans-serif', fontSize: NAME_PX, fontWeight: '800', fill: lift(look.color),
    }) });
    name.anchor.set(0, 0.5);
    const lv = new Text({ text: landLevelsText(), resolution: 2, style: new TextStyle({
      fontFamily: 'Source Sans 3, sans-serif', fontSize: LEVEL_PX, fontWeight: '700', fill: C_LEVEL,
    }) });
    lv.anchor.set(0, 0.5);
    lv.y = 1;
    let icon = null;
    if (_icons[land]) {
      icon = new Sprite(_icons[land]);
      icon.anchor.set(0.5);
      icon.width = ICON_W; icon.height = ICON_W;
    }
    const w = PAD_L + ARROW_W + GAP + (icon ? ICON_W + GAP : 0) + Math.ceil(name.width) + LEVEL_GAP + Math.ceil(lv.width) + PAD_R;
    bg.roundRect(-w / 2 - 1.5, -PLATE_H / 2 - 1.5, w + 3, PLATE_H + 3, PLATE_R + 1.5).fill({ color: C_KEY, alpha: 0.9 })
      .roundRect(-w / 2, -PLATE_H / 2, w, PLATE_H, PLATE_R).fill({ color: C_PLATE, alpha: 0.94 }).stroke({ width: 2, color: C_RIM, alpha: 0.85 });
    let x = -w / 2 + PAD_L;
    arrow.x = x + ARROW_W / 2; x += ARROW_W + GAP;
    if (icon) { icon.x = x + ICON_W / 2; x += ICON_W + GAP; }
    name.x = x; x += Math.ceil(name.width) + LEVEL_GAP;
    lv.x = x;
    c.addChild(bg, arrow);
    if (icon) c.addChild(icon);
    c.addChild(name, lv);
    c._sp = { land, name: name.text, lv: lv.text, w, icon: !!icon, rot: arrow.rotation };
    return c;
  }

  _make(p, lands) {
    const c = new Container();
    c.label = 'wheel-signpost';
    c.x = p.x; c.y = p.y - ABOVE;
    const plates = [];
    /* read top to bottom: the road you are on, then its fork */
    p.lands.forEach((land, k) => {
      const info = lands ? lands.find((l) => l.id === land) : null;
      const pl = this._plate(land, info);
      pl.y = -(p.lands.length - 1 - k) * (PLATE_H + STACK) - PLATE_H / 2;
      plates.push(pl);
      c.addChild(pl);
    });
    c.alpha = 0;
    c.scale.set(POP_FROM);   /* v2.3.3146 */
    this.layer.addChild(c);
    return { c, plates, gate: p.gate };
  }

  /** `posts` the town's signposts (findGateSignposts; [] lets every one go),
   *  `lands` the map's lands (names and directions), `P` the player. */
  update(posts, lands, P) {
    const seen = new Set();
    const px = P ? P.x : 0, py = P ? P.y : 0;
    for (const p of posts) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d > SIGNPOST_SHOW_R + 200) continue;
      seen.add(p.i);
      let e = this.posts.get(p.i);
      if (!e) { e = this._make(p, lands); this.posts.set(p.i, e); }
      const want = Math.max(0, Math.min(1, (SIGNPOST_SHOW_R - d) / SIGNPOST_SHOW_FADE));
      e.c.alpha += (want - e.c.alpha) * 0.2;
      if (Math.abs(want - e.c.alpha) < 0.01) e.c.alpha = want;
      e.c.visible = e.c.alpha > 0.01;
      /* v2.3.3146: popping up out of the post as it fades in */
      e.c.scale.set(POP_FROM + (1 - POP_FROM) * e.c.alpha);
      e.d = d;
    }
    for (const [i, e] of this.posts) {
      if (seen.has(i)) continue;
      this._drop(e);
      this.posts.delete(i);
    }
    /* QA (mp-signposts), armed by the harness only: the four found, and the
       ones drawn now */
    if (typeof window !== 'undefined' && window.__btProbe) {
      window.__btGatePosts = posts.map((p) => ({ gate: p.gate, x: p.x, y: p.y, lands: p.lands.slice() }));
      window.__btSignpostIcons = signpostIconsLoaded();
      window.__btSignposts = [...this.posts.values()].map((e) => ({
        gate: e.gate, x: e.c.x, y: e.c.y + ABOVE, d: Math.round(e.d || 0), alpha: +e.c.alpha.toFixed(2), visible: e.c.visible,
        scale: +e.c.scale.x.toFixed(3),   /* v2.3.3146: the pop */
        plates: e.plates.map((pl) => Object.assign({ y: pl.y }, pl._sp)),
      }));
    }
  }

  _drop(e) {
    try {
      if (e.c.parent) e.c.parent.removeChild(e.c);
      /* the icons' textures are the module's (freeSignpostIcons), not the plate's */
      e.c.destroy({ children: true, texture: false, textureSource: false });
    } catch (err) { /* already gone */ }
  }

  clear() {
    for (const e of this.posts.values()) this._drop(e);
    this.posts.clear();
  }
}
