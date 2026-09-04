/* ═══ v2.3.1358: THE ANIMATION PRELOAD MANIFEST ═══
 *
 * OWNER DIRECTIVE (2026-07-19, stated repeatedly): "Make sure ALL
 * animations are ready to be used the moment they fire in game for the
 * first time ... make this stuff load during the loading screen even
 * if it takes longer."  See CLAUDE.md — "Animation preloading is LAW".
 *
 * This module is the ONE registry of everything that must be warm
 * before the intro overlay lifts.  preloadWorldAnimations() is awaited
 * inside preloadPlayerAssets() (pixiRenderer.js — the intro gate).
 * The loading screen is ALLOWED to take longer; first-use hitches are
 * not.  If you add a new animation system, register its loader HERE in
 * the same PR — a lazy "load on first sighting" pattern is a bug.
 *
 * What each group covers (audit v2.3.1358):
 *  - variants:  fireGoblin / mummy / skeleton / fishman / rockmonster
 *               walk+attack+hit+death+remnants sheets (was: first
 *               sighting in a zone)
 *  - base mobs: slime + snowman full sheets, player death sheet (was:
 *               kicked non-blocking at renderer init, never awaited)
 *  - fx:        every EffectsRenderer strip — chop/cook/fire skill
 *               stand-ins, sword-swing + bow-shot stand-ins, popup and
 *               shard icons, node/ore sheets, magic bolt, snowman
 *               ice-burst impact (was: ctor-kicked unawaited or first
 *               snowman sighting)
 *  - traits:    all headwear/hair/facialhair base art + the local
 *               player's recolors, hair-clip mask, NFT face, HUD bars
 *               (was: first render of a wearer)
 *  - world:     every zone map image + walkability grids (was: on
 *               first entry to each zone)
 *
 * A settle report lands on window.__btPreloadReport so rigs (and
 * anyone debugging a first-use hitch) can verify coverage. */

import { variantSpritesFor, unloadVariantSprites } from './monsterVariantSprites.js';
import { loadSlimeSprites } from './slimeSprites.js';
import { loadSnowmanSprites, unloadSnowmanSprites } from './snowmanSprites.js';
import { loadPlayerDeathSprites } from './playerDeathSprites.js';
import { preloadStartZoneMap, loadWalkabilityMaps } from './tiledMaps.js';
import { effectsAnimationsReady, ensureImpactTex, ensureSnowballBurstTex, freeFrostImpactTex } from './systems/effectsRenderer.js'; /* v2.3.2272: the frost-only sheets get an exit */
import { fxStripsReady } from './fxStrips.js'; /* v2.3.1735: stun ring + whirl vortex (preloading is law) */
import { preloadTraits } from './systems/entityRenderer.js';
import { preloadCapes } from './capeSprites.js'; /* v2.3.2023: cosmetic capes are GLOBAL, not per-zone */
import { preloadFullsetFigures } from './gearSheets.js'; /* v2.3.1376: fullset knight figures */
import { preloadJogHeadOverlays } from './playerSkins.js'; /* v2.3.1376: their head overlays */
import { ZONE_VARIANT_MAP, MONSTER_VARIANTS, variantsForZone } from '../data/monsterVariants.js'; /* v2.3.1405: per-zone variant scoping */
import { loadMonsterRecolor, recolorFamilyOf, freeMonsterRecolor } from './monsterRecolor.js'; /* v2.3.1534: per-zone recolour; v2.3.2272: and its release */
import { loadNpcSprites } from './npcSprites.js'; /* v2.3.1672: NPC figure art */

/* v2.3.1405 (owner: "per zone loading instead of one long pregame loading
   screen"): ZONE-SPECIFIC textures moved OFF the blocking pre-game gate —
   the 12 zone maps (~4MB each = ~48MB), the monster variants (~10-20MB),
   and the frost-only snowman + ice-burst (~4MB) were all loaded up front,
   stacking ~60MB onto the iPhone startup peak for assets you don't use in
   the zone you're standing in.  They now load per-zone via
   preloadZoneAssets(zoneId) behind the per-zone loading overlay
   (zoneTransitions.js), and the previous zone's map is freed on exit
   (freeZoneMap).  The pre-game gate keeps only GLOBAL assets (player,
   town map [pixiRenderer.preloadStartZoneMap], slime [raw fodder is
   everywhere], fx, traits, fullset).  CLAUDE.md's preloading LAW is
   amended: these load during the per-zone loading SCREEN (awaited, no
   in-play first-use hitch) — compliant in spirit. */
export async function preloadZoneAssets(zoneId) {
  const tasks = [];
  /* map texture (self-heals via tileRenderer if missing, but we await it
     so the overlay holds until the ground is ready = no black flash) */
  tasks.push(Promise.resolve(preloadStartZoneMap(zoneId)).catch(() => {}));
  /* the monster VARIANT sheets this zone uses (server sends the monsters;
     we need their art warm before they render). */
  {
    /* v2.3.1535: variantsForZone covers BOTH the whole-archetype map and the
       per-spawn-entry overrides (verdant's single blueSlime), so a variant
       assigned by the spawn table warms here like any other. */
    const keys = variantsForZone(zoneId);
    /* skeleton has no zone entry — it only appears via the mummy->skeleton
       transform, so co-load it wherever mummy loads (sky). */
    if (keys.has('mummy')) keys.add('skeleton');
    for (const key of keys) {
      const v = variantSpritesFor(key); /* kicks the loader once (idempotent) */
      if (v && v.load) tasks.push(Promise.resolve(v.load()).catch(() => {}));
      /* v2.3.1534: a slime variant asking for a luminance RECOLOUR (blue
         mossSlime) builds its recoloured copy of the shared slime sheets
         here — per-zone, per the ZONE-ASSET EXCEPTION in CLAUDE.md, because
         a colour costs a full extra set of slime textures and only the zone
         that uses it should pay.  Awaited with the rest, so the zone overlay
         holds until it is ready and no slime is ever seen in the old colour
         (a lazy first-sighting build is exactly what the preloading LAW
         forbids). */
      const mv = MONSTER_VARIANTS[key];
      const fam = recolorFamilyOf(mv);
      if (fam) tasks.push(Promise.resolve(loadMonsterRecolor(fam, mv.recolor)).catch(() => {}));
    }
  }
  /* frost is the only snowman zone — its sprites + the ice-burst impact
     sheet (both ~2MB) load here instead of globally. */
  if (zoneId === 'frost') {
    tasks.push(Promise.resolve(loadSnowmanSprites()).catch(() => {}));
    try { ensureImpactTex(); } catch (e) { /* effectsAnimationsReady tracks it */ }
    /* v2.3.2217: the thrown ball's burst — AWAITED (pushed into tasks) rather
       than fire-and-forget, so it is ready before the zone overlay lifts
       instead of popping in on the first snowball that lands. */
    tasks.push(Promise.resolve(ensureSnowballBurstTex()).catch(() => {}));
  }
  await Promise.allSettled(tasks);
}

/* ═══ v2.3.2272: THE EXIT HALF OF PER-ZONE LOADING ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."
 *
 * v2.3.1405 (the note above) moved three categories off the startup gate and
 * onto per-zone loading, and freed exactly ONE of them on the way out: the
 * ~4MB map.  The other two -- the monster variant sheets and frost's snowman --
 * had no unload to call, so the steady state was not "the zone you are in", it
 * was "everywhere you have been".
 *
 * Measured, before any of this was written (mp-texdrift, sampling resident
 * decoded texture at the worldview hub between legs so the reading is always
 * of the SAME zone):
 *
 *     hub 382.5MB -> ember 413 -> sky 449.2 -> frost 468.8 -> verdant 474.4
 *
 * Monotone, +92MB, and the ~6MB dip on each return is the map -- the one thing
 * that WAS freed, and therefore the control proving the instrument can see a
 * release when one happens.  Decoded, the art is much bigger than it looks on
 * disk: fire-goblin is 1.9MB of PNG and 60.5MB of RGBA.
 *
 * ── WHAT IT WILL NOT FREE ──
 * Anything the destination zone needs.  `toZoneId` is not optional politeness:
 * verdant and mist share reskins of the same two sprite modules, so freeing
 * "what the old zone used" without subtracting "what the new zone uses" would
 * unload a sheet a monster standing in front of you is drawn from.  Passing no
 * destination frees the outgoing zone's art outright, which is only correct
 * when there is no destination.
 *
 * ── AND IT DOES NOT WEAKEN THE PRELOADING LAW ──
 * Everything freed here is re-loaded by preloadZoneAssets, AWAITED behind the
 * per-zone loading overlay -- the ZONE-ASSET EXCEPTION the law already carves
 * out, and the same trade v2.3.1405 made for the map.  What is not touched is
 * anything global: player, traits, fx, slime, capes, fullsets all stay warm.
 *
 * Recolours (loadMonsterRecolor) are deliberately left resident.  They are
 * slime sheets -- tens of KB against the variants' tens of MB -- and their
 * cache is keyed by (family, colour) rather than by zone, so freeing one on a
 * zone exit would need a reverse index for no measurable return. */
export async function freeZoneAssets(fromZoneId, toZoneId) {
  if (!fromZoneId) return null;
  const going = variantsForZone(fromZoneId);
  if (going.has('mummy')) going.add('skeleton');   /* co-loaded; co-freed */
  const keeping = toZoneId ? variantsForZone(toZoneId) : new Set();
  if (keeping.has('mummy')) keeping.add('skeleton');
  const drop = [];
  for (const key of going) if (!keeping.has(key)) drop.push(key);
  const tasks = [];
  if (drop.length) tasks.push(Promise.resolve(unloadVariantSprites(drop)).catch(() => []));
  if (fromZoneId === 'frost' && toZoneId !== 'frost') {
    tasks.push(Promise.resolve(unloadSnowmanSprites()).catch(() => 0));
    /* The ice-burst and snowball-burst strips are frost-only for the same
       reason the snowman is; they were the ~6.5MB frost still kept after the
       variant free had returned every other zone to its exact baseline. */
    tasks.push(Promise.resolve(freeFrostImpactTex()).catch(() => {}));
  }
  /* And the retinted copies the departing zone's variants asked for.  Same
     subtraction as the sheets: a colour the destination also uses stays.
     Resolved through MONSTER_VARIANTS because the cache is keyed by (family,
     colour) and only the variant knows both. */
  const keptFam = new Set();
  for (const key of keeping) {
    const mv = MONSTER_VARIANTS[key];
    if (mv && recolorFamilyOf(mv)) keptFam.add(recolorFamilyOf(mv) + '|' + String(mv.recolor));
  }
  for (const key of going) {
    const mv = MONSTER_VARIANTS[key];
    const fam = recolorFamilyOf(mv);
    if (!fam) continue;
    if (keptFam.has(fam + '|' + String(mv.recolor))) continue;
    try { freeMonsterRecolor(mv); } catch (e) { /* a colour that will not free is a leak, not a crash */ }
  }
  await Promise.allSettled(tasks);
  return { from: fromZoneId, to: toZoneId || null, dropped: drop };
}

export async function preloadWorldAnimations() {
  const groups = {
    slime: loadSlimeSprites(),
    playerDeath: loadPlayerDeathSprites(),
    walkability: loadWalkabilityMaps(),
    fx: effectsAnimationsReady(),
    /* v2.3.1735: the shared owner FX strips.  Registered HERE, in the same PR
       that adds them, per CLAUDE.md's animation-preloading law — a first-use
       texture load is a regression, and these two are global (not per-zone). */
    /* v2.3.2070: the portal beam rides this group — it is exported from
       fxStrips.js and awaited by the same fxStripsReady(), so it is covered
       by the line above and needs no entry of its own.  Said out loud
       because a still image in a module named "strips" is exactly the kind
       of thing a later reader assumes was forgotten. */
    fxStrips: fxStripsReady(),
    traits: preloadTraits(),
    /* v2.3.2023: five stills per cape.  Global rather than per-zone -- a cape
       is worn everywhere, so it belongs on the gate with the player's own
       art, not behind a zone overlay. */
    capes: preloadCapes(),
    /* v2.3.1672: NPC art.  GLOBAL, not per-zone: the only NPC art today is
       Mayor Bro, who stands in town — and town is a resident hub that is
       never freed (see the ZONE-ASSET EXCEPTION in CLAUDE.md), so there is no
       per-zone eviction to hang him off.  He is one 256px texture, ~18KB.
       Registered HERE rather than loaded on first sighting because the
       renderer's lookup is cache-only by design: if this line is removed the
       mayor silently falls back to his emoji stand-in forever, which is a
       visible bug rather than a silent hitch — deliberately the louder
       failure of the two.  If NPC art ever grows past a handful of figures,
       move it to preloadZoneAssets and free it on zone exit. */
    npcArt: loadNpcSprites(),
  };

  const names = Object.keys(groups);
  const settled = await Promise.allSettled(names.map((n) => Promise.resolve(groups[n]).catch(() => {})));
  const report = {};
  names.forEach((n, i) => { report[n] = settled[i].status; });
  /* v2.3.1398 (owner: "make sure all this stuff loads correctly at the
     login loading page"): the fullset knight figures + their head
     overlays are BACK on the blocking gate.  The v2.3.1382 +4s
     background warm raced the player's first armored jog on-device —
     the recurring "head disappearing" reports are that race (plus
     post-deploy cache re-fetches) landing mid-play.  Memory guard: they
     load as a SECOND WAVE only after every other group has settled, so
     their decode buffers never stack on top of the main preload burst —
     the all-parallel shape is what killed iPhone startup in v2.3.1382,
     not gating per se.  The loading screen is allowed to take longer
     (CLAUDE.md, preloading is LAW). */
  const wave2 = {
    fullset: preloadFullsetFigures(),
    jogHeads: preloadJogHeadOverlays(),
  };
  const names2 = Object.keys(wave2);
  const settled2 = await Promise.allSettled(names2.map((n) => Promise.resolve(wave2[n]).catch(() => {})));
  names2.forEach((n, i) => { report[n] = settled2[i].status; });
  try { if (typeof window !== 'undefined') window.__btPreloadReport = report; } catch (e) {}
  return report;
}
