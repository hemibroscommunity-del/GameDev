/* v2.3.3569: BROTOWN'S SAFE GROUND HEALS AS THE OLD TOWN DID, OUT OF A FIGHT
 * (server/src/safeheal.js, docs/specs/safe-ground-heal.md).
 *   1. Standing on the Wheel's safe ground, out of a fight: the hub's 10% of
 *      HP a regen tick, stamina and mana topped off by 10% too; empty to full
 *      in ten ticks (~7 s), where the wilds' trickle takes over 80 (~a minute).
 *   2. Just inside and just past the safe ground's edge: fast inside, the
 *      wilds' 1% trickle past it.
 *   3. A hit TAKEN in the last 6 s: no heal at all; 6 s on, the fast one.
 *   4. A hit DEALT in the last 6 s: none either (a fight at the town's edge).
 *   5. A duel on the safe ground: none of the three topped off; an arena
 *      match: no HP.
 *   6. Lil Bro's race: HP and mana as fast, stamina only its own trickle; a
 *      race left past its end time no longer counts; a sprint's hold wins.
 *   7. `safeheal: false`: the wilds' trickle again.
 *   8. A phone out of step with the room's Wheel: the trickle, not the hub.
 *   9. Unchanged elsewhere: the old town's 10% (no fight gate), the wilds'
 *      trickle, a dungeon.
 *  10. Rows: healing empty to full on the safe ground writes one rpg row,
 *      the regen tick's own coalesced save (handoff rule 4).
 * Convention: tick functions invoked directly, never startTickLoop. */
import { GameRoom } from '../src/index.js';
import { SAFE_HEAL } from '../src/safeheal.js';

function makeState() {
  const store = new Map();
  const puts = [];
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push(k); store.set(k, v); },
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
    _puts: puts,
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
const settle = () => new Promise((r) => setTimeout(r, 0));

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  return room.sessions.get(ws);
}

const wsA = fakeWs('a');
await join(wsA, 'bp_sh_a');
const ps = room.playerState.bp_sh_a;
const T = room._wheelT();
const [CX, CY] = T.WHEEL_CENTRE;
const R = T.WHEEL_SAFE_R;
const QUIET = room.SPOKE_REGEN_OOC_MS;

/* a spot r px from the Wheel's middle, due south (the town's arrival side) */
function stand(r, zone) {
  ps.z = zone || 'wheel';
  ps.x = CX;
  ps.y = CY + r;
}
/* hurt and drained, out of any fight for `quietMs` */
function hurt(quietMs) {
  const now = Date.now();
  ps.hp = 1;
  ps.stamina = 0;
  ps.mana = 0;
  ps.blocking = false;
  ps._guardBrokenUntil = 0;
  ps._sprintAt = 0;
  ps._race = null;
  ps._arenaMatch = null;
  ps.lastDamageAt = now - quietMs;
  ps._lastDealtAt = now - quietMs;
}
function tickGain() {
  const hp0 = ps.hp, st0 = ps.stamina, mn0 = ps.mana;
  room._tickPlayerRegen();
  return { hp: ps.hp - hp0, st: ps.stamina - st0, mn: ps.mana - mn0 };
}
const HUB_HP = Math.max(1, Math.ceil(ps.maxHp * 0.10));
const TRICKLE_HP = Math.max(1, Math.round(ps.maxHp * room.SPOKE_REGEN_PCT));
const HUB_ST = Math.max(1, Math.ceil(ps.maxStamina * 0.10));
const HUB_MN = Math.max(1, Math.ceil(ps.maxMana * 0.10));

check('0: the live flag is `safeheal`, lower case (liveops.js FLAG_NAME_RE)',
  SAFE_HEAL.FLAG === 'safeheal' && /^[a-z0-9_]+$/.test(SAFE_HEAL.FLAG));
check('0: a new character has every pool, on the long Wheel',
  ps.maxHp > 0 && ps.maxStamina > 0 && ps.maxMana > 0 && R > 0 && room._wheelInStep(ps),
  { hp: ps.maxHp, st: ps.maxStamina, mn: ps.maxMana, R });
check('0: a tick of the hub\'s heal is several of the trickle\'s (the gap this closes)', HUB_HP >= 5 * TRICKLE_HP,
  { HUB_HP, TRICKLE_HP });

// ── 1. the safe ground, out of a fight ──
{
  stand(R * 0.2);
  hurt(QUIET + 1000);
  const g = tickGain();
  check('1: a tick on the safe ground heals the hub\'s 10% of HP', g.hp === HUB_HP, { g, HUB_HP });
  check('1: ...tops stamina off by 10% of its bar (beside its own refill)', g.st >= HUB_ST, { g, HUB_ST });
  check('1: ...and mana by 10% of its bar', g.mn >= HUB_MN, { g, HUB_MN });
  hurt(QUIET + 1000);
  let n = 0;
  while (ps.hp < ps.maxHp && n < 200) { room._tickPlayerRegen(); n++; }
  check('1: empty to full in ten ticks (~7 s)', ps.hp === ps.maxHp && n <= 10, { n, hp: ps.hp });
  check('1: ...stamina and mana full with it', ps.stamina === ps.maxStamina && ps.mana === ps.maxMana,
    { st: ps.stamina, mn: ps.mana });
  stand(R * 0.2, 'meadow');
  hurt(QUIET + 1000);
  let m = 0;
  while (ps.hp < ps.maxHp && m < 400) { room._tickPlayerRegen(); m++; }
  check(`1: the wilds' trickle takes ${m} (about a minute)`, m >= 60, { m });
}

// ── 2. the edge ──
{
  stand(R - 40);
  hurt(QUIET + 1000);
  check('2: 40 px inside the edge: the hub\'s pace', tickGain().hp === HUB_HP);
  stand(R + 40);
  hurt(QUIET + 1000);
  check('2: 40 px past it: the wilds\' trickle', tickGain().hp === TRICKLE_HP);
  stand(R + 40);
  hurt(QUIET + 1000);
  const st = tickGain().st;
  check('2: ...and no stamina top-off past it (its own 7)', st < HUB_ST + 7 && st > 0, { st, HUB_ST });
}

// ── 3. a hit taken ──
{
  stand(R * 0.5);
  hurt(QUIET + 1000);
  ps.lastDamageAt = Date.now() - 3000;
  const g = tickGain();
  check('3: hit 3 s ago on the safe ground: no heal', g.hp === 0, g);
  check('3: ...and no top-off', g.mn < HUB_MN, g);
  ps.lastDamageAt = Date.now() - (QUIET + 500);
  check('3: 6.5 s on: the hub\'s pace', tickGain().hp === HUB_HP);
}

// ── 4. a hit dealt ──
{
  stand(R * 0.5);
  hurt(QUIET + 1000);
  ps._lastDealtAt = Date.now() - 2000;
  const g = tickGain();
  check('4: struck a monster 2 s ago: no heal', g.hp === 0 && g.mn < HUB_MN, g);
}

// ── 5. a duel, an arena match ──
{
  if (!room._duels) room._duels = new Map();
  room._duels.set('d-sh', { status: 'active', a: 'bp_sh_a', b: 'bp_sh_other' });
  stand(R * 0.2);
  hurt(QUIET + 1000);
  const g = tickGain();
  check('5: in a duel on the safe ground: no HP', g.hp === 0, g);
  check('5: ...no stamina top-off (its own refill only)', g.st > 0 && g.st < HUB_ST + 7, { g, HUB_ST });
  check('5: ...no mana top-off', g.mn < HUB_MN, { g, HUB_MN });
  room._duels.delete('d-sh');
  hurt(QUIET + 1000);
  ps._arenaMatch = { id: 'm-sh' };
  const a = tickGain();
  check('5: in an arena match: no HP', a.hp === 0, a);
  ps._arenaMatch = null;
}

// ── 6. Lil Bro's race, a sprint ──
{
  stand(R * 0.2);
  hurt(QUIET + 1000);
  ps._race = { t0: Date.now() - 1000, next: 0, lilMs: 24000, endBy: Date.now() + 50000 };
  const g = tickGain();
  check('6: racing: HP at the hub\'s pace', g.hp === HUB_HP, g);
  check('6: ...mana too', g.mn >= HUB_MN, g);
  check('6: ...but stamina only its own refill', g.st > 0 && g.st < HUB_ST + 7, { g, HUB_ST });
  hurt(QUIET + 1000);
  ps._race = { t0: Date.now() - 90000, next: 1, lilMs: 24000, endBy: Date.now() - 1000 };
  check('6: a race left past its end time no longer holds the stamina back', tickGain().st >= HUB_ST);
  hurt(QUIET + 1000);
  ps._sprintAt = Date.now();
  const s = tickGain();
  check('6: sprinting on the safe ground: no stamina at all (the drain wins)', s.st === 0, s);
  check('6: ...HP still heals', s.hp === HUB_HP, s);
  ps._sprintAt = 0;
}

// ── 7. the kill switch ──
{
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { safeheal: false });
  stand(R * 0.2);
  hurt(QUIET + 1000);
  const g = tickGain();
  check('7: `safeheal: false`: the wilds\' trickle', g.hp === TRICKLE_HP, g);
  check('7: ...and no top-off', g.mn < HUB_MN, g);
  room._liveFlags = Object.assign({}, room._liveFlags, { safeheal: true });
  hurt(QUIET + 1000);
  check('7: `safeheal: true` (or absent): on', tickGain().hp === HUB_HP);
  delete room._liveFlags.safeheal;
}

// ── 8. a phone out of step with the room's Wheel ──
{
  const keep = ps._wheelSizes;
  ps._wheelSizes = [room._wheelLongNow() === 1 ? 5 : 1];
  check('8: (the phone is out of step)', !room._wheelInStep(ps));
  stand(R * 0.2);
  hurt(QUIET + 1000);
  check('8: out of step: the trickle, not the hub', tickGain().hp === TRICKLE_HP);
  ps._wheelSizes = keep;
}

// ── 9. everywhere else as it was ──
{
  stand(0, 'town');
  hurt(0);
  ps.lastDamageAt = Date.now();
  check('9: the old town: 10% even straight after a hit (no gate there)', tickGain().hp === HUB_HP);
  stand(0, 'meadow');
  hurt(QUIET + 1000);
  check('9: the wilds: the trickle', tickGain().hp === TRICKLE_HP);
  stand(0, 'dungeon:sh');
  hurt(QUIET + 1000);
  check('9: a dungeon: the trickle', tickGain().hp === TRICKLE_HP);
}

// ── 10. rows written ──
{
  await settle();
  stand(R * 0.2);
  hurt(QUIET + 1000);
  ps._regenSaveAt = 0;
  ps._regenDirty = false;
  const before = state._puts.filter((k) => k === 'rpg:bp_sh_a').length;
  let n = 0;
  while (ps.hp < ps.maxHp && n < 50) { room._tickPlayerRegen(); n++; }
  await settle();
  const rows = state._puts.filter((k) => k === 'rpg:bp_sh_a').length - before;
  check('10: empty to full on the safe ground writes one rpg row', rows === 1, { rows, n });
  check('10: ...the rest wait for the coalesced write', ps._regenDirty === true || n === 1, { dirty: ps._regenDirty });
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nALL PASS');
