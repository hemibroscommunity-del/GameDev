/* v2.3.4139: mp-lagoonclimbdesk -- mp-lagoonclimb on a computer (wide: true,
   1280 x 800, the sideways layout).  On a computer the walk stops the feet a
   few px further off a wall than on a phone: the climb begun at the vines'
   foot ended on its second frame, and walking into the chest never opened it
   (game/climbActions.js).  Same steps, same checks, its pictures named desk-. */
import { play } from './mp-lagoonclimb.mjs';

export async function run(args) { return play(args, true); }
