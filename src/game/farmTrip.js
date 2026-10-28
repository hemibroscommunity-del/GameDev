/* ═══ v2.3.3136: THE WAY ONTO YOUR FARM WAITS FOR IT ═══
 *
 * Every way onto your farm -- "Visit Your Farm" at the Feed & Seed and the
 * old Farm window, the Land Office's "Travel to Farm", and the Dungeon
 * Workshop's dungeons on their way home -- warps you there on the spot, and
 * since v2.3.1406 kicked the farm's pictures off un-awaited, so its ground
 * came in a beat after you did.  The farm you walk has far more to show (its
 * ground, the barn, the props and trees, every crop's every stage, the
 * farmer's moves: rendering/farmWorld.js, preloadZoneAssets('farm_home')),
 * and the preloading law (CLAUDE.md) wants all of it in before you see it.
 *
 * So each of them still warps, and then HOLDS you here: the zone's loading
 * screen up and your feet still (S._farmArtHold, beside S._townArtHold in
 * BroTown's movement and jump.js) until the farm is loaded, at most
 * FARM_HOLD_CAP_MS.  A farm already loaded -- you never left it -- holds
 * nothing.  docs/specs/farm-walk.md.
 */
import { ZONES } from '@/data/zones.js';
import { BT_AUDIO } from '@/data/index.js';
import { showZoneLoadingOverlay, hideZoneLoadingOverlay, releaseLeftZoneArt } from '@/game/zoneTransitions.js';
import { farmArtReady } from '@/rendering/farmWorld.js';
import { isZoneMapResident } from '@/rendering/tiledMaps.js';
import { farmFigureReady } from '@/rendering/standIns.js';

export const FARM_HOLD_CAP_MS = 12000;
let _seq = 0;

/** Is everything the farm draws in?  Its ground, its pictures, the farmer's
 *  moves (v2.3.3439: the hoe, the can, the kneel). */
export function farmReady() {
  return farmArtReady() && isZoneMapResident('farm_home') && farmFigureReady();
}

/** Called right after a warp onto the farm. */
export function holdFarmUntilReady(S) {
  if (!S) return;
  /* v2.3.3672: THE FARM'S OWN MUSIC.  Every way onto the farm sets its map
     straight in, so the zone change's own music call (BroTown's `if (!S.map)`)
     never ran there, and the farm went on playing whatever played before it
     -- BroTown's track, the trip passing through today's town -- though the
     Sound Studio said the theme (mp-farmmusic found it, as mp-googrotto found
     a dungeon's in v2.3.3610).  This is the one call every way onto the farm
     makes, so it asks here: ZONE_MUSIC.farm_home, the owner's "Homestead
     Morning"; a no-op when it already plays. */
  if (S.currentZone === 'farm_home') {
    try { BT_AUDIO.startZoneAmbient('farm_home'); } catch (e) { /* sound only */ }
  }
  /* ═══ v2.3.3705: AND THE TRIP LETS GO OF WHERE IT LEFT ═══
     For the same reason: no way onto the farm passes through a zone change,
     so none of them let the zone they left go.  A walk out of the Wheel does
     (zoneTransitions, freeZoneAssets), and so does a dungeon's way in
     (gameEvents' dungeon_started, releaseLeftZoneArt), but from the Feed &
     Seed, the old Farm window or the Land Office the Wheel's own pictures
     stayed for the whole visit: its lands' banner strips (15 MB of decoded
     images), the signposts' icons, the buildings' pictures and every monster
     look loaded near you.  rememberFarmTrip (wheelTownDoors.js) names the zone
     each of those three leaves; the Workshop's dungeons on their way home
     name none.  Released as a dungeon's way in releases it, a beat late (the
     renderer has not yet seen the flip); the way back into the Wheel loads
     it all again behind its own loading screen, as after a dungeon. */
  const left = S._farmLeaving;
  S._farmLeaving = null;
  if (left && left !== 'farm_home' && S.currentZone === 'farm_home') {
    try { releaseLeftZoneArt(left, 'farm_home'); } catch (e) { /* a leak, not a crash */ }
  }
  const seq = ++_seq;
  const load = import('@/rendering/preloadAnimations.js').then((m) => m.preloadZoneAssets('farm_home'));
  if (farmReady()) { load.catch(() => {}); return; }
  S._farmArtHold = seq;
  showZoneLoadingOverlay((ZONES.farm_home && ZONES.farm_home.name) || 'Your Farm');
  Promise.race([load.catch(() => null), new Promise((r) => setTimeout(r, FARM_HOLD_CAP_MS))]).then(() => {
    if (S._farmArtHold !== seq) return;
    S._farmArtHold = null;
    /* the screen is one element for every zone change: lift it only if no
       other one has taken it over meanwhile */
    if (S.currentZone === 'farm_home' && !S._zoneLoading && !S._townArtHold && !S._netHold) hideZoneLoadingOverlay();
    if (typeof window !== 'undefined' && window.__btProbe) {
      (window.__btFarmHolds || (window.__btFarmHolds = [])).push({ at: Date.now(), ready: farmReady() });
    }
  });
}
