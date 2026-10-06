/* ═══ v2.3.3124: THE WAY ONTO YOUR FARM WAITS FOR IT ═══
 *
 * Every way onto your farm -- "Visit Your Farm" at the Feed & Seed and the
 * old Farm window, the Land Office's "Travel to Farm", and the Dungeon
 * Workshop's dungeons on their way home -- warps you there on the spot, and
 * since v2.3.1406 kicked the farm's pictures off un-awaited, so its ground
 * came in a beat after you did.  The farm you walk has far more to show (its
 * ground, the barn, the props and trees, every crop's every stage, the
 * farmer's kneel: rendering/farmWorld.js, preloadZoneAssets('farm_home')),
 * and the preloading law (CLAUDE.md) wants all of it in before you see it.
 *
 * So each of them still warps, and then HOLDS you here: the zone's loading
 * screen up and your feet still (S._farmArtHold, beside S._townArtHold in
 * BroTown's movement and jump.js) until the farm is loaded, at most
 * FARM_HOLD_CAP_MS.  A farm already loaded -- you never left it -- holds
 * nothing.  docs/specs/farm-walk.md.
 */
import { ZONES } from '@/data/zones.js';
import { showZoneLoadingOverlay, hideZoneLoadingOverlay } from '@/game/zoneTransitions.js';
import { farmArtReady } from '@/rendering/farmWorld.js';
import { isZoneMapResident } from '@/rendering/tiledMaps.js';
import { farmKneelReady } from '@/rendering/standIns.js';

export const FARM_HOLD_CAP_MS = 12000;
let _seq = 0;

/** Is everything the farm draws in?  Its ground, its pictures, the kneel. */
export function farmReady() {
  return farmArtReady() && isZoneMapResident('farm_home') && farmKneelReady();
}

/** Called right after a warp onto the farm. */
export function holdFarmUntilReady(S) {
  if (!S) return;
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
