/* ═══ v2.3.5218: THE RACE'S PAGE DOOR -- ONE WRITER OF THE PHONE'S RACE (card L PR 5) ═══
 * (docs/specs/race-door.md, "the page"; held by server/test/race-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's copy of Lil Bro's race is ONE field, `S._race`: none, or its
 * record, whose `phase` goes asked (the phone asked the worker), count (the
 * worker's race_state: the countdown), run (the gun) and done (the worker's
 * race_end: the result card).  game/race.js wrote it in eight places; now
 * only raceTo does, by a way of RACE_PAGE_WAYS:
 *   ask      requestRace          a record {phase: 'asked'}
 *   fail     requestRace          none: the ask could not be sent
 *   state    onRaceState          a record {phase: 'count', ...}
 *   gun      raceTick             the record's phase, count -> run, in place
 *   end      onRaceEnd            a record {phase: 'done', ...}
 *   dismiss  dismissRace          none: the result card closed
 *   timeout  raceTick             none: an ask unanswered, or a race never
 *                                 heard the end of
 *   forget   forgetRace           none: the rejoin (the worker forgot it)
 * The door's rules are race.js's own checks, so nothing a player sees
 * changes: an ask only while no race is live (raceLive), the gun only from
 * the countdown, a dismiss only of the result card, a timeout only of an ask
 * or a run; and a record only of its own way's phase.  `?racedoor=0` lifts
 * them (the record's phase still its way's), as the lines before the door.
 *
 * Not folded here: Lil Bro's run (`S._raceLil`, raceDriveNpc's drawing of
 * him), which outlives the race's end until he is home; the flags touched
 * (`next`) and the countdown's beat (`count`), counts on the record.
 *
 * One import, the page's switch reader (game/switches.js, itself of no
 * imports; card T's, v2.3.5306), by a relative path: the race's rules are
 * read by a node test without the game.
 */
import { sw } from './switches.js';

export const RACE_PAGE_WAYS = Object.freeze({
  ask: 'asked', fail: 'none', state: 'count', gun: 'run', end: 'done',
  dismiss: 'none', timeout: 'none', forget: 'none',
});
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const LIVE = ['asked', 'count', 'run'];

/* `?racedoor=0` -- through the page's one reader (switches.js reads the
   address at each ask), so a test can set it */
export function raceDoorOff() {
  return sw('racedoor');
}

/* the race's phase on this phone: its record's, or none */
export function racePhase(S) {
  const r = S && S._race;
  return r && typeof r.phase === 'string' ? r.phase : 'none';
}

/** THE ONE WRITER of `S._race`.  `rec` is the new record for ask, state and
 *  end (its `phase` that way's), null for the ways to none and the gun.
 *  True when it wrote. */
export function raceTo(S, rec, way) {
  if (!S || typeof S !== 'object' || !has(RACE_PAGE_WAYS, way)) return false;
  const to = RACE_PAGE_WAYS[way];
  const from = racePhase(S);
  const off = raceDoorOff();
  if (to === 'none') {
    if (rec !== null) return false;
    if (!off) {
      if (way === 'dismiss' && from !== 'done') return false;
      if (way === 'timeout' && from !== 'asked' && from !== 'run') return false;
    }
    S._race = null;
    return true;
  }
  if (to === 'run') {
    if (rec !== null || !S._race || (!off && from !== 'count')) return false;
    S._race.phase = 'run';
    return true;
  }
  if (!rec || typeof rec !== 'object' || rec.phase !== to) return false;
  if (!off && way === 'ask' && LIVE.includes(from)) return false;
  S._race = rec;
  return true;
}
