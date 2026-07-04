/* HP + Endurance grid test (v2.3.1154; BALANCE-PLAN spec Phases 2/4).
 * The last two build skills gained channel grids — this suite covers
 * the server-authoritative half:
 *   1.  Sanitizers: [0,50] channel clamp, unknown keys dropped, and the
 *       grid BUDGET clamp (sum(spec) <= governing stat) the weapon
 *       grids never had.
 *   2.  stats_update: grid fields land, vigor/stamina flip statsChanged
 *       (pools recompute the same tick), pools clamp [0,999].
 *   3.  Vigor: maxHp = floor((calcMaxHp + armorHp) × (1+pts×0.005)),
 *       cap +25%.
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
  check('stats_update: unspent pools clamp [0,999]', ps.hpUnspent === 6 && ps.enduranceUnspent === 999,
    { hp: ps.hpUnspent, en: ps.enduranceUnspent });
  check('stats_update: vigor recomputed maxHp the same tick (statsChanged)',
    ps.maxHp > hpBefore, { before: hpBefore, after: ps.maxHp });
  check('stats_update: stamina channel recomputed maxStamina the same tick',
    ps.maxStamina > stamBefore, { before: stamBefore, after: ps.maxStamina });
}

// ── 3+4. vigor / stamina formulas ──
{
  // v2.3.1156: coefficients halved with the 100-pt cap — cap values land
  // at exactly 100 points now.
  ps.armor = null;
  ps.hpSpec = { vigor: 100 };
  ps.enduranceSpec = { stamina: 100 };
  room._recomputeMaxes(ps);
  const baseHp = room._calcMaxHp(ps.level, ps.vitality);
  check('vigor: maxHp = floor(base × 1.25) at the 100-pt cap',
    ps.maxHp === Math.floor(baseHp * 1.25), { maxHp: ps.maxHp, base: baseHp });
  const baseStam = room._calcMaxStamina(ps.endurance);
  check('stamina channel: maxStamina = floor(base × 1.5) at the 100-pt cap',
    ps.maxStamina === Math.floor(baseStam * 1.5), { maxStamina: ps.maxStamina, base: baseStam });
  check('vigor: helper caps past 100 pts', Math.abs(room._vigorMult({ hpSpec: { vigor: 999 } }) - 1.25) < 1e-9);
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
  check('conditioning: 100 pts (the new cap) regen ~1.5x the base tick',
    condGain === Math.max(1, Math.ceil(plainGain * 1.5)) || condGain === Math.max(1, Math.ceil(7 * (1 + nowEnd * 0.002) * 1.5)),
    { plainGain, condGain });
}

// ── 6. recovery on discrete heals, NOT on lifesteal ──
{
  ps.hpSpec = { recovery: 100 };
  ps.enduranceSpec = {};
  room._recomputeMaxes(ps);
  // fish eat: cooked minnow heals ceil(_fishHealAmount × 1.5)
  ps.inventory = { cooked_fish_minnow: 1 };
  ps.hp = 1;
  const rawHeal = room._fishHealAmount('cooked_fish_minnow');
  room._handleEatRequest(session, { invKey: 'cooked_fish_minnow' });
  check('recovery: fish heal × 1.5 at the 100-pt cap',
    ps.hp === Math.min(ps.maxHp, 1 + Math.ceil(rawHeal * 1.5)), { hp: ps.hp, rawHeal });
  // second wind: heal fraction × recovery (40 pts = 20% at 0.5%/pt)
  ps.defenseSpec = { secondwind: 40 };
  ps._secondWindReadyAt = 0;
  ps.hp = Math.floor(ps.maxHp / 2);
  ps.agility = 0;
  const before = ps.hp;
  const r = room._applyDamage(ps, 10, false);
  check('recovery: second wind heal × 1.5 (survived unblocked hit)',
    r.secondWind === Math.round(ps.maxHp * 0.20 * 1.5), { got: r.secondWind, expect: Math.round(ps.maxHp * 0.20 * 1.5), before });
  ps.defenseSpec = {};
  // lifesteal: EXCLUDED from recovery — still exactly 90% of taken.
  ps.dmgFromMonster = { m1: 40 };
  ps.hp = 1;
  const ls = room._applyMeleeLifesteal({ ...ps, activeSlot: 'melee', dmgFromMonster: { m1: 40 }, hp: 1, maxHp: ps.maxHp, hpSpec: { recovery: 100 } }, 'm1');
  check('recovery: melee lifesteal refund stays 90% (NOT recovery-boosted)',
    ls.refund === Math.ceil(40 * 0.9), ls);
}

// ── 7. evasion shares the 30% dodge cap ──
{
  ps.hpSpec = {}; ps.defenseSpec = {};
  ps.agility = 375; // 375 × 0.0008 = 30% — capped from agility alone
  ps.enduranceSpec = { evasion: 50 };
  ps._zoneEntryGraceUntil = 0;
  const origRandom = Math.random;
  // A roll at 0.299999 dodges (under 30%); at 0.300001 it must NOT —
  // evasion cannot push the cap past 30%.
  Math.random = () => 0.299999;
  const dodged = room._applyDamage(ps, 5, false);
  ps.hp = ps.maxHp;
  Math.random = () => 0.300001;
  const hit = room._applyDamage(ps, 5, false);
  Math.random = origRandom;
  check('evasion: shared 30% cap — dodge at 29.9999%, hit at 30.0001% even with 50 evasion pts',
    dodged.dodged === true && hit.dodged === false, { dodged, hit });
  check('evasion: helper is +0.1%/pt (v2.3.1156)', Math.abs(room._evasionDodge({ enduranceSpec: { evasion: 10 } }) - 0.01) < 1e-9);
  ps.agility = 0;
}

// ── 8. lifeblood on the killing blow ──
{
  ps.hpSpec = { lifeblood: 50 };
  room._recomputeMaxes(ps);
  ps.z = 'meadow'; ps.x = 100; ps.y = 100;
  ps.hp = Math.floor(ps.maxHp / 2);
  const before = ps.hp;
  const m = { id: 'gr_m1', alive: true, hp: 0, maxHp: 10, xp: 5, gold: 0, level: 1, x: 100, y: 100, dmgByPlayer: { bp_gr_a: 10 } };
  room._resolveMonsterKill('meadow', m, 'bp_gr_a', ps, 'melee');
  check('lifeblood: killing blow heals 12.5% maxHp at the 50-pt cap (plus any lifesteal)',
    ps.hp >= Math.min(ps.maxHp, before + Math.round(ps.maxHp * 0.25 * 0.5)), { before, after: ps.hp, maxHp: ps.maxHp });
  ps.hpSpec = {};
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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
