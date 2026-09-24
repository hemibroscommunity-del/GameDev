/**
 * PixiJS Renderer — replaces canvasRenderer.js.
 * Manages the PixiJS application and orchestrates all render systems.
 */
import { createPixiApp } from './pixiApp.js';
import { applyDepthBuckets } from './depthSort.js'; /* v2.3.2635: one depth pass per frame */
import { TileRenderer } from './systems/tileRenderer.js';
import { EntityRenderer, prewarmMaskedBodyFrames, prewarmAltWornSets, planPrewarmProgress, uploadBakedTextures, uploadGearTextures, registerPrewarmRenderer, setPlateZoom, figureFeetY, playerGroundDy } from './systems/entityRenderer.js'; /* v2.3.2262: setPlateZoom keeps in-world text readable when the world zooms out; v2.3.2748: + the player's feet for the depth pass */
import { EffectsRenderer, prewarmDmgFontPipe, FIRE_FRAME_MS } from './systems/effectsRenderer.js';
import { WorldFx } from './worldFx.js';               /* v2.3.2712 */
import { WorldLife } from './worldLife.js';           /* v2.3.2811: trees sway, signs swing, flags wave */
import { deathCrumble } from './deathCrumble.js';     /* v2.3.2712 */
import { LightFx, setLightFx } from './lightfx/lightFx.js'; /* v2.3.2710: map-lit shadows + metal glint, behind ?lightfx=1 */
import { setSheen } from './lightfx/glint.js'; /* v2.3.2864: the permanent soft metal shine, behind ?sheen=1; v2.3.2887: on for everyone, ?sheen=0 turns it off */
import { AmbientFx } from './systems/ambientFx.js'; /* v2.3.2762 */
import { setWorldCasts } from './lightfx/casters.js'; /* v2.3.2749: QA before/after of the world's shadows */
import { FpsOverlay } from './systems/fpsOverlay.js';
import { MinimapRenderer } from './systems/minimapRenderer.js'; /* v2.3.1781 */
import { loadPlayerSprites } from './playerSprites.js';
import { loadPlayerAnchors } from './playerAnchors.js';
import { loadSlimeSprites } from './slimeSprites.js';
import { loadPlayerDeathSprites } from './playerDeathSprites.js';
import { loadWeaponSprites } from './weaponSprites.js';
import { loadShieldSprites } from './shieldSprites.js';
import { preloadStartZoneMap } from './tiledMaps.js';
import { noteZoneEntered } from '../ui/zoneBannerOverlay.js'; /* v2.3.2596: the one place that sees EVERY zone change */
import { preloadGear, drawGearFrame } from './gearSheets.js';
import { preloadCombatGear } from './combatGear.js';
import { preloadBodyAll } from './playerSkins.js';
import { preloadWorldAnimations } from './preloadAnimations.js'; /* v2.3.1358 */
import { Assets } from 'pixi.js';
import { markStandIns } from './formShade.js'; /* v2.3.2767: light from above (the batcher patch itself installs on import) */
import { SELF_STAND_IN_FIELDS, PEER_STAND_IN_MAPS } from './lightfx/casters.js';

/* v2.3.778: decode ALL textures to <img>-backed sources, never ImageBitmap.
   On iOS, ImageBitmaps are GPU-backed: the memory purge that kills the WebGL
   context silently wipes their pixels, leaving non-null "husk" Textures that
   render INVISIBLE after a rebuild -- the 'monsters gone, weapon gone, still
   taking damage' session.  <img> sources keep the compressed bytes and
   re-decode on every GPU upload, so they survive any purge, and the
   module-level loader caches become safe to reuse across rebuilds.
   MUST run before the first Assets.load anywhere; module scope here wins by
   construction (the whole module graph evaluates before any runtime load).
   The v2.3.776 call inside loadImageZoneMaps ran too LATE for every loader
   except zone maps -- which is exactly why the map healed but weapons and
   monsters didn't. */
try { Assets.setPreferences({ preferCreateImageBitmap: false }); } catch (e) { /* older pixi */ }

/**
 * Preload every player-avatar asset that would otherwise stream in lazily and
 * flicker on first use — the body sheets, the recolored-skin body, the
 * equipped gear (ALL poses + directions), weapon icons, shield, and hand
 * anchors.  Returns a promise that settles once everything is baked, so the
 * intro overlay can hold until the avatar is guaranteed flicker-free.
 * Uses allSettled so a single missing asset can't stall the gate.
 */
export function preloadPlayerAssets() {
  return Promise.allSettled([
    loadPlayerSprites(),
    loadWeaponSprites(),
    loadShieldSprites(),
    loadPlayerAnchors(),
    preloadGear(),
    preloadBodyAll(),
    /* v2.3.1022: hold the intro until the starting-zone (town) map is in the
       Assets cache -> no black-ground flash on join.  Warmed early at modal
       time, so this is a cached/in-flight await (~0ms) unless the network is
       genuinely slow. */
    preloadStartZoneMap('town'),
    /* v2.3.1022: warm the swing/bowshot gear sheets (network-only, parallel)
       so the first armored attack doesn't cold-load mid-combat. */
    preloadCombatGear(),
    /* v2.3.1358 (owner directive — CLAUDE.md "Animation preloading is
       LAW"): every GLOBAL animation — slime + player-death sheets, all
       EffectsRenderer strips (skill + attack stand-ins, icons), head
       traits, walkability grids, fullset knight figures.  The loading
       screen is allowed to take longer; first-use hitches are not.  New
       animation systems REGISTER in preloadAnimations.js in the same PR.
       v2.3.1405 (owner: "per zone loading"): the ZONE-SPECIFIC assets —
       the 12 zone maps, monster variants, and frost snowman/ice-burst —
       moved OFF this gate to preloadZoneAssets(zoneId), loaded per-zone
       behind the loading overlay on entry (zoneTransitions.js).  Only the
       starting-zone (town) map is warmed here, above. */
    preloadWorldAnimations(),
  ]).then((results) =>
    /* Bake the armored-body masked frames while the intro overlay is still
       up (needs the body + gear sheets above resolved first), so the
       silhouette-confinement cost is paid here instead of as hitches during
       the first seconds of play. */
    /* v2.3.700: BOTH prewarm passes now run behind the intro overlay (the
       IntroVideo loading bar tracks prewarmProgress) -- full speed with
       nothing competing, so the total wait is a few seconds and the player
       joins with EVERY gear state warm.  Replaces the v2.3.698/699
       post-join idle trickle, which traded a long warm-up for early-play
       frame-rate dips. */
    (planPrewarmProgress(), prewarmMaskedBodyFrames().catch(() => {}))
      .then(() => prewarmAltWornSets({ fast: true }).catch(() => {}))
      /* v2.3.701: force GPU upload of the baked textures behind the intro
         so early play doesn't pay lazy first-draw upload stalls. */
      .then(() => uploadBakedTextures(_appRef && _appRef.renderer).catch(() => {}))
      /* v2.3.1022: also GPU-upload the gear sheets (idle/jog + the preloaded
         swing/bowshot strips) so a first armored turn/swing doesn't pay a
         lazy first-draw upload.  Staggered + dedup'd; appended here so it runs
         after the bake and never blocks the parallel network preloads above. */
      .then(() => uploadGearTextures(_appRef && _appRef.renderer).catch(() => {}))
      /* v2.3.1361: init the damage-popup BitmapText pipe (batcher/shader
         + glyph-atlas GPU upload) behind the intro — it was the last
         first-use render init left, paid on the first HIT of the session
         (iOS fire-goblin crash suspect). */
      .then(() => { try { prewarmDmgFontPipe(_appRef && _appRef.renderer); } catch (e) { /* best-effort */ } })
      .then(() => results)
  );
}

/** v2.3.715: light, network-only warm kicked while the welcome modal is up
 *  -- that screen is otherwise dead network time.  Downloads the same sheets
 *  the full preloadPlayerAssets() bake needs, so the intro-gated prewarm
 *  starts from a hot cache instead of cold fetches.  Deliberately NO baking
 *  or GPU uploads here: the modal must stay responsive on phones, and all of
 *  these loaders cache internally, so the joinTown pass re-runs cheaply. */
export function prewarmBaseSheets() {
  return Promise.allSettled([
    loadPlayerSprites(),
    loadWeaponSprites(),
    loadShieldSprites(),
    loadPlayerAnchors(),
    preloadGear(),
    preloadBodyAll(),
  ]);
}

/**
 * Initializes the PixiJS renderer.
 * @param {HTMLCanvasElement} canvas - Existing canvas element to render into
 * @returns {Promise<{update: Function, onZoneChange: Function, destroy: Function}>}
 */
let _appRef = null;   /* v2.3.701: handle for uploadBakedTextures behind the intro */

/* v2.3.2748: the ground line the depth pass pivoted on this frame -- the
   player's FEET -- published for mp-propdepth, which has to compare it with
   each prop's base.  Mutated in place: no allocation per frame. */
const _playerGround = { x: NaN, y: NaN };
const _depthProbe = { legacy: false };
if (typeof window !== 'undefined') {
  window.__btPlayerGround = () => ({ x: _playerGround.x, y: _playerGround.y });
  window.__btDepthLegacy = (on) => { _depthProbe.legacy = !!on; };
}

export async function initPixiRenderer(canvas) {
  const { app, layers, worldContainer, screenContainer } = await createPixiApp(canvas);
  _appRef = app;
  /* v2.3.704: let the equip-change re-prewarm GPU-upload its fresh bakes
     (the intro-time uploadBakedTextures only covered the spawn loadout). */
  registerPrewarmRenderer(app.renderer);

  const tileRenderer = new TileRenderer(layers.tiles, app);
  /* v2.3.1713: layers.gestureFront is passed so the player's own body can be
     lifted above the trees for the mine/fish gestures (which have no stand-in
     figure) — see EntityRenderer._updatePlayer. */
  /* v2.3.2633: + gatherNodesFront, the layer ABOVE `player`.  Props that stand
     south of the player are re-parented into it each frame so a building can
     occlude the body -- see rendering/depthSort.js for why the split exists
     rather than the body simply joining the sorted layer. */
  const entityRenderer = new EntityRenderer(layers.entities, layers.player, layers.monsterUi, layers.gestureFront, layers.gatherNodesFront, layers.foreground); /* v2.3.2655: + the near-camera layer */
  const effectsRenderer = new EffectsRenderer(layers);
  /* v2.3.2712: time of day, the air, dust prints and blood (worldFx.js); the
     crumbling corpse needs the renderer to photograph the body it replaces. */
  const worldFx = new WorldFx(layers, app);
  const worldLife = new WorldLife(layers);
  worldFx.setEntityRenderer(entityRenderer);   /* v2.3.2715: night lights the plates and the monsters */
  deathCrumble.setRenderer(app.renderer);
  /* v2.3.2710: shadows cast by each map's own sun, and metal that catches the
     light (rendering/lightfx).  Off unless the switch is on -- see lightFx.js. */
  const lightFx = new LightFx(layers, worldContainer);
  if (typeof window !== 'undefined') {
    window.__btLightFx = {
      probe: () => lightFx.probe(),
      set: (on) => setLightFx(on),
      /* pin every glint at one point of its sweep, for pictures; null frees it */
      glint: (p) => { lightFx.glint.force = (p == null ? null : (+p < 0 ? -1 : Math.min(1, +p))); },   /* v2.3.2864: -1 = hold every sweep off */
      /* v2.3.2864: the permanent sheen on/off, and a multiplier on its
         strength so the pictures can show a softer and a stronger cut */
      sheen: (on) => setSheen(on),
      sheenScale: (k) => { lightFx.glint.sheenScale = (k == null ? null : Math.max(0, +k)); },
      sheenSun: (v) => { lightFx.sheenSun = (Array.isArray(v) && v.length === 2) ? [+v[0], +v[1]] : null; },
      /* v2.3.2749: props and trees stop casting (figures still do) -- the
         look before they did, for before/after pictures of one frame */
      world: (on) => setWorldCasts(on),
    };
  }
  /* v2.3.2762: the maps' ambient life -- lava breathing, smoke, water light,
     wind, snow, motes (systems/ambientFx.js). */
  const ambientFx = new AmbientFx(layers);
  /* v2.3.221: FPS counter only mounts with ?dev=1. */
  const _devUI = typeof window !== 'undefined' && /[?&]dev=1\b/.test(window.location.search);
  /* v2.3.1781: minimap lives in the screen-space `hud` layer so it never
     inherits the world's camera transform or WORLD_ZOOM scale. */
  const minimap = new MinimapRenderer(layers.hud, app);
  const fpsOverlay = _devUI ? new FpsOverlay() : null;

  /* v2.3.1670: the village-tileset load that used to sit here is GONE.
     It fetched a 32x32 tileset (grass, dirt, plants) plus 20 building PNGs
     on every startup and handed them to tileRenderer.setAssets(), but the
     branch that drew them — _rebuildWithSprites — was unreachable: it only
     ever applied to town / meadow / farm_home, and all three have painted
     single-image maps, whose path returns before the sprite branch is
     considered.  So this was ~1.4MB downloaded and 23 textures GPU-uploaded
     at startup to render nothing, on a game whose startup memory on iPhone
     is the thing we keep fighting (see the v2.3.1405 per-zone work).
     The art itself was a purchased pixel-art pack from an earlier version of
     the game, fully replaced by the painted maps; it is deleted from the
     repo along with its loader. */

  // Load player sprite sheets (non-blocking — entityRenderer falls back
  // to procedural Graphics on the first few frames before sheets resolve).
  loadPlayerSprites().catch((err) => console.warn('Player sprites failed to load, using procedural fallback:', err));
  // Player death animation — 21-frame transformation (alive -> skeleton -> bone pile).
  loadPlayerDeathSprites().catch((err) => console.warn('Player death sprites failed to load, using fade-rotate fallback:', err));
  // Same for slime monsters (idle / shoot / hit / death / remnants).
  loadSlimeSprites().catch((err) => console.warn('Slime sprites failed to load, using procedural fallback:', err));
  /* v2.3.1406: the snowman kick that lived here (pre-v2.3.1358 legacy) is
     GONE — it decoded the frost-only sheets at startup on every session,
     silently defeating the v2.3.1405 per-zone move.  preloadZoneAssets('frost')
     owns the load now (zone-entry overlay awaits it); the renderer's
     procedural snowman covers any race. */
  /* v2.3.1119: monster variant sheets (fire goblin, mummy, skeleton, ...) now
     load LAZILY per-variant on first sighting (variantSpritesFor kicks the load),
     not as one batched preload at startup.  Town has no monsters, so this keeps
     ~10-20MB of variant textures out of the town session entirely -- they were a
     dead weight on the iPhone's WebGL budget.  Each variant still falls back to
     the base archetype until its sheet lands. */
  // Weapon icons (sword / bow / staff).
  loadWeaponSprites().catch((err) => console.warn('Weapon sprites failed to load, using procedural fallback:', err));
  // Shield (front / 3-quarter / side wood-shield views).
  loadShieldSprites().catch((err) => console.warn('Shield sprites failed to load, using procedural arc fallback:', err));
  // Per-frame hand anchors + weapon grip points.
  loadPlayerAnchors().catch((err) => console.warn('Player anchors failed to load, using procedural fallback:', err));
  /* v2.3.1119: zone maps load PER-ZONE on entry, not all 12 up front.  Each
     1024x1024 map is ~4MB of VRAM decoded; preloading all 12 pinned ~48MB
     resident even in town (you only ever see one zone), a big chunk of the
     iPhone WebGL-budget pressure.  tileRenderer.rebuild() already self-heals a
     cache miss (kicks Assets.load(imageUrl) and swaps the texture in when it
     resolves -- see the single-image zone path), so dropping the bulk preload
     just means the current zone's map loads on entry.  The STARTING zone (town)
     stays gated by preloadStartZoneMap('town') below, so spawn never flashes
     black; other zones paint after a brief first-entry load and stay cached. */

  let currentZone = null;
  let currentMap = null;

  function onZoneChange(map, zoneId, S) {
    if (zoneId === currentZone && map === currentMap) return;
    currentZone = zoneId;
    currentMap = map;
    tileRenderer.rebuild(app, map, zoneId);
    entityRenderer.clear();
    effectsRenderer.clear();
    lightFx.clear();   /* v2.3.2710: last zone's shadows and glints go with its figures */
    ambientFx.setZone(zoneId);   /* v2.3.2762 */
    /* ═══ v2.3.2596: THE ZONE-ENTRY BANNER'S ONE TRIGGER ═══
       This function is the single place in the client that observes every zone
       change, whatever set it -- the hub walk-in, a respawn, the dev warp, a
       dungeon exit -- because it watches S.currentZone rather than trusting any
       one of the nine sites that assign it.  Hooking it here rather than at
       those sites is what stops the banner from being a rule that half of them
       remember.
       It fires for a MAP swap on the same zone too, which is not an entry, so
       the overlay tracks the zone id itself and ignores the repeat.  Failure is
       silent by design: a flourish must never cost the player their zone
       change. */
    try { noteZoneEntered(zoneId, S); } catch (e) { /* never block the zone change */ }
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

    // Resize PixiJS to match the current canvas dimensions when they
    // actually change.  app.renderer.width/.height are stored in
    // logical (CSS) pixels — same units as cssW / cssH — so the
    // earlier `/ dpr` on app.renderer.* was double-counting and made
    // the comparison always-true, firing resize() every frame.
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    if (Math.abs(app.renderer.width - cssW) > 0.5 || Math.abs(app.renderer.height - cssH) > 0.5) {
      app.renderer.resize(cssW, cssH);
    }

    // Detect zone changes
    if (S.currentZone !== currentZone || S.map !== currentMap) {
      onZoneChange(S.map, S.currentZone, S);
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
    /* v2.3.845: publish the world<->screen scale so screen-anchored effects
       (e.g. the catch flight's bag target) can convert CSS px back to world
       coords: screenX = (worldX - camera.x) * scaleX. */
    S._worldScaleX = scaleX;
    S._worldScaleY = scaleY;
    /* v2.3.2262: the in-world TEXT counter-scales against this, so it stays
       readable when the world zooms out (owner).  Published through a setter
       rather than read off S inside entityRenderer, because the plate update
       runs per entity per frame and a module-scope number costs nothing;
       see setPlateZoom for what is compensated and what deliberately is not. */
    try { setPlateZoom(scaleX); } catch (e) { /* renderer must not die for a font size */ }

    // Camera offset: cx/cy are top-left of viewport in world coords.
    // With scale applied, world position X maps to screen position X*scale.
    // We need worldX=cx to map to screen X=0, so: cx*scale + offsetX = 0 → offsetX = -cx*scale
    //
    // We previously Math.round'd these to whole pixels to suppress
    // texture shimmer when the painted maps were 1254 px scaled into
    // 1024 px world bounds.  Now that all map art is native 1024×1024
    // there is no per-frame texture rescale, and rounding is actively
    // harmful: the camera lerps in sub-pixel steps (0.08–0.18 per
    // frame), so a rounded worldContainer.x flips by 1 px in a stutter
    // pattern, dragging the player sprite with it — that 1-px flicker
    // is what reads as frame-rate jitter even at a steady 60 fps.
    // Letting the offset stay fractional moves the whole scene in
    // smooth GPU sub-pixel steps instead.
    worldContainer.x = -cx * scaleX + shakeX;
    worldContainer.y = -cy * scaleY + shakeY;

    // Each renderer wrapped — a single throw in entity or effects
    // (e.g. the bow-kill crash) used to cascade into app.render() never
    // being called, freezing the canvas at the last good frame.  Now
    // failures log once per system and the surviving systems still draw.
    /* Per-stage timing so we can finally see WHICH sub-renderer is the
       meadow bottleneck.  Throttled to one log per 500 ms, only on
       slow total frames (>30 ms).  Logs the worst frame in each window
       to surface real spikes instead of averaging them away. */
    /* Reset stages at frame start so a partial / aborted pass doesn't
       leave the previous frame's values in place — that caused
       confusing attributions like "totalMs 50 / appMs 83" in the
       Perf overlay's long-frame table when a frame that bailed early
       inherited the prior slow frame's appMs reading. */
    if (!update._lastStages) update._lastStages = { tileMs: 0, entityMs: 0, effectsMs: 0, fpsMs: 0, appMs: 0 };
    update._lastStages.tileMs = update._lastStages.entityMs = update._lastStages.effectsMs = update._lastStages.fpsMs = update._lastStages.appMs = 0;

    const _t0 = performance.now();
    /* v2.3.1822: S passed in so the tile pass can read the LIVE quest table
       and paint a locked zone's portal as locked (see tileRenderer). */
    try { tileRenderer.update(cx, cy, viewW, viewH, S); }
    catch (e) { if (!update._tileErr) { update._tileErr = true; console.error('[pixi-render] tileRenderer threw', e && e.message, e && e.stack); } }
    const _t1 = performance.now();
    update._lastStages.tileMs = _t1 - _t0;
    try { entityRenderer.update(S, now); }
    catch (e) { if (!update._entityErr) { update._entityErr = true; console.error('[pixi-render] entityRenderer threw', e && e.message, e && e.stack); } }
    const _t2 = performance.now();
    update._lastStages.entityMs = _t2 - _t1;
    try { effectsRenderer.update(S, cssW, cssH, now); }
    catch (e) { if (!update._effectsErr) { update._effectsErr = true; console.error('[pixi-render] effectsRenderer threw', e && e.message, e && e.stack); } }
    /* v2.3.2811: the world's small motions -- after both renderers have put
       down this frame's props, trees and people (it bends what they placed),
       and before the lights, the depth pass and the shadows, which then see
       a sign where it swung to and a tree where it leaned. */
    try { worldLife.update(S, { cx, cy, viewW, viewH }, now, entityRenderer, effectsRenderer); }
    catch (e) { if (!update._lifeErr) { update._lifeErr = true; console.error('[pixi-render] worldLife threw', e && e.message, e && e.stack); } }
    /* v2.3.2712: after both renderers, so the lights sit on this frame's
       positions and every corpse has been asked for (the sweep drops the
       ones that were not -- the respawned). */
    try { worldFx.update(S, { cx, cy, viewW, viewH, cssW, cssH }, now); }
    catch (e) { if (!update._worldFxErr) { update._worldFxErr = true; console.error('[pixi-render] worldFx threw', e && e.message, e && e.stack); } }
    /* v2.3.2762: after the effects, in the camera's world rect. */
    try { ambientFx.update(S, cx, cy, viewW, viewH, now, canvas); }
    catch (e) { if (!update._ambientErr) { update._ambientErr = true; console.error('[pixi-render] ambientFx threw', e && e.message, e && e.stack); } }
    const _t3 = performance.now();
    update._lastStages.effectsMs = _t3 - _t2;
    /* ═══ v2.3.2635: DEPTH, AFTER EVERYTHING HAS MOVED ═══
       One pass over the two sorted layers, here rather than inside either
       renderer, because BOTH of them place things that stand on the ground:
       entityRenderer puts down the monsters, npcs, peers, pet and props, and
       effectsRenderer puts down the trees and ore right after it. Bucketing
       at the end of entityRenderer would have sorted the nodes on last
       frame's positions -- a frame of lag that shows up as a flicker exactly
       when the player crosses something, which is the one moment this
       feature exists for. */
    /* v2.3.2748: ...pivoting on the player's FEET, not S.player.y.  The
       position is the body's centre and the boots are drawn ~52 px lower, so
       a prop whose base fell between the two was drawn over a player standing
       visibly in front of it (owner: "really bad at detecting contact").  The
       x says where along a building's base to read it (propGround.js). */
    try {
      const _pd = entityRenderer.playerDisplay;
      let _pgy = _pd && !_pd.destroyed ? figureFeetY(_pd)
        : (S.player ? S.player.y + playerGroundDy(S.currentZone, S.player.x, S.player.y) : NaN);
      let _pgx = _pd && !_pd.destroyed ? _pd.x : (S.player ? S.player.x : NaN);
      _playerGround.x = _pgx; _playerGround.y = _pgy;
      /* QA only (mp-propdepth's before/after pictures): the v2.3.2711 rule --
         the body centre, and every prop on one flat line -- on the same frame */
      if (_depthProbe.legacy && S.player) { _pgy = S.player.y; _pgx = NaN; }
      applyDepthBuckets(layers.entities, layers.gatherNodesFront, _pgy, _pgx);
    }
    catch (e) { if (!update._depthErr) { update._depthErr = true; console.error('[pixi-render] depth sort threw', e && e.message); } }
    /* v2.3.2710: light and shine, LAST of the world passes: a shadow copies
       each figure's pieces where they are THIS frame, so it runs after
       everything that moves them -- the entity pass, the stand-ins placed by
       the effects pass, and the depth pass that re-parents occluders.  One
       boolean read when the switch is off (lightFx.js). */
    /* v2.3.2767: the combat / gathering stand-ins take the figure shade too */
    try { markStandIns(effectsRenderer, SELF_STAND_IN_FIELDS, PEER_STAND_IN_MAPS); } catch (e) { /* never break a frame */ }
    try { lightFx.update(S, now, entityRenderer, effectsRenderer); }
    catch (e) { if (!update._lightErr) { update._lightErr = true; console.error('[pixi-render] lightFx threw', e && e.message, e && e.stack); } }
    try { minimap.update(S, cssW, cssH, canvas); }
    catch (e) { if (!update._miniErr) { update._miniErr = true; console.error('[pixi-render] minimap threw', e && e.message, e && e.stack); } }

    if (fpsOverlay) fpsOverlay.update(now);
    const _t4 = performance.now();
    update._lastStages.fpsMs = _t4 - _t3;

    // Manual render
    try { app.render(); }
    catch (e) { if (!update._renderErr) { update._renderErr = true; console.error('[pixi-render] app.render threw', e && e.message, e && e.stack); } }
    const _t5 = performance.now();
    update._lastStages.appMs = _t5 - _t4;

    const _renderTotal = _t5 - _t0;
    if (!update._pp) update._pp = { lastT: 0, worst: 0, tile: 0, entity: 0, effects: 0, fps: 0, render: 0, monsters: 0 };
    if (_renderTotal > 30 && _renderTotal > update._pp.worst) {
      update._pp.worst   = _renderTotal;
      update._pp.tile    = _t1 - _t0;
      update._pp.entity  = _t2 - _t1;
      update._pp.effects = _t3 - _t2;
      update._pp.fps     = _t4 - _t3;
      update._pp.render  = _t5 - _t4;
      update._pp.monsters = (S.monsters && S.monsters.length) || 0;
    }
    if (_t5 - update._pp.lastT > 500 && update._pp.worst > 30) {
       
      console.warn('[bt-render-split]', {
        totalMs:    +update._pp.worst.toFixed(1),
        tileMs:     +update._pp.tile.toFixed(1),
        entityMs:   +update._pp.entity.toFixed(1),
        effectsMs:  +update._pp.effects.toFixed(1),
        fpsMs:      +update._pp.fps.toFixed(1),
        appRenderMs:+update._pp.render.toFixed(1),
        monsters:   update._pp.monsters,
        zone:       S.currentZone,
      });
       
      update._pp.lastT = _t5;
      update._pp.worst = 0;
    }
  }

  function destroy() {
    tileRenderer.destroy();
    entityRenderer.clear();
    effectsRenderer.clear();
    lightFx.clear();   /* v2.3.2710 */
    try { minimap.destroy(); } catch (e) {}
    if (fpsOverlay) fpsOverlay.destroy();
    app.destroy(false, { children: true });
  }

  return {
    app,
    canvas: app.canvas,
    update,
    onZoneChange,
    destroy,
    /* v2.3.771: rebuild the current zone's tiles in place -- called on
       tab-resume (iOS freezes background tabs and often reclaims the GPU
       context; after restore the tile buffers can be stale/black). */
    forceRefresh: () => {
      try {
        if (currentZone && currentMap) tileRenderer.rebuild(app, currentMap, currentZone);
      } catch (e) { /* best-effort */ }
    },
    /* v2.3.113: expose immediate-dispose for a single loot pile.
       BroTown's loot_credit / loot_despawn handlers call this so
       the Pixi children tear down the same tick the pile is
       claimed, instead of waiting one frame for the orphan sweep. */
    disposeLootById: (lootId) => effectsRenderer.disposeLootById(lootId),
    /* v2.3.1682: read-only probe of the in-world player HP bar, for the QA
       harness.  The contextual-display rule (reveal on damage or healing,
       always fade back out) is a fade played out over time against state
       that lives on the Pixi display object -- reading window._gameState
       cannot see it, so a test can only check what the renderer actually
       put on screen.  Returns nothing the game itself consumes. */
    hudHpProbe: () => {
      const pd = entityRenderer.playerDisplay;
      const ring = pd && pd._hudHpRing;
      if (!ring) return null;
      return {
        alpha: ring.alpha,
        barAlpha: pd._hudHpBarFrame ? pd._hudHpBarFrame.alpha : 0,
        fillAlpha: pd._hudHpBarFill ? pd._hudHpBarFill.alpha : 0,
        eventAt: ring._hpEventAt || 0,
        lastHp: ring._lastHpCur,
      };
    },
    /* v2.3.1715: read-only probe of the firemaking stand-in's four layers, for
       the QA harness — the same shape and the same reason as hudHpProbe above
       (v2.3.1682).  This pose replaced its art wholesale and gained two armour
       layers, and "did the plate draw" is a fact about Pixi display objects:
       window._gameState cannot see a sprite's texture frame, and a screenshot
       cannot tell a MISSING sheet from one that landed off the body — which is
       exactly the distinction this change needs to be able to make.  Returns
       nothing the game consumes. */
    /* v2.3.1765: read-only probe of the monster spawn-in flourish.  Owner:
       "showing a tiny white silhouette grow and then match the outline of the
       monster then become the monster."  Whether a sprite is currently a
       white silhouette is a fact about a filter and a scale on a display
       object — a screenshot can see a pale blob but cannot tell it from a
       monster that simply has not loaded its art. */
    /* v2.3.1824: read-only probe of where a slime is actually DRAWN.
       Owner: "the hitbox for the slime is way off.  All hitboxes need to be
       based on where the actual base of where the sprite is shown in the
       game."  Whether the blob's base lands on the monster's own y is a fact
       about a Pixi anchor, a scale and two container transforms; a
       screenshot can see a slime and a coin pile but cannot say which of
       them is in the wrong place, and window._gameState cannot see a sprite
       at all.  Reports the geometry and lets the test do the arithmetic. */
    slimeBaseProbe: () => {
      const out = [];
      for (const [id, d] of entityRenderer.monsterDisplays) {
        if (!d || !d._isFodder) continue;
        const sb = d._spriteBody;
        if (!sb || !sb.visible || !sb.texture || !sb.texture.height) continue;
        out.push({
          id,
          worldY: d.y,
          anchorY: sb.anchor.y,
          sbY: sb.y,
          texH: sb.texture.height,
          scaleY: Math.abs(sb.scale.y),
          containerScaleY: d.scale.y,
          state: d._slimeState || null,
        });
      }
      return out;
    },
    spawnFxProbe: () => {
      const out = [];
      for (const [id, d] of entityRenderer.monsterDisplays) {
        if (!d) continue;
        out.push({
          id, spawning: !!d._spawnAt, visible: !!d.visible,
          scale: +d.scale.x.toFixed(3),
          filtered: !!(d.filters && d.filters.length),
          alpha: +d.alpha.toFixed(2),
          hpUi: !!(d._hpUi && d._hpUi.visible),
        });
      }
      return out;
    },
    /* v2.3.1765: read-only probe of the arrows drawn on the last frame.
       Owner: "arrows should not show the tips when they've reached their
       destination (like the arrowhead should be stuck in the material)."
       Reports how many arrows were painted and how many of them kept a head,
       so a test can assert the RATIO rather than hunt for brown pixels — a
       pixel search cannot tell a buried head from an arrow that was never
       drawn at all, and that is precisely what this change turns on. */
    arrowProbe: () => ({
      arrows: effectsRenderer._arrowsDrawn || 0,
      heads: effectsRenderer._arrowHeadsDrawn || 0,
      /* v2.3.1915: how many of those were drawn UNDER the player, and which
         container each pool hangs off. A screenshot cannot tell an arrow
         behind the boots from one in front of them at this size, and the
         layer name is the fact the fix actually turns on. */
      ground: effectsRenderer._groundArrowsDrawn || 0,
      groundLayer: effectsRenderer.groundArrowLayer && effectsRenderer.groundArrowLayer.label || null,
      flyingLayer: effectsRenderer.projectileLayer && effectsRenderer.projectileLayer.label || null,
      /* v2.3.2381: the BOW SPECIAL's own pair.  It is a pooled Sprite from a
         painted sheet, not a Graphics polygon, so `arrows`/`heads` above --
         which _drawArrow owns -- can never see it, and three shipped
         assertions read those two. Separate fields keep both readable. */
      specials: effectsRenderer._specialArrowsDrawn || 0,
      specialHeads: effectsRenderer._specialArrowHeads || 0,
    }),
    /* v2.3.1765: read-only probe of the name plate's position relative to the
       character, for the QA harness.  Owner: "Move the standing nameplate down
       about 3-10 pixels it overlaps the character feet right now."
       The reported defect is an OVERLAP, so that is what this measures — the
       gap between the bottom of the body and the top of the plate, in screen
       pixels.  Asserting the literal y offset instead would pin a number
       without pinning the property: the plate sits inside a container the zone
       can scale, and the boots reach further on some frames than the nominal
       foot offset the code comments quote, which is how six pixels of designed
       clearance became an overlap in the first place.
       The plate is hidden for one synchronous measurement so the body's bounds
       exclude it, then restored before returning — no frame renders in
       between, so nothing is visible to the player. */
    /* v2.3.1826: read-only probe of HOW BIG the player is actually drawn, per
       facing.  Owner: "Character's size is inconsistent across different
       directions (east, southwest, etc).  I don't know the best way to fix
       that."

       This cannot be answered from the sheets alone: between the PNG and the
       screen sit an on-disk downscale (DISPLAY_DS), an upscale back to the
       authored frame height, a per-(pose,dir) normalisation table, LOCAL_SCALE,
       PLAYER_SIZE_MULT and the zone's player scale.  And it cannot be answered
       from getBounds() either — a player cell is fixed-size with transparent
       margin under the boots, so bounds measure the CELL, not the figure.

       So: read the texture's own pixels for the frame currently on screen,
       find the painted crown and feet rows, and convert to screen px through
       the live transform.  That is the figure height a person actually sees. */
    bodyFigureProbe: () => {
      const pd = entityRenderer.playerDisplay;
      const sb = pd && pd._spriteBody;
      if (!pd || !sb || !sb.visible || !sb.texture) return null;
      const tex = sb.texture;
      const src = tex.source && tex.source.resource;
      if (!src) return { err: 'texture source is not readable' };
      const fr = tex.orig || tex.frame || { x: 0, y: 0, width: tex.width, height: tex.height };   /* v2.3.2791: the WHOLE frame -- body frames are cropped */
      let painted;
      try {
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(fr.width));
        cv.height = Math.max(1, Math.round(fr.height));
        const c = cv.getContext('2d', { willReadFrequently: true });
        drawGearFrame(c, tex, 0, 0, cv.width, cv.height);   /* v2.3.2791: places a cropped frame at its trim */
        const p = c.getImageData(0, 0, cv.width, cv.height).data;
        let top = -1, bot = -1, l = cv.width, r = -1;
        for (let y = 0; y < cv.height; y++) {
          for (let x = 0; x < cv.width; x++) {
            if (p[(y * cv.width + x) * 4 + 3] < 24) continue;
            if (top < 0) top = y;
            bot = y;
            if (x < l) l = x;
            if (x > r) r = x;
          }
        }
        painted = { top, bot, l, r, h: bot - top + 1, w: r - l + 1, cellH: cv.height, cellW: cv.width };
      } catch (e) {
        return { err: 'texture is tainted or unreadable: ' + (e && e.message) };
      }
      /* What ONE texture pixel is worth on screen, measured through the whole
         chain rather than multiplied out of the factors by hand — that is the
         arithmetic this probe exists to avoid trusting. */
      const unitY = sb.toGlobal({ x: 0, y: 1 }).y - sb.toGlobal({ x: 0, y: 0 }).y;
      return {
        facing: pd._lastFacingKey || null,
        pose: pd._lastPoseKey || null,
        painted,
        /* v2.3.1832: WHICH FRAME OF THE CYCLE THIS IS.  The run cycle bobs the
           figure between ~68 and ~83 screen px, so a caller that samples on a
           timer is really sampling the bob, and 14 shots leave ~1% of error in
           the median — enough that southeast and southwest, which are ONE
           sheet mirrored and therefore identical by construction, read 1%
           apart.  Reporting the frame lets a caller cover the cycle by index
           and take a converged median instead of hoping. */
        /* v2.3.2791: a cropped frame carries its number (__btIx, gearSheets
           sliceCropped); frame.x / frame.width only encodes it for a plain strip.
           frameW stays the WHOLE frame's width, as it always meant. */
        frameIx: (sb.texture && sb.texture.__btIx != null) ? sb.texture.__btIx
          : ((sb.texture && sb.texture.frame && sb.texture.frame.width)
            ? Math.round(sb.texture.frame.x / sb.texture.frame.width) : 0),
        frameW: (sb.texture && (sb.texture.orig || sb.texture.frame)) ? (sb.texture.orig || sb.texture.frame).width : 0,
        unitPxY: +unitY.toFixed(5),
        figurePx: +(painted.h * unitY).toFixed(2),
        widthPx: +(painted.w * unitY).toFixed(2),
        /* Where the boots land on screen, relative to the display's origin —
           a figure that changes height about a fixed centre also moves its
           feet, which reads as the character bobbing as it turns. */
        feetOffsetPx: +((painted.bot - (painted.cellH - 1) / 2) * unitY).toFixed(2),
        spriteScaleY: +sb.scale.y.toFixed(5),
        /* v2.3.1826: the worn traits, in the SAME screen units, so a test can
           check that a hat keeps its proportion to the body across facings —
           the owner's actual constraint on the size fix ("without breaking
           anything else (relative item scale like hats, beards, etc)"). */
        hatPx: pd._headwearSprite && pd._headwearSprite.visible
          ? +(pd._headwearSprite.getBounds().height).toFixed(2) : 0,
        beardPx: pd._facialHairSprite && pd._facialHairSprite.visible
          ? +(pd._facialHairSprite.getBounds().height).toFixed(2) : 0,
        /* The trait's scale AGAINST the body's, which is the invariant that
           actually matters: hat-height / body-height varies between facings
           because each facing's hat ART has its own frame size, and that is
           authored, not a bug.  What must never change is that the trait is
           scaled BY the body — so this ratio is what a body-scale edit is
           tested against.  Absolute values: scale.x carries the mirror sign,
           and west is east flipped. */
        hatScaleRatio: pd._headwearSprite && pd._headwearSprite.visible && sb.scale.y
          ? +(Math.abs(pd._headwearSprite.scale.y) / Math.abs(sb.scale.y)).toFixed(5) : 0,
        beardScaleRatio: pd._facialHairSprite && pd._facialHairSprite.visible && sb.scale.y
          ? +(Math.abs(pd._facialHairSprite.scale.y) / Math.abs(sb.scale.y)).toFixed(5) : 0,
        /* v2.3.2361: the eyewear, by the same two measures -- it is the most
           placement-sensitive head trait there is (two pixels off reads as
           "on the forehead"), so a scenario has to be able to read it. */
        eyewearPx: pd._eyewearSprite && pd._eyewearSprite.visible
          ? +(pd._eyewearSprite.getBounds().height).toFixed(2) : 0,
        eyewearScaleRatio: pd._eyewearSprite && pd._eyewearSprite.visible && sb.scale.y
          ? +(Math.abs(pd._eyewearSprite.scale.y) / Math.abs(sb.scale.y)).toFixed(5) : 0,
        /* v2.3.2643: the eye style, by the same two measures as the eyewear
           above it -- it is the other face layer, and the one most likely to
           show a placement slip, because a sprite that is 2px off the eye row
           reads as a second pair of eyes rather than as a nudged hat. */
        eyeStylePx: pd._eyeStyleSprite && pd._eyeStyleSprite.visible
          ? +(pd._eyeStyleSprite.getBounds().height).toFixed(2) : 0,
        eyeStyleScaleRatio: pd._eyeStyleSprite && pd._eyeStyleSprite.visible && sb.scale.y
          ? +(Math.abs(pd._eyeStyleSprite.scale.y) / Math.abs(sb.scale.y)).toFixed(5) : 0,
      };
    },
    /* v2.3.1882: where the block pieces sit in the PLAYER DISPLAY'S OWN local
       space — the space SOUTH_BLOCK_OFFHAND.x/y are written in.  Tuning that
       constant off a screenshot means dividing out the world scale and the
       device ratio by hand, twice, and the shield is drawn at a size that
       makes an eyeballed answer look plausible while being wrong.  This
       reports the head and torso in the units the constant uses, so a
       placement can be stated as "below the chin, right of the ribs" and
       checked as a number. */
    /* v2.3.1887: the raw player display, for a QA pass that needs to walk
       its children.  Read-only use only — this hands out the live container,
       so a scenario that mutated it would be testing its own edit. */
    playerDisplayRaw: () => entityRenderer.playerDisplay || null,
    /* v2.3.2863: a peer's SWING or BOW stand-in body sprite (kind 'sword' /
       'bow'), for mp-peerattackink -- it reads the frame the renderer draws.
       Read-only, same rule as above. */
    remoteAttackSpriteRaw: (id, kind) => {
      const pool = kind === 'bow' ? effectsRenderer._remoteBowSprites : effectsRenderer._remoteSwordSprites;
      const set = pool && pool.get(id);
      return (set && set.body) || null;
    },
    /* v2.3.2863: the baked frames themselves for peer state `o` (kind 'sword' /
       'bow', the SHEET's facing key, plain or pre-flipped) -- the same call the
       renderer makes, so a scenario can compare a frame with its mirror
       directly instead of hoping to catch both on screen. */
    remoteAttackBake: (o, kind, cfgKey, mirror) => {
      const e = effectsRenderer;
      const cfg = ((kind === 'bow' ? e._bowCfg : e._swordCfg) || {})[cfgKey];
      return (o && cfg && cfg.bodyUrl) ? e._remoteBodyFramesFor(o, cfgKey, cfg, !!mirror) : null;
    },
    /* v2.3.2854: the same, for ANOTHER player's figure -- mp-harvestink reads
       which frame a peer is drawn from while they fish.  Read-only, same rule. */
    peerDisplayRaw: (id) => (entityRenderer.otherPlayerDisplays && entityRenderer.otherPlayerDisplays.get(id)) || null,
    /* v2.3.2078: what the pet display is doing — the pet was invisible
       for its whole life and nothing could see that. */
    petDrawn: () => entityRenderer.petDrawn(),
    blockGeomProbe: () => {
      const pd = entityRenderer.playerDisplay;
      const sb = pd && pd._spriteBody;
      if (!pd || !sb || !sb.texture) return null;
      const tex = sb.texture;
      const src = tex.source && tex.source.resource;
      if (!src) return { err: 'texture source is not readable' };
      const fr = tex.orig || tex.frame || { x: 0, y: 0, width: tex.width, height: tex.height };   /* v2.3.2791: the WHOLE frame -- body frames are cropped */
      let painted = null;
      try {
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(fr.width));
        cv.height = Math.max(1, Math.round(fr.height));
        const c = cv.getContext('2d', { willReadFrequently: true });
        drawGearFrame(c, tex, 0, 0, cv.width, cv.height);   /* v2.3.2791: places a cropped frame at its trim */
        const p = c.getImageData(0, 0, cv.width, cv.height).data;
        let top = -1, bot = -1, l = cv.width, r = -1;
        /* Widest painted row, which on these sheets is the shoulders — the
           landmark that separates "head" from "torso" without needing to know
           anything about the drawing. */
        let bestRow = -1, bestW = -1;
        for (let y = 0; y < cv.height; y++) {
          let rl = -1, rr = -1;
          for (let x = 0; x < cv.width; x++) {
            if (p[(y * cv.width + x) * 4 + 3] < 24) continue;
            if (rl < 0) rl = x;
            rr = x;
          }
          if (rl < 0) continue;
          if (top < 0) top = y;
          bot = y;
          if (rl < l) l = rl;
          if (rr > r) r = rr;
          if (rr - rl > bestW) { bestW = rr - rl; bestRow = y; }
        }
        painted = { top, bot, l, r, shoulderRow: bestRow, shoulderW: bestW,
          cellH: cv.height, cellW: cv.width };
      } catch (e) {
        return { err: 'texture is tainted or unreadable: ' + (e && e.message) };
      }
      /* Texture px -> display-local units, straight off the sprite's own
         transform rather than multiplied out by hand. */
      const kx = Math.abs(sb.scale.x), ky = Math.abs(sb.scale.y);
      const cx = (painted.cellW - 1) / 2, cy = (painted.cellH - 1) / 2;
      const loc = (tx, ty) => ({ x: +((tx - cx) * kx + sb.x).toFixed(1),
        y: +((ty - cy) * ky + sb.y).toFixed(1) });
      const sh = pd._shieldSprite;
      const wc = pd._weaponContainer, ws = pd._weaponSprite;
      return {
        facing: pd._lastFacingKey || null,
        pose: pd._lastPoseKey || null,
        crown: loc(cx, painted.top),                    /* top of the head */
        chin: loc(cx, painted.shoulderRow),             /* where shoulders start */
        feet: loc(cx, painted.bot),
        bodyLeft: loc(painted.l, painted.shoulderRow).x,
        bodyRight: loc(painted.r, painted.shoulderRow).x,
        shield: sh && sh.visible
          ? { x: +sh.x.toFixed(1), y: +sh.y.toFixed(1),
            w: +sh.width.toFixed(1), h: +sh.height.toFixed(1) } : null,
        weapon: ws && ws.visible
          ? { x: +ws.x.toFixed(1), y: +ws.y.toFixed(1),
            w: +ws.width.toFixed(1), h: +ws.height.toFixed(1),
            containerX: wc ? +wc.x.toFixed(1) : null, containerY: wc ? +wc.y.toFixed(1) : null } : null,
      };
    },
    namePillProbe: () => {
      const pd = entityRenderer.playerDisplay;
      const pill = pd && pd._namePill;
      if (!pd || !pill) return null;
      const pb = pill.getBounds();
      const wasVisible = pill.visible;
      pill.visible = false;
      const bb = pd.getBounds();
      pill.visible = wasVisible;
      /* The character's anchor in screen space.  `dropBelowAnchor` is the
         number the fix actually moves, in the units the owner's "3-10 pixels"
         is written in — container units times whatever the zone scales the
         player by. */
      const origin = pd.toGlobal({ x: 0, y: 0 });
      return {
        pillVisible: wasVisible,
        /* The authored offset, in container units — the number the fix moves. */
        pillLocalY: pill.y,
        /* What ONE container unit is worth in screen pixels, measured through
           the whole chain rather than read off pd.scale — the player display's
           own scale is only half of it, the world container carries the camera
           zoom as well (0.8 here), which is why 38 units land 30.4px down. */
        unitPx: +(pd.toGlobal({ x: 0, y: 1 }).y - pd.toGlobal({ x: 0, y: 0 }).y).toFixed(4),
        displayScale: +pd.scale.y.toFixed(4),
        /* Measured from the pill's OWN origin, not from its bounds: bounds
           include content extents (the level line, the badge slot) and sat 8px
           above the origin, which read as the transform losing 8 pixels when
           nothing was losing anything. */
        dropBelowAnchor: +(pill.toGlobal({ x: 0, y: 0 }).y - origin.y).toFixed(1),
        paintedTopDrop: +(pb.y - origin.y).toFixed(1),
        pillTop: +pb.y.toFixed(1), pillBottom: +(pb.y + pb.height).toFixed(1),
        /* Diagnostics only — see the note in mp-hpbar on why the plate is NOT
           asserted against these.  A player sheet is a fixed-size cell with
           transparent margin under the boots, so bodyBottom is the bottom of
           the CELL, several pixels below the lowest painted pixel. */
        bodyTop: +bb.y.toFixed(1), bodyBottom: +(bb.y + bb.height).toFixed(1),
        boxGap: +(pb.y - (bb.y + bb.height)).toFixed(1),
      };
    },
    /* ═══ v2.3.1953: BUILD PROBE ═══
       Height and frame are a non-uniform scale on the display container, and
       every claim the feature makes is a fact about a transform that no
       screenshot and no game-state read can settle:
         - is the figure actually 13% taller and 17% wider, ON SCREEN;
         - do the BOOTS stay where the server says the player is (the scale is
           about the sprite's centre, so growth has to be compensated or a tall
           bro sinks into the floor);
         - and is the name plate the SAME SIZE on every build (it rides
           _uiLayer, which carries the inverse).
       `peerName` reports the same three for one remote player instead, which
       is how a scenario checks that a build survived the wire rather than
       just the store.  Read-only; returns null when there is nothing to
       measure. */
    buildProbe: (peerName) => {
      let pd = entityRenderer.playerDisplay;
      if (peerName) {
        pd = null;
        for (const d of entityRenderer.otherPlayerDisplays.values()) {
          if (d && d._pillName && d._pillName.text
              && String(d._pillName.text).indexOf(peerName) >= 0) { pd = d; break; }
        }
      }
      if (!pd) return null;
      const sb = pd._spriteBody;
      const ui = pd._uiLayer;
      const pill = pd._namePill;
      /* Screen pixels per ONE container unit, measured through the live
         transform chain (which carries the camera zoom as well) rather than
         multiplied out of the factors by hand. */
      const o = pd.toGlobal({ x: 0, y: 0 });
      const unitX = pd.toGlobal({ x: 1, y: 0 }).x - o.x;
      const unitY = pd.toGlobal({ x: 0, y: 1 }).y - o.y;
      let fig = null;
      if (sb && sb.texture && sb.texture.source && sb.texture.source.resource) {
        const tex = sb.texture;
        const fr = tex.orig || tex.frame || { x: 0, y: 0, width: tex.width, height: tex.height };   /* v2.3.2791: the WHOLE frame -- body frames are cropped */
        try {
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(fr.width));
          cv.height = Math.max(1, Math.round(fr.height));
          const c = cv.getContext('2d', { willReadFrequently: true });
          drawGearFrame(c, tex, 0, 0, cv.width, cv.height);   /* v2.3.2791: places a cropped frame at its trim */
          const px = c.getImageData(0, 0, cv.width, cv.height).data;
          let top = -1, bot = -1, l = cv.width, r = -1;
          for (let y = 0; y < cv.height; y++) {
            for (let x = 0; x < cv.width; x++) {
              if (px[(y * cv.width + x) * 4 + 3] < 24) continue;
              if (top < 0) top = y;
              bot = y; if (x < l) l = x; if (x > r) r = x;
            }
          }
          /* sb carries the body's own scale on top of the container's, so
             these are converted through sb rather than through pd. */
          const sUnitX = sb.toGlobal({ x: 1, y: 0 }).x - sb.toGlobal({ x: 0, y: 0 }).x;
          const sUnitY = sb.toGlobal({ x: 0, y: 1 }).y - sb.toGlobal({ x: 0, y: 0 }).y;
          fig = {
            heightPx: +((bot - top + 1) * Math.abs(sUnitY)).toFixed(2),
            widthPx: +((r - l + 1) * Math.abs(sUnitX)).toFixed(2),
            /* Absolute screen y of the lowest painted row — the boots. */
            feetScreenY: +(sb.toGlobal({ x: 0, y: bot - (cv.height - 1) / 2 }).y).toFixed(2),
          };
        } catch (e) { fig = { err: 'texture unreadable' }; }
      }
      return {
        scaleX: +pd.scale.x.toFixed(5), scaleY: +pd.scale.y.toFixed(5),
        uiScaleX: ui ? +ui.scale.x.toFixed(5) : null,
        uiScaleY: ui ? +ui.scale.y.toFixed(5) : null,
        /* What the container's scale is worth on screen — scaleX/scaleY times
           the camera, which is what the eye actually sees. */
        unitPxX: +unitX.toFixed(5), unitPxY: +unitY.toFixed(5),
        /* The plate's ACCUMULATED transform, not its painted bounds.  Bounds
           depend on the NAME in it — "Ref" and "Bigg" make different-width
           plates for reasons that have nothing to do with build — so comparing
           two players' plate widths measures their names.  The world transform
           is what "is it stretched" actually asks: it must be the plain zone
           scale on every build, with the container's non-uniform part fully
           cancelled by _uiLayer. */
        pillScaleX: pill ? +pill.worldTransform.a.toFixed(5) : null,
        pillScaleY: pill ? +pill.worldTransform.d.toFixed(5) : null,
        pillW: pill && pill.visible ? +pill.getBounds().width.toFixed(2) : null,
        pillH: pill && pill.visible ? +pill.getBounds().height.toFixed(2) : null,
        originScreenY: +o.y.toFixed(2),
        /* ── the boots, against the position the SERVER knows ──
           The container's origin is the sprite's centre and is nudged upward
           to absorb the build's growth (see _applyBuildScale), so the boots'
           offset from the ORIGIN necessarily grows with the scale.  The claim
           being tested is the other one: that the boots land the same distance
           below the player's WORLD y whatever the build.  Both numbers are in
           the parent's (world) space so they subtract cleanly. */
        worldY: (() => {
          try {
            const S = window._gameState && window._gameState.current;
            if (!S) return null;
            if (!peerName) return S.player ? +(S.player.y).toFixed(2) : null;
            const o2 = Object.values(S.others || {})
              .find((x) => x && String(x.name || '').indexOf(peerName) >= 0);
            return o2 ? +((o2.renderY != null ? o2.renderY : o2.y)).toFixed(2) : null;
          } catch (e) { return null; }
        })(),
        feetWorldY: (fig && sb && !fig.err)
          ? +(pd.parent.toLocal({ x: 0, y: fig.feetScreenY }).y).toFixed(2) : null,
        fig,
      };
    },
    /* v2.3.1765: read-only probe of WHICH LAYER the extraction cue draws on,
       for the QA harness — same shape and same reason as the two probes above.
       "Is the white gesture in front of the tree" is a depth fact about the
       scene graph, and neither window._gameState nor a screenshot can settle
       it: a pixel test cannot tell a cue drawn behind a canopy from a cue that
       was never drawn at all, which is the exact distinction this change
       makes.
       Reports the cue's layer plus the world's layer ORDER, so the harness
       compares the cue against where the trees actually are that frame (read
       off a live node's own sprite, which is where the tree's parent lives)
       instead of trusting a hard-coded name on either side. */
    cueLayerProbe: () => {
      const e = effectsRenderer;
      /* _cueDrawnOn, not cueGfx: the question is where the cue was PAINTED on
         the last frame that painted one, and those are different facts —
         see the note at its assignment in effectsRenderer. */
      const drawn = e._cueDrawnOn || null;
      const cueParent = drawn ? drawn.parent : null;
      const world = cueParent ? cueParent.parent : null;
      return {
        cueLayer: cueParent ? cueParent.label : null,
        nodeGfxLayer: e.nodeGfx && e.nodeGfx.parent ? e.nodeGfx.parent.label : null,
        /* every world layer, bottom-first: index in this array IS the depth */
        order: world ? world.children.map((c) => c.label) : [],
      };
    },
    fireGearProbe: () => {
      const e = effectsRenderer;
      const one = (sp) => (sp ? {
        visible: sp.visible,
        tex: sp.texture && sp.texture.frame
          ? { x: sp.texture.frame.x, y: sp.texture.frame.y, w: sp.texture.frame.width, h: sp.texture.frame.height } : null,
        x: +sp.x.toFixed(1), y: +sp.y.toFixed(1), scale: +sp.scale.y.toFixed(4), tint: sp.tint,
      } : null);
      return {
        /* v2.3.1749: published so the harness stops keeping its own copy of
           the cadence — it had a hard-coded 200 that the 3x speed-up broke. */
        frameMs: FIRE_FRAME_MS,
        frames: e._fireFrames ? e._fireFrames.length : 0,
        body: one(e.fireSprite), legs: one(e.fireLegsSprite),
        shirt: one(e.fireShirtSprite), chest: one(e.fireChestSprite),
        order: ['fireSprite', 'fireLegsSprite', 'fireShirtSprite', 'fireChestSprite']
          .map((k) => (e[k] && e[k].parent ? e[k].parent.getChildIndex(e[k]) : -1)),
      };
    },
    /* ═══ v2.3.1751: THE POOLS THE SOAK COULD NOT SEE ═══
       mp-soak.mjs states its own coverage limit in as many words: the per-
       entity display pools live on the entity/effects sub-renderers, which
       initPixiRenderer keeps in CLOSURE, "so this probe cannot count them, and
       a leak confined to those maps would pass here."  The owner has now
       reported the slowdown twice, the second time after "lots of monster
       killing" — which is exactly what churns monsterDisplays — so the blind
       spot is where the search has to go.  That note says to expose them
       behind the autotest surface rather than widening the scene walk; this is
       that.  Counts only, read-only, consumed by nothing in the game. */
    poolSizesProbe: () => {
      const e = effectsRenderer, n = entityRenderer;
      const size = (m) => (m && typeof m.size === 'number' ? m.size : null);
      const out = {
        monsterDisplays: size(n && n.monsterDisplays),
        otherPlayerDisplays: size(n && n.otherPlayerDisplays),
        npcDisplays: size(n && n.npcDisplays),
        chatTexts: size(e && e.chatTexts),
        remoteSlashSprites: size(e && e._remoteSlashSprites),
        remoteSkillSprites: size(e && e._remoteSkillSprites),
        remoteSwordSprites: size(e && e._remoteSwordSprites),
        remoteBowSprites: size(e && e._remoteBowSprites),
        remoteBodyCache: size(e && e._remoteBodyCache),
        remoteSheetCache: size(e && e._remoteSheetCache),
      };
      for (const k of Object.keys(out)) if (out[k] === null) delete out[k];
      return out;
    },
    /* v2.3.1749: read-only probe of a PEER's gathering stand-in, for the QA
       harness — sibling of fireGearProbe above and added for the same reason.
       The question "does another player's firemaking play once, in order, or
       does it wrap" is a fact about a frame index living in a renderer
       closure; a screenshot cannot separate it from the terrain, and the game
       consumes nothing here. */
    /* v2.3.2279: the bow special's blast -- how many are playing and how wide
       each is DRAWN.  A screenshot cannot tell a 440px fireball from a 220px
       one against unfamiliar ground, and the whole point of the mirror-pin
       between arrowblast.js RADIUS and the client's TARGET_PERIMETER_PX is
       that the ring drawn is the ring the worker hit. */
    arrowBlastProbe: () => effectsRenderer.arrowBlastProbe(),
    projScaleProbe: () => effectsRenderer.projScaleProbe(),   /* v2.3.2287 */
    remoteSkillProbe: (id) => {
      const e = effectsRenderer;
      const pool = e._remoteSkillSprites;
      const ent = pool && pool.get(id);
      if (!ent) return null;
      return {
        code: ent._exCode || null,
        frame: typeof ent._fi === 'number' ? ent._fi : null,
        base: typeof ent._base === 'number' ? ent._base : null,
        count: typeof ent._specLen === 'number' ? ent._specLen : null,
        startedAt: ent._exStart || 0,
        visible: !!(ent[ent._exCode] && ent[ent._exCode].visible),
        /* v2.3.2273: the peer figure's DRAWN size.  The chop height lived as a
           literal in two places and drifted for ~230 versions -- a peer's
           lumberjack 18% larger than your own, which single-client QA cannot
           see.  Both sites now share CHOP_STANDIN_H; this is what lets a test
           say so, by comparing against the local __btChopFigure(). */
        scaleY: (ent[ent._exCode] && ent[ent._exCode].scale) ? ent[ent._exCode].scale.y : null,
        /* v2.3.2303: the peer's CLOTHES.  Until this version the gear block was
           gated `if (code === 'fire')`, so a peer cooking or chopping was drawn
           bare-chested while their own screen composited all three layers --
           the owner's "items missing on other characters during certain
           animations that don't appear missing on your own screen".
           `hasTex` is separate from `visible` on purpose and is the assertion
           that actually bites: a recoloured set resolves through gearArt to its
           donor art, and a call site that built a URL from the raw equip id
           404s SILENTLY and draws nothing -- while a tint applied to that empty
           sprite still reports the right colour (the v2.3.1772 trap, where a
           passing test measured colour on an invisible strip). */
        gear: ent.gear ? {
          legs: { visible: !!ent.gear.legs.visible, hasTex: !!(ent.gear.legs.texture && ent.gear.legs.texture.frame), tint: ent.gear.legs.tint },
          shirt: { visible: !!ent.gear.shirt.visible, hasTex: !!(ent.gear.shirt.texture && ent.gear.shirt.texture.frame), tint: ent.gear.shirt.tint },
          chest: { visible: !!ent.gear.chest.visible, hasTex: !!(ent.gear.chest.texture && ent.gear.chest.texture.frame), tint: ent.gear.chest.tint },
        } : null,
        /* v2.3.2356: the armour's DRAWN height on the peer figure, the twin of
           __btChopFigure's gearDrawnH.  The chop layers now ship half-res
           (GEAR_STRIP_TWIN, effectsRenderer) and BOTH placers had to stop
           assuming the old size in the same edit; a scale factor alone cannot
           show that they agree, a drawn height can.  Read off the legs sprite,
           which is the one slot the chopper always resolves when greaves are
           worn (the plate is a fine second, the shirt hides under it). */
        gearDrawnH: (ent.gear && ent.gear.legs && ent.gear.legs.texture && ent.gear.legs.texture.height)
          ? +(Math.abs(ent.gear.legs.scale.y) * ent.gear.legs.texture.height).toFixed(2) : null,
        /* The body sprite's own flip, so a test can pin that a peer chopping a
           tree on their left faces it (v2.3.2303) rather than away from it. */
        /* v2.3.2303: the index handed to the GEAR loader, which is NOT the
           body index. chop's row carries `from: 12`, so the body runs 12..23
           while the gear strips are 12-frame -- passing the body index clamps
           the armour on its last frame for the whole swing while the body
           animates underneath. Asserting on `frame` alone cannot see that;
           this is the field that can. */
        gearIx: typeof ent._gearIx === 'number' ? ent._gearIx : null,
        signX: (ent[ent._exCode] && ent[ent._exCode].scale)
          ? (ent[ent._exCode].scale.x < 0 ? -1 : 1) : null,
        /* v2.3.2855: is this peer's lumberjack drawn from a bake that carries
           their drawings (true), or from the shared figure (false)? */
        chopInk: !!ent._chopInk,
        /* v2.3.2856: is this peer's cook drawn with their drawings' layer? */
        cookInk: !!ent._cookInk,
        /* v2.3.2858: ...and their fire-lighter? */
        fireInk: !!ent._fireInk,
      };
    },
    /* v2.3.2855: the lumberjack SPRITES -- yours (no id) or a peer's -- for
       mp-harvestink, which reads the frame the renderer actually draws, the same
       way it reads the fishing body through peerDisplayRaw. */
    chopSpriteRaw: (id) => {
      const e = effectsRenderer;
      if (id == null) return e.chopSprite || null;
      const ent = e._remoteSkillSprites && e._remoteSkillSprites.get(id);
      return (ent && ent.chop) || null;
    },
    /* v2.3.2855: how many drawn peers' lumberjacks are baked right now. */
    peerChopBakes: () => (effectsRenderer._peerChopBakes ? effectsRenderer._peerChopBakes.size : 0),
    /* v2.3.2856: the cook's two SPRITES -- the figure and the drawings' layer
       over it -- yours (no id) or a peer's, for mp-cookink to read the frame
       the renderer actually draws. */
    cookSpriteRaw: (id) => {
      const e = effectsRenderer;
      if (id == null) return e.cookSprite ? { body: e.cookSprite, ink: e.cookInkSprite || null } : null;
      const ent = e._remoteSkillSprites && e._remoteSkillSprites.get(id);
      return (ent && ent.cook) ? { body: ent.cook, ink: ent.cookInk || null } : null;
    },
    /* v2.3.2856: your cook's layers (how many frames, or 0 when there is no
       layer), and how many drawn peers' layers are held right now. */
    cookInkLayers: () => {
      const e = effectsRenderer;
      return {
        body: e._cookFramesInk ? e._cookFramesInk.length : 0,
        legless: e._cookLeglessFramesInk ? e._cookLeglessFramesInk.length : 0,
        peers: (e._peerInks && e._peerInks.cook) ? e._peerInks.cook.size : 0,
      };
    },
    /* v2.3.2858: the fire-lighter's two SPRITES, yours (no id) or a peer's, and
       its layers -- mp-fireink, the twins of cookSpriteRaw / cookInkLayers. */
    fireSpriteRaw: (id) => {
      const e = effectsRenderer;
      if (id == null) return e.fireSprite ? { body: e.fireSprite, ink: e.fireInkSprite || null } : null;
      const ent = e._remoteSkillSprites && e._remoteSkillSprites.get(id);
      return (ent && ent.fire) ? { body: ent.fire, ink: ent.fireInk || null } : null;
    },
    fireInkLayers: () => {
      const e = effectsRenderer;
      return {
        body: e._fireFramesInk ? e._fireFramesInk.length : 0,
        peers: (e._peerInks && e._peerInks.fire) ? e._peerInks.fire.size : 0,
      };
    },
    /* v2.3.138: dispose a single loot pile by direct object reference.
       Local SP pickups don't always set lootId (legacy melee/bow/DoT
       push paths) so disposeLootById can't reach them. The pickup
       filter returns false to remove from S.groundLoot but the orphan
       sweep was intermittently missing the cleanup, leaving the coin
       sprite stuck after gold was credited. This direct-ref dispose
       removes any uncertainty about ID matching. */
    disposeLootRef: (loot) => effectsRenderer.disposeLootRef(loot),
    /* v2.3.130: wholesale flush.  Sites that do `S.groundLoot = []`
       (player respawn, zone transition, dungeon enter, etc.) call
       this first so all sprites tear down the same tick, closing the
       window where the orphan sweep hadn't yet run and stale slime
       remnants or coin piles could still render. */
    flushAllLoot: () => effectsRenderer.flushAllLoot(),
  };
}
