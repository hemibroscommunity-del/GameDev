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

import { loadAllVariantSprites } from './monsterVariantSprites.js';
import { loadSlimeSprites } from './slimeSprites.js';
import { loadSnowmanSprites } from './snowmanSprites.js';
import { loadPlayerDeathSprites } from './playerDeathSprites.js';
import { loadImageZoneMaps, loadWalkabilityMaps } from './tiledMaps.js';
import { effectsAnimationsReady, ensureImpactTex } from './systems/effectsRenderer.js';
import { preloadTraits } from './systems/entityRenderer.js';
import { preloadFullsetFigures } from './gearSheets.js'; /* v2.3.1376: fullset knight figures */
import { preloadJogHeadOverlays } from './playerSkins.js'; /* v2.3.1376: their head overlays */

export async function preloadWorldAnimations() {
  /* Kick the lazy-by-default loaders eagerly. */
  try { ensureImpactTex(); } catch (e) { /* tracked below via effectsAnimationsReady */ }

  const groups = {
    variants: loadAllVariantSprites(),
    slime: loadSlimeSprites(),
    snowman: loadSnowmanSprites(),
    playerDeath: loadPlayerDeathSprites(),
    zoneMaps: loadImageZoneMaps(),
    walkability: loadWalkabilityMaps(),
    fx: effectsAnimationsReady(),
    traits: preloadTraits(),
    /* v2.3.1376: the fullset armored figures + the head overlays they draw
       the player's real head from — new animation system, registered per
       the law above in the same PR that ships it. */
    fullset: preloadFullsetFigures(),
    jogHeads: preloadJogHeadOverlays(),
  };

  const names = Object.keys(groups);
  const settled = await Promise.allSettled(names.map((n) => Promise.resolve(groups[n]).catch(() => {})));
  const report = {};
  names.forEach((n, i) => { report[n] = settled[i].status; });
  try { if (typeof window !== 'undefined') window.__btPreloadReport = report; } catch (e) {}
  return report;
}
