/**
 * PixiJS Application setup and container hierarchy.
 * Creates the layered scene graph used by all render systems.
 */
import { Application, Container, Graphics } from 'pixi.js';

/**
 * Layer names in render order (back to front).
 * Each becomes a Container added to app.stage.
 */
export const LAYER_NAMES = [
  'tiles',          // tile map (ground, paths, water, buildings)
  'groundDetails',  // zone-specific ground overlays (cracks, frost, etc.)
  'groundSplatter', // persistent kill marks
  'groundLoot',     // dropped items
  'gatherNodes',    // trees, fish spots, ore veins
  'telegraphs',     // monster attack warnings
  'entities',       // monsters, NPCs, other players, pets
  'player',         // local player character
  'projectiles',    // arrows, staff bolts
  'particles',      // hit particles, ambient particles, death explosions
  'damageNumbers',  // floating combat text
  'overlayWorld',   // lock-on indicators, chat bubbles, labels
  'atmosphere',     // zone tint, vignette, darkness, fog
  'screenFX',       // damage flash, level up, zone transitions
  'hud',            // clan war scoreboard, aim reticle
];

/**
 * Creates and initializes the PixiJS application.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<{app: Application, layers: Object, worldContainer: Container}>}
 */
export async function createPixiApp(canvas) {
  const app = new Application();

  await app.init({
    canvas: canvas,
    resizeTo: window,
    background: 0x0d0b18,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    powerPreference: 'high-performance',
    autoStart: false,  // Don't auto-render — we control rendering manually
  });

  // Stop the internal ticker — we render manually from our game loop
  app.ticker.stop();

  // World container — moves with camera (everything in game-world space)
  const worldContainer = new Container();
  worldContainer.label = 'world';
  app.stage.addChild(worldContainer);

  // Screen container — fixed to viewport (HUD, flashes, overlays)
  const screenContainer = new Container();
  screenContainer.label = 'screen';
  app.stage.addChild(screenContainer);

  // Create layer containers
  const layers = {};
  const worldLayers = [
    'tiles', 'groundDetails', 'groundSplatter', 'groundLoot',
    'gatherNodes', 'telegraphs', 'entities', 'player',
    'projectiles', 'particles', 'damageNumbers', 'overlayWorld',
  ];
  const screenLayers = ['atmosphere', 'screenFX', 'hud'];

  for (const name of worldLayers) {
    const layer = new Container();
    layer.label = name;
    worldContainer.addChild(layer);
    layers[name] = layer;
  }

  for (const name of screenLayers) {
    const layer = new Container();
    layer.label = name;
    screenContainer.addChild(layer);
    layers[name] = layer;
  }

  return { app, layers, worldContainer, screenContainer };
}

/**
 * Updates camera position (translates world container).
 * @param {Container} worldContainer
 * @param {number} cx - Camera X in world space
 * @param {number} cy - Camera Y in world space
 * @param {number} shakeX - Screen shake offset X
 * @param {number} shakeY - Screen shake offset Y
 */
export function updateCamera(worldContainer, cx, cy, shakeX = 0, shakeY = 0) {
  worldContainer.x = -cx + shakeX;
  worldContainer.y = -cy + shakeY;
}
