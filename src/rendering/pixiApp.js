/**
 * PixiJS Application setup and container hierarchy.
 * Creates the layered scene graph used by all render systems.
 */
import { Application, Container } from 'pixi.js';

/**
 * Layer names in render order (back to front).
 */
export const LAYER_NAMES = [
  'tiles', 'groundDetails', 'groundSplatter', 'groundLoot',
  'gatherNodes', 'telegraphs', 'entities', 'player',
  'projectiles', 'particles', 'damageNumbers', 'overlayWorld',
  'atmosphere', 'screenFX', 'hud',
];

/**
 * Creates and initializes the PixiJS application.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<{app: Application, layers: Object, worldContainer: Container, screenContainer: Container}>}
 */
export async function createPixiApp(canvas) {
  const app = new Application();

  const dpr = window.devicePixelRatio || 1;

  await app.init({
    canvas: canvas,
    width: canvas.clientWidth || (canvas.width / dpr),
    height: canvas.clientHeight || (canvas.height / dpr),
    background: 0x0d0b18,
    antialias: false,
    resolution: dpr,
    autoDensity: true,
    powerPreference: 'high-performance',
    autoStart: false,
  });

  app.ticker.stop();

  // World container — moves with camera
  const worldContainer = new Container();
  worldContainer.label = 'world';
  app.stage.addChild(worldContainer);

  // Screen container — fixed to viewport (HUD, flashes)
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
