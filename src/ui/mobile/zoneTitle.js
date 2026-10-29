/* ═══ v2.3.2596: THE ZONE'S NAME, IN ONE PLACE ═══
 *
 * Lifted verbatim out of ZoneHeader.jsx (v2.3.1333) so the zone-entry banner
 * and the header rail it docks into can print the SAME string.
 *
 * That is the whole point of the move rather than a tidy-up: the banner's
 * promise is "this wide thing becomes that small label", and two independent
 * copies of "how a zone is named" is exactly the kind of thing that stays
 * identical for a year and then diverges on the day someone adds a suffix to
 * one of them — at which point the flourish visibly turns into different words
 * and reads as a bug.
 *
 * A LEAF module on purpose: it imports data and nothing else in this repo, so
 * the DOM overlay (src/ui/zoneBannerOverlay.js, reached from the renderer) can
 * use it without dragging React in behind it.
 */
import { ZONES } from '../../data/zones.js';
import { DEPTH_CONFIG } from '../../data/lifeSkills.js';

/* Title stays white per the v2.3.1333 spec (the old per-element tint fought
   the recessed navy face), and carries the depth suffix the retired floating
   label showed — the info survived that move, only the housing changed. */
/* ═══ v2.3.3840: NEVER "TOWN" ON THE WAY BACK TO BROTOWN ═══
   A death (respawn.js), the way in and the way out of a dungeon put you in
   the retired map's `town` for a moment, and take you from there to the
   Wheel's BroTown under one veil (wheelHome.js wantWheelSpawn).  The veil is
   see-through, and this printed the zone you were in: "Town", the retired
   map's name, for 5-8 s at every death on a phone judge pass, and for a frame
   after the veil lifted.  While that trip is wanted the bar names where you
   are going.  The 30 s is wheelHome.js TRIP_VEIL_MS: a trip that never
   happened leaves you on the old map, and then it says so (TRAPS §244).
   A leaf: reads the state, imports nothing new. */
const TRIP_MS = 30000;
function goingToWheel(S, zoneId) {
  return zoneId === 'town' && !!S && !!S._spawnToWheel && Date.now() - (S._spawnAskedAt || 0) < TRIP_MS;
}

export function zoneTitle(S) {
  const zoneId = (S && S.currentZone) || 'town';
  /* the Wheel's own name, as ZoneHeader.jsx prints it there (no levels) */
  if (goingToWheel(S, zoneId)) return (ZONES.wheel && ZONES.wheel.name) || 'BroTown';
  const z = ZONES[zoneId];
  const name = (z && z.name) || 'Town';
  const depth = S && S._currentDepth;
  if (depth && depth !== 'shallow' && zoneId !== 'town') {
    const lr = (DEPTH_CONFIG[depth] && DEPTH_CONFIG[depth].lvlRange) || [1, 10];
    return `${name} — ${depth.toUpperCase()} (Lv${lr[0]}-${lr[1]})`;
  }
  /* v2.3.3556: a range that is one level is that level -- a dungeon is one
     level (server/src/wheeldungeon.js), and its top bar read "the Great Cave
     (Lv28-28)" */
  if (z && z.level && z.level[1] > 0) {
    return z.level[0] === z.level[1] ? `${name} (Lv ${z.level[0]})` : `${name} (Lv${z.level[0]}-${z.level[1]})`;
  }
  return name;
}
