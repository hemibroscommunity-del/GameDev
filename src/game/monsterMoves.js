/* ═══ v2.3.3946: MONSTER MOVES, ON THE PHONE ═══
 * (spec: docs/specs/monster-moves.md; the worker's half: server/src/monstermoves.js)
 *
 * From tier 2 (level 6) a Wheel monster has moves of its tier: a combo, a
 * charge along a lane, a volley in a fan, a two-step slam, an area slam, and
 * past tier 7 an enrage below 30% of its bar.  The worker decides and deals
 * every one; this is what the phone needs to SHOW them, and nothing else:
 *
 *   - which worker can do them (`caps.monstermoves`, and each kind's switch,
 *     which the live flags put in the same caps), noted once a join;
 *   - the warning's shape from a `monster_ability` telegraph, every number
 *     clamped (the event is the worker's, but it only ever gates a drawing);
 *   - a volley's balls, from its release;
 *   - whether a monster is enraged, from what the phone already has (its land,
 *     its level and its bar): a tier is five levels on the Wheel, so its tier
 *     is ceil(level / 5), and the worker's own rule is tier 7+ under 30%.  No
 *     field on the tick, so a phone that walks up to an enraged elder later
 *     sees it as well (server/test/monster-moves.test.mjs holds the two rules
 *     together).
 *
 * No imports, so node can test it. */

/* the worker's MONSTER_MOVES.ENRAGE (mirror-held) */
export const MOVE_ENRAGE = Object.freeze({ TIER: 7, HP_FRAC: 0.3 });
/* the levels in a tier of the Wheel (wheelzone.js: 6-10, 11-15, ... 36-40) */
export const MOVE_TIER_LEVELS = 5;
/* the moves' kinds a phone draws as a warning on the ground (the worker's
   MOVE_KINDS; mirror-audit holds gameEvents.js's tables to them) */
export const MOVE_KINDS = Object.freeze(['combo', 'charge', 'volley', 'stomp', 'quake']);

let _caps = null;
/** The worker's caps, noted at each join (wsClient.js state_sync). */
export function noteMoveCaps(caps) { _caps = caps && typeof caps === 'object' ? caps : null; }
/** Can this worker do the moves at all? */
export function movesCapOn() { return !!(_caps && _caps.monstermoves === true); }
/** ...and this kind (its switch rides the caps as `false` when thrown) */
export function moveKindOn(flag) { return movesCapOn() && _caps[flag] !== false; }

/** A monster's tier on the Wheel, from its level (1 off the Wheel). */
export function moveTierOf(m) {
  if (!m || typeof m.home !== 'string') return 1;
  const L = Math.floor(Number(m.level) || 0);
  return L >= 1 ? Math.max(1, Math.min(8, Math.ceil(L / MOVE_TIER_LEVELS))) : 1;
}

/** Is it enraged: an elder (tier 7+) under 30% of its bar, alive -- the
 *  worker's _monsterEnraged, read from what the phone has. */
export function monsterEnragedLook(m) {
  if (!moveKindOn('monsterenrage')) return false;
  if (!m || m.alive === false || moveTierOf(m) < MOVE_ENRAGE.TIER) return false;
  const hp = Number(m.hp), max = Number(m.maxHp);
  return max > 0 && hp > 0 && hp / max < MOVE_ENRAGE.HP_FRAC;
}

/* the red an enraged body pulses to: a tint can only darken a channel, so the
   pulse is the body's own colour multiplied toward this */
const ENRAGE_RED = [255, 84, 72];
const ENRAGE_PERIOD_MS = 700;
/** The body's tint with the enrage's pulse on it (`base` when not enraged):
 *  between its own colour and that colour x red, about once a second and a
 *  half.  A tint only, so nothing is rebuilt (TRAPS §218). */
export function enrageTint(m, base, now) {
  if (!monsterEnragedLook(m)) return base;
  const t = (Number(now) || Date.now()) / ENRAGE_PERIOD_MS;
  const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
  const b = base >>> 0;
  const ch = (shift, red) => {
    const c = (b >> shift) & 0xff;
    return Math.round(c * (1 - k + k * red / 255)) & 0xff;
  };
  return ((ch(16, ENRAGE_RED[0]) << 16) | (ch(8, ENRAGE_RED[1]) << 8) | ch(0, ENRAGE_RED[2])) >>> 0;
}

const num = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

/** The warning's shape from a telegraph, or null for a plain ring (the kits'
 *  own, drawn as ever).  Clamped: it only gates a drawing.
 *    line   a charge's lane: (ax, ay) to (bx, by), w each side
 *    fan    a volley: from (ax, ay), n balls at `len` along `ang` +- span/2,
 *           each a ring of br
 *    rings  a two-step slam: r0, then the ring's own radius
 *    ring   an area slam's one ring (the moves' dark edge on it)
 *    follow a combo's ring, round the monster wherever it is shoved */
export function moveGeometry(p) {
  if (!p || !movesCapOn() || MOVE_KINDS.indexOf(p.ability) < 0) return null;
  if (p.shape === 'line') {
    if (typeof p.bx !== 'number' || typeof p.by !== 'number') return null;
    return { shape: 'line', bx: p.bx, by: p.by, w: num(p.w, 4, 120, 34) };
  }
  if (p.shape === 'fan') {
    return { shape: 'fan', ang: num(p.ang, -7, 7, 0), span: num(p.span, 0, 3, 0.8), len: num(p.len, 10, 600, 200),
      n: Math.round(num(p.n, 1, 5, 3)), br: num(p.br, 8, 120, 44) };
  }
  if (p.shape === 'rings') return { shape: 'rings', r0: num(p.r0, 8, 400, 90) };
  if (p.shape === 'ring') return { shape: 'ring' };
  if (p.follow && p.monsterId != null) return { shape: 'follow', mid: p.monsterId };
  return null;
}

/** A volley's balls at its release: [{x, y, tx, ty}] (at most 5), or []. */
export function volleyBalls(p) {
  if (!p || !movesCapOn() || p.ability !== 'volley' || !p.release || !Array.isArray(p.pts)) return [];
  const x = Number(p.ax), y = Number(p.ay);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const out = [];
  for (let i = 0; i < p.pts.length && i < 5; i++) {
    const q = p.pts[i];
    if (!Array.isArray(q) || !Number.isFinite(Number(q[0])) || !Number.isFinite(Number(q[1]))) continue;
    out.push({ x, y, tx: Number(q[0]), ty: Number(q[1]) });
  }
  return out;
}
