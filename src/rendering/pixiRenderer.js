/**
 * PixiJS Renderer — replaces canvasRenderer.js.
 * Manages the PixiJS application and orchestrates all render systems.
 */
import { createPixiApp } from './pixiApp.js';
import { TileRenderer } from './systems/tileRenderer.js';
import { EntityRenderer, prewarmMaskedBodyFrames, prewarmAltWornSets, planPrewarmProgress, uploadBakedTextures, uploadGearTextures, registerPrewarmRenderer } from './systems/entityRenderer.js';
import { EffectsRenderer, prewarmDmgFontPipe, FIRE_FRAME_MS } from './systems/effectsRenderer.js';
import { FpsOverlay } from './systems/fpsOverlay.js';
import { loadPlayerSprites } from './playerSprites.js';
import { loadPlayerAnchors } from './playerAnchors.js';
import { loadSlimeSprites } from './slimeSprites.js';
import { loadPlayerDeathSprites } from './playerDeathSprites.js';
import { loadWeaponSprites } from './weaponSprites.js';
import { loadShieldSprites } from './shieldSprites.js';
import { preloadStartZoneMap } from './tiledMaps.js';
import { preloadGear } from './gearSheets.js';
import { preloadCombatGear } from './combatGear.js';
import { preloadBodyAll } from './playerSkins.js';
import { preloadWorldAnimations } from './preloadAnimations.js'; /* v2.3.1358 */
import { Assets } from 'pixi.js';

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
  const entityRenderer = new EntityRenderer(layers.entities, layers.player, layers.monsterUi, layers.gestureFront);
  const effectsRenderer = new EffectsRenderer(layers);
  /* v2.3.221: FPS counter only mounts with ?dev=1. */
  const _devUI = typeof window !== 'undefined' && /[?&]dev=1\b/.test(window.location.search);
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

  function onZoneChange(map, zoneId) {
    if (zoneId === currentZone && map === currentMap) return;
    currentZone = zoneId;
    currentMap = map;
    tileRenderer.rebuild(app, map, zoneId);
    entityRenderer.clear();
    effectsRenderer.clear();
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
    /* v2.3.845: publish the world<->screen scale so screen-anchored effects
       (e.g. the catch flight's bag target) can convert CSS px back to world
       coords: screenX = (worldX - camera.x) * scaleX. */
    S._worldScaleX = scaleX;
    S._worldScaleY = scaleY;

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
    try { tileRenderer.update(cx, cy, viewW, viewH); }
    catch (e) { if (!update._tileErr) { update._tileErr = true; console.error('[pixi-render] tileRenderer threw', e && e.message, e && e.stack); } }
    const _t1 = performance.now();
    update._lastStages.tileMs = _t1 - _t0;
    try { entityRenderer.update(S, now); }
    catch (e) { if (!update._entityErr) { update._entityErr = true; console.error('[pixi-render] entityRenderer threw', e && e.message, e && e.stack); } }
    const _t2 = performance.now();
    update._lastStages.entityMs = _t2 - _t1;
    try { effectsRenderer.update(S, cssW, cssH, now); }
    catch (e) { if (!update._effectsErr) { update._effectsErr = true; console.error('[pixi-render] effectsRenderer threw', e && e.message, e && e.stack); } }
    const _t3 = performance.now();
    update._lastStages.effectsMs = _t3 - _t2;

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
