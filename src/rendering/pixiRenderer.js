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
import { loadWeaponSprites } from './weaponSprites.js';

/**
 * Initializes the PixiJS renderer.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<{update: Function, onZoneChange: Function, destroy: Function}>}
 */
export async function initPixiRenderer(canvas) {
  const { app, layers, worldContainer, screenContainer } = await createPixiApp(canvas);

  const tileRenderer = new TileRenderer(layers.tiles);
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
  // Weapon icons (sword / bow / staff).
  loadWeaponSprites().catch((err) => console.warn('Weapon sprites failed to load, using procedural fallback:', err));
  // Per-frame hand anchors + weapon grip points.
  loadPlayerAnchors().catch((err) => console.warn('Player anchors failed to load, using procedural fallback:', err));

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

    // Resize PixiJS to match the current canvas dimensions each frame
    // The game's own resize handler sets canvas.width/height, we sync PixiJS to it
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    if (Math.abs(app.renderer.width / dpr - cssW) > 1 || Math.abs(app.renderer.height / dpr - cssH) > 1) {
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
    worldContainer.x = -cx * scaleX + shakeX;
    worldContainer.y = -cy * scaleY + shakeY;

    // Each renderer wrapped — a single throw in entity or effects
    // (e.g. the bow-kill crash) used to cascade into app.render() never
    // being called, freezing the canvas at the last good frame.  Now
    // failures log once per system and the surviving systems still draw.
    try { tileRenderer.update(cx, cy, viewW, viewH); }
    catch (e) { if (!update._tileErr) { update._tileErr = true; console.error('[pixi-render] tileRenderer threw', e && e.message, e && e.stack); } }
    try { entityRenderer.update(S, now); }
    catch (e) { if (!update._entityErr) { update._entityErr = true; console.error('[pixi-render] entityRenderer threw', e && e.message, e && e.stack); } }
    try { effectsRenderer.update(S, cssW, cssH, now); }
    catch (e) { if (!update._effectsErr) { update._effectsErr = true; console.error('[pixi-render] effectsRenderer threw', e && e.message, e && e.stack); } }

    fpsOverlay.update(now);

    // Manual render
    try { app.render(); }
    catch (e) { if (!update._renderErr) { update._renderErr = true; console.error('[pixi-render] app.render threw', e && e.message, e && e.stack); } }
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
