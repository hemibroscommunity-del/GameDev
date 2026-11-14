/* ═══ v2.3.5480: THE POWER INDEX ═══
 *
 * The owner, 2026-11-14: "I think "total power" shouldn't just be a summary
 * of the 3 combat skills but more of a "power index" score based on
 * equipment, stat allocations, and primary combat skills that best predict
 * generalized PVP success against a control character."
 * (Card PW, docs/plan/cards/PW.md; spec docs/specs/power-index.md.)
 *
 * WHAT IT IS.  A duel's odds, not a sum.  ONE fixed reference character, the
 * CONTROL (below), stands in for "a player you might meet".  For each of a
 * player's three styles (melee, bow, magic) the index plays the fight between
 * them ON AVERAGES -- every number from the worker's own combat functions,
 * called, never copied:
 *   - each side's hit: the mean of the very roll a hit between players makes
 *     (combat.js _rollHit: the weapon, its tier and grade, the trained level,
 *     Power, Luck's crit, the special and its shape, the level edge against
 *     the other side's level as an opponent, the ceiling);
 *   - what lands of it: the other side's Dodge, Defense under the combined
 *     floor, and armour (prog3.js _prog3DodgePct / _prog3DefMult, PROG3.FLOOR,
 *     combat.js _armorDrMult), in _applyDamage's order (`landed` below; the
 *     suite holds it to _applyDamage's own dice);
 *   - how often: the weapon's cycle with the Speed stat's cut (freeswing.js
 *     _fsCycleMs, _pfBowCycleMs; drawgather.js _dgStaffCycleMs), and the
 *     specials the full mana bar holds (_abilityCost), one every
 *     SPECIAL_GAP_MS, each taking a swing's place;
 *   - how much it takes: the bar (prog3.js _prog3Recompute: the one
 *     formula's health).  Nothing heals in a fight: the worker's regen waits
 *     for five seconds without a hit (index.js _tickPlayerRegen).
 * That gives each side's time to beat the other, and their ratio
 *     r = the control's time to beat you / your time to beat it
 * gives your ODDS against the control, r ^ ALPHA: ALPHA is fitted
 * (power.test.mjs §4) so that the odds name who wins (Bradley-Terry: between
 * two players, A's odds over B's are A's chance of winning over B's).
 *
 * ═══ v2.3.5480: THE SCORE IS A RATING, LIKE CHESS'S ═══
 * The owner, 2026-11-14, shown the odds themselves (1 for everyone under
 * level 15, millions from 25), a narrower power of them, and this, chose
 * this ("Go recommended"):
 *     a style's score = 3,000 + 400 x log10(your odds against the control)
 * rounded.  The control reads 3,000 in every style; every 400 points ahead
 * is ten times likelier to win (P(A beats B) = 1 / (1 + 10^((B - A) / 400)),
 * chess's Elo); a level-1 character reads about 200, a level-40 one about
 * 4,700.  THE FLOOR IS 1 for a style the player can fight in, and 0 is "no
 * weapon in that hand" (the boards leave a 0 off): a level-1 staff barely
 * scratches the control's armour, and a few such characters fall a little
 * under ten million to one -- under 0 unfloored (the lowest of 1,500 at
 * levels 1-5: -116 a style, -10 a Power).  At 1 they keep their place on
 * the board.  The player's Power is their best style's.
 *
 * WHAT IT LEAVES OUT (positions: both stand and trade blows): a bow or staff
 * kiting a sword out of its reach, a roll's i-frames, the shield's block and
 * parry, projectiles that miss, the sword's lunge, food, mana regained in the
 * fight, a weapon gem's ticks and statuses (pvpextras.js), a brew.  The
 * suite measures what that costs in names-the-winner.
 *
 * SERVER ONLY.  The phone never computes it (a phone could lie); the board's
 * row carries it.  Nothing here is hidden: the formula and the control are
 * public, like a game's stats.
 *
 * THE CONTROL NEVER CHANGES QUIETLY.  POWER.V is the table's version: a
 * change to CONTROL or ALPHA bumps it, and every score is recomputed (a row
 * carries the `v` it was computed at; a reader treats another `v` as not yet
 * ranked).
 *
 * `powerOf(room, ps)` reads only the build -- skills, points, the worn gear
 * -- off a copy, never the live player: no buff, curse, brew, hp or position
 * enters it, and nothing of the player is written.  `room` is the GameRoom
 * (its combat methods are mixins that read `this`).  The two dice of a roll
 * (the band, then the crit) are walked on a fixed grid by holding
 * Math.random for the length of one synchronous call (`withDice`), restored
 * in a finally -- so the index is a pure function of the build, the same on
 * every call, and the roll it averages is the game's own.
 */
import { PROG3, prog3RespecPoints } from './prog3.js';
import { FREE_SWING } from './freeswing.js';

/* The styles, as the boards name them, and what each is to the worker. */
const STYLE = Object.freeze({
  melee: Object.freeze({ slot: 'melee', wpn: 'weapon', cat: 'sword' }),
  bow: Object.freeze({ slot: 'ranged', wpn: 'rangedWeapon', cat: 'bow' }),
  magic: Object.freeze({ slot: 'staff', wpn: 'staffWeapon', cat: 'staff' }),
});

/* the control's three weapons' types, by name: a literal `type: '<x>'` is
   how the wire audit finds a message the worker sends (wire-audit.test), and
   these are gear, not messages */
const WEAPON_TYPE = Object.freeze({ melee: 'greatsword', bow: 'bow', magic: 'staff' });

export const POWER = Object.freeze({
  V: 2,
  STYLES: Object.freeze(['melee', 'bow', 'magic']),
  /* The fitted exponent: the odds are the time ratio to this power.
     power.test.mjs §4 fits it on half the duels of characters who may meet
     in No man's land (within five levels) and reports on the other half:
     1.84-2.10 over five seeds of 1,200 pairs (spec "The fit"). */
  ALPHA: 2,
  /* v2.3.5480: the rating the owner chose: the control's score, and the
     points that mean ten times the odds (version 2; version 1, the odds as
     a number with the control at 1,000, never reached a board) */
  RATING: Object.freeze({ CONTROL: 3000, PER_TENFOLD: 400 }),
  /* ═══ THE CONTROL: an honest mid-game character of today's game ═══
     Level 20 in all three skills, so each style meets its own mirror (the
     control scores 3,000 in each).  Its points are the deal those levels
     give (prog3.js prog3RespecPoints: 57 shared, 57 a lane), spent the way
     a player who has not min-maxed spends them; its gear what the lands it
     plays (levels 11-20) give: a black steel blade and armour, a hardwood
     bow and staff (gathering.js: black steel ore and hardwood grow there;
     titanium and cedar from level 21), all normal grade, unhardened, no
     amulet, the starter shield.  Every piece of it is held honest by the
     suite (§1: the points within the deal, the gear through the worker's
     own equip gate). */
  CONTROL: Object.freeze({
    sk: Object.freeze({ sword: 20, bow: 20, staff: 20 }),
    shared: Object.freeze({ hp: 15, def: 12, dodge: 12, stam: 6, mana: 6, eres: 3, move: 3 }),
    lane: Object.freeze({ dmg: 18, luck: 15, aspd: 12, special: 9, range: 3, elem: 0 }),
    gear: Object.freeze({
      weapon: Object.freeze({ type: WEAPON_TYPE.melee, name: 'Black Steel Great Sword', gearBase: 'steel', tierMult: 1.40, quality: 'normal' }),
      rangedWeapon: Object.freeze({ type: WEAPON_TYPE.bow, name: 'Hardwood Bow', gearBase: 'ww_hardwood', tierMult: 1.25, quality: 'normal' }),
      staffWeapon: Object.freeze({ type: WEAPON_TYPE.magic, name: 'Hardwood Staff', gearBase: 'ww_hardwood', tierMult: 1.25, quality: 'normal' }),
      armor: Object.freeze({ name: 'Black Steel Torso', mat: 'blacksteel', tierMult: 3, quality: 'normal' }),
      legsArmor: Object.freeze({ name: 'Black Steel Greaves', mat: 'blacksteel', tierMult: 3, quality: 'normal' }),
      shield: Object.freeze({ name: 'Pine Shield', gearBase: 'wood', tierMult: 1.0 }),
      amulet: null,
    }),
  }),
  /* The phone's gap between two specials (src/game/playerActions.js: `now -
     S._lastSwipe < 1500`): the worker keeps no copy, so this is the one
     number here that is the phone's.  The suite reads it off that line. */
  SPECIAL_GAP_MS: 1500,
  /* The roll's band is walked at this many points (the midpoints of equal
     slices): the roll is straight in its band but for the crit anchor's
     corner and the rounding, so 16 points read a blow's mean within half a
     percent of a 512-point grid's (measured over 60 random pairs); §2 holds
     it to the real dice. */
  DICE: 16,
});

/* the fields of a player that make their build: read off the live player,
   copied, never written back */
const BUILD_KEYS = Object.freeze(['weapon', 'rangedWeapon', 'staffWeapon', 'armor', 'legsArmor', 'shield', 'amulet']);

/** A fighter: the build alone, on a fresh object the worker's recompute can
 *  stamp its bars on (maxHp, maxMana, the mana blocks, the level). */
function fighterOf(room, src) {
  if (!src || typeof src !== 'object' || !src.prog3 || !src.prog3.sk) return null;
  const f = { prog3: src.prog3, _buffs: {} };
  for (const k of BUILD_KEYS) f[k] = (src[k] && typeof src[k] === 'object') ? src[k] : null;
  room._prog3Recompute(f);
  return f;
}

/** The control as a player: its levels dealt by the worker's own deal, its
 *  points placed, its gear worn. */
export function controlBuild() {
  const C = POWER.CONTROL;
  const p3 = { sk: {} };
  for (const cat of PROG3.SKILLS) p3.sk[cat] = { level: C.sk[cat], xp: 0 };
  prog3RespecPoints(p3, false);
  let spent = 0;
  for (const [k, n] of Object.entries(C.shared)) { p3.alloc[k] = n; spent += n; }
  p3.shared = Math.max(0, p3.shared - spent);
  for (const cat of PROG3.SKILLS) {
    let lane = 0;
    for (const [k, n] of Object.entries(C.lane)) { p3.atk[cat][k] = n; lane += n; }
    p3.poolBy[cat] = Math.max(0, p3.poolBy[cat] - lane);
    p3.pool = Math.max(0, p3.pool - lane);
  }
  const out = { prog3: p3 };
  for (const k of BUILD_KEYS) out[k] = C.gear[k] ? { ...C.gear[k] } : null;
  return out;
}

/* ═══ THE DICE ═══
   _computeAttackDamage draws twice: the band (the hit's spread), then the
   crit (`Math.random() < chance`).  Held to `u` for the first draw and to
   `c` after it, one call gives the roll at that point of the band, with or
   without its crit.  DICE_SEEN keeps the most draws one roll made, for the
   suite (§2z: a roll that drew a third time would walk the wrong grid). */
const NO_CRIT = 1 - 1e-12;
const CRIT = 0;
export const DICE_SEEN = { max: 0 };
function withDice(u, c, fn) {
  const real = Math.random;
  let n = 0;
  Math.random = () => (n++ === 0 ? u : c);
  try { return fn(); } finally {
    Math.random = real;
    if (n > DICE_SEEN.max) DICE_SEEN.max = n;
  }
}

/* ═══ WHAT LANDS: _applyDamage's guards, in its order ═══
   Dodge misses the hit; Defense cuts what is left, never below the combined
   floor (FLOOR over what Dodge lets through); armour cuts after that; every
   step keeps at least 1.  Read against the attacker's level as an opponent,
   the edge (oneformula.js "the level edge both ways"). */
function guardOf(room, def, attackerLevel) {
  const dodge = room._prog3DodgePct(def, attackerLevel);
  const cut = Math.min(1, Math.max(room._prog3DefMult(def, attackerLevel), PROG3.FLOOR / Math.max(0.01, 1 - dodge)));
  return { land: 1 - dodge, cut, armour: room._armorDrMult(def) };
}
function landed(g, hit) {
  return Math.max(1, Math.max(1, hit * g.cut) * g.armour);
}

/** The mean of one roll, and of what lands of it on `def`: `{hit, taken}`. */
function meanHit(room, att, def, style, special, opts) {
  const S = STYLE[style];
  const tLvl = room._prog3OpponentLevel(def);
  const g = guardOf(room, def, room._prog3OpponentLevel(att));
  const pc = Math.max(0, Math.min(1, room._prog3CritChance(att, S.cat, tLvl)));
  const o = { targetLevel: tLvl, ...(opts || {}) };
  const K = POWER.DICE;
  let hNo = 0, hCrit = 0, tNo = 0, tCrit = 0;
  for (let i = 0; i < K; i++) {
    const u = (i + 0.5) / K;
    const a = Number(withDice(u, NO_CRIT, () => room._rollHit(att, S.slot, special, o)).dmg) || 0;
    const b = pc > 0 ? (Number(withDice(u, CRIT, () => room._rollHit(att, S.slot, special, o)).dmg) || 0) : a;
    hNo += a; hCrit += b;
    tNo += landed(g, a); tCrit += landed(g, b);
  }
  const mix = (x, y) => ((1 - pc) * x + pc * y) / K;
  return { hit: mix(hNo, hCrit), taken: g.land * mix(tNo, tCrit) };
}

/* The special each style throws, as its claims reach the worker: the sword's
   special swing, the bow's volley (three arrows, each `part: 3` of the
   special roll: BOW_VOLLEY_WORTH), the staff's big bolt (three orbs). */
const SPECIAL = Object.freeze({
  melee: Object.freeze({ n: 1, opts: null }),
  bow: Object.freeze({ n: 3, opts: Object.freeze({ part: 3 }) }),
  magic: Object.freeze({ n: 1, opts: Object.freeze({ bigBolt: true, orbs: 3 }) }),
});

/** One attack cycle of this style, ms: the held weapon's interval with the
 *  Speed stat's cut -- the worker's own readers of the phone's clock (the
 *  sword's free-swing cycle; the bow's, the flicked bow's over its
 *  BOW_FASTER, the held bow within a ms; the staff's gather). */
export function cycleMs(room, f, style) {
  if (style === 'melee') return room._fsCycleMs(f);
  if (style === 'bow') return room._pfBowCycleMs(f) / FREE_SWING.BOW_FASTER;
  return room._dgStaffCycleMs(f);
}

/** `att`'s side of the fight against `def` in one style: its mean blows and
 *  the time it needs to bring `def`'s full bar to nothing (ms; Infinity
 *  with no weapon in that hand). */
export function sideOf(room, att, def, style) {
  if (!att[STYLE[style].wpn]) return { ttk: Infinity, plain: 0, special: 0, cycle: 0, specials: 0 };
  const plain = meanHit(room, att, def, style, false, null).taken;
  const sp = SPECIAL[style];
  const special = sp.n * meanHit(room, att, def, style, true, sp.opts).taken;
  const cycle = Math.max(1, cycleMs(room, att, style));
  const cost = room._abilityCost(att, 'swipe');
  const specials = cost > 0 ? Math.floor((att.maxMana || 0) / cost) : 0;
  /* the burst: while the bar lasts, a special every SPECIAL_GAP_MS (or every
     cycle, if a cycle is longer), taking one swing's place in that window;
     then the weapon alone */
  const W = Math.max(POWER.SPECIAL_GAP_MS, cycle);
  const burstRate = (special + (W / cycle - 1) * plain) / W;
  const plainRate = plain / cycle;
  const B = specials * W;
  const hp = Math.max(1, def.maxHp || 1);
  const ttk = (specials > 0 && hp <= burstRate * B) ? hp / burstRate : B + (hp - burstRate * B) / plainRate;
  return { ttk, plain, special, cycle, specials };
}

/** The ratio a style's score is made of: the control's time to beat you
 *  over yours to beat it (0 when you cannot fight in that style). */
export function ratioOf(room, f, ctl, style) {
  const you = sideOf(room, f, ctl, style);
  if (!Number.isFinite(you.ttk) || !(you.ttk > 0)) return 0;
  const it = sideOf(room, ctl, f, style);
  return it.ttk / you.ttk;
}

/* the rating: 3,000 + 400 x log10(the odds), whole, at least 1 for a style
   the player can fight in; 0 for no weapon in that hand (r 0) */
const score = (r, alpha) => (r > 0 && Number.isFinite(r))
  ? Math.max(1, Math.round(POWER.RATING.CONTROL + POWER.RATING.PER_TENFOLD * alpha * Math.log10(r)))
  : 0;

/** The power index of a player's build: `{power, melee, bow, magic, v}` (the
 *  ratings), or null for a player the worker holds no trained skills for.
 *  `alpha` is for the suite; everything else reads POWER.ALPHA. */
export function powerOf(room, ps, alpha) {
  const f = fighterOf(room, ps);
  if (!f) return null;
  const ctl = fighterOf(room, controlBuild());
  const a = (typeof alpha === 'number' && alpha > 0) ? alpha : POWER.ALPHA;
  const out = { power: 0, melee: 0, bow: 0, magic: 0, v: POWER.V };
  for (const s of POWER.STYLES) {
    out[s] = score(ratioOf(room, f, ctl, s), a);
    if (out[s] > out.power) out.power = out[s];
  }
  return out;
}

/* The three ratios behind the scores, for the suite's fit (no exponent). */
export function ratiosOf(room, ps) {
  const f = fighterOf(room, ps);
  if (!f) return null;
  const ctl = fighterOf(room, controlBuild());
  const out = {};
  for (const s of POWER.STYLES) out[s] = ratioOf(room, f, ctl, s);
  return out;
}
