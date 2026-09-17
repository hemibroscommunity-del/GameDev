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
export function zoneTitle(S) {
  const zoneId = (S && S.currentZone) || 'town';
  const z = ZONES[zoneId];
  const name = (z && z.name) || 'Town';
  const depth = S && S._currentDepth;
  if (depth && depth !== 'shallow' && zoneId !== 'town') {
    const lr = (DEPTH_CONFIG[depth] && DEPTH_CONFIG[depth].lvlRange) || [1, 10];
    return `${name} — ${depth.toUpperCase()} (Lv${lr[0]}-${lr[1]})`;
  }
  if (z && z.level && z.level[1] > 0) return `${name} (Lv${z.level[0]}-${z.level[1]})`;
  return name;
}
