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
 * v2.3.1460 (owner): gatherNodes moved ABOVE entities — monsters used to
 * draw over trees/rocks/fishing holes whenever they overlapped, hiding
 * the resource.  Nodes now cover monsters; the local player (and the
 * chop/cook stand-ins that live in gatherNodes) keep drawing above both.
 * v2.3.1472 (owner): monsterUi sits ABOVE gatherNodes — a monster's HP
 * bar must stay readable even when a tree covers the monster itself, so
 * the bar/level/number are parented here while the BODY stays down in
 * entities and remains correctly hidden behind the resource.  Still
 * below damageNumbers, so damage popups keep reading over the bars.
 * v2.3.1500 (owner): gatherNodesFront sits directly ABOVE player, for
 * resources that should occlude the character rather than sit behind them --
 * trees, so you can walk behind one and have it cover you.  Deliberately a
 * SEPARATE layer rather than moving gatherNodes up: that would drag ponds and
 * the harvest stand-ins along with it, and would put trees back over monster
 * HP bars, undoing v2.3.1472.
 * v2.3.1593 (owner): "make monsters appear in front of ore" — gatherNodesBack
 * sits BELOW entities, and ore veins move into it.  This unwinds v2.3.1460
 * for ore ONLY, which is all that is left of that decision: trees went up to
 * gatherNodesFront in v2.3.1500 and fishing holes went down to groundLoot in
 * v2.3.1464, so ore was the last node type still covering monsters.  Again a
 * separate layer rather than moving gatherNodes down — that container also
 * holds the chop/cook/sword harvest stand-ins, which must keep drawing above
 * entities.
 * v2.3.1713 (owner): "move the life skill extraction gestures to be in front
 * of the other stuff.  The woodcutting gesture was largely hidden behind a
 * tree."  MEASURED on a real client at a real frost tree: the chopper stand-in
 * sat in gatherNodes (index 7) while v2.3.1500 had put trees in
 * gatherNodesFront (index 10) — so the very tree you are chopping ALWAYS
 * painted over the lumberjack swinging at it, leaving his legs and nothing
 * else.  gestureFront is a new layer directly above gatherNodesFront that
 * holds ONLY the gathering figures while a gather gesture is playing (the
 * chop/cook/fire stand-ins for you and for peers, and the player's own body
 * during the mine/fish poses, which have no stand-in).  Deliberately NOT a
 * move of gatherNodes or of player: gatherNodes also holds node badges/tips
 * and the sword/bow COMBAT stand-ins, and a player who is merely standing
 * (or fighting) behind a tree must stay hidden by it — that occlusion is the
 * whole point of v2.3.1500.  Still BELOW projectiles/particles/damageNumbers,
 * so wood chips, splashes, the tool cue and damage popups keep reading over
 * the figure.
 */
const WORLD_LAYER_NAMES = [
  'tiles', 'groundDetails', 'groundSplatter', 'groundLoot',
  'telegraphs', 'gatherNodesBack', 'entities', 'gatherNodes', 'monsterUi', 'player',
  'gatherNodesFront', 'gestureFront',
  'projectiles', 'particles', 'damageNumbers', 'overlayWorld',
];
const SCREEN_LAYER_NAMES = ['atmosphere', 'screenFX', 'hud'];
export const LAYER_NAMES = [...WORLD_LAYER_NAMES, ...SCREEN_LAYER_NAMES];
/* v2.3.1909: the world stack, published for QA. "Arrows draw under the
   player" is a statement about ORDER, and a scenario that hard-coded the
   order would keep passing after someone reordered the layers — which is
   the only way this can silently regress. */
if (typeof window !== 'undefined') window.__btLayerOrder = WORLD_LAYER_NAMES.slice();

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
  /* v2.3.1383: without a webglcontextlost preventDefault the browser never
     even ATTEMPTS a context restore — the canvas just dies.  iOS Safari
     kills WebGL contexts under memory pressure (owner: rejoin "blanks
     out"); with this, short pressure spikes restore in place, and the
     unrecoverable case is caught by the black-screen watchdog (a lost
     context now samples as fully dark -> rebuild -> capped reload). */
  try {
    canvas.addEventListener('webglcontextlost', (e) => {
      try { e.preventDefault(); } catch (err) { /* ignore */ }
      try { import('../debug/crashTrap.js').then(ct => ct.recordCrash('gl-context-lost', 'canvas context lost')).catch(() => {}); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try { import('../debug/crashTrap.js').then(ct => ct.recordCrash('gl-context-restored', 'canvas context restored')).catch(() => {}); } catch (err) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }

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
