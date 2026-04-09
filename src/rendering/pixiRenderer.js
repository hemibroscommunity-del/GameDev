/**
 * PixiJS Renderer — replaces canvasRenderer.js.
 * Manages the PixiJS application and orchestrates all render systems.
 */
import { createPixiApp } from './pixiApp.js';
import { TileRenderer } from './systems/tileRenderer.js';
import { EntityRenderer } from './systems/entityRenderer.js';
import { EffectsRenderer } from './systems/effectsRenderer.js';

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

  let currentZone = null;
  let currentMap = null;

  function onZoneChange(map, zoneId) {
    if (zoneId === currentZone && map === currentMap) return;
    currentZone = zoneId;
    currentMap = map;
    tileRenderer.rebuild(app, map, zoneId);
    entityRenderer.clear();
    effectsRenderer.clear();
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

    // Tile background fill
    tileRenderer.update(cx, cy, viewW, viewH);

    // Entity updates
    entityRenderer.update(S, now);

    // Effects updates (screen-space overlays use CSS dimensions)
    effectsRenderer.update(S, cssW, cssH, now);

    // Manual render
    app.render();
  }

  function destroy() {
    tileRenderer.destroy();
    entityRenderer.clear();
    effectsRenderer.clear();
    app.destroy(false, { children: true });
  }

  return { app, canvas: app.canvas, update, onZoneChange, destroy };
}
