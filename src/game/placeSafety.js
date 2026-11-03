/* ═══ v2.3.3922: WHERE YOU ARE, AND WHETHER YOU ARE SAFE THERE ═══
 *
 * The owner, 2026-11-02: "The top bar is underwhelming (says 'brotown'). The
 * red skull with the 1 is supposed to mean your character is in the
 * wilderness and any character 1 level below you, equal to, or above you can
 * attack you (you would keep all your equipped items and lose everything else
 * including gold). But if you are the one to initiate an attack on another
 * player you get a red skull above your head and if you get killed you lose
 * everything."  He adopted the review's answer: a place and safety chip in
 * the top bar -- Safe / PvP / Outlaw -- "reserve the red skull for the actual
 * aggressor state", and a tap on it that says the exact cost, "such as
 * '2,306 gold and 8 inventory items'".
 *
 * The words and the numbers, with no imports, so node can test them
 * (tools/dev/test-place-safety.mjs).  The worker decides every fight
 * (server/src/nomansland.js _nmlAllowed): its character levels at most N
 * apart, N the LOWER of the two No man's land numbers.  From your side the
 * widest that can be is your own number, so the chip says the levels within
 * it -- "Lv 6-8" for a level-7 bro in No man's land 1 -- and never promises a
 * fight the worker would refuse.  ui/mobile/NmlBadge.jsx (PlaceChip) reads
 * the game's state into these. */

/** The character levels that may attack a level `myLv` bro standing in No
 *  man's land `n` (the worker's |a - b| <= min(na, nb), from your side). */
export function pvpRange(myLv, n) {
  const L = Math.max(1, Math.floor(Number(myLv) || 1));
  const N = Math.max(0, Math.floor(Number(n) || 0));
  return { lo: Math.max(1, L - N), hi: L + N };
}

/** What the chip shows.  `nml` your No man's land number (0 off it), `myLv`
 *  your character level, `redMin` the minutes left on your red skull (0: none).
 *  A red skull is an outlaw anywhere (it counts down while you play, in town
 *  too); else No man's land is PvP; everywhere else is safe. */
export function placeState({ nml = 0, myLv = 1, redMin = 0 } = {}) {
  const n = Math.max(0, Math.floor(Number(nml) || 0));
  const red = Math.max(0, Math.ceil(Number(redMin) || 0));
  const { lo, hi } = pvpRange(myLv, n);
  if (red > 0) return { kind: 'outlaw', n, lo, hi, redMin: red };
  if (n > 0) return { kind: 'pvp', n, lo, hi, redMin: 0 };
  return { kind: 'safe', n: 0, lo, hi, redMin: 0 };
}

/* the en dash, written as an escape: the game's script is ASCII (TRAPS §258) */
const DASH = '–';
const DOT = '·';

/** "6-8", or "6" when the range is one level */
export function levelSpan(lo, hi) {
  return lo === hi ? String(lo) : `${lo}${DASH}${hi}`;
}

/** The chip's words.  `narrow` (an upright phone under 430 px, barNarrow) drops the
 *  "PvP" word for the levels alone; the colour says the rest. */
export function chipWords(st, narrow) {
  if (!st) return '';
  if (st.kind === 'outlaw') return 'Outlaw';
  if (st.kind === 'pvp') return narrow ? `Lv ${levelSpan(st.lo, st.hi)}` : `PvP ${DOT} Lv ${levelSpan(st.lo, st.hi)}`;
  return 'Safe';
}

/** How many things a player kill there would take from your bag: each kind
 *  in it (the bag is a key -> count map) and each spare weapon.  What you
 *  wear is never counted: it stays (nomansland.js _nmlOnDeath). */
export function bagRiskCount(R) {
  if (!R) return 0;
  let k = 0;
  const inv = R.inventory;
  if (inv && typeof inv === 'object') {
    for (const key of Object.keys(inv)) if ((Number(inv[key]) || 0) > 0) k++;
  }
  if (Array.isArray(R.weaponStash)) k += R.weaponStash.filter(Boolean).length;
  return k;
}

const n0 = (v) => Math.max(0, Math.floor(Number(v) || 0));
const num = (v) => n0(v).toLocaleString('en-US');

/** "your 2,306 gold and the 8 things in your bag" (and the plain forms when
 *  either is none) */
export function riskWords(gold, things) {
  const g = n0(gold), t = n0(things);
  const tw = t === 1 ? 'the 1 thing in your bag' : `the ${num(t)} things in your bag`;
  if (g > 0 && t > 0) return `your ${num(g)} gold and ${tw}`;
  if (g > 0) return `your ${num(g)} gold`;
  if (t > 0) return tw;
  return 'anything you carry';
}

/** The popup's first, plain lines, with live numbers ({lead, more}).  `place`
 *  the name on the bar ("BroTown", a land's). */
export function placeLines(st, { gold = 0, things = 0, place = 'BroTown' } = {}) {
  if (!st) return { lead: '', more: '' };
  const risk = riskWords(gold, things);
  if (st.kind === 'outlaw') {
    const m = st.redMin === 1 ? '1 more minute' : `${st.redMin} more minutes`;
    return {
      lead: `You attacked a player first, so you're an outlaw for ${m}.`,
      more: st.n > 0
        ? 'If a player beats you now, you drop everything, even what you’re wearing.'
        : `${place} is safe, but if a player beats you in No man’s land before then, you drop everything, even what you’re wearing.`,
    };
  }
  if (st.kind === 'pvp') {
    return {
      lead: `Players Lv ${levelSpan(st.lo, st.hi)} can attack you here.`,
      more: `If a player beats you, you keep what you’re wearing, but you drop ${risk}. Put things in the Bank in BroTown to keep them safe.`,
    };
  }
  return { lead: `${place} is safe. No one can attack you here.`, more: '' };
}
