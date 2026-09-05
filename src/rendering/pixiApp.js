/**
 * PixiJS Application setup and container hierarchy.
 * Creates the layered scene graph used by all render systems.
 */
import { watchContextLoss } from '../debug/crashTrap.js';
import { Application, Cache, Container } from 'pixi.js';

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
/* v2.3.1915: the world stack, published for QA. "Arrows draw under the
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

  /* ═══ v2.3.2271: HOW MANY THINGS ARE IN THE SCENE ═══
   * Owner: "the game slows down after playing for a while (like an accumulated
   * frame rate drop)."
   *
   * "Accumulated" names a shape -- something GROWS -- and the commonest way a
   * Pixi game grows is display objects that are created per event and never
   * destroyed.  That is invisible from the outside: a leaked Sprite parked at
   * alpha 0 looks exactly like no leak at all, and the frame rate that would
   * expose it is the one thing a headless desktop browser cannot measure
   * honestly for a phone.
   *
   * A NODE COUNT CAN BE MEASURED HONESTLY ANYWHERE, which is the point of this
   * probe: it is a property of the scene, not of the device, so a count that
   * climbs over a run is a leak whether the box is doing 60fps or 6.  Broken
   * down by the labelled top-level containers, so a rise says WHERE.
   *
   * Probe only, house style (__btAtkMark, __btCoach, __btBuild): no cost unless
   * something calls it, and nothing in the game does. */
  if (typeof window !== 'undefined') {
    window.__btScene = function () {
      const count = (c) => {
        let n = 1;
        const k = (c && c.children) || [];
        for (let i = 0; i < k.length; i++) n += count(k[i]);
        return n;
      };
      const byLayer = {};
      try {
        ((app.stage && app.stage.children) || []).forEach((c, i) => {
          byLayer[(c && c.label) || ('layer' + i)] = count(c);
        });
      } catch (e) { /* a mid-teardown stage is not worth throwing over */ }
      let total = null;
      try { total = count(app.stage); } catch (e) { total = null; }
      return { total, byLayer };
    };
  }

  /* ═══ v2.3.2281: WHAT IS ACTUALLY DRAWN ON TOP OF THE CORPSE ═══
   *
   * Owner: "Sometimes the death animation still shows character wearing items
   * as it dies (like frozen in place). I think the cape does this. Maybe other
   * items too."
   *
   * "Maybe other items too" is the part that needs an instrument. The death
   * path already hides by EXCEPTION (v2.3.1887, after a hand-written hide list
   * missed the slung shield for two months) -- but only within the player's
   * own display container. Anything drawn for the player from SOMEWHERE ELSE
   * in the scene graph -- the gathering/attack stand-ins and their trait
   * sprites live in the effects renderer's own layers, not under the display
   * -- is outside that sweep entirely, and mp-deathshield, which enumerates
   * the display's children, cannot see it either. Both would report a clean
   * corpse while the screen showed a floating cape.
   *
   * So this asks the question from the SCREEN's side instead of the display's:
   * walk the whole stage and report every visible, textured node whose bounds
   * land near a given screen point, whatever container it belongs to. Answers
   * "what is on top of the corpse" rather than "did we remember this layer".
   *
   * Identified by TEXTURE SOURCE LABEL, which for anything Assets loaded is
   * its URL -- so the answer names the art file, and a floating cape reads as
   * a cape rather than as an anonymous Sprite.
   *
   * Probe only, house style: no cost unless something calls it, and nothing in
   * the game does. */
  if (typeof window !== 'undefined') {
    window.__btCorpse = function (sx, sy, radius) {
      const out = [];
      const R = typeof radius === 'number' ? radius : 90;
      const walk = (node, layer) => {
        if (!node || node.visible === false) return;
        /* alpha 0 paints nothing; treat it as hidden so the answer is what
           the player can SEE, not what the graph happens to hold. */
        if (typeof node.alpha === 'number' && node.alpha <= 0.01) return;
        if (node.texture && node.texture.source) {
          let b = null;
          try { b = node.getBounds(); } catch (e) { b = null; }
          if (b && b.width > 0 && b.height > 0) {
            const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            if (Math.abs(cx - sx) <= R + b.width / 2 && Math.abs(cy - sy) <= R + b.height / 2) {
              const src = node.texture.source;
              /* A canvas-baked texture (a recolour) has no URL to name it, and
                 "Sprite" tells the next reader nothing about which figure it
                 belongs to.  Walk up to three labelled ancestors so a bake can
                 still be placed -- which container drew it is the question
                 actually being asked. */
              const path = [];
              for (let p = node.parent, n = 0; p && n < 6 && path.length < 3; p = p.parent, n++) {
                if (p.label) path.push(String(p.label));
              }
              out.push({
                layer,
                label: String((src && src.label) || node.label || '?').split('?')[0],
                path,
                w: Math.round(b.width), h: Math.round(b.height),
                dx: Math.round(cx - sx), dy: Math.round(cy - sy),
              });
            }
          }
        }
        const kids = node.children || [];
        for (let i = 0; i < kids.length; i++) walk(kids[i], layer);
      };
      try {
        ((app.stage && app.stage.children) || []).forEach((c, i) => {
          walk(c, (c && c.label) || ('layer' + i));
        });
      } catch (e) { /* a mid-teardown stage is not worth throwing over */ }
      return out;
    };
  }

  /* ═══ v2.3.2272: HOW MUCH DECODED TEXTURE IS RESIDENT ═══
   * The companion to __btScene, and the more important of the two for the
   * owner's "slows down after playing for a while": a Pixi scene can hold a
   * flat node count while the TEXTURE memory behind it climbs all session,
   * and on iOS that climb is what turns into a frame rate that never comes
   * back -- Safari starts evicting and re-uploading textures under GPU
   * pressure rather than failing outright.
   *
   * It counts DECODED bytes (w * h * 4), not file bytes, because the decoded
   * size is what occupies the GPU and the two are nowhere near each other: the
   * fire goblin's sheets are 1.9MB of PNG on disk and 60.5MB once decoded.
   * Sources are deduped by uid, so a sheet sliced into forty frame Textures
   * counts once, the way the GPU counts it.
   *
   * Reaching into Cache's private map is deliberate and is why every step is
   * wrapped: there is no public enumeration of what Assets is holding, and a
   * probe that silently returns null on a future Pixi is better than one that
   * throws inside a renderer.  Nothing in the game calls this. */
  if (typeof window !== 'undefined') {
    window.__btTex = function (want) {
      try {
        const map = Cache && (Cache._cache || Cache.cache);
        if (!map || typeof map.forEach !== 'function') return null;
        const seen = new Set();
        let bytes = 0, sources = 0;
        const take = (src) => {
          if (!src || typeof src.uid === 'undefined' || seen.has(src.uid)) return;
          /* A DESTROYED source is not resident, whatever the cache still says.
             Canvas-minted textures (Texture.from(canvas) -- the monster
             recolours, the peer bakes) stay keyed in Cache after their source
             is destroyed, and counting those would report memory that has
             already gone back, which is the exact error that makes a probe
             worse than none: it would have said the recolour free did nothing. */
          if (src.destroyed) return;
          seen.add(src.uid);
          sources++;
          const w = src.pixelWidth || src.width || 0;
          const h = src.pixelHeight || src.height || 0;
          bytes += w * h * 4;
        };
        map.forEach((v) => {
          if (!v) return;
          if (v.source) take(v.source);              /* Texture */
          else if (v.uid && v.resource !== undefined) take(v); /* TextureSource */
          else if (v.textures) {                      /* Spritesheet */
            for (const k in v.textures) { const t = v.textures[k]; if (t && t.source) take(t.source); }
          }
        });
        /* `list` is opt-in because the answer is hundreds of URLs: __btTex()
           for the totals, __btTex(true) when a residue has to be NAMED.
           Sorted by size so the first rows are the ones worth reading. */
        const out = { sources, mb: +(bytes / 1048576).toFixed(1), keys: map.size || null };
        if (want) {
          const rows = [];
          const rseen = new Set();
          map.forEach((v, k) => {
            const src = v && (v.source || (v.uid && v.resource !== undefined ? v : null));
            if (!src || src.destroyed || rseen.has(src.uid)) return;
            /* Deduped by uid like the total above -- without this a sheet
               sliced into forty frame Textures prints forty rows of its full
               size and the list reads as a catastrophe that is not there. */
            rseen.add(src.uid);
            const w = src.pixelWidth || src.width || 0, h = src.pixelHeight || src.height || 0;
            rows.push({ k: String(k), mb: +((w * h * 4) / 1048576).toFixed(2) });
          });
          rows.sort((a, b) => b.mb - a.mb);
          out.list = rows;
        }
        return out;
      } catch (e) { return null; }
    };
  }

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
