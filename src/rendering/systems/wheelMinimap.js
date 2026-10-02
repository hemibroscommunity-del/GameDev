/**
 * ═══ v2.3.2966: THE WHEEL'S MINIMAP ═══
 *
 * Owner, 2026-10-01: "I'm thinking the minimap will need to be larger and
 * the most informative and intuitive it can be for navigation purposes.
 * Maybe tapping it brings up an overlay of a labelled world map.  It would
 * probably help to have areas labelled so players can start memorizing the
 * territory."
 *
 * Only in the Wheel (`?trial=wheel`): MinimapRenderer hands the box over
 * while you are there, and today's zones keep their own (52 px, a flat slab
 * with icons, as the owner asked for them in v2.3.1792 / v2.3.2247).  The
 * Wheel is 42 zones across, and a slab with icons says nothing about where
 * you are in it.  So this one:
 *
 *   - is BOX px (2.5x the zones'), flush in the same top-right corner;
 *   - shows WINDOW game px round you, about three zones across: the land
 *     itself from the worker's overview (its own ground colours, a touch
 *     darker so the marks stand out), the sea, and the roads, the river and
 *     the railway as clean lines over it (wheelmap.js);
 *   - marks the town, the camps, the passes, the gates and the landmarks,
 *     you (a chevron the way you face), other bros and monsters;
 *   - says under it where you are, in words: the land, its stage and the
 *     levels there ("Frost Ridge / the thaw line · Lv 6-10"), from the
 *     worker's answer for the spot under you (wheelHere);
 *   - carries a small "expand" mark: tapping the box opens the world map
 *     (src/ui/WorldMapOverlay.jsx, a DOM button laid exactly over this box,
 *     whose place is published here as window.__btWheelMini).
 *   - v2.3.2990: stars the quest's way, as the gold road on the ground reads
 *     it (questRoute.js questRoutePoint): the Wheel's Mayor Bro for the
 *     welcome or a hand-in, or the middle of a land's monsters for a quest
 *     that names the land.  While the spot is off the box, the star waits at
 *     its edge on the line from you, so the box says which way however far.
 *     Today's zones star their portals, and the Wheel has none to star.
 *
 * PRELOADING: nothing to load.  The overview is a canvas the worker made
 * before the Wheel opened (behind its loading screen); the lines and marks
 * are drawn once from numbers.
 */
import { Container, Graphics, Sprite, Text, Texture, CanvasSource } from 'pixi.js';
import { wheelOverview, wheelMapInfo, wheelHere } from '@/game/wheelTrial.js';
import { questRoutePoint } from '@/game/questRoute.js';   /* v2.3.2990: the quest's way */

export const WHEEL_BOX = 132;      /* CSS px a side */
export const WHEEL_WINDOW = 3200;  /* game px across the box: about three zones */
const SCALE = WHEEL_BOX / WHEEL_WINDOW;

const C_SEA = 0x16324a, C_FRAME = 0xd8aa58, C_ROAD = 0xf2e4c2, C_PATH = 0xe6d5ae, C_RIVER = 0x5aaee8, C_RAIL = 0x2b2320;
const C_TOWN = 0xf4f0e7, C_CAMP = 0xeac675, C_GATE = 0xc58cff, C_PASS = 0xf4f0e7, C_LANDMARK = 0x9fe0c0;
const C_PLAYER = 0xf4f0e7, C_OTHER = 0x58b97b, C_MONSTER = 0xe35d5b;
const C_QUEST_STAR = 0xf5ce3c, QUEST_STAR_PX = 17, QUEST_EDGE = 10;   /* v2.3.2990: as the zones' minimap stars, held this far in from the box's edge */
const FACING_SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

export class WheelMinimap {
  constructor(hudLayer, icons, dotTex) {
    this.icons = icons || {};
    this.dotTex = dotTex;
    this.root = new Container();
    this.root.label = 'wheel-minimap';
    this.root.visible = false;
    this.root.alpha = 0.92;
    hudLayer.addChild(this.root);

    const shadow = new Graphics().roundRect(-2, -2, WHEEL_BOX + 4, WHEEL_BOX + 4, 8).fill({ color: 0x000000, alpha: 0.45 });
    const bg = new Graphics().roundRect(0, 0, WHEEL_BOX, WHEEL_BOX, 7).fill(C_SEA);
    this.root.addChild(shadow, bg);
    this.clip = new Container();
    this.root.addChild(this.clip);
    this.pan = new Container();
    this.clip.addChild(this.pan);
    const mask = new Graphics().roundRect(0, 0, WHEEL_BOX, WHEEL_BOX, 7).fill(0xffffff);
    this.root.addChild(mask);
    this.clip.mask = mask;
    this.lines = new Graphics();     /* roads, river, railway: drawn once */
    this.places = new Graphics();    /* town, camps, passes, gates, landmarks: drawn once */
    this.marks = new Container();    /* bros and monsters: every frame */
    this.pan.addChild(this.lines, this.places, this.marks);
    this.player = new Sprite(this.icons.self || this.dotTex);
    this.player.anchor.set(0.5);
    this.player.width = 15; this.player.height = 15;
    this.player.tint = C_PLAYER;
    this.pan.addChild(this.player);
    const border = new Graphics().roundRect(0.5, 0.5, WHEEL_BOX - 1, WHEEL_BOX - 1, 7).stroke({ width: 1.5, color: C_FRAME, alpha: 0.85 });
    /* the "tap me" mark: two corner arrows, bottom left */
    const expand = new Graphics();
    const ex = 6, ey = WHEEL_BOX - 18;
    expand.roundRect(ex - 2, ey - 2, 16, 16, 4).fill({ color: 0x0b161b, alpha: 0.7 });
    expand.moveTo(ex + 2, ey + 6).lineTo(ex + 2, ey + 2).lineTo(ex + 6, ey + 2)
      .moveTo(ex + 10, ey + 6).lineTo(ex + 10, ey + 10).lineTo(ex + 6, ey + 10)
      .moveTo(ex + 2, ey + 2).lineTo(ex + 5, ey + 5).moveTo(ex + 10, ey + 10).lineTo(ex + 7, ey + 7)
      .stroke({ width: 1.5, color: C_FRAME, cap: 'round', join: 'round' });
    this.root.addChild(border, expand);

    /* where you are, in words, under the box */
    this.label = new Container();
    this.labelBg = new Graphics();
    this.title = new Text({ text: '', resolution: 2, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: '700', fill: 0xf4f0e7, stroke: { color: 0x0b161b, width: 3 } } });
    this.sub = new Text({ text: '', resolution: 2, style: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 10.5, fontWeight: '600', fill: 0xeac675, stroke: { color: 0x0b161b, width: 3 } } });
    this.title.anchor.set(1, 0); this.sub.anchor.set(1, 0);
    this.label.addChild(this.labelBg, this.title, this.sub);
    this.root.addChild(this.label);

    this.pool = [];
    this.used = 0;
    this.built = null;      /* the map the lines were drawn from */
    this.under = null;      /* the overview sprite */
    this.words = '';
    this._rectFor = '';
  }

  hide() {
    if (this.root.visible) this.root.visible = false;
    try { if (window.__btWheelMini) window.__btWheelMini = null; } catch (e) { /* no page */ }
  }

  /* the lines and places, once per map */
  _build(map) {
    this.built = map;
    const L = this.lines;
    L.clear();
    const path = (pts) => { L.moveTo(pts[0] * SCALE, pts[1] * SCALE); for (let i = 2; i < pts.length; i += 2) L.lineTo(pts[i] * SCALE, pts[i + 1] * SCALE); };
    const draw = (want, style) => {
      let any = false;
      for (const r of map.routes) if (want(r) && r.pts.length >= 4) { path(r.pts); any = true; }
      if (any) L.stroke({ cap: 'round', join: 'round', ...style });
    };
    draw((r) => r.kind === 'river', { width: 2.6, color: C_RIVER, alpha: 0.95 });
    draw((r) => r.kind === 'rail', { width: 1.2, color: C_RAIL, alpha: 0.9 });
    draw((r) => r.kind === 'road' && !r.trunk, { width: 1.4, color: C_PATH, alpha: 0.85 });
    draw((r) => r.kind === 'road' && r.trunk, { width: 2.2, color: C_ROAD, alpha: 0.95 });
    const P = this.places;
    P.clear();
    for (const p of map.places) {
      const x = p.x * SCALE, y = p.y * SCALE;
      if (p.kind === 'camp') P.poly([x, y - 5, x + 5, y + 4, x - 5, y + 4]).fill(C_CAMP).stroke({ width: 1, color: 0x0b161b });
      else if (p.kind === 'gate') P.circle(x, y, 5).fill(C_GATE).stroke({ width: 1.2, color: 0x0b161b });
      else if (p.kind === 'pass') P.poly([x, y - 4, x + 4, y, x, y + 4, x - 4, y]).fill(C_PASS).stroke({ width: 1, color: 0x0b161b });
      else if (p.kind === 'landmark') P.circle(x, y, 4).fill(C_LANDMARK).stroke({ width: 1, color: 0x0b161b });
    }
    const t = map.hub.town;
    P.rect(t.x * SCALE - 5, t.y * SCALE - 5, 10, 10).fill(C_TOWN).stroke({ width: 1.2, color: 0x0b161b });
  }

  _placeUnder(map) {
    if (this.under) return;
    const c = wheelOverview();
    if (!c || !c.width) return;
    /* a fresh source, as wheelGround.js makes its own (never Texture.from
       a canvas: that one is cached by the canvas and shared) */
    const tex = new Texture({ source: new CanvasSource({ resource: c, width: c.width, height: c.height, resolution: 1, scaleMode: 'linear' }) });
    const s = new Sprite(tex);
    s.width = map.worldW * SCALE; s.height = map.worldH * SCALE;
    /* a touch darker than the ground, so every mark on it reads */
    s.tint = 0xb4b4b4;
    this.pan.addChildAt(s, 0);
    this.under = s;
  }

  _dropUnder() {
    if (!this.under) return;
    const s = this.under;
    this.under = null;
    try { s.destroy({ texture: true, textureSource: true }); } catch (e) { /* gone */ }
  }

  _mark(x, y, icon, color, px) {
    let s = this.pool[this.used];
    if (!s) { s = new Sprite(this.dotTex); s.anchor.set(0.5); this.marks.addChild(s); this.pool.push(s); }
    s.texture = (icon && this.icons[icon]) || this.dotTex;
    s.width = px; s.height = px;
    s.tint = color;
    s.x = x * SCALE; s.y = y * SCALE;
    s.visible = true;
    this.used++;
  }

  update(S, cssW, cssH, canvas, topInset) {
    const P = S && S.player;
    const map = wheelMapInfo();
    if (!P || !map) { this.hide(); return; }
    /* a new map is a new Wheel (left and come back): its overview is a new
       canvas too */
    if (this.built !== map) { this._build(map); this._dropUnder(); }
    this._placeUnder(map);

    /* centred on you, held at the world's edge like the camera */
    const spanW = map.worldW * SCALE, spanH = map.worldH * SCALE;
    this.pan.x = Math.max(WHEEL_BOX - spanW, Math.min(0, WHEEL_BOX / 2 - P.x * SCALE));
    this.pan.y = Math.max(WHEEL_BOX - spanH, Math.min(0, WHEEL_BOX / 2 - P.y * SCALE));
    this.root.x = Math.round(cssW - WHEEL_BOX);
    this.root.y = topInset;
    this.root.visible = true;

    /* other bros and monsters */
    this.used = 0;
    const others = S.others;
    if (others) for (const id in others) { const o = others[id]; if (o && (o.zone || o.z) === S.currentZone) this._mark(o.x, o.y, 'player', C_OTHER, 13); }
    const mons = S.monsters || [];
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || m.alive === false || m.dead || (m.hp != null && m.hp <= 0)) continue;
      this._mark(m.x, m.y, 'monster', C_MONSTER, 12);
    }
    /* v2.3.2990: the quest's way (above the bros and monsters: drawn last) */
    let quest = null;
    try { quest = questRoutePoint(S.currentZone, S.rpg || null, S); } catch (e) { quest = null; }
    let questEdge = false;
    if (quest) {
      const pbx = P.x * SCALE + this.pan.x, pby = P.y * SCALE + this.pan.y;
      const dx = quest.x * SCALE + this.pan.x - pbx, dy = quest.y * SCALE + this.pan.y - pby;
      const lo = QUEST_EDGE, hi = WHEEL_BOX - QUEST_EDGE;
      let t = 1;
      if (dx > 0) t = Math.min(t, (hi - pbx) / dx); else if (dx < 0) t = Math.min(t, (lo - pbx) / dx);
      if (dy > 0) t = Math.min(t, (hi - pby) / dy); else if (dy < 0) t = Math.min(t, (lo - pby) / dy);
      t = Math.max(0, t);
      questEdge = t < 1;
      this._mark((pbx + dx * t - this.pan.x) / SCALE, (pby + dy * t - this.pan.y) / SCALE, 'star', C_QUEST_STAR, QUEST_STAR_PX);
    }
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].visible = false;
    const f = FACING_SECTORS.indexOf(S._renderFacing || 'south');
    this.player.x = P.x * SCALE; this.player.y = P.y * SCALE;
    this.player.rotation = f >= 0 ? f * Math.PI / 4 + Math.PI / 2 : 0;

    /* where you are, in words */
    const here = wheelHere(P.x, P.y);
    const w = here && here.words;
    const key = w ? `${w.title}|${w.sub}` : '';
    if (key !== this.words) {
      this.words = key;
      this.title.text = w ? w.title : '';
      this.sub.text = w ? w.sub : '';
      const tw = Math.max(this.title.width, this.sub.width);
      this.title.x = this.sub.x = WHEEL_BOX - 4;
      this.title.y = WHEEL_BOX + 4;
      this.sub.y = WHEEL_BOX + 4 + 15;
      this.labelBg.clear();
      if (w) this.labelBg.roundRect(WHEEL_BOX - tw - 10, WHEEL_BOX + 2, tw + 10, w.sub ? 32 : 19, 5).fill({ color: 0x0b161b, alpha: 0.72 });
    }

    /* the box's place on the page, for the button that opens the world map */
    try {
      const rk = `${cssW}x${cssH}x${this.root.y}`;
      if (rk !== this._rectFor) {
        this._rectFor = rk;
        const c = (canvas || document.querySelector('canvas')).getBoundingClientRect();
        this._rect = { left: Math.round(c.left + this.root.x), top: Math.round(c.top + this.root.y), w: WHEEL_BOX, h: WHEEL_BOX };
      }
      window.__btWheelMini = this._rect;
      /* QA probe (tools/qa/mp/mp-wheelmap.mjs) */
      window.__btMinimap = {
        wheel: true, visible: true, zone: S.currentZone, box: WHEEL_BOX, window: WHEEL_WINDOW,
        rootX: this.root.x, topInset: this.root.y, panX: this.pan.x, panY: this.pan.y,
        playerBoxX: P.x * SCALE + this.pan.x, playerBoxY: P.y * SCALE + this.pan.y,
        facingRot: this.player.rotation, markers: this.used, under: !!this.under,
        routes: map.routes.length, places: map.places.length, words: w ? { ...w } : null,
        quest: quest ? { x: Math.round(quest.x), y: Math.round(quest.y), npc: quest.npc || null, zoneId: quest.zoneId || null, edge: questEdge } : null,
      };
    } catch (e) { /* never breaks the frame */ }
  }

  destroy() {
    this._dropUnder();
    try { this.root.destroy({ children: true }); } catch (e) { /* gone */ }
    this.pool = [];
  }
}
