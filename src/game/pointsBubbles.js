/* v2.3.3971: the rules of a weapon level-up's bubbles (ui/pointsFly.js), with
   no imports so node tests them (server/test/points-fly.test.mjs). */

/* the three combat skills (prog3's keys): a life skill or the character sends
   none */
export var POINTS_FLY_SKILLS = ['sword', 'bow', 'staff'];

/** Is it on?  `search` is location.search; off with ?pointsfly=0. */
export function pointsFlyOn(search) {
  return !/[?&]pointsfly=0(?:&|$)/.test(String(search || ''));
}

/** How many bubbles for a level-up: 5-7 (the owner's "bubbles"), the same
 *  level always the same number. */
export function pointsBubbleCount(level) {
  var n = Math.max(1, Math.floor(Number(level) || 1));
  return 5 + (n % 3);
}
