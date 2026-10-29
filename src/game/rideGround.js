/* ═══ v2.3.3776: WHERE A BOARD ROLLS -- THE SAFE GROUND'S CIRCLE ═══
 * The skateboard's rules (game/ride.js) take the safe ground as a centre and a
 * radius so node can test them without the game's tables; this is where the
 * phone reads them: the middle of the Wheel the room plays (No man's land's
 * centre, the same middle trapping.js and the move diet read) and the town's
 * safe radius (zones.js wheel.safeR) -- never a coordinate written here
 * (CLAUDE.md: QA and code read the Wheel's geometry). */
import { ZONES } from '@/data/zones.js';
import { NML_CENTRE, NML_CENTRES } from '@/data/noMansLandRings.js';
import { wheelLong } from '@/game/wheelSize.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';

export function rideGround(S) {
  const z = ZONES && ZONES.wheel;
  return {
    centre: NML_CENTRES[wheelLong()] || NML_CENTRE,
    safeR: z && z.safeR,
    swimming: !!(S && isWheelSwimming(S)),
  };
}
