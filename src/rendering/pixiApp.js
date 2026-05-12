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
 * Creates and initializes the PixiJS application.
 * Tries WebGL first; if it fails (e.g. blocked by browser extensions),
 * falls back to the PixiJS Canvas renderer.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 */
export async function createPixiApp(canvas) {
  /* Mobile GPUs hit fillrate limits at full DPR (commonly 2-3 on
     phones).  At DPR=3 the renderer pushes 9x the pixels of DPR=1;
     for meadow with 10 slime sprites + the 1024x1024 zone painting
     that saturates the GPU (bt-frame-split: renderMs 39-100,
     simMs 1-8).  Cap at integer 2 to keep buffer dims integer
     (fractional 1.5 + autoDensity caused black/glitchy render in
     v2.1.49).  DPR=3 phones drop to 2 -> ~44% of pixel work; DPR=2
     and below are unchanged. */
  const rawDpr = window.devicePixelRatio || 1;
  const dpr = Math.min(Math.max(1, Math.floor(rawDpr)), 2);

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

  // Try WebGL first
  try {
    const app = new Application();
    await app.init({ ...initOpts, preference: 'webgl' });
    console.log('PixiJS using WebGL renderer');
    return buildScene(app);
  } catch (e) {
    console.warn('WebGL init failed, retrying with Canvas renderer:', e.message);
  }

  // Fallback to PixiJS Canvas renderer
  const app = new Application();
  await app.init({ ...initOpts, preference: 'canvas' });
  console.log('PixiJS using Canvas renderer');
  return buildScene(app);
}
