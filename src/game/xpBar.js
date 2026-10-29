/* ═══ v2.3.3695: THE XP BAR -- A SKILL'S XP, SHOWN AS YOU EARN IT ═══
 *
 * The owner, 2026-10-28: "The game needs an XP Popup and an Xp bar to appear
 * with the icon of whatever primary combat skill you're earning Xp in
 * someplace at the bottom (or maybe top) depending on what works best. Then
 * disappears again."
 *
 * Where: the top bar's middle (ui/mobile/ZoneHeader.jsx), in place of the
 * "BroTown" title while you earn, and the title back XP_BAR_SHOW_MS after the
 * last gain.  The one place every layout shares (a phone upright and
 * sideways, a computer playing wide), never under a thumb, never over the
 * world, and the bar where the AP chip already pops its "+N" (v2.3.3553).
 *
 * What: the skill's picture (the owner's Points icons), its level, a bar that
 * fills to the next level, and the gain, "+3 XP", popping in beside it.
 *
 * From: the worker's numbers only.  A combat skill's XP is the worker's
 * (server prog3.js _prog3AwardXp: `sk.xp` toward `prog3XpRequired(sk.level)`),
 * sent whole in player_state's `prog3`; wsClient hands each new blob and the
 * one it replaces to noteProg3Xp before it adopts it.  Nothing is predicted.
 *
 * NO IMPORTS: server/test/xp-bar.test.mjs runs this in node; the XP curve is
 * passed in (`req`, data/prog3.js prog3XpRequired). */

/* how long the bar stays after the last gain.  v2.3.3796: 3000 -> 3500, the
   slower fill (XP_FILL_DELAY_MS + XP_FILL_MS, 1.8 s) and then time to read
   it; a level-up's longer show is XP_BAR_UP_SHOW_MS */
export const XP_BAR_SHOW_MS = 3500;
/* v2.3.3796: a level-up's show: the run to the end, the new level's fill
   (XP_WRAP_MS + XP_FILL_DELAY_MS + XP_FILL_MS, 3.75 s) and time to read it */
export const XP_BAR_UP_SHOW_MS = 5200;
/* the combat skills, in the Points tab's order of their keys */
export const XP_BAR_CATS = Object.freeze(['sword', 'bow', 'staff']);
/* how long a "+N" pops (game.css bt-xp-gain) */
export const XP_GAIN_MS = 1200;
/* v2.3.3739: the white gain bar (ui/mobile/XpTrack.jsx).  The white shows
   at once where the XP now stands; the gold waits XP_FILL_DELAY_MS, so the
   white is seen, then grows to it over XP_FILL_MS.  A level-up runs the gold
   to the end, and XP_WRAP_MS after the gain the bar starts the new level
   empty, the white at what carried over and the gold growing to it.
   v2.3.3796, the owner: "when you gain xp show the white bar longer (the
   added xp that the bar climbs to) and make the fill up to that white portion
   slower" -- the white alone 120 -> 600 ms, the climb 500 -> 1200 ms, eased
   out (XP_FILL_EASE: quick at first, settling into the white); the level-up's
   second step after the first has run (1800 ms) and a breath, 2000 ms. */
export const XP_FILL_DELAY_MS = 600;
export const XP_FILL_MS = 1200;
export const XP_WRAP_MS = 2000;
/* the gold's easing as CSS, and the same curve for the counting number
   (xpEase): an ease-out cubic, 1 - (1 - p)^3 */
export const XP_FILL_EASE = 'cubic-bezier(.33,1,.68,1)';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const lvlOf = (sk) => Math.max(1, Math.floor(num(sk && sk.level) || 1));

/** The XP a skill gained from `prev` to `next` ({level, xp}, xp toward the
 *  next level), across any levels between; 0 when it went down or nothing
 *  moved.  `req(level)` is the XP from that level to the next. */
export function skillXpGain(prev, next, req) {
  if (!prev || !next || typeof req !== 'function') return 0;
  const pl = lvlOf(prev), nl = lvlOf(next);
  if (nl < pl) return 0;
  if (nl === pl) return Math.max(0, num(next.xp) - num(prev.xp));
  let g = Math.max(0, num(req(pl)) - num(prev.xp));
  for (let L = pl + 1; L < nl; L++) g += Math.max(0, num(req(L)));
  return g + Math.max(0, num(next.xp));
}

/** "+3 XP", "+1.4 XP", "+120 XP": one decimal below 10, none from there. */
export function xpGainWords(gain) {
  const g = num(gain);
  if (!(g > 0)) return '';
  const v = g < 10 ? Math.round(g * 10) / 10 : Math.round(g);
  return '+' + (v >= 1000 ? v.toLocaleString('en-US') : String(v)) + ' XP';
}

/** v2.3.3739: an XP number as the bar prints it: one decimal where it is
 *  fractional below 10 (the worker's XP is 0.2 of the damage), whole from 10,
 *  a thousands separator from 1,000.  Rounded DOWN, so the bar never reads
 *  "120 / 120" a hair before the level. */
export function xpNumWords(v) {
  const n = Math.max(0, num(v));
  const w = n < 10 ? Math.floor(n * 10 + 1e-9) / 10 : Math.floor(n + 1e-9);
  return w >= 1000 ? w.toLocaleString('en-US') : String(w);
}

/** v2.3.3796: the fill's ease-out (XP_FILL_EASE's curve), p in 0..1 */
export function xpEase(p) {
  const q = Math.max(0, Math.min(1, num(p)));
  return 1 - Math.pow(1 - q, 3);
}

/** v2.3.3796: the number while it counts, `t` ms after the count began from
 *  `from` toward `to` -- held XP_FILL_DELAY_MS with the white alone, then
 *  XP_FILL_MS in step with the gold (the owner: "instead of changing the
 *  whole xp number make it count up").  Done: `to`. */
export function xpCountAt(from, to, t) {
  const a = num(from), b = num(to), tt = num(t);
  if (tt <= XP_FILL_DELAY_MS) return a;
  return a + (b - a) * xpEase((tt - XP_FILL_DELAY_MS) / XP_FILL_MS);
}

/** v2.3.3796: how long `bar` stays up after its gain: a level-up longer */
export function xpShowMs(bar) {
  return bar && bar.up ? XP_BAR_UP_SHOW_MS : XP_BAR_SHOW_MS;
}

/** v2.3.3739: "45 / 120", the XP into this level over what the next level
 *  needs (the owner: "It should also show the number of xp needed for the
 *  next level somewhere on the bar").  The worker's numbers, `bar.xp` and
 *  `bar.need`. */
export function xpToNextWords(xp, need) {
  return xpNumWords(xp) + ' / ' + xpNumWords(Math.max(1, num(need)));
}

/** v2.3.3739: how the track moves to a new bar, given the bar it last drew
 *  (`was`: {cat, level, at}, or null).
 *   - `fresh`: a new skill, a bar that had gone (XP_BAR_SHOW_MS), a fall in
 *     level, or nothing drawn yet: the gold first stands where the XP was
 *     before this gain (`from`), then grows.  Otherwise it grows on from
 *     wherever it is, never from zero.
 *   - `wrap`: the gain crossed a level since the level drawn: the white and
 *     the gold run to the end, then the new level starts empty. */
export function xpFillSteps(was, bar) {
  if (!bar) return { fresh: true, wrap: false, from: 0 };
  const level = lvlOf(bar);
  const fresh = !was || was.cat !== bar.cat || num(bar.at) - num(was.at) >= (was.up ? XP_BAR_UP_SHOW_MS : XP_BAR_SHOW_MS)
    || lvlOf(was) > level;
  const fromLevel = bar.fromLevel != null ? lvlOf({ level: bar.fromLevel }) : level;
  const wrap = level > (fresh ? fromLevel : lvlOf(was));
  const from = fromLevel === level || wrap ? Math.max(0, Math.min(1, num(bar.fromFrac))) : 0;
  return { fresh, wrap, from };
}

/* who wants to know (ZoneHeader re-renders at once, not on its 500 ms beat) */
const _listeners = new Set();
export function onXpBar(fn) {
  if (typeof fn !== 'function') return () => {};
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

/** A new prog3 blob replaced `prevP3`: the skill that gained the most XP in it
 *  becomes the bar's (S._xpBar), and the listeners are told.  Returns the bar,
 *  or null when no combat skill gained (a first blob, a respec, a reload).
 *  The gains of one skill that keep coming while its bar is up add into one
 *  "+N" until it has popped (XP_GAIN_MS), so a flurry reads as one number. */
export function noteProg3Xp(S, prevP3, nextP3, req, now) {
  if (!S || !prevP3 || !prevP3.sk || !nextP3 || !nextP3.sk) return null;
  let best = null;
  for (const cat of XP_BAR_CATS) {
    const g = skillXpGain(prevP3.sk[cat], nextP3.sk[cat], req);
    if (g > 0 && (!best || g > best.gain)) best = { cat, gain: g };
  }
  if (!best) return null;
  const t = num(now);
  const sk = nextP3.sk[best.cat];
  const level = lvlOf(sk);
  const need = Math.max(1, num(req(level)));
  const xp = Math.max(0, num(sk && sk.xp));
  /* v2.3.3739: where this skill stood before the gain (the white bar's start) */
  const psk = prevP3.sk[best.cat];
  const fromLevel = lvlOf(psk);
  const fromXp = Math.max(0, num(psk && psk.xp));
  const fromNeed = Math.max(1, num(req(fromLevel)));
  const fromFrac = Math.max(0, Math.min(1, fromXp / fromNeed));
  const was = S._xpBar;
  const same = !!(was && was.cat === best.cat && t - was.gainAt < XP_GAIN_MS);
  S._xpBar = {
    cat: best.cat,
    level,
    xp,
    need,
    frac: Math.max(0, Math.min(1, xp / need)),
    /* this pop's number: the gains since it started */
    gain: same ? was.gain + best.gain : best.gain,
    gainAt: same ? was.gainAt : t,
    /* a new pop each time the number restarts (its key) */
    seq: (was ? was.seq : 0) + (same ? 0 : 1),
    at: t,
    up: level > fromLevel,
    fromLevel,
    fromFrac,
    /* v2.3.3796: the number's start (XpTrack counts from it) */
    fromXp,
    fromNeed,
  };
  for (const fn of Array.from(_listeners)) { try { fn(S._xpBar); } catch (_e) { /* a reader's fault is its own */ } }
  return S._xpBar;
}

/** Is the bar up at `now`? */
export function xpBarShown(bar, now) {
  return !!(bar && num(now) - num(bar.at) < xpShowMs(bar));
}
