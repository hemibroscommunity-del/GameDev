/* ═══ v2.3.3583: HOW MANY RACES LIL BRO HAS WON OFF YOU ═══
 * The owner, 2026-10-23: "lil bro should also have dialog change to
 * acknowledge the race has been lost and to try again if you've lost already
 * (but said in his personality)".  Counted as the worker's race_end says a
 * race was lost (game/race.js onRaceEnd: you finished behind him, or ran out
 * of time), read by his line (gameSystems.js race_1's `progress`, a getter,
 * through lilBroRaceLine).  In memory only, as the race itself is (`S._race`):
 * a new visit starts him back at his first dare.
 *
 * No imports: race.js stays free of the game's tables, and gameSystems.js
 * reads it with no cycle (race.js -> eventSounds.js -> data/index.js ->
 * gameSystems.js would be one).
 */
let lost = 0;

/** A race the worker called lost. */
export function noteRaceLost() { lost += 1; }

/** How many he has won off you this visit. */
export function raceLosses() { return lost; }

/** Back to none (a test's). */
export function resetRaceLosses() { lost = 0; }
