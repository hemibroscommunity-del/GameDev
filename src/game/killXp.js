/* ═══ v2.3.3893: A KILL'S XP, THE MOMENT IT DIES, JUMPING INTO THE BAR ═══
 *
 * The owner, 2026-10-29: "xp needs a 'jump to xp bar' effect and I think the
 * +xp message should occur the moment the monster reaches 0hp so it beats the
 * messages about what loot it drops".
 *
 * What a kill showed: the top bar's "+1.8 XP" (game/xpBar.js, the killing
 * blow's XP) up in the corner of your eye, and then, as you walked over the
 * pile, the loot's "+5 G" and its other lines over your head -- the only
 * words where you were looking.  Now, when a monster you fought dies, its
 * "+N XP" rises from where it fell and flies into the top bar's XP bar, which
 * pulses as it lands (ui/XpFlyOverlay.jsx, the v2.3.1874 flight, sent to the
 * bar); the bar's own "+N" waits for it and pops on the landing.  The loot's
 * lines come on the pickup, after a walk; this comes with the kill.
 *
 * WHICH NUMBER: the worker's, never a guess.  A combat skill's XP is the
 * worker's (server prog3.js, a fifth of the damage a hit credits), sent in the
 * killing blow's player_state -- which the worker sends while it handles the
 * blow, a tick before the kill itself goes out with the tick's events.  So at
 * the kill the bar (S._xpBar) normally already holds the blow's gain: that
 * "+N" (the gains of the last XP_GAIN_MS added up, the bar's own number) is
 * what flies.  If the kill arrives first, it waits for the gain up to
 * KILL_XP_WAIT_MS; none (a skill at its cap, a kill you only tagged long
 * ago), and nothing flies.  The kill's own `xp` is the old combat XP, which
 * moves nothing under prog3 (v2.3.1727), so it is never shown.
 *
 * Off for one phone with ?xpfly=0 (the memory law's off-ramp: it adds no art,
 * but the owner can compare).
 *
 * NO IMPORTS: server/test/kill-xp.test.mjs runs this in node. */

/* a bar gain this recent at the kill is the killing blow's (the worker sent
   it a tick before the kill: some 25 ms, more on a slow phone) */
export const KILL_XP_FRESH_MS = 700;
/* the kill came first: how long it waits for its gain */
export const KILL_XP_WAIT_MS = 1500;
/* the kill's drop lines ("Coins x6", game/dropLines.js) wait this long, so its
   XP is up first and on its way to the bar before they rise (the flight's
   lift over the spot is 520 ms, ui/XpFlyOverlay.jsx LIFT_MS) */
export const KILL_XP_LINES_AFTER_MS = 500;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Is the kill's fly on?  `search` is location.search; off with ?xpfly=0. */
export function killXpOn(search) {
  return !/[?&]xpfly=0(?:&|$)/.test(String(search || ''));
}

/** A monster I earned from (`kill`: monster_kill's payload, its monsterId and
 *  where it died) died at world (x, y), `now` (called only while
 *  killXpOn).  Returns the flight
 *  to start ({ x, y, cat, gain }) when the bar already holds its gain, else
 *  null and the kill waits (S._killXpWait) for killXpOnGain. */
export function killXpOnKill(S, kill, now) {
  if (!S || !kill) return null;
  const t = num(now);
  S._killXpKillAt = t;   /* (read by mp-killxp: the kill, as the phone handled it) */
  /* its drop lines, which come in the same tick (loot_drop after this
     monster_kill), start after the XP (game/dropLines.js pushGroup) */
  S._dropLinesAt = t + KILL_XP_LINES_AFTER_MS;
  const bar = S._xpBar;
  if (bar && bar.gain > 0 && t - num(bar.at) <= KILL_XP_FRESH_MS && bar.at !== S._killXpFlewAt) {
    S._killXpWait = null;
    S._killXpFlewAt = bar.at;
    return { x: num(kill.x), y: num(kill.y), monsterId: kill.monsterId, cat: bar.cat, gain: bar.gain };
  }
  S._killXpWait = { x: num(kill.x), y: num(kill.y), monsterId: kill.monsterId, at: t };
  return null;
}

/** The bar just took a gain (`bar`, from noteProg3Xp) at `now`: the flight of
 *  a kill waiting for it, or null. */
export function killXpOnGain(S, bar, now) {
  if (!S || !bar || !(bar.gain > 0)) return null;
  const w = S._killXpWait;
  if (!w) return null;
  S._killXpWait = null;
  if (num(now) - w.at > KILL_XP_WAIT_MS) return null;
  S._killXpFlewAt = bar.at;
  return { x: w.x, y: w.y, monsterId: w.monsterId, cat: bar.cat, gain: bar.gain };
}

/* ═══ THE BAR'S "+N" IS HELD ONLY WHILE A KILL'S LABEL IS REALLY IN THE AIR ═══
 * The bar's own "+N" is hidden while a kill's label flies to it (game.css
 * html[data-xp-inbound]).  Each flight holds it with a token, given back once:
 * on the landing, on the label's unmount, or -- if the label never mounted
 * (the tab hidden as a burn finished a monster, its entry pruned on the first
 * frame back before it was drawn) -- by the token's own failsafe timer, the
 * flight plus a margin.  Without that the hold outlived its label and the
 * bar's "+N" was gone for the rest of the visit (the orchestrator's review of
 * #1347; xpLanding.js's HOLD_MAX_MS is the same guard for the card).
 *   env: { set(on), land(), setTimeout(fn, ms), clearTimeout(t) } */
export const KILL_XP_HOLD_MARGIN_MS = 600;
export function killXpInbound(env) {
  let n = 0;
  const api = {
    /** a flight of `ms` starts: its token */
    begin(ms) {
      const tk = { done: false, t: 0 };
      n++;
      env.set(true);
      tk.t = env.setTimeout(() => api.end(tk, false), Math.max(0, num(ms)) + KILL_XP_HOLD_MARGIN_MS);
      return tk;
    },
    /** its label landed (`arrived`) or went: once per token */
    end(tk, arrived) {
      if (!tk || tk.done) return;
      tk.done = true;
      env.clearTimeout(tk.t);
      n = Math.max(0, n - 1);
      if (!n) env.set(false);
      if (arrived) env.land();
    },
    /** no kill label is left anywhere: nothing is held */
    reset() { if (n) { n = 0; env.set(false); } },
    count() { return n; },
  };
  return api;
}
