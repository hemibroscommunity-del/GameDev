/**
 * PixiJS Renderer — replaces canvasRenderer.js.
 * Manages the PixiJS application and orchestrates all render systems.
 */
import { createPixiApp } from './pixiApp.js';
import { TileRenderer } from './systems/tileRenderer.js';
import { EntityRenderer } from './systems/entityRenderer.js';
import { EffectsRenderer } from './systems/effectsRenderer.js';
import { FpsOverlay } from './systems/fpsOverlay.js';
import { loadTileAssets } from './tileAssets.js';
import { loadPlayerSprites } from './playerSprites.js';
import { loadPlayerAnchors } from './playerAnchors.js';
import { loadSlimeSprites } from './slimeSprites.js';
import { loadSnowmanSprites } from './snowmanSprites.js';
import { loadWeaponSprites } from './weaponSprites.js';
import { loadShieldSprites } from './shieldSprites.js';
import { loadImageZoneMaps } from './tiledMaps.js';

/**
 * Initializes the PixiJS renderer.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<{update: Function, onZoneChange: Function, destroy: Function}>}
 */
export async function initPixiRenderer(canvas) {
  const { app, layers, worldContainer, screenContainer } = await createPixiApp(canvas);

  const tileRenderer = new TileRenderer(layers.tiles, app);
  const entityRenderer = new EntityRenderer(layers.entities, layers.player);
  const effectsRenderer = new EffectsRenderer(layers);
  const fpsOverlay = new FpsOverlay();

  // Load tile sprite assets (non-blocking — tiles render procedurally until loaded)
  loadTileAssets()
    .then((assets) => {
      tileRenderer.setAssets(assets);
      // Force rebuild if a zone is already active
      if (currentZone && currentMap) {
        tileRenderer.rebuild(app, currentMap, currentZone);
      }
    })
    .catch((err) => console.warn('Tile assets failed to load, using procedural fallback:', err));

  // Load player sprite sheets (non-blocking — entityRenderer falls back
  // to procedural Graphics on the first few frames before sheets resolve).
  loadPlayerSprites().catch((err) => console.warn('Player sprites failed to load, using procedural fallback:', err));
  // Same for slime monsters (idle / shoot / hit / death / remnants).
  loadSlimeSprites().catch((err) => console.warn('Slime sprites failed to load, using procedural fallback:', err));
  // Snowman monsters — 5 source directional stills (W / NW / SE rendered by mirror).
  loadSnowmanSprites().catch((err) => console.warn('Snowman sprites failed to load, using procedural fallback:', err));
  // Weapon icons (sword / bow / staff).
  loadWeaponSprites().catch((err) => console.warn('Weapon sprites failed to load, using procedural fallback:', err));
  // Shield (front / 3-quarter / side wood-shield views).
  loadShieldSprites().catch((err) => console.warn('Shield sprites failed to load, using procedural arc fallback:', err));
  // Per-frame hand anchors + weapon grip points.
  loadPlayerAnchors().catch((err) => console.warn('Player anchors failed to load, using procedural fallback:', err));
  /* Preload single-image zone maps (frost, etc.) so the Sprite has
     a real texture by the time the user enters the zone — without
     this, Texture.from(url) in Pixi v8 yields a blank placeholder. */
  loadImageZoneMaps().catch((err) => console.warn('Image zone maps failed to load:', err));

  let currentZone = null;
  let currentMap = null;

  function onZoneChange(map, zoneId) {
    if (zoneId === currentZone && map === currentMap) return;
    currentZone = zoneId;
    currentMap = map;
    tileRenderer.rebuild(app, map, zoneId);
    entityRenderer.clear();
    effectsRenderer.clear();
    /* One-shot diagnostic: dump scene-graph state right after zone
       change so we can see what's detached / hidden / zeroed when
       sprites go invisible.  Only logs ONCE per zone enter. */
    try {
      const wc = worldContainer;
      const pl = layers.player;
      const el = layers.entities;
      const pd = entityRenderer.playerDisplay;
      console.log('[zone-enter]', {
        zone: zoneId,
        worldVisible: wc && wc.visible,
        worldScale: wc && { x: wc.scale.x, y: wc.scale.y },
        worldPos: wc && { x: Math.round(wc.x), y: Math.round(wc.y) },
        worldChildren: wc && wc.children.length,
        playerLayerInWorld: pl && pl.parent === wc,
        playerLayerVisible: pl && pl.visible,
        playerLayerChildren: pl && pl.children.length,
        entityLayerInWorld: el && el.parent === wc,
        entityLayerChildren: el && el.children.length,
        hasPlayerDisplay: !!pd,
        playerDisplayParent: pd && (pd.parent === pl ? 'playerLayer' : pd.parent ? 'OTHER' : 'DETACHED'),
        playerDisplayVisible: pd && pd.visible,
        playerSpriteVisible: pd && pd._spriteBody && pd._spriteBody.visible,
        playerSpriteHasTexture: pd && pd._spriteBody && !!pd._spriteBody.texture && !pd._spriteBody.texture.destroyed,
      });
    } catch (e) { console.warn('[zone-enter] diag threw', e && e.message); }
  }

  /**
   * Updates all render systems for one frame.
   * @param {Object} S - Game state (stateRef.current)
   * @param {number} viewW - Logical viewport width (already includes 1.25x zoom factor)
   * @param {number} viewH - Logical viewport height
   * @param {Array} nfts - NFT catalogue
   */
  function update(S, viewW, viewH, nfts) {
    const now = Date.now();
    const cx = S.camera.x;
    const cy = S.camera.y;

    // Resize PixiJS to match the current canvas dimensions when they
    // actually change.  app.renderer.width/.height are stored in
    // logical (CSS) pixels — same units as cssW / cssH — so the
    // earlier `/ dpr` on app.renderer.* was double-counting and made
    // the comparison always-true, firing resize() every frame.
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    if (Math.abs(app.renderer.width - cssW) > 0.5 || Math.abs(app.renderer.height - cssH) > 0.5) {
      app.renderer.resize(cssW, cssH);
    }

    // Detect zone changes
    if (S.currentZone !== currentZone || S.map !== currentMap) {
      onZoneChange(S.map, S.currentZone);
    }

    // Screen shake (decay handled in pre-render simulation phase)
    let shakeX = 0, shakeY = 0;
    if (S.screenShake > 0.1) {
      shakeX = (Math.random() - 0.5) * S.screenShake * 2;
      shakeY = (Math.random() - 0.5) * S.screenShake * 2;
    }

    // The Canvas 2D code uses ctx.setTransform(dpr * 0.8, ...) which means
    // the viewport shows 1/0.8 = 1.25x more world than CSS pixels.
    // viewW/viewH already include this factor (W = canvas.width/dpr * 1.25).
    // To show the same amount of world, we scale worldContainer by
    // cssW / viewW = CSS pixels / logical viewport = 0.8
    const scaleX = cssW / viewW;
    const scaleY = cssH / viewH;
    worldContainer.scale.set(scaleX, scaleY);

    // Camera offset: cx/cy are top-left of viewport in world coords.
    // With scale applied, world position X maps to screen position X*scale.
    // We need worldX=cx to map to screen X=0, so: cx*scale + offsetX = 0 → offsetX = -cx*scale
    //
    // We previously Math.round'd these to whole pixels to suppress
    // texture shimmer when the painted maps were 1254 px scaled into
    // 1024 px world bounds.  Now that all map art is native 1024×1024
    // there is no per-frame texture rescale, and rounding is actively
    // harmful: the camera lerps in sub-pixel steps (0.08–0.18 per
    // frame), so a rounded worldContainer.x flips by 1 px in a stutter
    // pattern, dragging the player sprite with it — that 1-px flicker
    // is what reads as frame-rate jitter even at a steady 60 fps.
    // Letting the offset stay fractional moves the whole scene in
    // smooth GPU sub-pixel steps instead.
    worldContainer.x = -cx * scaleX + shakeX;
    worldContainer.y = -cy * scaleY + shakeY;

    // Each renderer wrapped — a single throw in entity or effects
    // (e.g. the bow-kill crash) used to cascade into app.render() never
    // being called, freezing the canvas at the last good frame.  Now
    // failures log once per system and the surviving systems still draw.
    /* Per-stage timing so we can finally see WHICH sub-renderer is the
       meadow bottleneck.  Throttled to one log per 500 ms, only on
       slow total frames (>30 ms).  Logs the worst frame in each window
       to surface real spikes instead of averaging them away. */
    const _t0 = performance.now();
    try { tileRenderer.update(cx, cy, viewW, viewH); }
    catch (e) { if (!update._tileErr) { update._tileErr = true; console.error('[pixi-render] tileRenderer threw', e && e.message, e && e.stack); } }
    const _t1 = performance.now();
    try { entityRenderer.update(S, now); }
    catch (e) { if (!update._entityErr) { update._entityErr = true; console.error('[pixi-render] entityRenderer threw', e && e.message, e && e.stack); } }
    const _t2 = performance.now();
    try { effectsRenderer.update(S, cssW, cssH, now); }
    catch (e) { if (!update._effectsErr) { update._effectsErr = true; console.error('[pixi-render] effectsRenderer threw', e && e.message, e && e.stack); } }
    const _t3 = performance.now();

    fpsOverlay.update(now);
    const _t4 = performance.now();

    // Manual render
    try { app.render(); }
    catch (e) { if (!update._renderErr) { update._renderErr = true; console.error('[pixi-render] app.render threw', e && e.message, e && e.stack); } }
    const _t5 = performance.now();

    const _renderTotal = _t5 - _t0;
    if (!update._pp) update._pp = { lastT: 0, worst: 0, tile: 0, entity: 0, effects: 0, fps: 0, render: 0, monsters: 0 };
    if (_renderTotal > 30 && _renderTotal > update._pp.worst) {
      update._pp.worst   = _renderTotal;
      update._pp.tile    = _t1 - _t0;
      update._pp.entity  = _t2 - _t1;
      update._pp.effects = _t3 - _t2;
      update._pp.fps     = _t4 - _t3;
      update._pp.render  = _t5 - _t4;
      update._pp.monsters = (S.monsters && S.monsters.length) || 0;
    }
    if (_t5 - update._pp.lastT > 500 && update._pp.worst > 30) {
      /* eslint-disable no-console */
      console.warn('[bt-render-split]', {
        totalMs:    +update._pp.worst.toFixed(1),
        tileMs:     +update._pp.tile.toFixed(1),
        entityMs:   +update._pp.entity.toFixed(1),
        effectsMs:  +update._pp.effects.toFixed(1),
        fpsMs:      +update._pp.fps.toFixed(1),
        appRenderMs:+update._pp.render.toFixed(1),
        monsters:   update._pp.monsters,
        zone:       S.currentZone,
      });
      /* eslint-enable no-console */
      update._pp.lastT = _t5;
      update._pp.worst = 0;
    }
  }

  function destroy() {
    tileRenderer.destroy();
    entityRenderer.clear();
    effectsRenderer.clear();
    fpsOverlay.destroy();
    app.destroy(false, { children: true });
  }

  return { app, canvas: app.canvas, update, onZoneChange, destroy };
}
