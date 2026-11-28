/* ═══ v2.3.6860: A HIT TAKEN OUTSIDE A SAFE PLACE CLOSES THE MENU (card MN step 1) ═══
 *
 * BroTown's frame calls menus3HitTick(S) once a frame: one compare of the
 * hurt stamp (S.lastDamageTaken, written by every monster's and a duel's hit)
 * against the last one seen, so the common frame does nothing.  A new stamp
 * asks the rule (src/game/menus3Close.js menus3HitStep) with where you stand:
 * the Wheel's safe ground (trapping.js onSafeGround, the "Brotown · safe"
 * circle) or a zone marked safe.  Its own file so the page's first script
 * (main.jsx's menus3Wire.js) does not carry the zones' table. */
import { menus3HitStep } from '../../game/menus3Close.js';
import { onSafeGround } from '../../game/trapping.js';
import { ZONES } from '../../data/zones.js';
import { menus3Active, menus3Open, menus3Close } from './menus3Wire.js';

let _seen = 0;

function safeHere(S) {
  try {
    if (S.currentZone === 'wheel') return !!(S.player && onSafeGround(S.player.x, S.player.y));
    const z = ZONES[S.currentZone];
    return !!(z && z.safe);
  } catch (e) { return true; }
}

export function menus3HitTick(S) {
  if (!S || !menus3Active()) return;
  const t = Number(S.lastDamageTaken) || 0;
  if (!(t > _seen)) return;   /* the common frame: one compare */
  const r = menus3HitStep(_seen, t, menus3Open(), safeHere(S));
  _seen = r.seen;
  if (r.close) menus3Close('hit');
}
