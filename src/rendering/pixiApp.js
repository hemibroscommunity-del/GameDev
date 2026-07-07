/**
 * PixiJS Application setup and container hierarchy.
 * Creates the layered scene graph used by all render systems.
 */
import { watchContextLoss } from '../debug/crashTrap.js';
import { Application, Container } from 'pixi.js';

/**
 * Layer names in render order (back to front).
 * v2.3.1182: buildScene used to re-declare these two lists inline while
 * this export sat unused -- two copies of the same 15 names is a silent
 * drift hazard, so the world/screen splits are now THE definition and
 * LAYER_NAMES derives from them.
 */
const WORLD_LAYER_NAMES = [
  'tiles', 'groundDetails', 'groundSplatter', 'groundLoot',
  'gatherNodes', 'telegraphs', 'entities', 'player',
  'projectiles', 'particles', 'damageNumbers', 'overlayWorld',
];
const SCREEN_LAYER_NAMES = ['atmosphere', 'screenFX', 'hud'];
export const LAYER_NAMES = [...WORLD_LAYER_NAMES, ...SCREEN_LAYER_NAMES];

/** Build the scene graph (containers + layers) on a successfully initialized app. */
function buildScene(app) {
  app.ticker.stop();

  // The React canvas owns input — onTouchStart / onTouchEnd / onClick on the
  // <canvas> element drive lock-on, swing, swipe, etc. PixiJS v8's EventSystem
  // attaches its own touch/pointer listeners with autoPreventDefault=true,
  // which suppresses the synthesized click that React's onClick relies on.
  // Disable PixiJS's event interception so React handlers fire cleanly.
  if (app.renderer && app.renderer.events) {
    app.renderer.events.autoPreventDefault = false;
  }
  app.stage.eventMode = 'none';

  const worldContainer = new Container();
  worldContainer.label = 'world';
  app.stage.addChild(worldContainer);

  const screenContainer = new Container();
  screenContainer.label = 'screen';
  app.stage.addChild(screenContainer);

  const layers = {};
  for (const name of WORLD_LAYER_NAMES) {
    const layer = new Container();
    layer.label = name;
    worldContainer.addChild(layer);
    layers[name] = layer;
  }

  for (const name of SCREEN_LAYER_NAMES) {
    const layer = new Container();
    layer.label = name;
    screenContainer.addChild(layer);
    layers[name] = layer;
  }

  return { app, layers, worldContainer, screenContainer };
}

/**
 * Creates and initializes the PixiJS application.
 * WebGL only -- throws on failure so the caller's retry/backoff handles it.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 */
export async function createPixiApp(canvas) {
  const dpr = window.devicePixelRatio || 1;

  const initOpts = {
    canvas: canvas,
    width: canvas.clientWidth || (canvas.width / dpr),
    height: canvas.clientHeight || (canvas.height / dpr),
    background: 0x0d0b18,
    antialias: false,
    resolution: dpr,
    autoDensity: true,
    powerPreference: 'high-performance',
    autoStart: false,
    /* Snap every sprite's render position to whole screen pixels.
       Zone texture is NEAREST-sampled and snaps to pixels, but the
       player sprite uses fractional P.x / P.y and drifts smoothly
       within those snapped frames — that mismatch reads as walking
       stutter even at a steady 60 fps.  roundPixels keeps the data
       layer fractional (so lerps / physics stay smooth) but aligns
       render positions, so player and world step together. */
    roundPixels: true,
  };

  // WebGL only.  v2.3.778: the Pixi v8 Canvas renderer cannot draw our
  // baked/tinted pipeline -- the old silent fallback produced a near-black
  // world that PRETENDED to work (the iPhone two-window screenshots).
  // Throwing instead routes failure into BroTown's pixi-init-failed
  // handler: crash-log entry + fresh-canvas retry with backoff, with the
  // black-screen watchdog as the floor.  Strictly better than a broken
  // canvas renderer even on first boot.
  try {
    const app = new Application();
    await app.init({ ...initOpts, preference: 'webgl' });
    /* v2.3.763: record WebGL context loss -- prime suspect for the reported
       mid-fight black canvas on iPhone. */
    watchContextLoss(canvas);
    console.log('PixiJS using WebGL renderer');
    return buildScene(app);
  } catch (e) {
    console.error('WebGL init failed (no canvas fallback -- failing fast):', e && e.message);
    throw e;
  }
}
