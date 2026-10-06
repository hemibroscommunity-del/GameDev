/**
 * PixiJS Application setup and container hierarchy.
 * Creates the layered scene graph used by all render systems.
 */
import { watchContextLoss } from '../debug/crashTrap.js';
import { installSharpPixels } from './sharpPixels.js'; /* v2.3.2770 */
import { SHADE } from './formShade.js';
import { Application, Cache, Container, TextureSource } from 'pixi.js';

/* ═══ v2.3.3069: A DESTROYED TEXTURE LETS GO OF ITS PIXELS ═══
   TextureSource.destroy() nulls its `resource` -- but Pixi also keeps the
   constructor's whole `options` object (this.options = options), resource and
   all, and nothing ever clears it.  That only matters if something still points
   at the destroyed source, and Pixi does: a pooled Batch keeps the up to 32
   sources of its last frame in its BatchTextureArray until it is reused, a
   sprite drawn and then hidden keeps its texture in its per-renderer draw data
   (BatchableSprite) -- the shadows' pools are full of those -- and so do the
   render group's meshes.  Measured (a heap snapshot, phone-sized page, a tour
   of four lands and home): 43 destroyed sources still alive, 22.6 MB of the
   pictures they were made from held through `options` -- the Wheel's object
   sheets freed as you walk (commons-1.png 6.1 MB, sky-1.png 5.5, ember-1.png
   3.5, buildings-16.png 2.2), loaded again when you came back beside the
   copy still held, and canvases.  Pixi never reads `options.resource` back
   (nothing in pixi.js does), so on destroy it goes too: a source still pointed
   at then costs its few hundred bytes, not its picture.  mp-zombietex. */
if (TextureSource && TextureSource.prototype && !TextureSource.prototype.__btLetsGo) {
  const destroy = TextureSource.prototype.destroy;
  TextureSource.prototype.destroy = function () {
    const r = destroy.apply(this, arguments);
    try { if (this.options) this.options.resource = null; } catch (e) { /* frozen options: nothing held there */ }
    return r;
  };
  TextureSource.prototype.__btLetsGo = true;
}

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
  'tiles', 'groundDetails', 'groundSplatter',
  /* ═══ v2.3.2710: CAST SHADOWS LIE ON THE GROUND ═══
     lightfx/shadows.js.  Above the painted map, its footprints and the
     splatter, because a shadow falls ON them.  Below `groundLoot` and
     `telegraphs` on purpose: a dropped item and the red ring of an incoming
     attack are things the player has to read, so a passing shadow may dim
     the floor but never the warning.  And below every layer that stands on
     the ground, so a building in front of a shadow hides it the way it hides
     the figure casting it. */
  'shadows',
  'groundLoot',
  'telegraphs', 'gatherNodesBack', 'entities', 'gatherNodes',
  /* ═══ v2.3.2636: HIT EFFECTS GO UNDER THE PLAYER ═══
     Owner: "make the character layer in front of the effects (after monsters
     get hit you made effects)."

     `particles` used to sit between `projectiles` and `damageNumbers`, above
     everything, so every impact burst painted over the character who caused
     it -- you swing, and the debris you knocked off the monster covers your
     own body. One of the effectsRenderer sites even records the old
     behaviour as a feature ("particleLayer renders above entities/player, so
     the flash sits over the snowman"); it still sits over the snowman, it
     just no longer sits over you.

     Placed HERE, between the gather nodes and the monster UI, because that
     is the one slot that keeps all three true at once: effects still draw
     over the monsters they belong to (`entities` is below), they stay under
     the monster health bars (`monsterUi` is above) so a burst cannot hide
     the bar it is reducing, and they are under the player.

     `projectiles` deliberately does NOT move: an arrow in FLIGHT is above
     the player by design (v2.3.1915 moved only the SPENT ones down to
     groundLoot, and mp-arrowhead asserts both halves). Damage numbers and
     overlayWorld stay on top for the obvious reason. */
  'particles',
  'monsterUi', 'player',
  'gatherNodesFront', 'gestureFront',
  'projectiles',
  /* ═══ v2.3.2655: THE NEAR-CAMERA FOREGROUND ═══
     DEPTH-ROADMAP item 5, and the layer whose absence meant an edge-cropped
     canopy could not be drawn by anything at all (docs/ART-ASSET-PHASES.md §3
     -- three of the first four assets commissioned for this game were held for
     want of it).

     HERE, and the two neighbours are the whole argument.  ABOVE `projectiles`
     because a branch between you and the camera covers an arrow in flight as
     surely as it covers the body -- put it below and an arrow draws over the
     tree it is passing behind.  BELOW `damageNumbers` and `overlayWorld`
     because a canopy that hides the number telling you how much you just took
     is a canopy that costs you the fight; UI is not scenery and never occludes.
     Unlike `entities`/`gatherNodesFront` this layer is NOT depth-sorted: a
     foreground piece is nearer the camera than everything by construction, so
     there is no ground line to sort it by. */
  'foreground',
  /* ═══ v2.3.2712: THE LIGHT ═══
     Time of day (rendering/worldFx.js): the night's light map, multiplied
     over the world, plus the day's cloud shadows and the dawn fog.  ABOVE
     everything that is IN the world -- the ground, the bodies, the canopy in
     `foreground` all take the hour's light -- and BELOW the damage numbers and
     the world overlay, because the night must never make a number you need to
     read harder to read.  Not depth-sorted: light covers, it does not stand. */
  'lighting',
  /* v2.3.2717: things that GIVE light, drawn after the night multiplies the
     world so the night cannot darken them: a firefly and its glow.  Still
     under the damage numbers and the world overlay, like everything in the
     world. */
  'glows',
  'damageNumbers', 'overlayWorld',
  /* ═══ v2.3.3035: A BAR NOTHING IN THE WORLD MAY COVER ═══
     The harvest's bar (effectsRenderer _drawGatherHpBar) sits ON the rock you
     mine, and that rock is promoted into `overlayWorld` while you mine
     (v2.3.854: it covers the rock baked into the swing).  The bar first went
     into overlayWorld after it, re-appended to the end on every frame -- and
     the capture still showed the rock over it: traced, the bar was moved to
     the end each frame and the rock was after it again by the next, though
     nothing re-added the rock, so something else reorders that layer.  A
     layer of its own, last in the world, holds nothing else and so has nothing
     to be put under. */
  'worldUi',
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

  /* ═══ v2.3.3079: THE WORLD AND THE SCREEN ARE RENDER GROUPS ═══
     The owner's yes to "smoother frames (Pixi render groups) -- occasional
     1-px shift, not byte-identical".  The camera is the world container's own
     x / y / scale (pixiRenderer), so every frame it moves, Pixi used to work
     out every world object's place on screen again on the CPU, and any of the
     ~25 changes a frame makes to the scene (effects added, pooled sprites
     shown and hidden, the depth sort's moves) rebuilt the draw list of the
     WHOLE scene, the HUD's ~216 containers included (docs/MEMORY-PLAN.md,
     frame time).  As render groups, a world object keeps its place in the
     world and the camera is applied to it on the GPU, and a change in the
     world rebuilds only the world's list, a change on the screen only the
     screen's.  The camera on the GPU is in 32-bit floats, so an edge can land
     a pixel over now and then -- the shift the owner accepted.
     `?norendergroups` is the scene as it was, to compare. */
  if (!(typeof location !== 'undefined' && /[?&]norendergroups\b/.test(location.search || ''))) {
    worldContainer.isRenderGroup = true;
    screenContainer.isRenderGroup = true;
  }

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

  /* ═══ v2.3.3037: EVERY PICTURE ON THE GPU, NAMED ═══
   * __btTex counts Pixi's asset CACHE -- pictures loaded from a file.  The
   * GPU holds more than that: the Wheel's ground pieces, the baked bodies, the
   * shadows' and the minimap's render textures, text, canvases.  This lists
   * everything the renderer has uploaded (GlTextureSystem.managedTextures),
   * what it is (a picture from a file, a canvas, or a render texture drawn on
   * the GPU -- the ones an iOS graphics reset blanks), its decoded size (x 4/3
   * with mipmaps), and how long since it was last drawn.  Probe only, house
   * style: nothing in the game calls it. */
  if (typeof window !== 'undefined') {
    /* every source the GPU holds or the asset cache keeps, for the audit's
       thumbnails (mp-gpuaudit QA_GA_THUMBS) */
    window.__btGpuTexSources = function () {
      const out = [];
      try { for (const s of (app.renderer.texture.managedTextures || [])) out.push(s); } catch (e) { /* none */ }
      try {
        const map = Cache && (Cache._cache || Cache.cache);
        if (map && typeof map.forEach === 'function') map.forEach((v) => {
          const src = v && (v.source || (v.uid && v.resource !== undefined ? v : null));
          if (src) out.push(src);
        });
      } catch (e) { /* none */ }
      return out;
    };
    window.__btGpuTex = function (top) {
      try {
        const r = app.renderer;
        const list = (r && r.texture && r.texture.managedTextures) || [];
        const now = r && r.gc ? r.gc.now : performance.now();
        const kindOf = (s) => {
          const res = s.resource;
          /* v2.3.3076: a buffer that let go of its colours once uploaded (the
             Wheel's ground, wheelGround.js _toGpu) is still a buffer */
          if (!res) return s.uploadMethodId === 'buffer' ? 'buffer' : 'render';
          if (typeof ImageBitmap !== 'undefined' && res instanceof ImageBitmap) return 'file';
          if (typeof HTMLImageElement !== 'undefined' && res instanceof HTMLImageElement) return 'file';
          if (typeof HTMLCanvasElement !== 'undefined' && res instanceof HTMLCanvasElement) return 'canvas';
          if (typeof OffscreenCanvas !== 'undefined' && res instanceof OffscreenCanvas) return 'canvas';
          if (ArrayBuffer.isView(res)) return 'buffer';
          return 'other';
        };
        const rows = [];
        const byKind = {};
        let bytes = 0;
        for (const s of list) {
          if (!s || s.destroyed) continue;
          const w = s.pixelWidth || 0, h = s.pixelHeight || 0;
          const mip = !!(s.autoGenerateMipmaps || s.mipLevelCount > 1);
          const b = w * h * 4 * (mip ? 4 / 3 : 1);
          const kind = kindOf(s);
          bytes += b;
          byKind[kind] = (byKind[kind] || 0) + b;
          rows.push({ label: String(s.label || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0], kind, w, h, mip,
            mb: +(b / 1048576).toFixed(2), idleS: s._gcLastUsed >= 0 ? Math.round((now - s._gcLastUsed) / 1000) : null });
        }
        rows.sort((a, b) => b.mb - a.mb);
        const mbOf = (o) => { const m = {}; for (const k in o) m[k] = +(o[k] / 1048576).toFixed(1); return m; };
        const cv = r && r.canvas;
        /* and what the asset cache holds that the GPU does NOT: decoded (a
           canvas's pixels are kept whatever happens) and never drawn */
        const onGpu = new Set(list);
        const idle = {};
        let idleBytes = 0;
        try {
          const map = Cache && (Cache._cache || Cache.cache);
          const seen = new Set();
          if (map && typeof map.forEach === 'function') map.forEach((v) => {
            const src = v && (v.source || (v.uid && v.resource !== undefined ? v : null));
            if (!src || src.destroyed || seen.has(src.uid) || onGpu.has(src)) return;
            seen.add(src.uid);
            const b = (src.pixelWidth || 0) * (src.pixelHeight || 0) * 4;
            idleBytes += b;
            const k = kindOf(src) + ' ' + (String(src.label || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('/').slice(0, 5).join('/') || ((src.pixelWidth || 0) + 'x' + (src.pixelHeight || 0)));
            idle[k] = (idle[k] || 0) + b;
          });
        } catch (e) { /* a private map that moved: the rest still stands */ }
        const idleTop = Object.entries(idle).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, b]) => [k, +(b / 1048576).toFixed(2)]);
        return { n: rows.length, mb: +(bytes / 1048576).toFixed(1), byKind: mbOf(byKind),
          canvas: cv ? [cv.width, cv.height, +((cv.width * cv.height * 4) / 1048576).toFixed(1)] : null,
          cacheNotOnGpu: { mb: +(idleBytes / 1048576).toFixed(1), top: idleTop },
          list: rows.slice(0, top || 400) };
      } catch (e) { return { err: String(e && e.message || e) }; }
    };
  }

  const layers = {};
  for (const name of WORLD_LAYER_NAMES) {
    const layer = new Container();
    layer.label = name;
    /* ═══ v2.3.2633: THE TWO LAYERS THAT SORT BY DEPTH ═══
       Roadmap item 1.  Everything that can occlude or be occluded lives in
       one of these two, and inside them draw order is computed from each
       object's GROUND-CONTACT LINE every frame (see rendering/depthSort.js)
       rather than being the order things happened to be added in.

       Only these two.  Turning it on layer-wide would cost a sort per layer
       per frame for stacks whose order is deliberate and fixed — the ground
       splatter, the telegraphs, the HUD — and buy nothing: a vignette has no
       ground line.  Pixi only re-sorts a layer when a child's zIndex has
       actually changed, so a still scene does no work. */
    if (name === 'entities' || name === 'gatherNodesFront') layer.sortableChildren = true;
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
/* v2.3.3017: the colour the canvas clears to, where nothing is drawn -- what a
   world that has stopped drawing shows.  The black-screen watchdog
   (BroTown.jsx _wdLitPx) reads it as dark: its sum, 48, passed the old
   near-black line of 30, so a screen of nothing else counted as lit. */
export const CANVAS_BG = 0x0d0b18;

/* ═══ v2.3.3072: THE SCREEN HAS NO DEPTH BUFFER ═══
   Pixi asks for the canvas's WebGL context with a stencil buffer (its masks:
   the swimmer cut at the neck) and says nothing of depth, and WebGL's default
   is a depth buffer too: one more full-screen buffer behind the picture that
   nothing reads -- no code here or in Pixi's 2D drawing turns DEPTH_TEST on.
   iPhone Safari makes the two one packed depth + stencil buffer (WebKit's
   WebGLDefaultFramebuffer: DEPTH24_STENCIL8, on Metal 32-bit float depth and
   8-bit stencil); asked for stencil alone it makes STENCIL_INDEX8, a byte a
   pixel.  At 1170 x 2532 that is ~11 MB less on the GPU (~20 if the packed
   format is stored 8 bytes a pixel), and one clear less a frame.  Chrome
   keeps a packed buffer whatever is asked, so nothing changes there.  Not a
   pixel changes anywhere: with DEPTH_TEST off the depth buffer is never read
   (mp-nodepth checks it stays off through a fight, a swim and a rebuild).
   Only Pixi's own getContext on this canvas is changed, and only while the
   app is made; `?depthbuf` in the address keeps the depth buffer, to compare. */
function withoutDepthBuffer(canvas) {
  try {
    if (/(^|[?&])depthbuf(=|&|$)/.test(window.location.search || '')) return () => {};
    if (!canvas || typeof canvas.getContext !== 'function' || Object.prototype.hasOwnProperty.call(canvas, 'getContext')) return () => {};
    const own = canvas.getContext;
    canvas.getContext = function (type, attrs) {
      if ((type === 'webgl2' || type === 'webgl') && attrs && typeof attrs === 'object') attrs = Object.assign({}, attrs, { depth: false });
      return own.apply(this, [type, attrs].concat(Array.prototype.slice.call(arguments, 2)));
    };
    return () => { try { delete canvas.getContext; } catch (e) { /* the prototype's again */ } };
  } catch (e) {
    return () => {};
  }
}

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
    background: CANVAS_BG,
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
       render positions, so player and world step together.
       v2.3.2922: except the character sprites.  The sharp batcher
       (sharpPixels.js) draws them unsnapped, because snapping each
       stacked layer of a figure on its own made them snap apart (the
       NE/NW collar flicker, TRAPS §121). */
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
    const putBack = withoutDepthBuffer(canvas);   /* v2.3.3072 */
    try {
      await app.init({ ...initOpts, preference: 'webgl' });
    } finally {
      putBack();
    }
    /* v2.3.763: record WebGL context loss -- prime suspect for the reported
       mid-fight black canvas on iPhone. */
    watchContextLoss(canvas);
    /* v2.3.2770: crisp character pixels without spending texture memory */
    try { installSharpPixels(app, SHADE.figure); } catch (e) { /* the default look */ }
    console.log('PixiJS using WebGL renderer');
    return buildScene(app);
  } catch (e) {
    console.error('WebGL init failed (no canvas fallback -- failing fast):', e && e.message);
    throw e;
  }
}
