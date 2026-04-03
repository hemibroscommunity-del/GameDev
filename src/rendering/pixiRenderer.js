/**
 * PixiJS Renderer — replaces canvasRenderer.js.
 * Manages the PixiJS application and orchestrates all render systems.
 */
import { Graphics } from 'pixi.js';
import { createPixiApp, updateCamera } from './pixiApp.js';
import { TileRenderer } from './systems/tileRenderer.js';
import { EntityRenderer } from './systems/entityRenderer.js';
import { EffectsRenderer } from './systems/effectsRenderer.js';

/**
 * @typedef {Object} PixiRendererInstance
 * @property {import('pixi.js').Application} app
 * @property {Function} update - Call each frame
 * @property {Function} onZoneChange - Call when zone changes
 * @property {Function} destroy - Cleanup
 */

/**
 * Initializes the PixiJS renderer.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<PixiRendererInstance>}
 */
export async function initPixiRenderer(canvas) {
  const { app, layers, worldContainer, screenContainer } = await createPixiApp(canvas);

  let _frameCount = 0;

  // Create render systems
  const tileRenderer = new TileRenderer(layers.tiles);
  const entityRenderer = new EntityRenderer(layers.entities, layers.player);
  const effectsRenderer = new EffectsRenderer(layers);

  let currentZone = null;
  let currentMap = null;

  /**
   * Called when the zone changes — rebuilds tile map and resets entities.
   */
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
   * This replaces the old renderFrame() function.
   *
   * @param {Object} S - Game state (stateRef.current)
   * @param {number} viewW - Viewport width (logical pixels)
   * @param {number} viewH - Viewport height (logical pixels)
   * @param {Array} nfts - NFT catalogue
   */
  function update(S, viewW, viewH, nfts) {
    const now = Date.now();
    const cx = S.camera.x;
    const cy = S.camera.y;

    // Detect zone changes
    if (S.currentZone !== currentZone || S.map !== currentMap) {
      onZoneChange(S.map, S.currentZone);
    }

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (S.screenShake > 0.1) {
      shakeX = (Math.random() - 0.5) * S.screenShake * 2;
      shakeY = (Math.random() - 0.5) * S.screenShake * 2;
      S.screenShake *= 0.85;
    } else {
      S.screenShake = 0;
    }

    // Update camera
    updateCamera(worldContainer, cx, cy, shakeX, shakeY);

    // Tile culling
    tileRenderer.update(cx, cy, viewW, viewH);

    // Entity updates
    entityRenderer.update(S, now);

    // Effects updates
    effectsRenderer.update(S, viewW, viewH, now);

    // Manual render — we control when PixiJS draws
    app.render();
  }

  /**
   * Cleanup — destroy PixiJS app and all systems.
   */
  function destroy() {
    tileRenderer.destroy();
    entityRenderer.clear();
    effectsRenderer.clear();
    // Don't remove the canvas from DOM — React owns it
    app.destroy(false, { children: true });
  }

  return {
    app,
    canvas: app.canvas,
    update,
    onZoneChange,
    destroy,
  };
}
