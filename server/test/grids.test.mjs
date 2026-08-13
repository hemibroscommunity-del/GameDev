/* HP + Endurance grid test (v2.3.1154; BALANCE-PLAN spec Phases 2/4).
 * The last two build skills gained channel grids — this suite covers
 * the server-authoritative half:
 *   1.  Sanitizers: [0,50] channel clamp, unknown keys dropped, and the
 *       grid BUDGET clamp (sum(spec) <= governing stat) the weapon
 *       grids never had.
 *   2.  stats_update: grid fields land, vigor/stamina flip statsChanged
 *       (pools recompute the same tick), pools clamp [0,999].
 *   3.  Vigor: maxHp = floor((calcMaxHp + armorHp) × (1+pts×0.005)),
 *       cap +25%.  (Historical: Vigor went flat in v2.3.1343 and the
 *       armorHp term left the pool entirely in v2.3.1697 — armor is
 *       damage reduction now, pinned by tutorial.test §8.)
 *   4.  Stamina channel: maxStamina × (1+pts×0.01), cap +50%.
 *   5.  Conditioning: regen tick × (1+pts×0.01).
 *   6.  Recovery: multiplies the fish-eat heal and Second Wind — but
 *       NOT the melee-lifesteal refund (>100% refunds mint sustain).
 *   7.  Evasion: SHARES the 30% dodge cap with agility (§4 hard rule) —
 *       at the cap from agility alone, 50 evasion points add nothing.
 *   8.  Lifeblood: killing blow heals 0.5%/pt of maxHp, cap 25%.
 *   9.  Join backfill: a stored record with no grid fields gets pools
 *       backfilled to stat level minus spent (boundary-heal twin of the
 *       backfill-grid-points migration).
 * Convention: tick functions + handlers invoked directly, never
 * startTickLoop (the combat-lifecycle convention). */
import { GameRoom } from '../src/index.js';
/* v2.3.1451 (bench-locked T2): fixtures replay their specs through the
   real helper; assertions derive from the banked values. */
import { t2ReplayFlat as _replay, t2PointValue, t2BenchLevel, t2SpendLevel } from '../src/data.js';
import { computeBuildTotal } from '../src/migrations.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town', ...(data || {}) } }));
}

const ws = fakeWs('g');
await join(ws, 'bp_gr_a');
const ps = room.playerState['bp_gr_a'];

/* v2.3.1659 (prog3): every joining player is respecced onto the
   trained-skill track now.  THIS SUITE PINS THE LEGACY GRID PATH —
   still live code for any blob whose v10 migration fail-opens — so
   the fixture opts out of prog3 and re-derives the legacy pools.
   The new path's coverage lives in prog3.test.mjs. */
delete ps.prog3;
room._recomputeMaxes(ps);
const session = [...room.sessions.values()].find((s) => s.id === 'bp_gr_a');

// ── 1. sanitizers ──
{
  // v2.3.1156: channel clamp is the uniform 100; grid budget is
  // min(200, 2 x stat) in lockstep with the point-doubling migration.
  const spec = room._sanitizeHpSpec({ vigor: 500, recovery: -3, lifeblood: 7.9, junk: 50 }, { vitality: 200 });
  check('sanitize: [0,100] clamp + floor, unknown keys dropped',
    spec.vigor === 100 && spec.recovery === 0 && spec.lifeblood === 7 && !('junk' in spec), spec);
  const tight = room._sanitizeEnduranceSpec({ stamina: 60, conditioning: 50, swiftness: 50 }, { endurance: 60 });
  check('sanitize: budget clamp truncates in canonical order (sum <= 2x stat)',
    tight.stamina === 60 && tight.conditioning === 50 && tight.swiftness === 10, tight);
  check('sanitize: no ps -> no budget clamp (join sanitize path)',
    room._sanitizeHpSpec({ vigor: 50, recovery: 50 }).recovery === 50);
}

// ── 2. stats_update lands grid fields + recomputes pools same tick ──
{
  // A fresh player's stats clamp to _statCap(level 1) = 30, so the grid
  // budget is 2x30 = 60 per grid — the overspend below MUST truncate.
  room._handleStatsUpdate(session, { vitality: 40, endurance: 40 });
  check('stats_update: raw stats clamped to the level cap first (30 at L1-ish)',
    ps.vitality === 30 && ps.endurance === 30, { vit: ps.vitality, end: ps.endurance });
  const hpBefore = ps.maxHp;
  const stamBefore = ps.maxStamina;
  room._handleStatsUpdate(session, {
    hpSpec: { vigor: 50, recovery: 20, lifeblood: 10 },
    hpUnspent: 6,
    enduranceSpec: { stamina: 40, conditioning: 20, evasion: 10 },
    enduranceUnspent: 99999,
  });
  check('stats_update: grid specs stored, overspend truncated at the 2x-stat budget (60)',
    ps.hpSpec.vigor === 50 && ps.hpSpec.recovery === 10 && ps.hpSpec.lifeblood === 0
    && ps.enduranceSpec.stamina === 40 && ps.enduranceSpec.conditioning === 20 && ps.enduranceSpec.evasion === 0,
    { hp: ps.hpSpec, en: ps.enduranceSpec });
  // v2.3.1158: pools are DERIVED now — whenever a spec arrives the
  // handler recomputes canonical earned-minus-spent, overriding the
  // client-reported values (6 and 99999 both land at 60 earned − 60
  // spent = 0).  This is also the truncation consistency fix: the
  // budget-clipped points above are reflected in the pools the same
  // tick instead of waiting for the next reconnect's v7 migration.
  check('stats_update: pools recomputed canonically, client-reported values overridden',
    ps.hpUnspent === 0 && ps.enduranceUnspent === 0,
    { hp: ps.hpUnspent, en: ps.enduranceUnspent });
  check('stats_update: vigor recomputed maxHp the same tick (statsChanged)',
    ps.maxHp > hpBefore, { before: hpBefore, after: ps.maxHp });
  check('stats_update: stamina channel recomputed maxStamina the same tick',
    ps.maxStamina > stamBefore, { before: stamBefore, after: ps.maxStamina });
}

// ── 3+4. vigor / stamina formulas ──
{
  // v2.3.1451 (bench-locked): Vigor / Deep Lungs add their BANKED
  // flats from ps.t2Flat — fixtures replay through the real helper
  // and expectations derive from the banked values.
  ps.armor = null;
  ps.hpSpec = { vigor: 100 };
  ps.enduranceSpec = { stamina: 100 };
  ps.t2Flat = _replay(ps);
  const _vigFlat = ps.t2Flat.hp.vigor;
  const _stamFlat = ps.t2Flat.endurance.stamina;
  room._recomputeMaxes(ps);
  const baseHp = room._calcMaxHp(ps.level, ps.vitality);
  check('vigor: maxHp = floor(base + banked flat) at the 100-pt cap',
    _vigFlat > 0 && ps.maxHp === Math.floor(baseHp + _vigFlat), { maxHp: ps.maxHp, base: baseHp, _vigFlat });
  const baseStam = room._calcMaxStamina(ps.endurance);
  check('stamina channel: maxStamina = floor(base + banked flat) at the 100-pt cap',
    _stamFlat > 0 && ps.maxStamina === Math.floor(baseStam + _stamFlat), { maxStamina: ps.maxStamina, base: baseStam, _stamFlat });
  check('vigor: helper reads the server-owned accumulator, not point counts',
    room._vigorFlat({ hpSpec: { vigor: 999 }, t2Flat: { hp: { vigor: 777 } } }) === 777
    && room._vigorFlat({ hpSpec: { vigor: 999 } }) === 0);
}

// ── 5. conditioning regen ──
{
  ps.z = 'meadow';
  ps.blocking = false;
  ps.enduranceSpec = {};
  ps.amuletStaminaRegen = 0; ps.restoration = 0;
  room._recomputeMaxes(ps);
  ps.stamina = 10;
  const nowEnd = ps.endurance;
  room._tickPlayerRegen();
  const plainGain = ps.stamina - 10;
  ps.enduranceSpec = { conditioning: 100 };
  ps.stamina = 10;
  room._tickPlayerRegen();
  const condGain = ps.stamina - 10;
  check('conditioning: 100 pts (the cap) add +50 flat to the base tick (v2.3.1345)',
    condGain === plainGain + 50, { plainGain, condGain });
}

// ── 6. recovery on discrete heals, NOT on lifesteal ──
{
  // v2.3.1451 (bench-locked): Recovery adds its BANKED per-heal flat.
  ps.hpSpec = { recovery: 100 };
  ps.enduranceSpec = {};
  ps.t2Flat = _replay(ps);
  const _recFlat = ps.t2Flat.hp.recovery;
  room._recomputeMaxes(ps);
  // fish eat: cooked minnow heals ceil(_fishHealAmount × 1.5)
  ps.inventory = { cooked_fish_minnow: 1 };
  ps.hp = 1;
  const rawHeal = room._fishHealAmount('cooked_fish_minnow');
  room._handleEatRequest(session, { invKey: 'cooked_fish_minnow' });
  check('recovery: fish heal + the banked per-heal flat',
    _recFlat > 0 && ps.hp === Math.min(ps.maxHp, 1 + Math.ceil(rawHeal) + _recFlat), { hp: ps.hp, rawHeal, maxHp: ps.maxHp, _recFlat });
  // second wind: banked secondwind flat + Recovery's banked per-heal
  // bonus (recovery spec still 100 from the fish check above),
  // bounded by maxHp in _applyDamage.
  ps.defenseSpec = { secondwind: 40 };
  ps.t2Flat = _replay(ps);
  const _swFlat2 = ps.t2Flat.defense.secondwind;
  const _recFlat2 = ps.t2Flat.hp.recovery;
  ps._secondWindReadyAt = 0;
  ps.hp = Math.floor(ps.maxHp / 2);
  ps.agility = 0;
  const before = ps.hp;
  const r = room._applyDamage(ps, 10, false);
  check('recovery: second wind = banked secondwind flat + banked recovery flat (survived unblocked hit)',
    _swFlat2 > 0 && r.secondWind === _swFlat2 + _recFlat2, { got: r.secondWind, before, _swFlat2, _recFlat2 });
  ps.defenseSpec = {};
  ps.t2Flat = _replay(ps);
  // lifesteal: EXCLUDED from recovery — still exactly 90% of taken.
  ps.dmgFromMonster = { m1: 40 };
  ps.hp = 1;
  const ls = room._applyMeleeLifesteal({ ...ps, activeSlot: 'melee', dmgFromMonster: { m1: 40 }, hp: 1, maxHp: ps.maxHp, hpSpec: { recovery: 100 } }, 'm1');
  check('recovery: melee lifesteal refund stays 90% (NOT recovery-boosted)',
    ls.refund === Math.ceil(40 * 0.9), ls);
}

// ── 7. evasion shares the dodge cap (v2.3.1343: raised 30% -> 50%) ──
{
  ps.hpSpec = {}; ps.defenseSpec = {};
  ps.agility = 625; // 625 × 0.0008 = 50% — capped from agility alone
  ps.enduranceSpec = { evasion: 50 };
  ps._zoneEntryGraceUntil = 0;
  const origRandom = Math.random;
  // A roll at 0.499999 dodges (under 50%); at 0.500001 it must NOT —
  // evasion cannot push past the shared cap.
  Math.random = () => 0.499999;
  const dodged = room._applyDamage(ps, 5, false);
  ps.hp = ps.maxHp;
  Math.random = () => 0.500001;
  const hit = room._applyDamage(ps, 5, false);
  Math.random = origRandom;
  check('evasion: shared 50% cap — dodge at 49.9999%, hit at 50.0001% even with 50 evasion pts',
    dodged.dodged === true && hit.dodged === false, { dodged, hit });
  check('evasion: helper is +0.5%/pt (v2.3.1343)', Math.abs(room._evasionDodge({ enduranceSpec: { evasion: 10 } }) - 0.05) < 1e-9);
  ps.agility = 0;
}

// ── 8. lifeblood on the killing blow ──
{
  // v2.3.1451 (bench-locked): the kill heal is the BANKED flat.
  ps.hpSpec = { lifeblood: 50 };
  ps.t2Flat = _replay(ps);
  const _lbFlat = ps.t2Flat.hp.lifeblood;
  room._recomputeMaxes(ps);
  ps.z = 'meadow'; ps.x = 100; ps.y = 100;
  ps.hp = Math.floor(ps.maxHp / 2);
  const before = ps.hp;
  const m = { id: 'gr_m1', alive: true, hp: 0, maxHp: 10, xp: 5, gold: 0, level: 1, x: 100, y: 100, dmgByPlayer: { bp_gr_a: 10 } };
  room._resolveMonsterKill('meadow', m, 'bp_gr_a', ps, 'melee');
  check('lifeblood: killing blow heals the banked flat (plus any lifesteal)',
    _lbFlat > 0 && ps.hp >= Math.min(ps.maxHp, before + _lbFlat), { before, after: ps.hp, maxHp: ps.maxHp, _lbFlat });
  ps.hpSpec = {};
  ps.t2Flat = undefined;
}

// ── 9. join backfill (boundary heal for pre-grid stored records) ──
{
  // Simulate a pre-grid stored blob: strip the grid fields + stamp _v
  // as current so no migration interferes — the JOIN path must backfill.
  const saved = state._store.get('rpg:bp_gr_a');
  delete saved.hpSpec; delete saved.hpUnspent;
  delete saved.enduranceSpec; delete saved.enduranceUnspent;
  state._store.set('rpg:bp_gr_a', saved);
  // Fresh room instance = fresh playerState (reconnect semantics).
  const room2 = new GameRoom(state, mockEnv);
  const ws2 = fakeWs('g2');
  room2.sessions.set(ws2, baseSession());
  await room2.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'bp_gr_a', name: 'T', phrase: 'p-bp_gr_a', data: { x: -100000, y: -100000, z: 'town' } }));
  const ps2 = room2.playerState['bp_gr_a'];
  check('join backfill: absent pools backfill to min(200, 2x stat) minus spent (v2.3.1157 earn rate)',
    ps2.hpUnspent === Math.min(200, 2 * (ps2.vitality || 0)) && ps2.enduranceUnspent === Math.min(200, 2 * (ps2.endurance || 0)),
    { hpUnspent: ps2.hpUnspent, vit: ps2.vitality, enUnspent: ps2.enduranceUnspent, end: ps2.endurance });
  check('join backfill: specs default empty-sanitized objects',
    typeof ps2.hpSpec === 'object' && typeof ps2.enduranceSpec === 'object', { hp: ps2.hpSpec, en: ps2.enduranceSpec });
}

// ── 10. v2.3.1157: the 1000-point combat ceiling ──
{
  const all100 = (keys) => Object.fromEntries(keys.map((k) => [k, 100]));
  const forged = {
    weaponSpecs: {
      sword: all100(['edge', 'precision', 'executioner', 'tempo', 'cleave']),
      bow: all100(['drawPower', 'marksmanship', 'headshot', 'piercing', 'longshot']),
      staff: all100(['spellPower', 'overload', 'detonation', 'attunement', 'focus']),
    },
    defenseSpec: all100(['bulwark', 'ironskin', 'thorns', 'secondwind', 'poise']),
    hpSpec: all100(['vigor', 'recovery', 'lifeblood', 'resilience']),
    enduranceSpec: all100(['stamina', 'conditioning', 'swiftness', 'evasion', 'reflexes']),
  };
  const total = room._clampBuildTotal(forged);
  const sumAll = [
    ...Object.values(forged.weaponSpecs.sword), ...Object.values(forged.weaponSpecs.bow),
    ...Object.values(forged.weaponSpecs.staff), ...Object.values(forged.defenseSpec),
    ...Object.values(forged.hpSpec), ...Object.values(forged.enduranceSpec),
  ].reduce((a, v) => a + v, 0);
  check('build ceiling: 2900 forged points truncate to exactly 1000', total === 1000 && sumAll === 1000, { total, sumAll });
  check('build ceiling: truncation follows canonical grid order (sword+bow keep, staff onward zeroed)',
    forged.weaponSpecs.sword.edge === 100 && forged.weaponSpecs.bow.longshot === 100
    && forged.weaponSpecs.staff.spellPower === 0 && forged.defenseSpec.bulwark === 0
    && forged.hpSpec.vigor === 0 && forged.enduranceSpec.stamina === 0,
    forged.weaponSpecs.staff);
  // Under-ceiling builds pass through untouched.
  const modest = { defenseSpec: { ironskin: 100 }, hpSpec: { vigor: 40 } };
  check('build ceiling: under-1000 allocations untouched',
    room._clampBuildTotal(modest) === 140 && modest.defenseSpec.ironskin === 100 && modest.hpSpec.vigor === 40, modest);
}

// ── 11. v2.3.1158: mutation gate — no echo / no put on a no-op ──
{
  // Prime a known canonical state (hpUnspent 35 IS the canonical
  // 60 earned − 25 spent, so the re-send below is a true no-op).
  const payload = { vitality: 30, hpSpec: { vigor: 20, recovery: 5 }, hpUnspent: 35 };
  room._handleStatsUpdate(session, payload);
  const origPut = state.storage.put;
  let puts = 0;
  state.storage.put = async (k, v) => { puts++; return origPut(k, v); };
  const echoes = () => ws.sent.filter((m) => m.type === 'player_state').length;
  const echoesBefore = echoes();
  room._handleStatsUpdate(session, JSON.parse(JSON.stringify(payload)));
  check('mutation gate: identical re-send -> no player_state echo',
    echoes() === echoesBefore, { before: echoesBefore, after: echoes() });
  check('mutation gate: identical re-send -> no storage put', puts === 0, { puts });
  // A real change still persists + echoes.
  room._handleStatsUpdate(session, { hpSpec: { vigor: 21, recovery: 5 } });
  check('mutation gate: real change still echoes + persists',
    echoes() === echoesBefore + 1 && puts > 0, { echoes: echoes(), puts });
  state.storage.put = origPut;
  check('mutation gate: pool canonical after the spend (earned − 26 spent)',
    ps.hpUnspent === Math.min(200, 2 * ps.vitality) - 26,
    { hpUnspent: ps.hpUnspent, vit: ps.vitality });
}

// ── stat_allocate + build_point_earned (v2.3.1170: first wire-level
// coverage, added with the grids.js extraction) ──
{
  ws.sent.length = 0;
  ps.unspentT2 = 2;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'stat_allocate', payload: { stat: 'power' } }));
  const alloc = ws.sent.find((m) => m.type === 'stat_allocated');
  check('stat_allocate: decrements unspentT2 and echoes stat_allocated',
    ps.unspentT2 === 1 && alloc && alloc.payload.stat === 'power' && alloc.payload.newUnspentT2 === 1,
    { unspent: ps.unspentT2, alloc });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'stat_allocate', payload: { stat: 'ferocity' } }));
  check('stat_allocate: retired T2 stat rejected (v2.3.1155 list)', ps.unspentT2 === 1, ps.unspentT2);
  ps.unspentT2 = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'stat_allocate', payload: { stat: 'mind' } }));
  check('stat_allocate: zero unspentT2 is a clean no-op', ps.unspentT2 === 0, ps.unspentT2);

  // v2.3.1342 (level-is-build): a stat bump no longer moves combat
  // level — only PLACED T2 points do — so build_point_earned holds the
  // level flat (and therefore must NOT refill pools), while a
  // stats_update that lands one more placed point is +1 level and DOES
  // refill (the spend is the level-up moment).
  ps.power = 10; ps.vitality = 20; ps.endurance = 10; ps.agility = 10; ps.mind = 10;
  ps.defenseSkill = { level: 0, xp: 0 };
  ps.weaponSpecs = { sword: { edge: 50 } };
  ps.defenseSpec = {}; ps.hpSpec = { recovery: 10 }; ps.enduranceSpec = {};
  room._recomputeMaxes(ps);
  check('level-is-build: level = 1 + placed points (50 edge + 10 recovery)', ps.level === 61, ps.level);
  ps.hp = 1; ps.stamina = 1; ps.mana = 1;
  ps.vitality += 1; // the "stat went up on the client" the event signals
  await room.webSocketMessage(ws, JSON.stringify({ type: 'build_point_earned' }));
  check('build_point_earned: stat bump holds level flat, no pool refill',
    ps.level === 61 && ps.hp === 1 && ps.stamina === 1 && ps.mana === 1,
    { level: ps.level, hp: ps.hp });
  room._handleStatsUpdate(room.sessions.get(ws), { hpSpec: { recovery: 11 } });
  check('stats_update: one more placed point = +1 level and pools refill',
    ps.level === 62 && ps.hp === ps.maxHp && ps.stamina === ps.maxStamina && ps.mana === ps.maxMana,
    { level: ps.level, hp: ps.hp, maxHp: ps.maxHp });
}

// ── 11. v2.3.1451: BENCH-LOCKED T2 — the stats_update diff pricing ──
// The server owns ps.t2Flat: each ADDED post-clamp point banks
// t2PointValue at the level it was bought (level = 1 + points placed,
// ticking mid-batch); payload.t2Flat is never read; decreases scale
// proportionally; clamp-truncated points bank nothing.
{
  ps.weaponSpecs = {}; ps.defenseSpec = {}; ps.hpSpec = {}; ps.enduranceSpec = {};
  ps.t2Flat = undefined;
  ps.power = 10; ps.vitality = 20; ps.endurance = 10; ps.agility = 10; ps.mind = 10;

  // 1. single point priced at the PRE-spend level (fresh build: level 1).
  room._handleStatsUpdate(session, { weaponSpecs: { sword: { edge: 1 } } });
  const _p1 = t2PointValue('damage', t2BenchLevel(t2SpendLevel(0)));
  check('t2bench: first point banks t2PointValue at the level-1 benchmark',
    ps.t2Flat && ps.t2Flat.sword.edge === _p1, { got: ps.t2Flat && ps.t2Flat.sword.edge, _p1 });

  // 2. a batch that straddles the 10-point benchmark boundary prices
  // each point at its own position — identical to buying one at a time.
  room._handleStatsUpdate(session, { weaponSpecs: { sword: { edge: 9 } } });
  const _before = ps.t2Flat.sword.edge;
  room._handleStatsUpdate(session, { weaponSpecs: { sword: { edge: 13 } } });
  let _exp = 0;
  for (let placed = 9; placed < 13; placed++) _exp += t2PointValue('damage', t2BenchLevel(t2SpendLevel(placed)));
  check('t2bench: batch prices per point across the benchmark tick (placed 9→13)',
    ps.t2Flat.sword.edge === _before + _exp, { got: ps.t2Flat.sword.edge, want: _before + _exp });

  // 3. payload.t2Flat is NEVER read — a forged accumulator (with or
  // without a legit spec alongside) leaves the server's value alone
  // beyond the priced diff.
  const _pre3 = ps.t2Flat.sword.edge;
  room._handleStatsUpdate(session, { t2Flat: { sword: { edge: 999999 } } });
  check('t2bench: forged payload.t2Flat alone is ignored', ps.t2Flat.sword.edge === _pre3, ps.t2Flat.sword.edge);
  const _placedNow = computeBuildTotal(ps);
  room._handleStatsUpdate(session, { weaponSpecs: { sword: { edge: 14 } }, t2Flat: { sword: { edge: 999999 } } });
  check('t2bench: forged t2Flat riding a legit spend adds only the priced point',
    ps.t2Flat.sword.edge === _pre3 + t2PointValue('damage', t2BenchLevel(t2SpendLevel(_placedNow))), ps.t2Flat.sword.edge);

  // 4. decrease (stale echo — no player respec exists) scales the
  // banked value proportionally, deterministic on both sides.
  const _cur = ps.t2Flat.sword.edge; // 14 points banked
  room._handleStatsUpdate(session, { weaponSpecs: { sword: { edge: 6 } } });
  check('t2bench: count decrease scales the banked flat proportionally (14 → 6)',
    ps.t2Flat.sword.edge === Math.round(_cur * 6 / 14), { got: ps.t2Flat.sword.edge, want: Math.round(_cur * 6 / 14) });

  // 5. clamp-truncated points bank NOTHING: vitality 20 → grid budget
  // min(200, 40) = 40; a 50-point vigor claim sanitizes down to 40,
  // and exactly 40 points' value lands in the accumulator.
  const _placed5 = computeBuildTotal(ps);
  room._handleStatsUpdate(session, { hpSpec: { vigor: 50 } });
  let _expV = 0;
  for (let p = 0; p < 40; p++) _expV += t2PointValue('vigor', t2BenchLevel(t2SpendLevel(_placed5 + p)));
  check('t2bench: budget-truncated points never bank value (50 claimed, 40 priced)',
    ps.hpSpec.vigor === 40 && ps.t2Flat.hp.vigor === _expV,
    { vigor: ps.hpSpec.vigor, got: ps.t2Flat.hp.vigor, want: _expV });

  // 6. the banked flat is what combat reads: maxHp carries it via
  // _vigorFlat the same tick.
  check('t2bench: _vigorFlat reads the accumulator',
    room._vigorFlat(ps) === ps.t2Flat.hp.vigor, room._vigorFlat(ps));
  ps.weaponSpecs = {}; ps.hpSpec = {}; ps.t2Flat = undefined;
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
