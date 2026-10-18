/* ═══ v2.3.3395: HALLOWEEN WEEK (docs/specs/halloween.md) ═══
 *
 * The fun & social plan's Halloween items (docs/FUN-SOCIAL-PLAN.md, the owner's
 * "Go recommended") that need no new picture: the Zombie Shuffle dance
 * (game/emoteMoves.js, a move with `season: 'halloween'`) and the speech
 * bubbles in pumpkin colours (effectsRenderer _renderChatBubble).  Both are on
 * from 18 October to 1 November by the phone's own calendar -- a look, never
 * a rule: the worker accepts the dance any day, so a phone with a wrong clock
 * only shows another phone's shuffle, it never breaks anything.
 *
 * v2.3.3460: from the 18th, not the 24th.  The owner looked for it on 18
 * October 2026, saw nothing (it had not begun), and chose "Start today for
 * everyone" -- this year and every year after.  The before-and-after pictures:
 * docs/shots/halloween.md.
 *
 * `?halloween=1` / `?halloween=0` in the address forces it either way for a
 * tab (tests, and the owner trying it out of season).
 *
 * No imports, so it can be read in node. */

export const HALLOWEEN = Object.freeze({
  /* the first and last days, month 1-12 */
  FROM: Object.freeze({ month: 10, day: 18 }),   /* v2.3.3460: was the 24th (the owner's "Start today") */
  TO: Object.freeze({ month: 11, day: 1 }),
});

let _forced;   /* undefined: not read yet; null: no override */
function forced() {
  if (_forced !== undefined) return _forced;
  _forced = null;
  try {
    const m = /[?&]halloween=(1|0|on|off)\b/.exec(globalThis.location ? globalThis.location.search : '');
    if (m) _forced = m[1] === '1' || m[1] === 'on';
  } catch (e) { /* no address: the calendar decides */ }
  return _forced;
}

/* is `date` (default: now) in Halloween week, by the local calendar */
export function halloweenOn(date) {
  const f = forced();
  if (f !== null) return f;
  const d = date instanceof Date ? date : new Date(typeof date === 'number' ? date : Date.now());
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === HALLOWEEN.FROM.month) return day >= HALLOWEEN.FROM.day;
  if (m === HALLOWEEN.TO.month) return day <= HALLOWEEN.TO.day;
  return false;
}

/* is a move's season on now ('halloween', or none: always) */
export function seasonOn(season, date) {
  if (!season) return true;
  if (season === 'halloween') return halloweenOn(date);
  return false;
}

/* tests only: forget the address override */
export function _resetSeasonForTests(v) { _forced = v === undefined ? undefined : v; }
