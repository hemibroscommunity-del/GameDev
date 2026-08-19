/**
 * ═══ MINIMAP (v2.3.1781) ═══
 *
 * Owner: "I think it'd be good to add a little minimap in the upper right
 * corner.  But I don't know the best way to do that."
 *
 * WHY THIS DRAWS THE MAP ART AND NOT A TILE GRID
 * ----------------------------------------------
 * There was already a minimap — the dashboard's Map panel
 * (src/ui/mobile/dash/MapPanel.jsx) — and it had been drawing a place that
 * does not exist.  It paints from `S.map`, which is `generateZoneMap()`:
 * procedural cross-paths, a ring road, and the TOWN_BUILDINGS rectangles.
 * v2.3.1681 already established that those rectangles are collision boxes
 * inherited from the old 40x30 tile village and line up with nothing in the
 * painted town; since the town became a 96x30 clifftop plateau they line up
 * with even less.  A minimap whose walls are imaginary is worse than none:
 * the player trusts it and walks into a cliff.
 *
 * So this one uses the ONE source that cannot drift — the same painted
 * texture the world itself is drawn from (`IMAGE_ZONE_MAPS[zone]`, already
 * resident in the Assets cache for the zone you are standing in).  It costs
 * no new bytes of memory, needs no build step, and is exactly what the
 * player sees, because it IS what the player sees.  That mattered enough to
 * pick it over the two alternatives:
 *   - re-deriving a tile grid: another representation to keep in sync, i.e.
 *     the MapPanel bug again with extra steps;
 *   - baking per-zone thumbnail assets offline: correct, but new files to
 *     regenerate whenever art changes, and new bytes on a device where RAM
 *     is already the reason zone art loads per-zone (v2.3.1405).
 *
 * WHY A WINDOW AND NOT THE WHOLE ZONE
 * -----------------------------------
 * Owner chose "window around you".  It is also the only choice that works
 * for every zone: town is 3072x960 world px (3.2:1), so fitting the whole
 * zone into a square box would draw it as a ~104x33 sliver floating in dead
 * space, while the square 1536x1536 combat zones would fill it.  A fixed
 * WINDOW_WORLD slice looks identical in every zone and keeps a consistent
 * sense of scale between them.
 *
 * WHY THE PLAYER DOT IS NOT NAILED TO THE CENTRE
 * ----------------------------------------------
 * The map pans under a fixed box and is CLAMPED at the zone edges, exactly
 * like the world camera (v2.3.819).  Near a border the map stops and the
 * player dot walks toward the edge of the box instead.  Locking the dot to
 * the centre would mean drawing void outside the map — the same defect the
 * world camera's clamp exists to prevent, reproduced in miniature.
 *
 * PRELOADING: this system loads NOTHING.  The map texture is whatever the
 * zone gate already put in the cache, and the marker dot is one texture
 * generated once at construction.  If the texture is not resident yet (the
 * per-zone loading overlay is still up) the frame is skipped and retried —
 * a cache LOOKUP, never an Assets.load.  Do not add a lazy load here.
 */
import { Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
import { IMAGE_ZONE_MAPS } from '../tiledMaps.js';
import { ZONES } from '@/data/zones.js';
import { TILE } from '@/data/constants.js';

/* Box size in CSS px.  104 is ~27% of a 390px phone's width — big enough
   that a 3px dot reads, small enough to leave the corner usable. */
export const MINIMAP_PX = 104;
/* How much world the box spans, in world px.  960 = 30 tiles ~= 1.6x the
   player's own viewport width (585 at WORLD_ZOOM 1.5) — enough context to
   plan a route without a monster dot going sub-pixel.

   960 is not an arbitrary round number: it is exactly the town plateau's
   DEPTH (30 tiles).  Anything larger and the box is taller than the town,
   so the pan below falls into its centre-a-small-zone branch and draws
   empty tray above and below the map — the same defect that capped
   WORLD_ZOOM at 1.5 in v2.3.1780, reproduced in the corner of the screen.
   Tying the two together is deliberate: if the town ever gets deeper, both
   numbers can move, and this comment is the second place to check. */
export const WINDOW_WORLD = 960;
const MARGIN = 10;   /* clears the 2px outer ring above */
const SCALE = MINIMAP_PX / WINDOW_WORLD;

/* Marker radius in CSS px, and colours.  Lantern Slate (docs/LANTERN-SLATE-SPEC.md):
   brass is the one accent, hp-red for hostiles, xp-green for other bros. */
const DOT_R = 3;
const C_FRAME_BG   = 0x111e23;   /* COL.well  — recessed tray */
const C_BORDER     = 0xd8aa58;   /* COL.accent — lantern brass */
const C_PLAYER     = 0xf4f0e7;   /* COL.text */
const C_MONSTER    = 0xe35d5b;   /* COL.hp */
const C_OTHER      = 0x58b97b;   /* COL.xp */
const C_NPC        = 0x4f8fde;   /* COL.mp */
const C_NODE       = 0x8d9b98;   /* COL.muted — quiet, they are scenery until you want one */
const C_EXIT       = 0xeac675;   /* COL.focus — brighter brass, the thing you look for */

/* Tile ids that generateZoneMap() stamps for real portals.  These ARE
   trustworthy even though the rest of that grid is not: v2.3.388 and the
   worldview branch stamp them from TOWN_EXITS / WORLDVIEW_EXITS, the same
   coordinates the world's portal-glow pass reads.  Everything else in
   `S.map` (paths, buildings, flowers) is ignored here on purpose. */
const EXIT_TILES = new Set([8, 9, 10]);

export class MinimapRenderer {
  constructor(hudLayer, app) {
    this.layer = hudLayer;
    this.app = app;

    this.root = new Container();
    this.root.label = 'minimap';
    this.root.visible = false;
    hudLayer.addChild(this.root);

    /* Recessed tray behind the map, so a not-yet-resident texture reads as
       an empty well rather than a hole in the UI. */
    /* Dark outer ring UNDER the tray.  The map art is bright sand and pale
       sky in town, and a 1px brass hairline alone disappears against it —
       the box has to read as a separate object sitting on top of the world,
       not as a lighter patch of it. */
    this.shadow = new Graphics();
    this.shadow.roundRect(-2, -2, MINIMAP_PX + 4, MINIMAP_PX + 4, 10).fill({ color: 0x000000, alpha: 0.42 });
    this.root.addChild(this.shadow);

    this.bg = new Graphics();
    this.bg.roundRect(0, 0, MINIMAP_PX, MINIMAP_PX, 8).fill(C_FRAME_BG);
    this.root.addChild(this.bg);

    /* Everything that pans lives under `pan`, so the map image and every
       marker share ONE transform — a marker can never drift off the terrain
       it is meant to be standing on. */
    this.clip = new Container();
    this.root.addChild(this.clip);
    this.pan = new Container();
    this.clip.addChild(this.pan);

    this.mapSprite = new Sprite(Texture.EMPTY);
    this.pan.addChild(this.mapSprite);
    this.markers = new Container();
    this.pan.addChild(this.markers);

    this.maskG = new Graphics();
    this.maskG.roundRect(0, 0, MINIMAP_PX, MINIMAP_PX, 8).fill(0xffffff);
    this.root.addChild(this.maskG);
    this.clip.mask = this.maskG;

    /* Brass hairline on top of the clipped content. */
    this.border = new Graphics();
    this.border.roundRect(0.5, 0.5, MINIMAP_PX - 1, MINIMAP_PX - 1, 8)
      .stroke({ width: 1, color: C_BORDER, alpha: 0.75 });
    this.root.addChild(this.border);

    this._dotTex = this._makeDotTexture();
    this._pool = [];
    this._used = 0;

    /* Player marker sits above every other dot and is drawn as a ringed dot
       so it stays findable in a cluster of monsters. */
    this._player = new Graphics();
    this._player.circle(0, 0, DOT_R + 1.6).fill({ color: 0x000000, alpha: 0.55 });
    this._player.circle(0, 0, DOT_R).fill(C_PLAYER);
    this.pan.addChild(this._player);

    this._zoneId = null;
    this._exitCache = [];      /* world-space {x,y} per portal, per zone */
    this._exitMapRef = null;   /* identity of the S.map the cache was built from */
  }

  /** One 8px white circle, tinted per marker.  Generated once — a Graphics
   *  per marker would rebuild geometry every frame for every monster. */
  _makeDotTexture() {
    const g = new Graphics();
    g.circle(8, 8, 7).fill(0xffffff);
    try {
      return this.app.renderer.generateTexture({ target: g, resolution: 2 });
    } catch (e) {
      return Texture.WHITE;   /* square dots beat no minimap */
    }
  }

  _dot(wx, wy, color, r) {
    let s = this._pool[this._used];
    if (!s) {
      s = new Sprite(this._dotTex);
      s.anchor.set(0.5);
      this._pool.push(s);
      this.markers.addChild(s);
    }
    /* Markers live under `pan`, which is scaled 1:1 — world->box conversion
       is done here so the dot keeps a constant SCREEN size regardless of
       how much world the box spans. */
    s.x = wx * SCALE;
    s.y = wy * SCALE;
    const d = (r || DOT_R) * 2;
    s.width = d;
    s.height = d;
    s.tint = color;
    s.visible = true;
    this._used++;
  }

  /** Portal positions in world px, recomputed only when the zone's map
   *  object identity changes (the same signal pixiRenderer uses for zone
   *  change).  Scanning a 96x48 grid every frame would be 4608 reads for a
   *  handful of dots that never move. */
  _exits(S) {
    const map = S.map;
    if (!map || !map.length) return [];
    if (this._exitMapRef === map) return this._exitCache;
    this._exitMapRef = map;
    const out = [];
    for (let ty = 0; ty < map.length; ty++) {
      const row = map[ty];
      if (!row) continue;
      for (let tx = 0; tx < row.length; tx++) {
        if (!EXIT_TILES.has(row[tx] | 0)) continue;
        const wx = (tx + 0.5) * TILE;
        const wy = (ty + 0.5) * TILE;
        /* The stamps are 2x2 tile blocks, so merge anything within 3 tiles
           of a portal already recorded — otherwise every exit draws as a
           four-dot smudge. */
        let merged = false;
        for (const e of out) {
          if (Math.abs(e.x - wx) <= TILE * 3 && Math.abs(e.y - wy) <= TILE * 3) { merged = true; break; }
        }
        if (!merged) out.push({ x: wx, y: wy });
      }
    }
    this._exitCache = out;
    return out;
  }

  update(S, cssW, cssH) {
    const P = S && S.player;
    const zoneId = S && S.currentZone;
    const zone = zoneId && ZONES[zoneId];
    /* Hold the box back while the per-zone loading overlay is up — a
       half-swapped zone would draw the new player position on the old map. */
    if (!P || !zone || S._zoneLoading) { this.root.visible = false; return; }

    const url = IMAGE_ZONE_MAPS[zoneId];
    const tex = url ? Assets.cache.get(url) : null;
    if (!tex) { this.root.visible = false; return; }   /* lookup only — never a load */

    if (this.mapSprite.texture !== tex) this.mapSprite.texture = tex;

    const zoneW = zone.w * TILE;
    const zoneH = zone.h * TILE;
    this.mapSprite.width = zoneW * SCALE;
    this.mapSprite.height = zoneH * SCALE;

    /* Pan so the player sits at the centre of the box, then clamp to the
       zone the way the world camera does — the map stops at its edge and
       the dot walks out to meet it.  A zone smaller than the window centres
       instead, since some empty box is then unavoidable. */
    const spanW = zoneW * SCALE, spanH = zoneH * SCALE;
    const wantX = MINIMAP_PX / 2 - P.x * SCALE;
    const wantY = MINIMAP_PX / 2 - P.y * SCALE;
    this.pan.x = spanW <= MINIMAP_PX ? (MINIMAP_PX - spanW) / 2 : Math.max(MINIMAP_PX - spanW, Math.min(0, wantX));
    this.pan.y = spanH <= MINIMAP_PX ? (MINIMAP_PX - spanH) / 2 : Math.max(MINIMAP_PX - spanH, Math.min(0, wantY));

    this.root.x = Math.round(cssW - MINIMAP_PX - MARGIN);
    this.root.y = MARGIN;
    this.root.visible = true;

    /* ── markers ───────────────────────────────────────────────────
       Drawn quietest-first so the things you act on land on top:
       nodes < NPCs < other players < monsters < exits < you. */
    this._used = 0;

    const nodes = S.gatherNodes || [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || n.alive === false) continue;
      this._dot(n.x, n.y, C_NODE, 2);
    }

    const npcs = S.npcs || [];
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      if (!n || !n.alive) continue;
      this._dot(n.x, n.y, C_NPC, 2.5);
    }

    const others = S.others;
    if (others) {
      for (const id in others) {
        const o = others[id];
        if (!o) continue;
        if ((o.zone || o.z || 'town') !== zoneId) continue;
        this._dot(o.x, o.y, C_OTHER, DOT_R);
      }
    }

    const mons = S.monsters || [];
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || m.dead || (m.hp != null && m.hp <= 0)) continue;
      this._dot(m.x, m.y, C_MONSTER, DOT_R);
    }

    const exits = this._exits(S);
    for (let i = 0; i < exits.length; i++) this._dot(exits[i].x, exits[i].y, C_EXIT, 3.5);

    /* Retire the tail of the pool rather than destroying it — monster counts
       swing every tick and churning Sprites would allocate all combat. */
    for (let i = this._used; i < this._pool.length; i++) this._pool[i].visible = false;

    this._player.x = P.x * SCALE;
    this._player.y = P.y * SCALE;

    /* QA probe (tools/qa/mp) — the harness cannot read a WebGL canvas, so
       the numbers a scenario asserts on come from here. */
    try {
      window.__btMinimap = {
        visible: true, zone: zoneId,
        panX: this.pan.x, panY: this.pan.y,
        spanW, spanH, markers: this._used,
        exits: exits.length,
        playerBoxX: P.x * SCALE + this.pan.x,
        playerBoxY: P.y * SCALE + this.pan.y,
        /* What KIND of thing backs the zone texture.  The dashboard's Map
           panel draws this same object straight to a 2D canvas, which only
           works while pixiRenderer keeps preferCreateImageBitmap:false
           (v2.3.778).  Surfaced here so mp-minimap can assert it rather than
           leave a pixi upgrade to blank that panel silently. */
        texKind: (tex.source && tex.source.resource && tex.source.resource.constructor)
          ? tex.source.resource.constructor.name : null,
        texNaturalW: (tex.source && tex.source.resource && tex.source.resource.naturalWidth) || 0,
      };
    } catch (e) { /* never breaks the frame */ }
  }

  destroy() {
    try { this.root.destroy({ children: true }); } catch (e) {}
    this._pool = [];
  }
}
