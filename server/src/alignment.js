/* ═══ v2.3.1218: ALIGNMENT REGISTERS — moral-progression foundation ═══
 *
 * The four action REGISTERS (Responsible / Mischievous / Cool / Ruthless)
 * are "voice categories, not moral categories" — none is good/bad, none is
 * ranked (gdd.md §33.3, creative-reference.md §0.1).  A player accumulates
 * four independent integer counters by choosing a PATH at each NPC chain's
 * CAPSTONE quest (gdd.md §25.1).  The choice is permanent per chain
 * (recorded in `choices[questId]`), so a cheater can't farm registers by
 * replaying turn-in.
 *
 * This module is PURE (no `this`, no I/O): the counters are written
 * server-side in quests.js `_handleQuestTurnIn`, persisted by persistence.js
 * (`_saveRpg` field list, rule 1) and bootstrapped in join.js.  The
 * dominant-register and five-ending resolvers are pure functions over the
 * four counters — the endings aren't reachable yet (they fire at the far-off
 * True Guardian achievement), but shipping the counters + resolver correctly
 * NOW is the load-bearing foundation the endings drop onto unchanged.
 *
 * Ending rule (gdd.md §33.4, v14.0.5): strict-max wins — the single register
 * strictly greater than all others gives its ending; ANY tie for the top
 * (2/3/4-way, including 1/1/1/1) resolves to WEAVER (the balanced fifth
 * ending).  Deliberately NO tiebreaker ordering.
 *
 * NOTE the naming split: a REGISTER (responsible) and its ENDING (hero) are
 * different words — don't conflate `cool` (register) with `arbiter` (ending).
 */

// The four canonical registers.  `path` values on the wire equal these.
export const REGISTERS = ['responsible', 'mischievous', 'cool', 'ruthless'];

// register -> its dominant-register ending name (gdd.md §53.4).
export const REGISTER_ENDING = {
  responsible: 'hero',
  mischievous: 'trickster',
  cool: 'arbiter',
  ruthless: 'sovereign',
};

const COUNTER_KEY = {
  responsible: 'responsibleCount',
  mischievous: 'mischievousCount',
  cool: 'coolCount',
  ruthless: 'ruthlessCount',
};

// Max choices a player can make = one capstone per NPC chain (gdd.md §33.3:
// "0-8 per register, up to 8 total").  Clamp counters defensively.
export const REGISTER_COUNT_CAP = 8;
export const TITLES_CAP = 16;

export function isRegister(path) {
  return typeof path === 'string' && Object.prototype.hasOwnProperty.call(COUNTER_KEY, path);
}

export function counterKeyFor(path) {
  return COUNTER_KEY[path];
}

// A fresh, all-zero alignment blob.  choices uses a null-proto map because
// its keys are client-supplied quest ids (session brief rule 4: plain {}
// no-ops on '__proto__').
export function defaultAlignment() {
  return {
    responsibleCount: 0,
    mischievousCount: 0,
    coolCount: 0,
    ruthlessCount: 0,
    choices: Object.create(null),
    titlesEarned: [],
  };
}

// Sanitize a stored/echoed alignment blob into a trusted shape.  Counters
// clamp to [0, cap] ints; choices keeps only valid register values on a
// null-proto map; titles keep only strings, capped.  Never trusts a
// client-supplied count (registers gate titles/endings — server is the sole
// writer via _handleQuestTurnIn).
export function sanitizeAlignment(raw) {
  const a = defaultAlignment();
  if (!raw || typeof raw !== 'object') return a;
  for (const reg of REGISTERS) {
    const k = COUNTER_KEY[reg];
    const n = Number(raw[k]);
    a[k] = Number.isFinite(n) ? Math.max(0, Math.min(REGISTER_COUNT_CAP, Math.floor(n))) : 0;
  }
  if (raw.choices && typeof raw.choices === 'object') {
    let n = 0;
    for (const [qid, path] of Object.entries(raw.choices)) {
      if (n >= 100) break; // key-count cap (mirrors join.js _capObjKeys)
      if (typeof qid !== 'string' || qid === '__proto__') continue;
      if (!isRegister(path)) continue;
      a.choices[qid] = path;
      n++;
    }
  }
  if (Array.isArray(raw.titlesEarned)) {
    a.titlesEarned = raw.titlesEarned.filter((t) => typeof t === 'string').slice(0, TITLES_CAP);
  }
  return a;
}

// Highest-count register, or a sentinel.  Pure over the four counters.
//   'untested' — all zero (new player, no capstone choices yet)
//   'balanced' — a tie for the highest count (the Weaver shape)
//   <register> — a single strict maximum
// (gdd.md §33.4 lines 6676-6680.)
export function dominantRegister(a) {
  if (!a) return 'untested';
  const counts = REGISTERS.map((r) => Number(a[COUNTER_KEY[r]]) || 0);
  const max = Math.max(...counts);
  if (max === 0) return 'untested';
  const leaders = REGISTERS.filter((r, i) => counts[i] === max);
  return leaders.length === 1 ? leaders[0] : 'balanced';
}

// The five-value ending enum (gdd.md §33.4): the strict-max register's
// ending, or 'weaver' on any top-tie.  Returns null when untested (no
// choices made) — callers snapshot this only at the True Guardian moment,
// which is future scope; shipped now so the resolver is test-locked.
export function resolveEnding(a) {
  const dom = dominantRegister(a);
  if (dom === 'untested') return null;
  if (dom === 'balanced') return 'weaver';
  return REGISTER_ENDING[dom];
}
