/* v2.3.3536: STAMINA REGEN, WORKED OUT BY THE WORKER (staminaregen.js,
 * docs/specs/stamina-regen.md).
 *   1. amuletStaminaRegenPct: a light gem's (4 + 3 x power) % at every tier,
 *      the game's own getAmuletBonus to the tenth; nothing for another gem,
 *      no amulet, junk, or a tier that is not one ('constructor', '__proto__').
 *   2. The regen tick, a new character (prog3) away from a hub: 7 a tick.
 *   3. The phone's claim of +100%, through both doors (a stats_update, and
 *      the join of a character on file), is still taken in -- and not read:
 *      still 7 a tick.
 *   4. A frozen Endurance on a prog3 character: still 7.
 *   5. A light amulet the worker made, through the forge's own craft and gem
 *      ops: the bonus the card prints, rounded up as the tick always did.
 *   6. `amuletregen: false`: the old tick, to the number.
 *   7. A character not on prog3 keeps its Endurance multiplier.
 * Convention: tick functions + handlers invoked directly, never
 * startTickLoop (the combat-lifecycle convention). */
import { GameRoom } from '../src/index.js';
import { amuletStaminaRegenPct, AMULET_STAMINA_REGEN } from '../src/staminaregen.js';
import { AMULET_TIERS, AMULET_GEM_STATS, getAmuletBonus } from '../../src/data/items.js';

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

// ── 1. the helper ──
{
  for (const tier of Object.keys(AMULET_TIERS)) {
    const mine = amuletStaminaRegenPct({ tier, gem: 'light' });
    const card = getAmuletBonus({ tier, gem: 'light' });
    check(`1: ${/^[aeiou]/.test(tier) ? 'an' : 'a'} ${tier} light amulet is the card's ${card && card.value}%`,
      card && card.stat === 'staminaRegen' && mine === card.value, { mine, card });
  }
  check('1: the light gem\'s row is the game\'s AMULET_GEM_STATS.light',
    AMULET_GEM_STATS.light.stat === 'staminaRegen'
    && AMULET_GEM_STATS.light.base === AMULET_STAMINA_REGEN.base
    && AMULET_GEM_STATS.light.perPower === AMULET_STAMINA_REGEN.perPower,
    { client: AMULET_GEM_STATS.light, server: AMULET_STAMINA_REGEN });
  check('1: simple 7, ornate 8.5, regal 10.6, mythic 13',
    amuletStaminaRegenPct({ tier: 'simple', gem: 'light' }) === 7
    && amuletStaminaRegenPct({ tier: 'ornate', gem: 'light' }) === 8.5
    && amuletStaminaRegenPct({ tier: 'regal', gem: 'light' }) === 10.6
    && amuletStaminaRegenPct({ tier: 'mythic', gem: 'light' }) === 13);
  const none = [
    null, undefined, 0, 'light', [], {},
    { tier: 'mythic' }, { tier: 'mythic', gem: null }, { tier: 'mythic', gem: 'flame' },
    { tier: 'mythic', gem: 'water' }, { tier: 'godly', gem: 'light' },
    { tier: 'constructor', gem: 'light' }, { tier: '__proto__', gem: 'light' },
    { tier: 'toString', gem: 'light' }, { gem: 'light' },
  ];
  const bad = none.filter((a) => amuletStaminaRegenPct(a) !== 0);
  check('1: no amulet, another gem, junk or a tier that is not one: 0', bad.length === 0, bad);
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town', ...(data || {}) } }));
  return room.sessions.get(ws);
}

/* One regen tick from 10 stamina, away from a hub (the hub top-off would add
   10% of the bar on top), nothing held, nothing sprinting. */
function tickGain(ps) {
  ps.z = 'meadow';
  ps.blocking = false;
  ps.stamina = 10;
  room._tickPlayerRegen();
  return ps.stamina - 10;
}

const wsA = fakeWs('a');
const sesA = await join(wsA, 'bp_sr_a');
const psA = room.playerState.bp_sr_a;

// ── 2. a new character ──
check('2: a new character is on prog3', !!psA.prog3, psA.prog3);
check('2: ...with no amulet and an Endurance of 0', !psA.amulet && (psA.endurance || 0) === 0,
  { amulet: psA.amulet, end: psA.endurance });
check('2: a regen tick away from a hub pays 7', tickGain(psA) === 7, psA.stamina);

// ── 3. the phone's claim is taken in and not read ──
{
  room._handleStatsUpdate(sesA, { amuletStaminaRegen: 100, amuletHpRegen: 100 });
  check('3: a stats_update\'s claim is still taken in, clamped (100)',
    psA.amuletStaminaRegen === 100 && psA.amuletHpRegen === 100,
    { st: psA.amuletStaminaRegen, hp: psA.amuletHpRegen });
  check('3: ...and the tick does not read it: still 7', tickGain(psA) === 7, psA.stamina);
  psA.amuletStaminaRegen = 0; psA.amuletHpRegen = 0;

  /* The other door: the join of a character on file re-reads the claim on
     every connect (anticheat §8 pins its 100 ceiling). */
  const wsB = fakeWs('b');
  const orig = room.state.storage.get;
  room.state.storage.get = async (k) => (k === 'rpg:bp_sr_b'
    ? { coins: 50, level: 3, xp: 0, inventory: {}, lifeSkills: {} } : orig(k));
  await join(wsB, 'bp_sr_b', { rpgAmuletStaminaRegen: 999, rpgAmuletHpRegen: 999 });
  room.state.storage.get = orig;
  const psB = room.playerState.bp_sr_b;
  check('3: a rejoin\'s claim is still taken in, clamped (100)',
    psB && psB.amuletStaminaRegen === 100, psB && psB.amuletStaminaRegen);
  check('3: ...the character on file is on prog3 and wears no amulet',
    psB && !!psB.prog3 && !psB.amulet, psB && { p3: !!psB.prog3, amulet: psB.amulet });
  check('3: ...and the tick does not read it: 7', psB && tickGain(psB) === 7, psB && psB.stamina);
  delete room.playerState.bp_sr_b;
  room.sessions.delete(wsB);
}

// ── 4. a frozen Endurance on a prog3 character ──
{
  psA.endurance = 500; // what a character from before prog3 might carry
  check('4: an Endurance of 500 on a prog3 character: still 7 (was 14)', tickGain(psA) === 7, psA.stamina);
  psA.endurance = 0;
}

// ── 5. a light amulet the worker made ──
{
  psA.goldBars = 10; psA.coins = 10000;
  room._handleAmuletForge(sesA, { op: 'craft', tierKey: 'simple' });
  check('5: the forge made a simple amulet', psA.amulet && psA.amulet.tier === 'simple' && psA.amulet.gem === null, psA.amulet);
  check('5: ...with no gem it adds nothing: 7', tickGain(psA) === 7, psA.stamina);
  psA.inventory = Object.assign(Object.create(null), psA.inventory || {}, { gem_light: 1 });
  room._handleAmuletForge(sesA, { op: 'gem', gem: 'light' });
  check('5: the forge set a light gem in it', psA.amulet && psA.amulet.gem === 'light', psA.amulet);
  const want = Math.ceil(7 * (1 + amuletStaminaRegenPct(psA.amulet) / 100));
  check('5: a simple light amulet (+7%): ceil(7 x 1.07) = 8', want === 8 && tickGain(psA) === 8, { want, got: psA.stamina - 10 });
  /* the tick's rounding (ceil) is what it always was: every tier of the gem
     is one more a tick at a base of 7 */
  for (const tier of ['ornate', 'regal', 'mythic']) {
    psA.amulet = { tier, gem: 'light', name: 'x' };
    const w = Math.ceil(7 * (1 + amuletStaminaRegenPct(psA.amulet) / 100));
    check(`5: ${/^[aeiou]/.test(tier) ? 'an' : 'a'} ${tier} light amulet: ceil(7 x ${1 + amuletStaminaRegenPct(psA.amulet) / 100}) = ${w}`, tickGain(psA) === w, psA.stamina - 10);
  }
  psA.amulet = { tier: 'mythic', gem: 'flame', name: 'x' };
  check('5: a flame amulet (elemental damage) adds nothing to stamina: 7', tickGain(psA) === 7, psA.stamina);
  psA.amulet = null;
}

// ── 6. the kill switch ──
{
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { amuletregen: false });
  psA.amuletStaminaRegen = 100;
  check('6: amuletregen false: the claim is read again, ceil(7 x 2) = 14', tickGain(psA) === 14, psA.stamina);
  psA.endurance = 500;
  check('6: ...and Endurance for everyone, ceil(7 x 2 x 2) = 28', tickGain(psA) === 28, psA.stamina);
  psA.amuletStaminaRegen = 0;
  psA.amulet = { tier: 'mythic', gem: 'light', name: 'x' };
  psA.endurance = 0;
  check('6: ...and the worker\'s own amulet is not (the claim of 0): 7', tickGain(psA) === 7, psA.stamina);
  psA.amulet = null;
  delete room._liveFlags.amuletregen;
  psA.amuletStaminaRegen = 100;
  check('6: switched back on: the claim is ignored again, 7', tickGain(psA) === 7, psA.stamina);
  psA.amuletStaminaRegen = 0;
}

// ── 7. a character not on prog3 ──
{
  const m3 = room._staminaRegenMults({ prog3: { v: 1 }, endurance: 500 });
  const m1 = room._staminaRegenMults({ endurance: 500 });
  check('7: Endurance multiplies only a character not on prog3 (1 against 2)',
    m3.endurance === 1 && m1.endurance === 2, { m3, m1 });
  check('7: the amulet\'s multiplier is the same either way (none: 1)',
    m3.amulet === 1 && m1.amulet === 1, { m3, m1 });
  check('7: a null player is x1 throughout',
    JSON.stringify(room._staminaRegenMults(null)) === JSON.stringify({ amulet: 1, endurance: 1 }), room._staminaRegenMults(null));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
