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
import { Container, Graphics, Sprite, Text, Texture, Assets } from 'pixi.js';
import { IMAGE_ZONE_MAPS } from '../tiledMaps.js';
import { propsForZone } from '@/data/worldProps.js';
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

/* Icon footprint in CSS px.  11 is the smallest a distinct SHAPE survives at
   on a phone — below that everything becomes the same grey lozenge and only
   colour carries meaning, which is what the first cut of this shipped. */
const ICON_PX = 9;
const BIG_ICON_PX = 11;   /* buildings and quest markers: the things you steer by */
const SCALE = MINIMAP_PX / WINDOW_WORLD;

/* Marker radius in CSS px, and colours.  Lantern Slate (docs/LANTERN-SLATE-SPEC.md):
   brass is the one accent, hp-red for hostiles, xp-green for other bros. */
const DOT_R = 3;
const C_FRAME_BG   = 0x111e23;   /* COL.well  — recessed tray, and the void outside the zone */
/* v2.3.1792: the flat ground.  A step up from the tray so the zone's EDGE
   still reads, and dark/desaturated so every marker colour — brass, red,
   green, blue, white — sits clear of it. */
const C_LAND       = 0x22333a;
const C_BORDER     = 0xd8aa58;   /* COL.accent — lantern brass */
const C_PLAYER     = 0xf4f0e7;   /* COL.text */
const C_MONSTER    = 0xe35d5b;   /* COL.hp */
const C_OTHER      = 0x58b97b;   /* COL.xp */
const C_NPC        = 0x4f8fde;   /* COL.mp */
const C_NODE       = 0x8d9b98;   /* COL.muted — quiet, they are scenery until you want one */
const C_EXIT       = 0xeac675;   /* COL.focus — brighter brass, the thing you look for */
const C_BUILDING   = 0xf4f0e7;   /* COL.text — landmarks read as chrome, not as a faction */
const C_QUEST      = 0xd8aa58;   /* COL.accent — gold '!', same as the in-world badge */
const C_QUEST_DONE = 0x58b97b;   /* COL.xp — green '?', same as the in-world badge */

/* v2.3.1783: which glyph a building gets, keyed off the ACTION its door
   opens (worldProps.js) rather than off its id.  Keying on the action means
   the icon and the panel come from one field: rename a building and the map
   still promises exactly the trade you get when you walk in. */
const BUILDING_ICON = {
  forge: 'forge',
  bank: 'bank',
  enchant: 'enchant',
  shop: 'shop',
};

/* Townsfolk who do a job get that job's glyph — the same one their building
   carries, so "the anvil on the map" is the blacksmith whether you find the
   forge or the man.  Anyone else is a plain townsfolk. */
const NPC_ICON = {
  blacksmith_bro: 'forge',
  storekeeper_bro: 'shop',
  mayor_bro: 'star',
};

/* Same order as entityRenderer's SECTORS — S._renderFacing is published from
   there, so this must match it or the chevron points somewhere else. */
const FACING_SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

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

    /* ═══ v2.3.1792: the ground is a FLAT COLOUR, not the painted map ═══
       Owner: "Can the minimap of the map be stripped to only use a plain color
       so it's simpler as an easier contrast against the map".

       v2.3.1781 drew the zone's own painted image here, and the argument for
       it was that it cannot drift from the art because it IS the art.  That
       argument was about accuracy, and accuracy turned out to be the wrong
       thing to optimise at this size: town's cobble is bright warm sand, and
       against it a 3px brass portal or a gold quest pin is nearly invisible.
       A marker layer is only worth the pixels if you can read it at a glance.

       So the ground is one flat slab now, sized and panned exactly as the
       image was — the zone's extent, its edges, and the camera-style clamp all
       behave identically, so what you lose is texture and nothing else.  It
       also means the box no longer waits on art: a flat rect is always ready.

       (The dashboard's Map panel still draws the real image.  It is a much
       bigger box, opened deliberately, where terrain reads fine and is the
       whole point of looking.) */
    this.land = new Graphics();
    this.pan.addChild(this.land);
    this._landW = -1; this._landH = -1;
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
    this._buildIcons();
    this._pool = [];
    this._used = 0;
    this._topInset = MARGIN;
    this._insetFor = null;   /* the cssH the inset was measured at */

    /* Player marker sits above every other marker.  v2.3.1783: a CHEVRON, not
       a dot — rotated to your facing, so the box answers "which way am I
       pointed" as well as "where am I".  Those are the two questions a
       minimap is opened for and a dot only answers one. */
    this._player = new Sprite(this._icons.self || this._dotTex);
    this._player.anchor.set(0.5);
    this._player.width = 13;
    this._player.height = 13;
    this._player.tint = C_PLAYER;
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

  /* ═══ v2.3.1783: ICONS, NOT COLOURED DOTS ═══
     Owner: "there needs to be better symbols on the minimap.  Stuff for
     portal, quest marker, icon representing what the building or NPC does
     (blacksmith, general store, etc).  Monsters should also have an icon
     that makes sense."

     The first cut drew every marker as the same circle in a different colour.
     That is a legend you have to memorise, and on a bright sand map at 3px
     several of those colours are the same colour.  Shape is what reads at
     this size, so each thing gets its own silhouette and colour becomes
     reinforcement rather than the only signal.

     DRAWN, NOT SAMPLED FROM THE UI ICON SET.  The /icons/ui art is 30px+ webp
     with interior detail; scaled to 11px it turns to mush, and it would be
     new bytes to load for a HUD element that must never load anything (see
     the header).  These are minted once at construction into small textures
     off one Graphics, then reused as tinted sprites — so the per-frame cost
     is identical to the coloured dots they replace.

     Each glyph is authored in a 32x32 box and drawn at 2x resolution, so it
     stays crisp when a phone's DPR scales it back up. */
  _mintIcon(key, draw) {
    const g = new Graphics();
    draw(g);
    /* Every glyph is filled WHITE and outlined BLACK, and the two behave
       differently under tint: tinting multiplies RGB, so the white fill takes
       the marker's colour while the black outline stays black whatever colour
       it is tinted.  One texture per glyph therefore carries both its shape
       and a keyline that survives on pale sand and dark cliff alike — which
       is what the first cut lacked, and why a white building marker vanished
       over the cobbles. */
    let tex;
    try {
      tex = this.app.renderer.generateTexture({ target: g, resolution: 2 });
    } catch (e) {
      tex = this._dotTex;
    }
    this._icons[key] = tex;
    return tex;
  }

  /** A quest pin: a filled disc carrying a dark '!' or '?'.
   *
   *  Both parts exploit the same tint rule as the glyphs — the disc is white
   *  so it takes the marker colour, the character and the keyline are
   *  near-black so they stay legible on top of it whatever that colour is.
   *  Bare tinted text was the first attempt and a gold '!' on gold sand is
   *  not a marker.  This is also the in-world badge's own construction
   *  (_drawQuestBadge: dark ring, white ring, state-coloured fill). */
  _mintPin(key, ch) {
    let tex;
    try {
      const c = new Container();
      const g = new Graphics();
      g.circle(16, 16, 13).fill(0xffffff).stroke({ width: 3, color: 0x0b161b, alpha: 1 });
      c.addChild(g);
      const t = new Text({
        text: ch,
        style: { fontFamily: 'Source Sans 3, sans-serif', fontSize: 21, fontWeight: '900', fill: '#0b161b' },
      });
      t.anchor.set(0.5);
      t.x = 16; t.y = 15;
      c.addChild(t);
      tex = this.app.renderer.generateTexture({ target: c, resolution: 2 });
      c.destroy({ children: true });
    } catch (e) {
      tex = this._dotTex;
    }
    this._icons[key] = tex;
    return tex;
  }

  _buildIcons() {
    this._icons = Object.create(null);
    const C = 16;   /* centre of the 32x32 authoring box */

    /* Every glyph below fills white and strokes near-black; see _mintIcon. */
    const KL = { width: 3, color: 0x0b161b, alpha: 1, join: 'round' };

    /* Hostile: an upward spike.  A triangle is the one silhouette nobody
       reads as scenery, and it points, which a circle cannot. */
    this._mintIcon('monster', (g) => {
      g.poly([C, 4, 28, 28, 4, 28]).fill(0xffffff).stroke(KL);
    });
    /* Another bro: head and shoulders. */
    this._mintIcon('player', (g) => {
      g.circle(C, 10, 5.5).fill(0xffffff).stroke(KL);
      g.roundRect(6, 18, 20, 11, 5).fill(0xffffff).stroke(KL);
    });
    /* You: a chevron, rotated to the way you are facing. */
    this._mintIcon('self', (g) => {
      g.poly([C, 3, 28, 29, C, 22, 4, 29]).fill(0xffffff).stroke(KL);
    });
    /* Portal: a standing arch — a doorway, not a dot. */
    this._mintIcon('portal', (g) => {
      g.poly([4, 30, 4, 16, C, 4, 28, 16, 28, 30, 21, 30, 21, 18, C, 12, 11, 18, 11, 30])
        .fill(0xffffff).stroke(KL);
    });
    /* Anvil: the blacksmith, on the building AND on the man.  Horn left, flat
       face, waist, splayed foot — the shape only reads if all four are there;
       the first cut skipped the waist and came out a goblet. */
    this._mintIcon('forge', (g) => {
      g.poly([6, 9, 27, 9, 27, 15, 6, 15]).fill(0xffffff).stroke(KL);
      g.poly([7, 9, 1, 13, 7, 16]).fill(0xffffff).stroke(KL);
      g.rect(13, 15, 7, 7).fill(0xffffff).stroke(KL);
      g.poly([6, 28, 9, 22, 24, 22, 27, 28]).fill(0xffffff).stroke(KL);
    });
    /* Satchel: the general store, and the man who runs it.  A coin was the
       obvious choice and it is wrong — at this size a disc with a hole is the
       portal arch again, and two marks that mean different things must not
       share a silhouette. */
    this._mintIcon('shop', (g) => {
      g.poly([9, 11, 23, 11, 27, 29, 5, 29]).fill(0xffffff).stroke(KL);
      g.poly([12, 11, 12, 6, 20, 6, 20, 11]).fill(0xffffff).stroke(KL);
    });
    /* Stacked coins: the bank. */
    this._mintIcon('bank', (g) => {
      g.ellipse(C, 24, 11, 4.5).fill(0xffffff).stroke(KL);
      g.ellipse(C, 17, 11, 4.5).fill(0xffffff).stroke(KL);
      g.ellipse(C, 10, 11, 4.5).fill(0xffffff).stroke(KL);
    });
    /* Gem: the elemental enchanter. */
    this._mintIcon('enchant', (g) => {
      g.poly([C, 3, 29, 13, C, 30, 3, 13]).fill(0xffffff).stroke(KL);
    });
    /* A roof with a chimney: the mayor's house, and any building with no
       trade of its own. */
    this._mintIcon('house', (g) => {
      g.poly([C, 4, 29, 16, 25, 16, 25, 29, 7, 29, 7, 16, 3, 16])
        .fill(0xffffff).stroke(KL);
    });
    /* A plain townsfolk with nothing to sell. */
    this._mintIcon('npc', (g) => {
      g.circle(C, 10, 5.5).fill(0xffffff).stroke(KL);
      g.roundRect(7, 18, 18, 11, 5).fill(0xffffff).stroke(KL);
    });
    /* The mayor.  NOT the house glyph he used to share with his own building:
       two different things a step apart on the map must not draw the same
       mark, or the map says there are two houses. */
    this._mintIcon('star', (g) => {
      g.star(C, C, 5, 13, 6).fill(0xffffff).stroke(KL);
    });
    /* Resource node: a small rough lump, deliberately the quietest mark. */
    this._mintIcon('node', (g) => {
      g.poly([C, 8, 24, 15, 21, 26, 11, 26, 8, 15]).fill(0xffffff).stroke(KL);
    });
    /* The two quest states, matching the in-world badge exactly: '❗' means
       he has work, '❓' means you can hand it in (entityRenderer sets
       npc._questMarker to one of those two glyphs, and this reads it rather
       than re-deriving quest state — one source, so they cannot disagree). */
    this._mintPin('quest', '!');
    this._mintPin('questDone', '?');
  }

  /** Place one marker.  `icon` is a key into the minted set (or null for the
   *  plain dot); `px` is its footprint in CSS px; `rot` rotates it (only the
   *  player chevron uses that). */
  _mark(wx, wy, icon, color, px, rot, dyPx) {
    let s = this._pool[this._used];
    if (!s) {
      s = new Sprite(this._dotTex);
      s.anchor.set(0.5);
      this._pool.push(s);
      this.markers.addChild(s);
    }
    const tex = (icon && this._icons[icon]) || this._dotTex;
    if (s.texture !== tex) s.texture = tex;
    /* Markers live under `pan`, which is scaled 1:1 — the world->box
       conversion happens here so a marker keeps a constant SCREEN size
       regardless of how much world the box spans. */
    s.x = wx * SCALE;
    s.y = wy * SCALE + (dyPx || 0);
    /* width/height rather than scale: the minted textures are all authored in
       a 32x32 box but generateTexture trims to the drawn bounds, so their
       pixel sizes differ and a shared scale would render them at different
       apparent sizes. */
    s.width = px;
    s.height = px;
    s.rotation = rot || 0;
    s.tint = color;
    s.alpha = 1;
    s.visible = true;
    this._used++;
    return s;
  }

  _dot(wx, wy, color, r) {
    const st = this._mark(wx, wy, null, color, (r || DOT_R) * 2, 0);
    return st;
  }

  /** How far down the box has to start to clear the zone-header rail.
   *  Owner: "The minimap is sitting a bit too high (it gets cut off by the
   *  bar at the top with the map name on it)."
   *
   *  MEASURED off the live DOM rather than hard-coded to the rail's 50px,
   *  because that rail is `50px + env(safe-area-inset-top)` — on a notched
   *  iPhone the inset is real and a constant would put the box back under the
   *  bar on exactly the primary platform.  Re-measured only when the canvas
   *  size changes (rotation, resize), so it is not a per-frame layout read. */
  _measureTopInset(canvas, cssH) {
    if (this._insetFor === cssH) return this._topInset;
    this._insetFor = cssH;
    let inset = MARGIN;
    try {
      const cv = canvas || document.querySelector('canvas');
      const hdr = document.querySelector('.bt-zone-header');
      if (cv && hdr) {
        const c = cv.getBoundingClientRect();
        const h = hdr.getBoundingClientRect();
        if (h.height > 0) inset = Math.max(MARGIN, Math.round(h.bottom - c.top) + MARGIN);
      }
    } catch (e) { /* keep the default */ }
    this._topInset = inset;
    return inset;
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

  update(S, cssW, cssH, canvas) {
    const P = S && S.player;
    const zoneId = S && S.currentZone;
    const zone = zoneId && ZONES[zoneId];
    /* Hold the box back while the per-zone loading overlay is up — a
       half-swapped zone would draw the new player position on the old map. */
    if (!P || !zone || S._zoneLoading) { this.root.visible = false; return; }

    const zoneW = zone.w * TILE;
    const zoneH = zone.h * TILE;

    /* Redraw the slab only when the zone's extent actually changes — a
       Graphics rebuild every frame would be geometry churn for a rectangle
       that is constant for as long as you are standing in the zone. */
    const landW = zoneW * SCALE, landH = zoneH * SCALE;
    if (landW !== this._landW || landH !== this._landH) {
      this.land.clear();
      this.land.rect(0, 0, landW, landH).fill(C_LAND);
      this._landW = landW; this._landH = landH;
    }

    /* v2.3.1792: NOT used to draw — reported to mp-minimap so it can keep
       asserting that the zone texture is <img>-backed.  That property belongs
       to the dashboard's Map panel, which draws the renderer's own
       HTMLImageElement straight to a 2D canvas and would silently blank if a
       pixi upgrade ever went back to ImageBitmap (v2.3.778).  The minimap is
       the only place with a probe the harness can reach, so the check lives
       on its probe rather than nowhere. */
    const url = IMAGE_ZONE_MAPS[zoneId];
    const tex = url ? Assets.cache.get(url) : null;

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
    this.root.y = this._measureTopInset(canvas, cssH);
    this.root.visible = true;

    /* ── markers ───────────────────────────────────────────────────
       v2.3.1783: every class of thing gets its own SILHOUETTE, not just its
       own colour (see _buildIcons for why).  Drawn quietest-first so what you
       steer by lands on top: nodes < buildings < NPCs < other bros < monsters
       < portals < quest markers < you. */
    this._used = 0;

    const nodes = S.gatherNodes || [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || n.alive === false) continue;
      this._mark(n.x, n.y, 'node', C_NODE, 7, 0);
    }

    /* Buildings, keyed off the SAME `action` the door panel opens — so the
       icon can never promise a trade the building does not run.  A prop with
       no action (the mayor's house) falls back to the roof glyph. */
    let props = [];
    try { props = propsForZone(zoneId) || []; } catch (e) { props = []; }
    for (let i = 0; i < props.length; i++) {
      const b = props[i];
      if (!b || !b.sprite) continue;         /* the anvil and stall are scenery */
      const key = BUILDING_ICON[b.action] || (b.blockW ? 'house' : null);
      if (!key) continue;
      /* Anchored at the bottom-centre in world space, so lift the marker onto
         the middle of the building rather than its doorstep. */
      this._mark(b.x, b.y - (b.worldH || 0) * 0.35, key, C_BUILDING, BIG_ICON_PX, 0);
    }

    const npcs = S.npcs || [];
    const questPins = [];
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      if (!n || !n.alive) continue;
      this._mark(n.x, n.y, NPC_ICON[n.id] || 'npc', C_NPC, ICON_PX, 0);
      /* Defer the '!' / '?' so it draws above every other marker — a quest
         pin the monsters can cover is a quest pin you walk past. */
      if (n._questMarker) questPins.push(n);
    }

    const others = S.others;
    if (others) {
      for (const id in others) {
        const o = others[id];
        if (!o) continue;
        if ((o.zone || o.z || 'town') !== zoneId) continue;
        this._mark(o.x, o.y, 'player', C_OTHER, ICON_PX, 0);
      }
    }

    const mons = S.monsters || [];
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || m.dead || (m.hp != null && m.hp <= 0)) continue;
      this._mark(m.x, m.y, 'monster', C_MONSTER, ICON_PX, 0);
    }

    const exits = this._exits(S);
    for (let i = 0; i < exits.length; i++) {
      this._mark(exits[i].x, exits[i].y, 'portal', C_EXIT, BIG_ICON_PX, 0);
    }

    /* '❗' = he has work for you, '❓' = you can hand it in.  Read straight off
       npc._questMarker, which is what the in-world badge over his head reads
       too — one source, so the map and the world can never disagree about
       whether a quest is waiting. */
    for (let i = 0; i < questPins.length; i++) {
      const n = questPins[i];
      const ready = n._questMarker !== '❗';
      /* Offset in BOX pixels, not world pixels.  A world offset shrinks with
         the map scale — the 26 world px this started at is 2.8 px in the box,
         so the pin sat inside the NPC glyph it was meant to flag. */
      this._mark(n.x, n.y, ready ? 'questDone' : 'quest',
        ready ? C_QUEST_DONE : C_QUEST, BIG_ICON_PX, 0, -9);
    }

    /* Retire the tail of the pool rather than destroying it — monster counts
       swing every tick and churning Sprites would allocate all combat. */
    for (let i = this._used; i < this._pool.length; i++) this._pool[i].visible = false;

    /* You: a chevron pointing where you face, so the map answers "which way
       am I pointed" as well as "where am I" — the two questions you open a
       minimap for.  SECTORS order is E,SE,S,SW,W,NW,N,NE and the glyph is
       authored pointing up (north), hence the -PI/2. */
    const fIdx = FACING_SECTORS.indexOf(S._renderFacing || 'south');
    this._player.x = P.x * SCALE;
    this._player.y = P.y * SCALE;
    this._player.rotation = fIdx >= 0 ? fIdx * Math.PI / 4 + Math.PI / 2 : 0;

    /* QA probe (tools/qa/mp) — the harness cannot read a WebGL canvas, so
       the numbers a scenario asserts on come from here. */
    try {
      window.__btMinimap = {
        visible: true, zone: zoneId,
        panX: this.pan.x, panY: this.pan.y,
        spanW, spanH, markers: this._used,
        exits: exits.length,
        icons: (() => {
          /* Census of which glyph each live marker is using, for QA — a
             screenshot cannot tell an anvil from a coin at 13px. */
          const out = Object.create(null);
          const byTex = new Map();
          for (const k in this._icons) byTex.set(this._icons[k], k);
          for (let i = 0; i < this._used; i++) {
            const k = byTex.get(this._pool[i].texture) || 'dot';
            out[k] = (out[k] || 0) + 1;
          }
          return out;
        })(),
        topInset: this.root.y,
        facingRot: this._player.rotation,
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
