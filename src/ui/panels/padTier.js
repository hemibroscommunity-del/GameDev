/* ═══ v2.3.6642: THE RIGHT LOBE'S TIER, TOLD (card PAD part 6) ═══
 * Whirlwind and Shield Bash sit in a tier over the right lobe while either
 * shows (game/padSkin.js specialLayout).  Whether one shows is
 * AbilityButtons' own list (abilityStatus: its 200 ms poll and the shield's
 * edge), so it TELLS the shell (PadHousings.jsx, which polls nothing) here,
 * in a layout effect: the shell grows in the same paint the buttons arrive
 * in, never a frame of a button over the outline.  `shown` is
 * { bash, whirl } or null (no tier: nothing drawn).  A change only when the
 * pair moves: the shell redraws on an edge, never per poll.
 */
let shown = null;
const subs = new Set();

function keyOf(v) { return v ? (v.bash ? 'b' : '') + (v.whirl ? 'w' : '') : ''; }

export const padTierBus = {
  get() { return shown; },
  set(v) {
    const next = v && (v.bash === true || v.whirl === true) ? { bash: v.bash === true, whirl: v.whirl === true } : null;
    if (keyOf(next) === keyOf(shown)) return;
    shown = next;
    subs.forEach((f) => { try { f(); } catch (e) { /* one listener's fault */ } });
  },
  subscribe(f) { subs.add(f); return () => { subs.delete(f); }; },
};
