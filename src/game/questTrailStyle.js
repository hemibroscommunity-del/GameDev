/* ═══ v2.3.2141: WHAT THE QUEST ROAD LOOKS LIKE, AND WHETHER IT IS THERE ═══
 *
 * Owner: "Add an option to turn off the path guide for the quest.  Also
 * explore different options than the bead snake (effective path but beads a
 * little strange)."
 *
 * Two requests, and they are the same setting.  The road (v2.3.2121) has only
 * ever had one look -- a line of gold motes, which the owner is right about:
 * a row of dots is a trail of breadcrumbs, and breadcrumbs say "someone walked
 * here", not "go this way".  They also cannot say WHICH way along themselves,
 * which is the one thing a guide is for; the shimmer travelling outward was
 * the only cue, and it is subtle by design.
 *
 * So this is one choice with four values, and Off is one of them rather than a
 * second toggle beside a style picker.  A player who wants it gone and a
 * player who wants it different are reaching for the same row.
 *
 * ═══ WHY IT IS A MODULE AND NOT A localStorage READ IN THE RENDERER ═══
 * _drawQuestTrail runs every frame.  localStorage.getItem is a synchronous
 * main-thread call that can hit disk, and iOS Safari is the primary platform
 * (CLAUDE.md) -- 60 of those a second, forever, for a value that changes when
 * somebody taps a settings row.  So the value is read ONCE and cached here,
 * and the setter is the only thing that writes.  The renderer calls a function
 * that returns a variable.
 *
 * The same shape as chatChannel.js (v2.3.2139) and for the same reason: a
 * preference with more than one reader gets exactly one home.
 */

const KEY = 'brotown_quest_path';

/* Ordered as they appear in Settings.  `hint` is the one line under the row --
 * it names what you will SEE, because "Ribbon" and "Beads" mean nothing to
 * someone who has not yet turned them on. */
export const TRAIL_STYLES = [
  { id: 'arrows', label: 'Arrows', hint: 'Chevrons pointing the way you should go' },
  { id: 'ribbon', label: 'Ribbon', hint: 'One flowing line, like a lit road' },
  { id: 'beads',  label: 'Beads',  hint: 'The original row of gold dots' },
  { id: 'off',    label: 'Off',    hint: 'No guide on the ground at all' },
];

/* ═══ WHY ARROWS AND NOT BEADS ═══
 * Changing a default changes it for everyone who never opens Settings, so it
 * needs a reason better than taste.  A chevron carries the one piece of
 * information the whole feature exists to deliver -- a DIRECTION -- in its
 * shape, at a glance, with no animation to wait for and nothing to compare it
 * against.  A dot carries none: a row of them is equally readable from either
 * end, so "which way along it" comes only from the travelling shimmer, and a
 * player who glances once never sees a shimmer travel.
 * Beads are still one tap away, and the owner's own word for them is why they
 * are not the default any more.
 */
export const DEFAULT_TRAIL_STYLE = 'arrows';

const _valid = (id) => TRAIL_STYLES.some((s) => s.id === id);

let _style = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return _valid(v) ? v : DEFAULT_TRAIL_STYLE;
  } catch (e) { return DEFAULT_TRAIL_STYLE; }
})();

/** The style the road should draw in.  Cheap enough for a render loop --
 *  a variable read, never storage. */
export function getTrailStyle() { return _style; }

/** True when the guide is switched off entirely.  Named rather than compared
 *  at each call site so `=== 'off'` exists in exactly one place. */
export function isTrailOff() { return _style === 'off'; }

/** Set the style.  An unknown id is ignored rather than stored: a bad value
 *  that reached storage would come back on every future load, and the renderer
 *  would then have to defend against it forever. */
export function setTrailStyle(id) {
  if (!_valid(id)) return _style;
  _style = id;
  try { localStorage.setItem(KEY, id); } catch (e) {}
  return _style;
}

/* v2.3.2141 QA handle, house style (__btCoach, __btQuestRoad).  A scenario
   needs to CHANGE the setting -- driving the Settings row is a different
   test -- and reading the module's own state back is how it tells "the
   renderer honoured it" apart from "the tap never landed". */
if (typeof window !== 'undefined') {
  window.__btTrailStyle = (id) => (id == null ? getTrailStyle() : setTrailStyle(id));
}
