/* ═══ v2.3.1874: WHERE A GAINED XP NUMBER LANDS, AND HOW IT COUNTS UP ═══
 *
 * Owner: "When you kill a monster or complete a quest show the combat skill
 * xp over the character then have the xp jump down into whatever combat skill
 * earned the xp and increase the number in a quick count up (kinda like when
 * you catch a fish it jumps into the bag but different mechanism for this)."
 *
 * Two halves live here, because they are the same problem seen from each end:
 * the CARD has to know when a number is on its way to it, and the FLIGHT has
 * to know where the card is.
 *
 * ═══ WHY THE NUMBER NEEDS A HELD VALUE AT ALL ═══
 *
 * The obvious build — fly a label to the card, then count the number up — does
 * not work against this game's data flow, and the reason is worth writing down
 * because it is what shapes everything below.
 *
 * prog3 XP is SERVER-AUTHORITATIVE (server/src/prog3.js `_prog3AwardXp`).  The
 * card reads rpg.prog3.sk[cat].xp, which changes the moment a player_state
 * delta arrives — typically BEFORE the flight would land, and on a kill the
 * client pushes its popup from its own prediction, so the two are not even on
 * the same clock.  Left alone the card's number jumps up first and the label
 * arrives afterwards, which reads as the number changing for no reason and
 * then a decoration landing on it.  Backwards.
 *
 * So the card does not render the live number directly.  It renders a HELD
 * value that this module owns:
 *
 *   - while a label is in flight to that skill, the value is FROZEN, whatever
 *     the server does in the meantime;
 *   - when the label lands, the value EASES to the live number over
 *     COUNT_MS — the quick count up that was asked for;
 *   - with nothing in flight it simply tracks the live number, so every other
 *     path into that number (a level-up, another device, a fresh state_sync)
 *     is unaffected and instant.
 *
 * Easing toward the LIVE number rather than to a snapshot taken at launch is
 * the detail that makes it robust: if the server's delta has not arrived by
 * the time the label lands, the count-up simply has nothing to travel yet and
 * picks the value up when it does, instead of animating to a stale target and
 * then jumping.
 *
 * A LEVEL-UP SNAPS.  Crossing a threshold resets xp toward zero, so the live
 * value goes DOWN; easing there would run the number backwards for half a
 * second.  Any decrease is taken immediately.
 */

/* The three combat skills, by the key prog3 uses. */
const CATS = ['sword', 'bow', 'staff'];

const COUNT_MS = 420;      /* the count-up itself — "quick", per the ask */

/* Per-skill display state: { shown, from, to, t0, holding } */
const _state = Object.create(null);
for (const c of CATS) _state[c] = { shown: null, from: 0, to: 0, t0: 0, holding: 0 };

/* Card rects, published by the cards themselves (DashColumns) each render.
   Keyed by skill.  A card that is not on screen simply stops publishing, and
   the flight falls back — see xpCardPoint. */
const _cards = Object.create(null);

/** DashColumns calls this for each card it draws, every render. */
export function registerXpCard(cat, rect) {
  if (!cat || !rect) return;
  _cards[cat] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, ts: Date.now() };
}

/** Where a label for `cat` should fly to, or null if that card is not on
 *  screen right now (the dashboard can be expanded over it, or the player
 *  can be in a menu).  Null means "do not fly" — see the overlay, which
 *  floats the label and fades it instead of sending it somewhere arbitrary. */
export function xpCardPoint(cat) {
  const c = _cards[cat];
  if (!c) return null;
  /* Stale means the card stopped rendering — a rect from two seconds ago is
     a position on a screen that no longer exists. */
  if (Date.now() - c.ts > 700) return null;
  return { x: c.x, y: c.y };
}

/* A hold must never outlive its label.  If the overlay is unmounted mid-flight
 * (a zone change, the React tree remounting) the landing never runs, and
 * without this the card's number would sit frozen for the rest of the session
 * — a worse bug than the early jump the hold exists to prevent.  Comfortably
 * longer than the flight itself (380ms lift + 520ms fall). */
const HOLD_MAX_MS = 2100;   /* > the flight (520 lift + 520 fall) with room */

/** A label is on its way to `cat`: hold that card's number where it is. */
export function holdXp(cat) {
  const st = _state[cat];
  if (!st) return;
  st.holding++;
  st.heldAt = Date.now();
}

/** The label landed: run the count up to whatever the live value is now. */
export function landXp(cat) {
  const st = _state[cat];
  if (!st) return;
  st.holding = Math.max(0, st.holding - 1);
  if (st.holding > 0) return;          /* another label still inbound */
  st.from = st.shown == null ? 0 : st.shown;
  st.t0 = Date.now();
}

/** The value the card should DISPLAY for `cat`, given the live one.
 *  Pure read — safe to call from render. */
export function displayXp(cat, live) {
  const st = _state[cat];
  const v = Math.max(0, Math.floor(live || 0));
  if (!st) return v;
  if (st.shown == null) { st.shown = v; return v; }
  /* A level-up (or any reset) goes straight through: easing would run the
     number backwards. */
  if (v < st.shown) { st.shown = v; st.t0 = 0; return v; }
  if (st.holding > 0) {
    /* ...unless the hold has gone stale, in which case its label is never
       coming and the number is released rather than stranded. */
    if (Date.now() - (st.heldAt || 0) < HOLD_MAX_MS) return st.shown;
    st.holding = 0;
    st.from = st.shown;
    st.t0 = Date.now();
  }
  if (!st.t0) { st.shown = v; return v; }        /* nothing in flight: track live */
  const k = (Date.now() - st.t0) / COUNT_MS;
  if (k >= 1) { st.t0 = 0; st.shown = v; return v; }
  /* ease-out: fast off the mark, settling onto the final number */
  const e = 1 - (1 - k) * (1 - k);
  st.shown = Math.round(st.from + (v - st.from) * e);
  return st.shown;
}

/** True while any card is mid count-up — the dashboard uses this to keep
 *  re-rendering while the number moves. */
export function xpCounting() {
  for (const c of CATS) { const st = _state[c]; if (st && (st.t0 || st.holding)) return true; }
  return false;
}

/** Test seam: forget everything (used by the QA scenario between cases). */
export function _resetXpLanding() {
  for (const c of CATS) _state[c] = { shown: null, from: 0, to: 0, t0: 0, holding: 0 };
  for (const k of Object.keys(_cards)) delete _cards[k];
}
