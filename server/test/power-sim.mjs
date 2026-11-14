/* ═══ v2.3.5480: THE DUEL SIMULATOR BEHIND THE POWER INDEX ═══
 * (power.test.mjs reads it; docs/specs/power-index.md has the study.)
 *
 * Two random honest characters trade blows until one falls, every number the
 * worker's own, called in-process on a real GameRoom:
 *   - a blow is the PvP roll (pvpbalance.js _pvpRollFor, the very function
 *     a `player_attack` reaches: combat.js _rollHit with the level edge
 *     against the target as an opponent), and a special is one only after
 *     the worker opened its window (_pvpSpecialPaid), as in the game;
 *   - it lands through THE door, combat.js _applyDamage: Dodge rolled on the
 *     dice, Defense under the combined floor, armour, every rounding;
 *   - mana refills on the worker's own regen tick (index.js
 *     _tickPlayerRegen, every REGEN_TICKS x the tick), in its in-combat rate
 *     because blows keep landing; health does not (the fight is marked an
 *     arena match, whose regen the worker holds, as a fight's is in No
 *     man's land by its five seconds);
 *   - the special's price is _abilityCost's block; the cycles are the ones
 *     the index reads (power.js cycleMs), and a special every
 *     POWER.SPECIAL_GAP_MS while the bar holds one, resetting the swing.
 *
 * WHAT IT LEAVES OUT -- positions (both stand and trade), so first of all a
 * bow or staff KITING a sword out of its reach (in No man's land the sword's
 * lunge closes that; docs/specs/pvp-fights.md has the fights with positions),
 * then: a roll's i-frames, the shield's block and parry, projectiles in
 * flight or missing, the staff's steering, food, a weapon gem's ticks and
 * statuses, a brew.  The index leaves out the same, plus the mana regained
 * in the fight and the dice themselves: what this measures is whether a
 * character's odds against ONE fixed control (the index) name the winner
 * between TWO characters who never met it.
 *
 * Deterministic: seed(n) seeds the duels' dice, the build generator and the
 * worker's Math.random alike; the worker's clock is the duel's.  Node only.
 */
import { GameRoom } from '../src/index.js';
import { REGEN_TICKS } from '../src/tick.js';
import { PROG3, prog3RespecPoints } from '../src/prog3.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../src/data.js';
import { POWER, cycleMs } from '../src/power.js';

/* ── determinism ── */
let _s = 1;
export function seed(n) { _s = (n >>> 0) || 1; }
export function rnd() {   /* mulberry32 */
  _s = (_s + 0x6D2B79F5) >>> 0;
  let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
let T = 1_900_000_000_000;
const realNow = Date.now;
const realRandom = Math.random;

/* ── the room: the worker, quiet (nothing it would send or save is a blow) ── */
export function makeRoom() {
  const store = new Map();
  const state = {
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(state, env);
  clearInterval(room.tickInterval); room.tickInterval = null;
  room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
  room._queuePlayerStateFlush = () => {}; room._sendPlayerState = () => {};
  return room;
}

/* ── a random honest character ── */
const BODY = Object.keys(PROG3.BODY);
const ATK = Object.keys(PROG3.ATK);
const METALS = Object.keys(BLACKSMITH_TIERS);
const WOODS = Object.keys(WOODWORKING_TIERS);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* points spread over `keys` the way a player who likes some stats more than
   others spends them (squared weights: a few favourites, the rest thin) */
function spread(total, keys) {
  const out = {};
  for (const k of keys) out[k] = 0;
  if (!(total > 0)) return out;
  const w = keys.map(() => rnd() ** 2);
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  let left = total;
  keys.forEach((k, i) => { const n = Math.floor(total * w[i] / sum); out[k] = n; left -= n; });
  out[pick(keys)] += left;
  return out;
}
/* the best material a character of this level has met: the lands' tiers
   (gathering.js _harvestNameForTier: levels 1-5, 6-10, 11-20, 21-30, 31-40) */
const landTier = (L) => (L <= 5 ? 0 : L <= 10 ? 1 : L <= 20 ? 2 : L <= 30 ? 3 : 4);
const lag = () => { const r = rnd(); return r < 0.6 ? 0 : r < 0.9 ? 1 : 2; };
const quality = () => { const r = rnd(); return r < 0.85 ? 'normal' : r < 0.97 ? 'rare' : 'elite'; };
const hardness = () => { const r = rnd(); return r < 0.75 ? 0 : r < 0.95 ? 1 : 2; };

/* the best wearable rung at or under `top` (the worker's own equip gate) */
function wear(room, ps, slot, make, top) {
  for (let r = top; r >= 0; r--) {
    const item = make(r);
    if (item && room._prog3EquipOk(ps, slot, item)) return item;
  }
  return make(0);
}

export function randomBuild(room, opts) {
  const o = opts || {};
  const L = o.level || (1 + Math.floor(rnd() * 40));
  const main = o.main || pick(PROG3.SKILLS);
  const p3 = { sk: {} };
  for (const cat of PROG3.SKILLS) {
    const lv = cat === main ? L : (rnd() < 0.5 ? 1 : 1 + Math.floor(rnd() * L));
    p3.sk[cat] = { level: lv, xp: 0 };
  }
  prog3RespecPoints(p3, false);
  /* most spend everything; some sit on part of it */
  const part = () => (rnd() < 0.75 ? 1 : rnd());
  const sh = Math.floor(p3.shared * part());
  Object.assign(p3.alloc, spread(sh, BODY));
  p3.shared -= sh;
  for (const cat of PROG3.SKILLS) {
    const n = Math.floor(p3.poolBy[cat] * part());
    Object.assign(p3.atk[cat], spread(n, ATK));
    p3.poolBy[cat] -= n; p3.pool -= n;
  }
  const ps = { prog3: p3 };
  room._prog3Recompute(ps);
  /* the copper blade and the pine bow and staff are where everyone starts
     (the tour); the metals and woods a rung past each land's */
  const lt = landTier(L);
  const metal = (r) => { const k = METALS[Math.max(1, Math.min(METALS.length - 1, r + 1))]; return { type: 'greatsword', gearBase: k, tierMult: BLACKSMITH_TIERS[k].tierMult, quality: quality(), hardness: hardness() }; };
  const wood = (type) => (r) => { const k = WOODS[Math.max(0, Math.min(WOODS.length - 1, r))]; return { type, gearBase: 'ww_' + k, tierMult: WOODWORKING_TIERS[k].tierMult, quality: quality(), hardness: hardness() }; };
  ps.weapon = wear(room, ps, 'weapon', metal, Math.max(0, lt - lag()));
  ps.rangedWeapon = wear(room, ps, 'rangedWeapon', wood('bow'), Math.max(0, lt - lag()));
  ps.staffWeapon = wear(room, ps, 'staffWeapon', wood('staff'), Math.max(0, lt - lag()));
  /* armour: copper, iron, black steel (armorforge.js), a rung behind now and then, sometimes none */
  const armTop = Math.min(3, 1 + Math.min(2, lt));
  const armour = (name) => {
    if (rnd() < 0.1) return null;
    const tm = Math.max(1, armTop - lag());
    const item = { name, mat: ['copper', 'iron', 'blacksteel'][tm - 1], tierMult: tm, quality: quality() };
    /* the worker gates both body pieces through its 'armor' slot (grids.js) */
    return room._prog3EquipOk(ps, 'armor', item) ? item : { name, mat: 'iron', tierMult: 2, quality: 'normal' };
  };
  ps.armor = armour('Torso');
  ps.legsArmor = armour('Greaves');
  ps.shield = { name: 'Pine Shield', gearBase: 'wood', tierMult: 1.0 };
  ps.amulet = null;
  if (rnd() < 0.15) {
    const am = { tier: L < 20 ? 'simple' : 'ornate', gem: pick(['storm', 'stone', 'flame', null]), name: 'Gold Amulet' };
    if (room._prog3EquipOk(ps, 'amulet', am)) ps.amulet = am;
  }
  return ps;
}

/* the weapon a character fights with: the skill they trained most (ties to
   the better weapon) */
const STYLE_OF = { sword: 'melee', bow: 'bow', staff: 'magic' };
const KIND = { melee: 'melee', bow: 'ranged', magic: 'staff' };
const WPN = { melee: 'weapon', bow: 'rangedWeapon', magic: 'staffWeapon' };
export function mainStyle(ps) {
  let best = null;
  for (const cat of PROG3.SKILLS) {
    const lv = ps.prog3.sk[cat].level;
    const w = ps[WPN[STYLE_OF[cat]]];
    const key = lv * 100 + ((w && w.tierMult) || 0);
    if (!best || key > best.key) best = { key, cat };
  }
  return STYLE_OF[best.cat];
}

/* a fresh copy of a build to fight with: full bars, nothing carried over */
function fighter(room, id, build) {
  const ps = { prog3: build.prog3, _buffs: {} };
  for (const k of ['weapon', 'rangedWeapon', 'staffWeapon', 'armor', 'legsArmor', 'shield', 'amulet']) ps[k] = build[k] || null;
  room._prog3Recompute(ps);
  ps.hp = ps.maxHp; ps.mana = ps.maxMana; ps.stamina = ps.maxStamina;
  ps.z = 'pw_duel'; ps._arenaMatch = true; ps.lastDamageAt = 0;
  room.playerState[id] = ps;
  return ps;
}

/* ── one duel, with dice: 1 if `a` wins, 0 if `b` does, 0.5 if neither falls in MAX_MS ── */
const MAX_MS = 300_000;
export function duel(room, a, b, styleA, styleB) {
  Date.now = () => T;
  Math.random = rnd;
  try {
    room.playerState = {};
    const F = [
      { id: 'pw_a', ps: fighter(room, 'pw_a', a), style: styleA || mainStyle(a) },
      { id: 'pw_b', ps: fighter(room, 'pw_b', b), style: styleB || mainStyle(b) },
    ];
    const t0 = T;
    const regenMs = REGEN_TICKS * room.TICK_RATE;
    let nextRegen = t0 + regenMs;
    for (const f of F) {
      f.cycle = Math.max(1, cycleMs(room, f.ps, f.style));
      f.cost = room._abilityCost(f.ps, 'swipe');
      f.lastSpecial = -Infinity;
      f.next = t0;
      f.armed = !!f.ps[WPN[f.style]];
    }
    /* who swings first when both are ready together: a coin */
    const first = rnd() < 0.5 ? 0 : 1;
    while (T - t0 < MAX_MS) {
      const ready = (f) => {
        if (!f.armed) return Infinity;
        const sp = f.ps.mana >= f.cost ? Math.max(f.lastSpecial + POWER.SPECIAL_GAP_MS, T) : Infinity;
        return Math.min(f.next, sp);
      };
      const ra = ready(F[0]), rb = ready(F[1]);
      const tNext = Math.min(ra, rb, nextRegen);
      if (!Number.isFinite(tNext)) return 0.5;
      T = Math.max(T, tNext);
      if (T >= nextRegen && nextRegen <= Math.min(ra, rb)) { room._tickPlayerRegen(); nextRegen += regenMs; continue; }
      const order = ra === rb ? (first === 0 ? [0, 1] : [1, 0]) : (ra < rb ? [0] : [1]);
      for (const i of order) {
        const att = F[i], tgt = F[1 - i];
        if (ready(att) > T) continue;
        const special = att.ps.mana >= att.cost && T - att.lastSpecial >= POWER.SPECIAL_GAP_MS;
        const kind = KIND[att.style];
        const tLvl = room._prog3OpponentLevel(tgt.ps);
        const aLvl = room._prog3OpponentLevel(att.ps);
        const blows = [];
        if (special) {
          att.ps.mana -= att.cost;
          room._pvpSpecialPaid(att.ps, T);
          att.lastSpecial = T;
          if (att.style === 'bow') for (let k = 0; k < 3; k++) blows.push({ part: 3 });
          else if (att.style === 'magic') blows.push({ orbs: 3 });
          else blows.push({});
        } else blows.push({});
        att.next = T + att.cycle;   /* playerActions: the special spends the swing clock too */
        for (const payload of blows) {
          const r = room._pvpRollFor(att.ps, kind, special, payload, tLvl);
          room._applyDamage(tgt.ps, r.dmg, false, { attackerLevel: aLvl });
          if (tgt.ps.hp <= 0) return i === 0 ? 1 : 0;
        }
        if (special) room._pvpSpecialSpent(att.ps, room._pvpSpecialCost(kind, blows[0]));
      }
    }
    return 0.5;
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
    room.playerState = {};
  }
}
