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
import { isZoneUnlocked, zoneUnlockQuest } from '@/game/questRoute.js'; /* v2.3.1822: a shut door looks shut */
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
    this._exitTiles = [];   // [{ r, c, tile, zoneId }]

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
    const _declared = zoneId === 'town' ? TOWN_EXITS
      : zoneId === 'worldview' ? WORLDVIEW_EXITS : null;
    if (_declared) {
      for (const ex of _declared) {
        /* Exits are declared at a 2x2 marker block's corner, so claim the
           block rather than the single cell. */
        for (let dr = 0; dr < 2; dr++) {
          for (let dc = 0; dc < 2; dc++) _destAt.set(`${ex.ty + dr},${ex.tx + dc}`, ex.zoneId);
        }
      }
    }
    this._exitTiles = [];
    for (let r = 0; r < rows; r++) {
      const row = map[r];
      if (!row) continue;
      for (let c = 0; c < cols; c++) {
        const t = row[c];
        if (t === 8 || t === 9 || t === 10) {
          this._exitTiles.push({ r, c, tile: t, zoneId: _destAt.get(`${r},${c}`) || null });
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
    if (this._exitTiles.length) {
      const now = Date.now();
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
          sp.tint = _locked ? PORTAL_BEAM_LOCKED_TINT : 0xffffff;
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
              alpha: +sp.alpha.toFixed(3), tint: sp.tint, blend: sp.blendMode };
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
