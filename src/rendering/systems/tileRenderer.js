/**
 * Tile Map Renderer — draws a zone's ground.  In practice that is one
 * Sprite: every live zone has a painted single-image map (or a looping
 * video, for town), so the map is a single texture covering world bounds.
 * The Tiled .tmx path and the procedural colored-rectangle path remain as
 * fallbacks for zones with neither.
 */
import { Container, Graphics, Sprite, Text, TextStyle, Texture, Rectangle, Assets } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js';
import { TOWN_EXITS, WORLDVIEW_EXITS, COMING_SOON_MARKS, TOWN_SOON_MARKS } from '@/data/effects.js';
import { isZoneUnlocked, zoneUnlockQuest, questRoutePoint } from "@/game/questRoute.js"; /* v2.3.1822: a shut door looks shut; v2.3.2121: and the way there is lit */
import { getLoadedTiledMap, getTilesetImage, IMAGE_ZONE_MAPS, VIDEO_ZONE_MAPS } from '../tiledMaps.js';
import { PORTAL_BEAM } from '../fxStrips.js'; /* v2.3.2070: the light shaft over a zone exit */

const ZONE_LABEL_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 28,
  fontWeight: '700',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 4 },
  align: 'center',
  letterSpacing: 2,
});

/* ═══ v2.3.2070: THE PORTAL BEAM'S SIZE AND STRENGTH ═══
 * Owner: "Use this to indicate portal areas (where you go between zones)
 * instead of the double circles.  It should fade furthest from the zone
 * entrance."
 *
 * 168 world px is 5.25 tiles tall, against the old halo's 3.2-tile width.
 * That sounds like a big jump and is not one on screen: the beam's own alpha
 * is baked to fall 98% from apex to tip (tools/import_portal_beam.py), so the
 * bright part is about a tile and a half across at the base and the rest is a
 * plume you read rather than look at.  Its footprint on the ground -- the part
 * that competes with the map art -- is SMALLER than the three nested circles
 * it replaces.
 *
 * Anchored (0.5, 1) so the sprite's bottom row sits on the tile centre.  The
 * bottom row IS the apex: the importer flips the artwork, which arrives with
 * its apex at the top, so the brightest, narrowest end lands where you step
 * through and the fan rises away from it. */
const PORTAL_BEAM_H = 168;
/* Multiplier on the pulse, which runs 0.4..0.8 — so this is not the opacity,
 * it is what the pulse is scaled BY.  1.25 is exactly the value that maps the
 * pulse's own peak (0.8) to a fully opaque beam and no further: anything
 * higher clips at the top of every cycle, which does not make the beam
 * brighter, it flattens the pulse into a hold.  At 1.0 the beam tops out at
 * 0.8 and reads as haze on town's cobble, which is the brightest ground in the
 * game and the first place the owner will look. */
const PORTAL_BEAM_ALPHA = 1.25;
/* A locked exit keeps a beam so the way stays findable on a painted map
 * (v2.3.1822's rule), but a cold and dim one: slate tint, and the pulse is
 * already halved for locked exits before it gets here.  The invitation is what
 * is removed, not the landmark. */
const PORTAL_BEAM_LOCKED_TINT = 0x7c8798;

/* ═══ v2.3.2121: THE QUEST ROAD ═══
 * Owner: "make it so that during quests there's a light gold path to the next
 * area you're supposed to go to."
 *
 * questRoute.js has answered "which way" since v2.3.1817 — it is what the
 * minimap star reads — but only on the minimap, which is a thing you stop to
 * consult.  This puts the same answer on the ground in front of you.
 *
 * IT IS A HEADING, NOT A ROUTE MAP.  The motes run from the player's feet
 * TRAIL_TILES along the way and stop, rather than drawing the whole distance.
 * Two reasons, and the second is the load-bearing one:
 *   - A line all the way across a zone is a stripe over the map art, and this
 *     has to survive being looked at for an entire play session.
 *   - It cannot go stale.  It is re-derived from the player's live position,
 *     so a short road that keeps being true beats a long one drawn once.
 *
 * Those seven tiles ARE PATHFOUND, over the same walkability grid the player
 * collides with — see _questPath, and see its header for why the first cut
 * (straight line, stopped at the first wall) drew nothing at all on the one
 * screen this feature was asked for.
 *
 * WHY IT AGREES WITH THE MINIMAP.  Both read questRoute.js.  The star answers
 * "which portal" and the road answers "which way from here"; if the road
 * picked its own destination the two could point opposite ways, which is
 * worse than having neither.
 *
 * Drawn on overlayGfx, which is cleared and refilled every frame — so this
 * costs no texture, and therefore has nothing to register with
 * preloadWorldAnimations (CLAUDE.md's preloading law is about assets that can
 * hitch on first use; a Graphics circle cannot). */
const TRAIL_GOLD = 0xF5C542;
/* The mote's hot centre and its shadow.  Both exist because town's ground is
   painted GOLD — see the three-ring note in _drawQuestTrail.  TRAIL_INK is
   Lantern Slate's own ink, the colour the quest plate sits on. */
const TRAIL_CORE = 0xFFF3C4;
const TRAIL_INK = 0x0D151A;
const TRAIL_TILES = 7;          /* how far ahead the road is lit */
const TRAIL_STEP = 0.9;         /* tiles between motes */
const TRAIL_NEAR_TILES = 1.4;   /* no motes under your own feet */

/* ═══ v2.3.2070: QA HANDLE ON THE BEAMS ═══
 * The beam is ADDITIVE light over a painted map, so the only honest way to
 * measure it is to shoot the same frame twice — with and without — and diff.
 * That needs a way to turn them off that the render loop will not undo, and it
 * has to reach the LIVE renderer.
 *
 * A per-instance `window.__x = () => this.y` (the shape the other probes in
 * this file use) is not good enough here, twice over: update() re-sets
 * `visible = true` on every beam every frame, so hiding the sprites is undone
 * before the shutter opens; and a renderer built later silently clobbers the
 * global, so the handle can end up pointing at an instance that is not the one
 * on screen. That second failure is invisible — the toggle reports success and
 * the two screenshots come back identical.
 * So the set is the registry, the CONTAINER's flag is what moves, and every
 * live renderer moves together. */
const _liveTileRenderers = new Set();

function cssToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}

/* Fallback colors for tiles without sprite assets */
const TILE_COLORS_BASE = {
  0: 0x2d5a1e, 1: 0x8b7355, 2: 0x2a6ca8, 3: 0x4a3a5c,
  4: 0x1a4a12, 5: 0x2d5a1e, 6: 0xd4b483, 7: 0x6b6b6b,
  8: 0x5b52ff, 9: 0x3dd497, 10: 0xff5e6c, 11: 0x4a4a4a,
  12: 0x6a5a3a, 13: 0x7a5a3a, 14: 0x5a4a2a, 15: 0x6a4a5a,
};

function getTileHexColor(tile, zoneId) {
  const zone = ZONES[zoneId];
  if (!zone) return TILE_COLORS_BASE[tile] || 0x2d5a1e;
  if (tile === 0) return cssToHex(zone.palette.ground);
  if (tile === 1) return cssToHex(zone.palette.path);
  return TILE_COLORS_BASE[tile] || cssToHex(zone.palette.ground);
}

export class TileRenderer {
  constructor(layer, app) {
    this.layer = layer;
    /* App reference is needed to call app.renderer.generateTexture
       in _rebuildFromTiled for the static-map bake.  Optional —
       falls through to per-sprite rendering if app isn't available. */
    this.app = app || null;
    // Background fill
    this.bgGfx = new Graphics();
    this.layer.addChild(this.bgGfx);
    // Container for tile sprites
    this.tileContainer = new Container();
    this.tileContainer.label = 'tileSprites';
    this.layer.addChild(this.tileContainer);
    // Overlay graphics for effects (water shimmer, exit glow, building outlines)
    this.overlayGfx = new Graphics();
    this.layer.addChild(this.overlayGfx);
    /* v2.3.2070: the portal beams.  A Container of Sprites rather than more
       Graphics, and ABOVE overlayGfx so the shaft reads as light over the
       ground rather than something painted into it.  Pooled per exit tile —
       see _updatePortalBeams. */
    this.portalLayer = new Container();
    this.portalLayer.label = 'portalBeams';
    this.layer.addChild(this.portalLayer);
    this._portalBeams = [];
    /* v2.3.2070: QA hook.  The beam is additive light over a painted map, so
       the only way to measure it is to shoot the same frame with and without
       it and diff — which needs a handle on the sprites.  Same shape as
       __btNpcSprites; read-only from the page's point of view. */
    _liveTileRenderers.add(this);
    if (typeof window !== 'undefined') {
      window.__btPortalBeams = () => {
        const all = [];
        for (const t of _liveTileRenderers) all.push(...t._portalBeams);
        return all;
      };
      window.__btPortalBeamsVisible = (v) => {
        let n = 0;
        for (const t of _liveTileRenderers) { t.portalLayer.visible = !!v; n++; }
        return n;
      };
    }
    // Building sprite container (rendered on top of tiles)
    this.buildingContainer = new Container();
    this.buildingContainer.label = 'buildingSprites';
    this.layer.addChild(this.buildingContainer);

    /* Zone-name labels — pooled.  In TOWN: one label per exit
       showing the destination zone's name.  In a themed zone: one
       label at the return-to-town exit (S.map tile 9) saying "Town".
       Pool grows on demand, unused entries hidden. */
    this._zoneLabels = [];

    /* Exit portal pulse — drawn per-frame on overlayGfx over S.map
       cells with tile id 8 (zone exit) / 9 (return-to-town) / 10
       (dungeon entrance). */
    this._exitTiles = [];   // [{ r, c, tile, zoneId, dir }]

    this.currentZone = null;
    this.currentMap = null;
    this._bgColor = 0x2d5a1e;
    this._mapW = 0;
    this._mapH = 0;
    /* Tiled tile-frame caches.  Per-tile-gid Texture (frame within the
       tileset) is created once on first use and reused across zones. */
    this._tilesetBaseCache = new Map(); // imageSrc -> Pixi Texture (full image)
    this._tileFrameCache = new Map();   // gid -> Pixi Texture (frame slice)
    /* RenderTexture cache of the fully-composed Tiled map per zone —
       lets the renderer draw the entire map as one Sprite per frame
       instead of thousands of per-tile Sprites.  Built once on the
       first zone entry, reused on revisits, destroyed if the zone's
       map data changes. */
    this._bakedMapCache = new Map();    // zoneId -> Texture (RenderTexture)
    /* v2.3.775: set when this instance was built after a GL loss (epoch
       rebuild).  On iOS the Assets-cached zone-map JPGs are decoded to
       GPU-backed ImageBitmaps -- the same memory purge that killed the
       context wipes their pixels, so re-upload from the cache yields a
       silently BLACK map while freshly-baked (CPU-canvas) player sprites
       render fine (the 2026-06-12 iPhone screenshot).  First use of each
       image zone after a rebuild forces a fresh fetch+decode instead. */
    this._forceImageReload = typeof window !== 'undefined' && !!window.__btLastGlRebuild;
    this._reloadedZones = {};
  }

  rebuild(app, map, zoneId) {
    this.currentZone = zoneId;
    this.currentMap = map;
    this.overlayGfx.clear();
    this.bgGfx.clear();
    /* v2.3.1405: destroy the PREVIOUS image-zone ground sprite (display
       object only — never its texture) before rebuilding, so the
       per-zone map eviction (tiledMaps.freeZoneMap → Assets.unload) can't
       orphan a live Sprite still pointing at the source it's about to
       free.  removeChildren() only detaches; the sprite object (and its
       texture ref) would linger until GC otherwise. */
    if (this._imageSprite) { try { this._imageSprite.destroy(); } catch (e) { /* ignore */ } this._imageSprite = null; }
    // Remove old tile sprites
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();

    if (!map) return;

    const zone = ZONES[zoneId];
    const rows = map.length;
    const cols = map[0]?.length || 0;
    this._mapW = cols * TILE;
    this._mapH = rows * TILE;
    this._bgColor = zone?.palette?.ground ? cssToHex(zone.palette.ground) : 0x2d5a1e;

    /* Collect exit/entrance positions from the procedural S.map.
       Tiles 8/9/10 mark zone exits, return-to-town, and dungeon
       entrances.  Used in update() to draw pulsing portal glows. */
    /* v2.3.1822: ...and remember WHERE each one goes, so update() can paint a
       locked zone's portal as locked.  The tile grid only says "this is an
       exit"; the destination lives in the exit tables, so match by position.
       A tile that matches nothing (every spoke's tile-9 way home, and the
       procedural zones) keeps zoneId null and is never treated as gated. */
    const _destAt = new Map();
    /* v2.3.2095: and which WAY each declared exit leads. The beam fans away
       from the tile you step on, so an exit you leave by walking SOUTH needs
       its plume pointing south too -- see the flip at the beam draw below. */
    const _dirAt = new Map();
    const _declared = zoneId === 'town' ? TOWN_EXITS
      : zoneId === 'worldview' ? WORLDVIEW_EXITS : null;
    if (_declared) {
      for (const ex of _declared) {
        /* ═══ v2.3.2095: CLAIM THE BLOCK, WHICHEVER CORNER IT IS ═══
           Exits are declared at a 2x2 marker block's corner. This claimed
           `ty..ty+1` x `tx..tx+1` -- i.e. it assumed the declared cell is the
           block's TOP-LEFT. Town's is not: its marker (25,48) is the block's
           BOTTOM-RIGHT, and the painted tiles are rows 47-48, cols 24-25. So
           the claim landed on rows 48-49, cols 25-26 and overlapped the real
           block on exactly ONE of its four cells.

           Three of town's four exit tiles therefore carried `zoneId: null`,
           which is not cosmetic: the locked/gated test is `!!ex.zoneId && ...`,
           so a gated zone's beam only ever read as locked on a quarter of its
           own portal. It surfaced as a beam-direction mess -- one tile fanned
           the new way and three the old -- which is what put a light on it.

           A 3x3 neighbourhood covers the block from ANY corner, which is the
           honest fix while the tables say "a corner" without saying which.
           Safe against cross-claiming: the closest two live trail-heads on
           either hub are six tiles apart. */
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            _destAt.set(`${ex.ty + dr},${ex.tx + dc}`, ex.zoneId);
            _dirAt.set(`${ex.ty + dr},${ex.tx + dc}`, ex.dir || null);
          }
        }
      }
    }
    this._exitTiles = [];
    for (let r = 0; r < rows; r++) {
      const row = map[r];
      if (!row) continue;
      for (let c = 0; c < cols; c++) {
        const t = row[c];
        /* ═══ v2.3.2135: THE DOOR TO THE SECOND DEPTH IS NOT DRAWN ═══
           Owner, on the demo: "Second depth zone used to exist and minimap
           icon still exists for it but doesn't exist anymore in game."  A
           reviewer wrote the same thing up as "Door didnt exist" in Verdant
           Wilds.

           Both were right, and it is every combat zone, not just that one.
           generateZoneMap stamps a 2x2 block of TILE 10 -- the depth-tier
           dungeon entrance -- at (16,2)-(17,2) in verdant, frost, sky, mist,
           ember and thunder alike.  Walking into it does nothing: the
           transition has been hard-off since v2.3.54, where zoneTransitions.js
           still carries the gate verbatim as `if (false && tile === 10)`
           ("the depth-tier dungeons aren't ready for play yet").  So this loop
           has been collecting a door that cannot open, and the block below has
           been painting it a glowing portal beam ever since.

           THE TILE IS DELIBERATELY LEFT IN THE MAP.  zoneTransitions' note
           says to flip that `false` to re-enable and gameSystems' mayor_3 note
           repeats it; stamping is what keeps that a one-line change.  What is
           removed here is only the ADVERTISING.  Tiles 8 and 9 are untouched --
           town exits and the return-to-town portal really do go somewhere.

           IF THE DUNGEONS EVER SHIP, three places take a 10 back: this test,
           the twin in minimapRenderer.js (EXIT_TILES, which draws the map
           icon), and the gate in zoneTransitions.js.  Noted in both renderers
           so neither is found alone. */
        if (t === 8 || t === 9) {
          this._exitTiles.push({ r, c, tile: t, zoneId: _destAt.get(`${r},${c}`) || null,
            dir: _dirAt.get(`${r},${c}`) || null });
        }
      }
    }

    /* Zone-name labels.  TOWN: place one label per exit, showing the
       DESTINATION zone's name (so the player sees where each exit
       leads from inside town).  THEMED ZONES: place one label at the
       return-to-town exit (S.map tile 9) reading "Town" so the
       player knows which exit takes them back home. */
    const labelsForFrame = [];
    if (zoneId === 'town') {
      for (const ex of TOWN_EXITS) {
        const destZone = ZONES[ex.zoneId];
        const text = (destZone && destZone.name) || ex.zoneId;
        /* v2.3.1822: carry the destination so update() can append "Locked". */
        labelsForFrame.push(Object.assign(
          this._exitLabelPos(ex.tx, ex.ty, cols, rows, text, ex.dir),
          { zoneId: ex.zoneId, baseText: text }));
      }
    } else if (zoneId === 'worldview') {
      /* v2.3.1303: worldview trail-heads get destination labels —
         before this the zone fell into the tile-9 branch below and,
         having no tile 9, showed nothing.  Unlike town, whose exits
         hug the map edges (labels go in the black margin via
         _exitLabelPos), the worldview trail-heads are INTERIOR (the
         town portal is dead center), so each label floats just above
         its portal halo like an annotation on the painted vista.
         ex.tx/ty is the 2x2 marker block's corner = the halo's
         visual center in world px. */
      for (const ex of WORLDVIEW_EXITS) {
        const destZone = ZONES[ex.zoneId];
        const text = (destZone && destZone.name) || ex.zoneId;
        labelsForFrame.push({ text, x: ex.tx * TILE, y: ex.ty * TILE - TILE * 2.4, rotation: 0,
          zoneId: ex.zoneId, baseText: text });
      }
    } else {
      /* Find tile-9 cells (return-to-town) and label one of them. */
      let placed = 0;
      for (let r = 0; r < rows && placed < 1; r++) {
        const row = map[r];
        if (!row) continue;
        for (let c = 0; c < cols && placed < 1; c++) {
          if (row[c] === 9) {
            labelsForFrame.push(this._exitLabelPos(c, r, cols, rows, 'Town', null));
            placed++;
          }
        }
      }
    }
    /* ═══ v2.3.1677: COMING SOON ═══
       Owner: "put 'coming soon' over all buildings in town and over all zone
       entry points that don't have a portal."

       Both cases are the same problem: the ART promises somewhere to go, and
       walking there does nothing.  The worldview paints nine regions of which
       five have a live trail-head, and most of town's twelve buildings have
       no door.
       v2.3.2078: that second half no longer reads "S.nearBuilding is
       force-set to null every frame" — it is computed every frame now, from
       buildingPropNear matching a prop's `action` against the BUILDINGS
       table.  What is true is narrower and worth stating exactly: TWO of the
       twelve are reachable (the forge and the general store), because those
       are the only PLACED town props carrying an action.  The other ten point
       at the v16 set still held behind propIsPlaced, or at tiles from the
       procedural town that no longer exists.  A player cannot tell "not built yet" from "I can't find
       the door", and spends the difference hunting.  A label costs one Text
       each and ends the hunt.

       The exit list WINS over the coming-soon list: a zone with a live portal
       is never labelled, even if someone leaves a stale entry in
       COMING_SOON_MARKS.  Enforced here rather than trusted to two hand-kept
       lists staying disjoint — the failure mode otherwise is a working zone
       that looks shut. */
    if (zoneId === 'town') {
      /* v2.3.1681: driven off TOWN_SOON_MARKS (measured off the painted map),
         NOT TOWN_BUILDINGS (collision boxes rescaled from the old tile
         village, which put seven of these labels on empty cobblestone —
         owner: "a whole bunch of invisible buildings with coming soon"). */
      for (const b of TOWN_SOON_MARKS) {
        labelsForFrame.push({
          text: 'Coming soon',
          x: b.tx * TILE, y: b.ty * TILE,
          rotation: 0, soon: true,
        });
      }
    } else if (zoneId === 'worldview') {
      const live = new Set(WORLDVIEW_EXITS.map((e) => e.zoneId));
      for (const m of COMING_SOON_MARKS) {
        if (live.has(m.zoneId)) continue;      // a real portal shipped; never label it
        labelsForFrame.push({
          text: (m.label ? m.label + '\n' : '') + 'Coming soon',
          x: m.tx * TILE, y: m.ty * TILE, rotation: 0, soon: true,
        });
      }
    }

    /* Apply pooled labels.  Grow the pool if needed; hide extras. */
    while (this._zoneLabels.length < labelsForFrame.length) {
      const t = new Text({ text: '', style: ZONE_LABEL_STYLE });
      t.anchor.set(0.5, 0.5);
      this.layer.addChild(t);
      this._zoneLabels.push(t);
    }
    for (let i = 0; i < this._zoneLabels.length; i++) {
      const t = this._zoneLabels[i];
      const spec = labelsForFrame[i];
      if (!spec) { t.visible = false; continue; }
      if (t.text !== spec.text) t.text = spec.text;
      t.x = spec.x;
      t.y = spec.y;
      t.rotation = spec.rotation || 0;
      /* Coming-soon marks read QUIETER than a destination you can actually
         reach: smaller, dimmed, centred on the thing rather than floating
         beside it.  They are an explanation, not an invitation — styling them
         like a live exit would send players toward them. */
      const wantAlpha = spec.soon ? 0.72 : 1;
      const wantScale = spec.soon ? 0.62 : 1;
      if (t.alpha !== wantAlpha) t.alpha = wantAlpha;
      if (t.scale.x !== wantScale) t.scale.set(wantScale);
      if (t.anchor.y !== 0.5) t.anchor.set(0.5, 0.5);
      t.visible = true;
    }
    /* v2.3.1822: the labels naming a GATED zone, so update() can flip them
       between "Frost Ridge" and "Frost Ridge / Locked" the moment the quest
       that opens it is accepted.  Only gated ones are listed — an ungated
       destination can never change, and re-texting it every frame would be
       work for nothing. */
    this._gatedLabels = [];
    for (let i = 0; i < labelsForFrame.length; i++) {
      const spec = labelsForFrame[i];
      if (spec && spec.zoneId && zoneUnlockQuest(spec.zoneId)) {
        this._gatedLabels.push({ text: this._zoneLabels[i], base: spec.baseText });
        this._zoneLabels[i]._btZone = spec.zoneId;
      }
    }

    /* Looping-video zone path — same render shape as the image path
       below, but the texture is backed by an HTMLVideoElement that
       loops forever.  Used for the town map so the painted day/night
       /weather effects play continuously.  Also lays down the still
       image as an underlay so the player sees art immediately while
       the video is decoding (or if autoplay is blocked). */
    const videoUrl = VIDEO_ZONE_MAPS[zoneId];
    const imageUrl = IMAGE_ZONE_MAPS[zoneId];
    if (videoUrl) {
      this._renderedTiled = true;
      this._isImageZone = true;
      /* Underlay = still image, so the player sees a complete town
         on the very first frame even before the video has decoded. */
      if (imageUrl) {
        const baseTex = Assets.cache.get(imageUrl);
        if (baseTex && baseTex.source) baseTex.source.scaleMode = 'nearest';
        const baseSprite = new Sprite(baseTex || Texture.EMPTY);
        baseSprite.x = 0;
        baseSprite.y = 0;
        baseSprite.width = this._mapW;
        baseSprite.height = this._mapH;
        this.tileContainer.addChild(baseSprite);
        if (!baseTex) {
          const w = this._mapW, h = this._mapH;
          Assets.load(imageUrl).then((loaded) => {
            if (loaded && !baseSprite.destroyed) {
              if (loaded.source) loaded.source.scaleMode = 'nearest';
              baseSprite.texture = loaded;
              baseSprite.width = w;
              baseSprite.height = h;
            }
          }).catch(() => {});
        }
      }
      /* Cache the <video> element across zone re-entries so the loop
         doesn't restart every time the player walks back into town —
         the same element keeps decoding while the player is in another
         zone, so re-entry is instant. */
      this._videoElements = this._videoElements || {};
      let video = this._videoElements[zoneId];
      if (!video) {
        video = document.createElement('video');
        video.src = videoUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        /* Some browsers require the video element to be in the DOM to
           decode reliably.  Hide it off-screen — Pixi reads pixels
           through Texture.from(video) regardless. */
        video.style.position = 'absolute';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.left = '-9999px';
        document.body.appendChild(video);
        this._videoElements[zoneId] = video;
        /* Resume blocked autoplay on the next user gesture (iOS
           Safari and Chrome's save-data mode both gate even muted
           autoplay until a touch / pointer event fires). */
        if (!TileRenderer._videoGestureHooked) {
          TileRenderer._videoGestureHooked = true;
          const all = this._videoElements;
          const resumePending = () => {
            Object.values(all).forEach((v) => {
              if (v && v.paused) {
                const p = v.play();
                if (p && p.catch) p.catch(() => {});
              }
            });
          };
          document.addEventListener('pointerdown', resumePending, { passive: true });
          document.addEventListener('touchstart', resumePending, { passive: true });
        }
      }
      const playPromise = video.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      const videoSprite = new Sprite(Texture.from(video));
      videoSprite.x = 0;
      videoSprite.y = 0;
      videoSprite.width = this._mapW;
      videoSprite.height = this._mapH;
      this.tileContainer.addChild(videoSprite);
      return;
    }

    /* Single-image zone path — when an entry exists in IMAGE_ZONE_MAPS,
       render one Sprite covering the world bounds.  Beats Tiled for
       authoring speed when you already have the art generated, and
       per-frame draw is just one sprite.
       Texture is rendered with NEAREST filter: the painted maps are
       pixel art at native 1024×1024 (matches world bounds 1:1), so
       LINEAR sampling at sub-pixel camera offsets blends adjacent
       texels each frame and reads as walking-shimmer / judder.
       NEAREST locks each screen pixel to the closest texel and the
       texture stays stable as the camera glides. */
    if (imageUrl) {
      this._renderedTiled = true;   // tell update() not to retry
      this._isImageZone = true;
      let cachedTex = Assets.cache.get(imageUrl);
      /* v2.3.775: after a GL-loss rebuild the cached ImageBitmap may be
         a husk (see constructor) -- treat the first use of each zone as
         a cache miss and re-fetch below. */
      let reload = false;
      if (this._forceImageReload && !this._reloadedZones[zoneId]) {
        this._reloadedZones[zoneId] = true;
        reload = !!cachedTex;
        cachedTex = null;
      }
      if (cachedTex && cachedTex.source) cachedTex.source.scaleMode = 'nearest';
      const sprite = new Sprite(cachedTex || Texture.EMPTY);
      sprite.x = 0;
      sprite.y = 0;
      sprite.width = this._mapW;
      sprite.height = this._mapH;
      this.tileContainer.addChild(sprite);
      this._imageSprite = sprite; /* v2.3.1405: tracked for safe per-zone map eviction */
      /* Race fix: if the preload is still in flight when the user
         enters the zone, the cache miss above leaves the sprite on
         Texture.EMPTY (blank).  Kick off the load and swap the
         texture in when it resolves so the player sees the image. */
      if (!cachedTex) {
        const w = this._mapW;
        const h = this._mapH;
        const loadP = reload
          ? Promise.resolve().then(() => Assets.unload(imageUrl)).catch(() => {}).then(() => Assets.load(imageUrl))
          : Assets.load(imageUrl);
        loadP.then((loaded) => {
          if (loaded && !sprite.destroyed) {
            if (loaded.source) loaded.source.scaleMode = 'nearest';
            sprite.texture = loaded;
            sprite.width = w;
            sprite.height = h;
          }
        }).catch(() => {});
      }
      return;
    }
    this._isImageZone = false;

    /* Prefer Tiled .tmx data when loaded for this zone — that's the
       authoritative visual source.  Falls back to procedural rectangles
       when Tiled isn't available.  _renderedTiled tracks whether the
       last rebuild used Tiled, so update() can re-trigger rebuild
       if the Tiled map finishes loading after zone entry.

       v2.3.1670: there used to be a third branch here — _rebuildWithSprites,
       which composed town/meadow/farm_home out of a purchased 32x32 village
       tileset.  It had been UNREACHABLE for a long time: all three of those
       zones are in IMAGE_ZONE_MAPS, and the single-image path above returns
       unconditionally, so control never arrived here for them.  The art was
       still downloaded at startup, though.  See the removal note in
       pixiRenderer.js. */
    const tiledMap = getLoadedTiledMap(zoneId);
    this._renderedTiled = !!tiledMap;
    if (tiledMap) {
      this._mapW = tiledMap.width * TILE;
      this._mapH = tiledMap.height * TILE;
      this._rebuildFromTiled(tiledMap);
    } else {
      this._rebuildProcedural(map, zoneId, rows, cols, zone);
    }
  }

  /** Position a zone label NEAR an exit tile but in the black
   *  margin OUTSIDE the map bounds, so it doesn't cover the playable
   *  area.  Picks the closest cardinal edge from the tile's position
   *  (or the exit's `dir` field if provided).  Returns
   *  { text, x, y, rotation }. */
  _exitLabelPos(tx, ty, cols, rows, text, dir) {
    /* Distance to each edge in tile units. */
    const dN = ty;
    const dS = rows - 1 - ty;
    const dW = tx;
    const dE = cols - 1 - tx;
    /* If a `dir` was provided (from TOWN_EXITS), use it as a hint. */
    let edge;
    if (dir === 'north' || dir === 'ne' || dir === 'nw') edge = 'n';
    else if (dir === 'south' || dir === 'se' || dir === 'sw') edge = 's';
    else if (dir === 'east') edge = 'e';
    else if (dir === 'west') edge = 'w';
    else {
      /* No hint — pick whichever edge the tile is closest to. */
      const min = Math.min(dN, dS, dW, dE);
      if      (min === dN) edge = 'n';
      else if (min === dS) edge = 's';
      else if (min === dW) edge = 'w';
      else                 edge = 'e';
    }
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const PAD = 32;     // distance from map edge into the black margin
    if (edge === 'n') return { text, x: cx, y: -PAD, rotation: 0 };
    if (edge === 's') return { text, x: cx, y: rows * TILE + PAD, rotation: 0 };
    if (edge === 'w') return { text, x: -PAD - 8, y: cy, rotation: -Math.PI / 2 };
    return { text, x: cols * TILE + PAD + 8, y: cy, rotation: Math.PI / 2 };
  }

  /** Resolve a global tile id to {tileset, localId}, picking the
   *  tileset with the highest firstgid <= gid.  Returns null if no
   *  match (gid 0 = empty cell). */
  _resolveGid(gid, tilesets) {
    let pick = null;
    for (const ts of tilesets) {
      if (ts.firstgid <= gid) pick = ts;
      else break;
    }
    return pick ? { ts: pick, localId: gid - pick.firstgid } : null;
  }

  /** Build (or look up cached) Pixi Texture for a global tile id. */
  _getTileTexture(gid, tilesets) {
    const cached = this._tileFrameCache.get(gid);
    if (cached) return cached;
    const res = this._resolveGid(gid, tilesets);
    if (!res) return null;
    const ts = res.ts;
    let baseTex = this._tilesetBaseCache.get(ts.imageSrc);
    if (!baseTex) {
      const img = getTilesetImage(ts.imageSrc);
      if (!img) return null;            // image not loaded yet — caller falls back
      baseTex = Texture.from(img);
      this._tilesetBaseCache.set(ts.imageSrc, baseTex);
    }
    const cols = ts.columns || 1;
    const sx = (res.localId % cols) * ts.tileWidth;
    const sy = Math.floor(res.localId / cols) * ts.tileHeight;
    const frame = new Texture({
      source: baseTex.source,
      frame: new Rectangle(sx, sy, ts.tileWidth, ts.tileHeight),
    });
    this._tileFrameCache.set(gid, frame);
    return frame;
  }

  /** Render a fully-loaded Tiled map.  When app.renderer is available,
   *  builds all per-tile Sprites into a temporary container, bakes the
   *  composite into a single RenderTexture, then displays the map as
   *  one Sprite using that texture.  This drops per-frame draw count
   *  from ~6000 (40x30 map x 5 layers) to 1 — significant FPS / GC
   *  win at the cost of one bake per zone (~5MB texture for a 40x30
   *  zone, kept in this._bakedMapCache so revisits are instant).
   *
   *  Falls back to the live per-tile Sprites if app isn't available
   *  (e.g., the in-update auto-refresh path that calls rebuild without
   *  an app reference). */
  _rebuildFromTiled(tiledMap) {
    /* Cache hit — reuse the previously baked map texture. */
    if (this.currentZone) {
      const cached = this._bakedMapCache.get(this.currentZone);
      if (cached && !cached.destroyed) {
        const sprite = new Sprite(cached);
        sprite.x = 0;
        sprite.y = 0;
        this.tileContainer.addChild(sprite);
        return;
      }
    }

    /* Build per-tile sprites.  When app is available, these go into a
       temporary container so we can generate a texture; when not,
       they render live in tileContainer. */
    const target = this.app && this.app.renderer ? new Container() : this.tileContainer;

    for (const layer of tiledMap.layers) {
      for (let r = 0; r < layer.height; r++) {
        for (let c = 0; c < layer.width; c++) {
          const raw = layer.data[r * layer.width + c];
          if (!raw) continue;
          const gid = raw & 0x1fffffff;   // strip Tiled flip flags
          const tex = this._getTileTexture(gid, tiledMap.tilesets);
          if (!tex) continue;
          const sprite = new Sprite(tex);
          sprite.x = c * TILE;
          sprite.y = r * TILE;
          sprite.width = TILE;
          sprite.height = TILE;
          target.addChild(sprite);
        }
      }
    }

    /* Bake into a single texture if possible. */
    if (this.app && this.app.renderer && target !== this.tileContainer) {
      try {
        const baked = this.app.renderer.generateTexture({
          target,
          frame: { x: 0, y: 0, width: this._mapW, height: this._mapH },
          resolution: 1,
        });
        if (this.currentZone) this._bakedMapCache.set(this.currentZone, baked);
        const sprite = new Sprite(baked);
        sprite.x = 0;
        sprite.y = 0;
        this.tileContainer.addChild(sprite);
      } catch (e) {
        console.warn('[tileRenderer] map bake failed, falling back to per-tile sprites:', e && e.message);
        /* Move the temp children into tileContainer so we still render. */
        while (target.children.length) {
          const child = target.children[0];
          target.removeChildAt(0);
          this.tileContainer.addChild(child);
        }
      } finally {
        target.destroy({ children: false });
      }
    }
  }

  /** Original procedural rebuild for zones without sprite assets. */
  _rebuildProcedural(map, zoneId, rows, cols, zone) {
    // Use a single Graphics object for procedural tiles
    const gfx = new Graphics();
    this.tileContainer.addChild(gfx);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = map[r]?.[c];
        if (tile === undefined) continue;
        const color = getTileHexColor(tile, zoneId);
        const x = c * TILE;
        const y = r * TILE;

        gfx.rect(x, y, TILE, TILE);
        gfx.fill({ color });

        // Tree (tile 4)
        if (tile === 4) {
          const tcx = x + TILE / 2;
          gfx.rect(tcx - 2, y + TILE / 2, 4, TILE / 2);
          gfx.fill({ color: 0x3a2810 });
          gfx.circle(tcx, y + TILE / 2 - 2, 8);
          gfx.fill({ color: cssToHex(zone?.palette?.accent || '#1a6a10') });
        }

        // Flower (tile 5)
        if (tile === 5) {
          gfx.circle(x + 10 + (c % 3) * 3, y + 10 + (r % 3) * 3, 2);
          gfx.fill({ color: 0xf5c542 });
        }

        // Water shimmer (tile 2)
        if (tile === 2) {
          gfx.rect(x + (c % 3) * 6, y + (r % 2) * 8, 6, 2);
          gfx.fill({ color: 0xffffff, alpha: 0.12 });
        }

        // Glowing exits
        if (tile === 8 || tile === 9 || tile === 10) {
          gfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
          gfx.fill({ color: TILE_COLORS_BASE[tile], alpha: 0.4 });
        }

        // Building outline
        if (tile === 3) {
          gfx.rect(x, y, TILE, TILE);
          gfx.stroke({ color: 0x2a2040, width: 1 });
        }
      }
    }
  }

  update(cx, cy, viewW, viewH, S) {
    /* Auto-refresh when a Tiled map finishes loading AFTER the
       initial rebuild for this zone — the user briefly sees the
       procedural fallback, then snaps to the Tiled visuals once
       the .tmx + tilesets resolve. */
    if (this.currentZone && !this._renderedTiled) {
      const tiled = getLoadedTiledMap(this.currentZone);
      if (tiled) this.rebuild(null, this.currentMap, this.currentZone);
    }

    /* Pulsing portal glows over zone-exit tiles (8 / 9 / 10).
       Drawn on overlayGfx every frame so the pulse animates without
       a full rebuild.  Color per type: 8 generic exit (zone-element
       color), 9 return-to-town (green), 10 dungeon (red).
       Image-mapped zones use a more pronounced pulse — wide radial
       halo + bright core + outline — so the exits stand out against
       the painted artwork.  Other zones use a tighter rectangle since
       the procedural ground tiles already provide visual contrast. */
    this.overlayGfx.clear();
    /* ═══ v2.3.2121: THE ROUTE IS READ ONCE, FOR BOTH USERS ═══
       The gold beam (inside the exits loop) and the road on the ground both
       want it, and it is hoisted OUT of `if (this._exitTiles.length)` on
       purpose: the trail must not be conditional on this zone having declared
       exit tiles.  It usually does — the route's own waypoint is normally one
       of them — but "the guidance disappears in a zone that happens to have
       no exits" is exactly the silent failure this feature exists to prevent.
       Wrapped for the same reason questRoute wraps q.check: it runs arbitrary
       per-quest predicates on live state, and a throw here would take the
       whole tile layer down.  No route is the correct failure mode. */
    const _now = Date.now();
    let _questTo = null;
    try { _questTo = questRoutePoint(this.currentZone, (S && S.rpg) || null, S); } catch (e) { _questTo = null; }
    if (this._exitTiles.length) {
      const now = _now;
      const zone = ZONES[this.currentZone];
      const elemColor = zone && zone.element ? 0xff5e6c : 0x5b52ff;
      const obvious = !!this._isImageZone;
      /* v2.3.1822: read the quest table LIVE, not at rebuild.  Accepting the
         quest that opens a zone has to change its portal there and then —
         rebuild only runs on a zone change, so a portal baked at entry would
         stay grey until you walked out and back. */
      const _rpg = (S && S.rpg) || null;
      /* v2.3.1822: QA probe — what each portal is ACTUALLY painted as this
         frame.  "The portals still look open" is a claim about pixels, and
         re-deriving the answer in the test from the quest table would just be
         asserting the test's own copy of the rule. */
      const _portalProbe = (typeof window !== 'undefined') ? [] : null;
      /* v2.3.2070: cache-only lookup, deliberately.  PORTAL_BEAM is registered
         in the central preload manifest (preloadAnimations.js), so by the time
         a zone renders it is warm; reading it here without a load call is what
         makes a missing registration show up as the old circles rather than as
         a texture that pops in mid-play.  CLAUDE.md: a first-use texture load
         is a regression. */
      const beamTex = PORTAL_BEAM.tex;
      let _beamIdx = 0;
      for (const gl of (this._gatedLabels || [])) {
        const want = isZoneUnlocked(_rpg, gl.text._btZone) ? gl.base : gl.base + '\nLocked';
        if (gl.text.text !== want) gl.text.text = want;
      }
      for (const ex of this._exitTiles) {
        const x = ex.c * TILE;
        const y = ex.r * TILE;
        const cx = x + TILE / 2;
        const cy = y + TILE / 2;
        /* ═══ v2.3.1822: A SHUT DOOR SHOULD LOOK SHUT ═══
           Owner: "I started a new character on the first quest and it was
           still showing the blue circle portals on every zone entrance...  I
           wanted you to only be able to access a zone if it's required by a
           quest first (in sequence)."  Entry was already refused (v2.3.1817,
           client + worker), but nothing SAID so until you walked into it and
           got pushed back — which reads as a broken portal, not a locked one.
           Locked exits keep their halo (so the way is still findable on the
           painted map) in a dead grey with a slower, weaker pulse. */
        const _locked = !!ex.zoneId && !isZoneUnlocked(_rpg, ex.zoneId);
        if (_portalProbe) _portalProbe.push({ zoneId: ex.zoneId, r: ex.r, c: ex.c, locked: _locked });
        let color, pulseSpeed;
        if (_locked)            { color = 0x6b7280; pulseSpeed = 900; }
        else if (ex.tile === 9) { color = 0x3dd497; pulseSpeed = 400; }
        else if (ex.tile === 10){ color = elemColor; pulseSpeed = 250; }
        else                    { color = elemColor; pulseSpeed = 300; }
        const pulse = (Math.sin(now / pulseSpeed + ex.c + ex.r) * 0.2 + 0.6)
          * (_locked ? 0.5 : 1);
        /* ═══ v2.3.2070: THE BEAM REPLACES THE CIRCLES ═══
           Owner: "Use this to indicate portal areas (where you go between
           zones) instead of the double circles."

           The Graphics below are NOT dead code and must not be deleted: they
           are the fallback for a beam texture that did not load.  A portal you
           cannot see is a zone you cannot find, so the failure mode here has
           to be "the old marker" and not "no marker" — the same rule
           fxStrips.js states for the stun ring.  Nothing else in the loop
           changes: the same pulse, the same per-type colour and speed, and the
           same locked test drive both paths, so a fallback portal still
           pulses at its own rate and still reads as shut when it is shut. */
        if (beamTex) {
          const sp = this._portalBeam(_beamIdx++);
          sp.texture = beamTex;
          sp.x = cx;
          sp.y = cy;
          sp.height = PORTAL_BEAM_H;
          sp.width = PORTAL_BEAM_H * (beamTex.width / beamTex.height);
          /* ═══ v2.3.2095: THE WAY OUT OF TOWN FANS THE WAY YOU ARE GOING ═══
             Owner: "The light for exiting the city needs to be flipped
             around."

             The beam is anchored (0.5, 1) with its apex on the tile, so it
             fans UP-SCREEN -- which is right for every exit you approach from
             below, because the plume is then the thing you see ahead of you.
             Town's one exit is the opposite case: it is on the plateau's
             southern lip and you leave by walking SOUTH, so the fan rose
             behind your shoulder and spread back over the town you were
             leaving. The light pointed at where you had been.

             Flipping scale.y (not the anchor, and not a rotation) keeps the
             apex exactly where it was -- on the tile you step through, which
             is the property v2.3.2070 was built around and the owner's
             original "it should fade furthest from the zone entrance" -- and
             sends the plume the other way.

             Keyed on the exit's declared `dir`, so it is the data that
             decides and not a hardcoded tile: any exit that leads southward
             gets it, and today that is exactly the one the owner is looking
             at. A tile-9 way home or a procedural exit carries no dir and is
             unchanged. */
          const _fanDown = ex.dir === 'south' || ex.dir === 'se' || ex.dir === 'sw';
          sp.scale.y = _fanDown ? -Math.abs(sp.scale.y) : Math.abs(sp.scale.y);
          /* v2.3.2121: the quest's own exit burns GOLD.  The road on the
             ground says which way; this says which arch, which is the
             question the star was invented to answer (questRoute.js's header:
             five interchangeable arches).  A LOCKED exit keeps its slate —
             the route never points at one, and "cold" outranks "chosen"
             because the invitation would be a lie. */
          const _isQuestExit = !_locked && _questTo
            && Math.abs(_questTo.x - cx) < TILE && Math.abs(_questTo.y - cy) < TILE;
          sp.tint = _locked ? PORTAL_BEAM_LOCKED_TINT : (_isQuestExit ? TRAIL_GOLD : 0xffffff);
          if (_portalProbe) {
            const _pq = _portalProbe[_portalProbe.length - 1];
            if (_pq) _pq.questGold = !!_isQuestExit;
          }
          /* Clamped: PORTAL_BEAM_ALPHA over 1 is deliberate — the beam wants
             to be brighter than the pulse's own 0.8 ceiling on a dark map —
             but Pixi clamps on render while leaving the property above 1,
             which makes the QA probe report an alpha nothing ever drew. */
          sp.alpha = Math.min(1, pulse * PORTAL_BEAM_ALPHA);
          sp.visible = true;
          /* v2.3.2070: the probe reports what was DRAWN, not what was
             intended — "the portals are beams now" is a claim about pixels,
             and re-deriving it in the test from the same constants would just
             be the test asserting its own copy of the rule (the reasoning
             v2.3.1822 wrote down for the locked flag). */
          if (_portalProbe) {
            const _p = _portalProbe[_portalProbe.length - 1];
            _p.beam = { w: Math.round(sp.width), h: Math.round(sp.height),
              alpha: +sp.alpha.toFixed(3), tint: sp.tint, blend: sp.blendMode,
              /* v2.3.2095: reported from the sprite, so the test reads which
                 way it was DRAWN rather than re-deriving the rule. */
              fanDown: sp.scale.y < 0, dir: ex.dir || null };
          }
          continue;
        }
        if (obvious) {
          /* Wide radial halo — three nested circles fading outward,
             so the exit reads as a glowing portal even on top of the
             dense painted artwork. */
          this.overlayGfx.circle(cx, cy, TILE * 1.6);
          this.overlayGfx.fill({ color, alpha: pulse * 0.18 });
          this.overlayGfx.circle(cx, cy, TILE * 1.05);
          this.overlayGfx.fill({ color, alpha: pulse * 0.32 });
          this.overlayGfx.circle(cx, cy, TILE * 0.55);
          this.overlayGfx.fill({ color, alpha: pulse * 0.65 });
          this.overlayGfx.circle(cx, cy, TILE * 0.55);
          /* The white rim is what makes an open portal read as "step here";
             a locked one gets the same grey as its fill so it stays a shape
             on the map without inviting the step. */
          this.overlayGfx.stroke({ color: _locked ? 0x9ca3af : 0xffffff, width: 2, alpha: pulse * 0.7 });
        } else {
          this.overlayGfx.rect(x - 2, y - 2, TILE + 4, TILE + 4);
          this.overlayGfx.fill({ color, alpha: pulse * 0.55 });
          this.overlayGfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
          this.overlayGfx.fill({ color, alpha: pulse * 0.25 });
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.stroke({ color, width: 1.5, alpha: pulse * 0.9 });
        }
      }
      if (_portalProbe) window.__btPortals = _portalProbe;
      /* Any pooled beam past the last exit this zone has (the pool survives a
         zone change; the exit list does not). */
      for (let i = _beamIdx; i < this._portalBeams.length; i++) this._portalBeams[i].visible = false;
    } else if (this._portalBeams.length) {
      for (const sp of this._portalBeams) sp.visible = false;
    }
    /* v2.3.2121: the road, drawn whether or not this zone declared exits. */
    this._drawQuestTrail(S, _questTo, _now);
    /* v2.3.2124: the vista magnifier's glass, under your feet. */
    this._drawPlayerLens(S, _now);

    // Two-pass background, matching the Canvas 2D path:
    //   1. Solid BLACK extending well beyond the map so out-of-bounds
    //      areas (anywhere past the tile grid) render black.
    //   2. Zone palette ground color inside the actual map rect.
    //      Skipped for image-mapped zones — the painted image fills
    //      the rect anyway, and the green palette fill bleeds through
    //      any transparent edge of the JPG (browsers decode JPEGs as
    //      opaque, but a sub-pixel rounding artifact at the world
    //      boundary can still expose this color).
    this.bgGfx.clear();
    const pad = Math.max(viewW, viewH);
    this.bgGfx.rect(-pad, -pad, this._mapW + pad * 2, this._mapH + pad * 2);
    this.bgGfx.fill({ color: 0x000000 });
    if (!this._isImageZone) {
      this.bgGfx.rect(0, 0, this._mapW, this._mapH);
      this.bgGfx.fill({ color: this._bgColor });
    }
  }

  /* ═══ v2.3.2124: THE MAGNIFYING GLASS ═══
   * Owner: "there was a fair point about the character being too small in
   * worldview.  Maybe it can show character full size but through a
   * 'magnifying glass'."
   *
   * entityRenderer does the actual magnifying -- a zone carrying `playerLens`
   * renders the LOCAL player at a flat readable scale instead of the vista
   * curve that takes him to 3% at the rim.  This draws the glass he is being
   * seen through, and it exists so the result reads as deliberate: a figure
   * that is simply bigger than the map's perspective says he should be looks
   * like a scale bug, and the same figure inside a lens looks like a lens.
   *
   * UNDER THE PLAYER, not over him.  overlayGfx sits below the entity layer,
   * so this is glass he stands on rather than a pane across his face -- which
   * is the only version that cannot cost readability, the exact thing the
   * feature is for (Tee raised it about visual impairment).
   *
   * No filter and no texture: a ring, a fill and a highlight arc on the
   * Graphics that is already cleared and refilled every frame.  A `filter`
   * compositing over the WebGL canvas is the documented cause of the iOS
   * static (CLAUDE.md), and this would be the worst possible place for it. */
  _drawPlayerLens(S, now) {
    const zone = ZONES[this.currentZone];
    const lens = zone && zone.playerLens;
    if (!lens || !S || !S.player) return;
    const r = (typeof lens.r === 'number' ? lens.r : 46);
    /* player x/y is the FOOT anchor and the figure stands up from it, so the
       glass is lifted onto his middle -- centred on the feet it cut through
       his knees and read as a selection ring. */
    const x = S.player.x, y = S.player.y + (typeof lens.cy === 'number' ? lens.cy : 0);
    /* A slow breath so the glass reads as an optic rather than a painted
       circle -- 3% over four seconds, small enough never to pull the eye off
       the figure inside it. */
    const breathe = 1 + 0.03 * Math.sin((now % 4000) / 4000 * Math.PI * 2);
    const rr = r * breathe;
    /* the glass */
    this.overlayGfx.circle(x, y, rr);
    this.overlayGfx.fill({ color: 0xCFE3F0, alpha: 0.10 });
    /* the rim, in Lantern Slate brass so it belongs to the UI rather than to
       the landscape */
    this.overlayGfx.circle(x, y, rr);
    this.overlayGfx.stroke({ color: 0xD8AA58, width: 2.5, alpha: 0.75 });
    /* an inner hairline, which is what makes a circle read as ground glass
       instead of as a selection ring */
    this.overlayGfx.circle(x, y, rr - 3);
    this.overlayGfx.stroke({ color: 0xF4F0E7, width: 1, alpha: 0.24 });
    /* the highlight: a short bright arc up-left, the one cue that says
       "curved glass" at this size */
    this.overlayGfx.arc(x, y, rr - 5, Math.PI * 1.05, Math.PI * 1.45);
    this.overlayGfx.stroke({ color: 0xFFFFFF, width: 2.5, alpha: 0.34 });
  }

  /* ═══ v2.3.2121: THE ROAD ITSELF ═══
   * Motes from the player along the way to `to`, fading with distance, with a
   * slow travelling shimmer so it reads as flowing THAT WAY rather than as a
   * static dotted line.  See the constants block for why it is a heading and
   * not a full route.
   *
   * Never throws and never blocks a frame: every early return leaves
   * overlayGfx exactly as the exits loop left it. */
  _drawQuestTrail(S, to, now) {
    /* v2.3.2121 QA HANDLE.  A scenario cannot read a WebGL canvas, and "are
       there gold pixels" was never the claim worth testing — "is the road
       pointing at the right thing, and does it get there" is.  Reset to a
       shape that says "ran, drew nothing" so a probe read can tell "no route"
       apart from "the trail code never executed", which are two very
       different bugs that look identical from the outside. */
    const _probe = (typeof window !== 'undefined')
      ? { to: to ? { x: to.x, y: to.y, npc: to.npc || null, zoneId: to.zoneId || null } : null,
          motes: 0, limitTiles: 0, legs: 0, bent: false }
      : null;
    if (_probe) window.__btQuestRoad = _probe;

    if (!to || !S || !S.player) return;
    const path = this._questPath(S, to);
    if (!path || path.length < 2) return;
    if (_probe) { _probe.legs = path.length - 1; _probe.bent = path.length > 2; }

    /* Arc length along the polyline, so spacing, falloff and the shimmer are
       all measured in DISTANCE TRAVELLED rather than in straight-line
       distance — a road that bends round a building must not bunch its motes
       up on the corner. */
    const seg = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const L = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      seg.push(L);
      total += L;
    }
    const limit = Math.min(total, TRAIL_TILES * TILE);
    if (_probe) _probe.limitTiles = limit / TILE;
    if (limit <= TRAIL_NEAR_TILES * TILE) return;   /* nothing left to draw */

    /* The shimmer: one slow cycle travelling outward along the road. */
    const phase = (now % 1600) / 1600;
    let si = 0;
    let acc = 0;                                     /* arc length at path[si] */
    for (let t = TRAIL_NEAR_TILES; t * TILE <= limit; t += TRAIL_STEP) {
      const d = t * TILE;
      while (si < seg.length - 1 && acc + seg[si] < d) { acc += seg[si]; si++; }
      const f = seg[si] > 0 ? (d - acc) / seg[si] : 0;
      const x = path[si].x + (path[si + 1].x - path[si].x) * f;
      const y = path[si].y + (path[si + 1].y - path[si].y) * f;
      /* ═══ BOTH OF THESE ARE SHALLOW ON PURPOSE ═══
         The first cut had falloff run 1 -> 0 and the shimmer swing 0.1 -> 1.0,
         which multiplied out to a typical mote alpha near 0.13 — and 13% gold
         over town's painted GOLD cobble is nothing.  Two headless shots in a
         row came back with no road on them.  The fade and the shimmer are
         both meant to be texture on a visible thing, not the difference
         between visible and not, so each keeps most of its brightness:
         distance costs 45%, the shimmer swings 20%. */
      const falloff = 1 - 0.45 * (d / (TRAIL_TILES * TILE));
      const wave = 0.8 + 0.2 * Math.sin((t / TRAIL_TILES - phase) * Math.PI * 2);
      const a = Math.max(0, falloff * wave);
      if (a <= 0.02) continue;
      if (_probe) _probe.motes++;
      /* ═══ THREE RINGS, AND THE DARK ONE IS THE REASON THIS IS VISIBLE ═══
         The first cut was gold glow + gold core, and the headless shot of the
         very screen this feature opens on showed NOTHING: town's ground is
         painted gold cobble, so gold at 30% alpha over gold is gold.  A mote
         cannot be defined by its hue when the hue is the floor's.

         So each one is a shadow, a glow and a hot core.  The Lantern Slate
         ink underneath (the same #0D151A the quest plate sits on) is what
         separates it from a bright ground, and the near-white core is what
         separates it from a dark one — frost and the cave are the opposite
         problem, and a single value cannot solve both.  Drawn shadow-first so
         the core lands on top of its own backing. */
      this.overlayGfx.circle(x, y, TILE * 0.40);
      this.overlayGfx.fill({ color: TRAIL_INK, alpha: a * 0.45 });
      this.overlayGfx.circle(x, y, TILE * 0.30);
      this.overlayGfx.fill({ color: TRAIL_GOLD, alpha: a * 0.85 });
      this.overlayGfx.circle(x, y, TILE * 0.15);
      this.overlayGfx.fill({ color: TRAIL_CORE, alpha: a });
    }
  }

  /* ═══ v2.3.2121: THE ROAD GOES ROUND THE TOWN HALL ═══
   *
   * The first cut of this drew a straight line and stopped it at the first
   * blocked cell, on the reasoning that collision is prop-only outside the
   * World View so the straight line is almost always the walk.  The very
   * first headless run killed that: a new bro spawns at (910, 1130) and Mayor
   * Bro stands at (900, 780), eleven tiles due north — with a building
   * squarely between them.  The road died after one tile.  On the one screen
   * the feature was asked for, it drew nothing.
   *
   * So it is a real route now, over the same `S._tiledWalkable[zone]` grid
   * isSolid() uses.  Breadth-first, four-connected, over a BOX around the
   * player just big enough to hold the seven-tile heading — bounded work,
   * with no dependence on how far away the target is.
   *
   * WHEN THE TARGET IS OUTSIDE THE BOX (the common case: a portal across the
   * zone), it routes to the reachable cell in the box that lands NEAREST the
   * target and stops there.  That is the honest answer for a heading: the
   * first seven tiles of the way there are true, and the road is re-derived
   * from the player's new position a moment later, so it keeps being true.
   * It never "fails to find a path" and blanks — the nearest reachable cell
   * always exists, because the player's own cell qualifies.
   *
   * CACHED ON THE CELL, not on the frame.  A BFS every frame at 60fps is a
   * cost this does not need to pay: the answer only changes when the player
   * or the target crosses a grid cell, so that is the key.  Walking at full
   * speed crosses a 16px cell a few times a second.
   *
   * Grid-reading is the part that silently goes wrong, so: it is a bare
   * bool[gh][gw] — not a `{ grid }` wrapper — at its OWN resolution, not the
   * tile grid's (16px prop-only cells from v2.3.1794; 64x64 for the World
   * View's painted mask), so world pixels scale through the grid's dimensions
   * against the zone's world extent, exactly as BroTown's isSolid and
   * zoneTransitions' nudgeSpawnToWalkable do.  `false` blocks; a missing row
   * or cell is off-map and also blocks, so a road cannot leave the world.
   *
   * A zone with NO grid at all (nothing to collide with) falls back to the
   * straight line, which is exactly right there. */
  _questPath(S, to) {
    const px = S.player.x, py = S.player.y;
    const straight = () => {
      const d = Math.hypot(to.x - px, to.y - py);
      if (!(d > 1)) return null;
      const k = Math.min(d, TRAIL_TILES * TILE) / d;
      return [{ x: px, y: py }, { x: px + (to.x - px) * k, y: py + (to.y - py) * k }];
    };

    const grid = (S._tiledWalkable && S._tiledWalkable[this.currentZone]) || null;
    const zdef = ZONES[this.currentZone];
    const gh = (grid && grid.length) || 0;
    const gw = (gh && grid[0] && grid[0].length) || 0;
    if (!gw || !zdef) return straight();

    const cw = (zdef.w * TILE) / gw, ch = (zdef.h * TILE) / gh;
    const pgx = Math.floor(px / cw), pgy = Math.floor(py / ch);
    const tgx = Math.floor(to.x / cw), tgy = Math.floor(to.y / ch);

    const key = this.currentZone + '|' + pgx + ',' + pgy + '|' + tgx + ',' + tgy;
    if (this._trailKey === key) return this._trailPath;
    this._trailKey = key;

    const open = (gx, gy) => {
      const row = grid[gy];
      return !!row && gx >= 0 && gx < gw && row[gx] !== false;
    };
    /* R covers the heading plus a little slack, so a road that has to detour
       sideways round a wide building still has room to come back. */
    const R = Math.ceil((TRAIL_TILES * TILE) / Math.min(cw, ch)) + 4;
    const x0 = Math.max(0, pgx - R), x1 = Math.min(gw - 1, pgx + R);
    const y0 = Math.max(0, pgy - R), y1 = Math.min(gh - 1, pgy + R);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    if (bw <= 0 || bh <= 0) { this._trailPath = straight(); return this._trailPath; }

    const prev = new Int32Array(bw * bh).fill(-2);   /* -2 unvisited, -1 root */
    const at = (gx, gy) => (gy - y0) * bw + (gx - x0);
    const startI = at(pgx, pgy);
    if (startI < 0 || startI >= prev.length) { this._trailPath = straight(); return this._trailPath; }
    prev[startI] = -1;
    const q = [startI];
    let head = 0;
    let best = startI;
    let bestD = Infinity;
    while (head < q.length) {
      const i = q[head++];
      const gx = x0 + (i % bw), gy = y0 + ((i / bw) | 0);
      const wx = (gx + 0.5) * cw, wy = (gy + 0.5) * ch;
      const d2 = (wx - to.x) * (wx - to.x) + (wy - to.y) * (wy - to.y);
      if (d2 < bestD) { bestD = d2; best = i; }
      if (gx === tgx && gy === tgy) break;           /* arrived */
      for (let k = 0; k < 4; k++) {
        const nx = gx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = gy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        const j = at(nx, ny);
        if (prev[j] !== -2 || !open(nx, ny)) continue;
        prev[j] = i;
        q.push(j);
      }
    }

    /* Backtrack, then STRAIGHTEN.  A four-connected BFS answers in stair
       steps, and a road of dots on a staircase reads as a bug; skipping every
       waypoint the previous one can already see turns it back into two or
       three long straight runs with a bend at the corner, which is what a
       road looks like. */
    const cells = [];
    for (let i = best; i !== -1; i = prev[i]) cells.push(i);
    cells.reverse();
    const pts = cells.map((i) => ({
      x: (x0 + (i % bw) + 0.5) * cw,
      y: (y0 + ((i / bw) | 0) + 0.5) * ch,
    }));
    pts[0] = { x: px, y: py };                       /* start at the feet, not the cell centre */
    /* The last hop onto the target itself: only when the BFS actually got
       there, so a road that stopped at the box edge does not jump the gap. */
    if (cells.length && cells[cells.length - 1] === at(tgx, tgy)) pts.push({ x: to.x, y: to.y });

    const clear = (a, b) => {
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const step = Math.min(cw, ch) * 0.5;
      for (let s = step; s < d; s += step) {
        if (!open(Math.floor((a.x + (b.x - a.x) * (s / d)) / cw),
                  Math.floor((a.y + (b.y - a.y) * (s / d)) / ch))) return false;
      }
      return true;
    };
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !clear(pts[i], pts[j])) j--;
      out.push(pts[j]);
      i = j;
    }
    this._trailPath = out;
    return out;
  }

  /* v2.3.2070: one pooled beam Sprite per exit tile, created on demand and
     reused across zone changes.  Pooled rather than rebuilt because the exit
     list is rebuilt on every zone change and a zone with six exits followed by
     one with two would otherwise churn four Sprites per transition; the extras
     are hidden, not destroyed.
     ADDITIVE, which is the whole reason the artwork can have a white
     background: the importer gives every pixel the ray's own colour and an
     alpha of "how far from white it was", so under `add` a lit pixel adds
     light and the page adds exactly nothing. */
  _portalBeam(i) {
    let sp = this._portalBeams[i];
    if (!sp) {
      sp = new Sprite();
      sp.anchor.set(0.5, 1);
      sp.blendMode = 'add';
      this.portalLayer.addChild(sp);
      this._portalBeams[i] = sp;
    }
    return sp;
  }

  destroy() {
    _liveTileRenderers.delete(this);
    for (const sp of this._portalBeams) { try { sp.destroy(); } catch (e) {} }
    this._portalBeams = [];
    this.portalLayer.removeChildren();
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();
    this.overlayGfx.clear();
    /* Free baked map RenderTextures (one per visited zone). */
    for (const [, tex] of this._bakedMapCache) {
      if (tex && !tex.destroyed) tex.destroy(true);
    }
    this._bakedMapCache.clear();
  }
}
