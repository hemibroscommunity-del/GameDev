/* Blocking costs stamina, and a broken guard stays broken (v2.3.1919).
 *
 * Owner: "Just make the shield have stamina cost that would prohibit
 * holding the shield up the whole time."
 *
 * Measured in a real duel before this version (tools/qa/mp/mp-duelfeel.mjs):
 * a defender holding the shield took 1.5 damage a swing for a full 40-second
 * round, against 11.8 unguarded, and never dropped it.  Three separate
 * things made that possible and all three are pinned here, because fixing
 * any one alone just moves the free block somewhere else:
 *
 *   1. the hold drain stopped at zero (`ps.stamina > 0`) and the blocker
 *      then fell into the REGEN arm — refilling while still holding;
 *   2. the auto-release set ps.blocking = false, and the client's next move
 *      packet (22ms later) set it straight back to true;
 *   3. a blocked PvP hit charged nothing at all, unlike a blocked monster
 *      hit, which has cost BLOCK_STAMINA_COST since v2.3.1731.
 */
import { GameRoom } from '../src/index.js';
import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from '../src/data.js';

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], closes: [], send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closes.push({ c, r }); } };
}
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 200, y: 200, z: 'town' } }));
}
const move = (ws, extra) => room.webSocketMessage(ws, JSON.stringify(Object.assign(
  { type: 'move', x: 200, y: 200, d: 'down', z: 'town' }, extra)));

check('the flag this whole suite depends on is ON (guard)', BLOCK_COSTS_STAMINA === true);

const wsA = fakeWs('atk'), wsB = fakeWs('def');
await join(wsA, 'bp_bc_a');
await join(wsB, 'bp_bc_b');
const A = room.playerState['bp_bc_a'], B = room.playerState['bp_bc_b'];
check('both players joined (guard)', !!A && !!B);

/* ── 1. holding the shield drains, and NEVER regenerates ── */
{
  B.maxStamina = 100; B.stamina = 100; B.blocking = true;
  B.maxHp = 500; B.hp = 500; B.dying = false;
  const seen = [];
  let ticksToBreak = 0;
  for (let i = 0; i < 40 && B.blocking; i++) { room._tickPlayerRegen(); seen.push(B.stamina); ticksToBreak++; }
  check('holding the shield drains stamina', seen[0] < 100, seen.slice(0, 3));
  /* Monotonic UNTIL the break, not forever: once the bar empties the guard
     breaks, the player is no longer blocking, and regenerating from then on
     is correct.  (The first cut of this assertion demanded it stay at zero
     and failed on exactly that healthy behaviour.) */
  check('...monotonically for as long as the shield is up',
    seen.every((v, i) => i === 0 || v <= seen[i - 1]), seen);
  check('...emptying the bar rather than levelling off', B.stamina === 0, { stamina: B.stamina, seen });
  /* A ~13 second hold on a 100 bar: long enough to read a wind-up, far too
     short to turtle a whole duel. */
  check('...taking a real but finite hold to do it (10-25 ticks)',
    ticksToBreak >= 10 && ticksToBreak <= 25, { ticksToBreak });
  /* THE LEAK: with the old `ps.stamina > 0` guard the blocker fell through
     to the regen arm at zero and refilled WHILE STILL HOLDING.  Forcing
     blocking back on (which is what the client used to achieve) must not
     buy any stamina back. */
  B.stamina = 0; B.blocking = true; B._guardBrokenUntil = 0;
  room._tickPlayerRegen();
  check('...and a blocker forced back to blocking at zero does NOT refill',
    B.stamina === 0, { now: B.stamina });
}

/* ── 2. emptying the bar breaks the guard, and the break is LATCHED ── */
{
  B.stamina = 4; B.blocking = true; B._guardBrokenUntil = 0;
  room._tickPlayerRegen();
  check('running the bar dry drops the shield', B.blocking === false, { stamina: B.stamina, blocking: B.blocking });
  check('...and stamps a guard break', B._guardBrokenUntil > Date.now(), B._guardBrokenUntil);
  /* This is the assertion the whole fix exists for: before the latch, the
     client's very next packet re-raised the shield milliseconds later. */
  await move(wsB, { blocking: true, ba: 0 });
  check('...that the client CANNOT cancel by re-asserting blocking',
    B.blocking === false, { blocking: B.blocking, until: B._guardBrokenUntil });
  await move(wsB, { blocking: true, ba: 0, x: 201 });
  check('...not on the next packet either', B.blocking === false, B.blocking);
  /* And it is a break, not a ban. */
  B._guardBrokenUntil = Date.now() - 1;
  await move(wsB, { blocking: true, ba: 0, x: 202 });
  check('once the break expires the shield can be raised again', B.blocking === true, B.blocking);
}

/* ── 3. a blocked PvP hit costs stamina ── */
{
  /* Consent, so the swing is allowed at all (v2.3.1917). */
  if (!room._pvpConsent) room._pvpConsent = new Map();
  room._pvpConsent.set(room._pvpPairKey('bp_bc_a', 'bp_bc_b'), Date.now() + 600000);
  room._pvpHitLanes = new Map();
  A.x = 0; A.y = 0; A.weapon = { type: 'sword', tierMult: 1 };
  A.dying = false; A.dead = false;
  B.x = 40; B.y = 0; B.agility = 0; B.dodging = false; B.dead = false; B.dying = false;
  B._zoneEntryGraceUntil = 0; B.maxHp = 5000; B.hp = 5000;
  B.maxStamina = 100; B.stamina = 100;
  /* Shield FACING the attacker: they stand at x=0 and the defender at x=40,
     so the bearing from defender to attacker is pi.  Getting this backwards
     produces `blocked:false` and looks exactly like a broken block. */
  B._guardBrokenUntil = 0; B.blocking = true; B.ba = Math.PI;
  /* v2.3.3264: raised a second ago, past the parry window -- a block in its
     first PARRY_WINDOW_MS is a PARRY against a player's blow too (§5) */
  B.blockStartT = Date.now() - 1000; A._staggerUntil = 0;
  room.stateHistory['bp_bc_b'] = [];
  room.eventBuffer.length = 0;
  const before = B.stamina;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('the blocked hit registered (guard)', !!hit && hit.payload.blocked === true, hit && hit.payload);
  const expected = Math.max(1, Math.round(BLOCK_STAMINA_COST * room._blockStaminaMult(B)));
  check('absorbing a hit on the shield costs stamina',
    B.stamina === before - expected, { before, after: B.stamina, expected });
  check('...and the hit itself still did no damage (block is full invuln)',
    B.hp === 5000, B.hp);
}

/* ── 4. a hit that empties the bar breaks the guard too ── */
{
  room._pvpHitLanes = new Map();
  B.stamina = 3; B.blocking = true; B.ba = Math.PI; B._guardBrokenUntil = 0; B.hp = 5000;
  B.blockStartT = Date.now() - 1000; A._staggerUntil = 0;   /* v2.3.3264: past the parry window */
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  check('a hit that empties the bar breaks the guard', B.blocking === false, { stamina: B.stamina, blocking: B.blocking });
  check('...latched against the client re-raising it', B._guardBrokenUntil > Date.now(), B._guardBrokenUntil);
  /* The point of the whole change: the NEXT swing is no longer blocked. */
  room._pvpHitLanes = new Map();
  await move(wsB, { blocking: true, ba: 0, x: 203 });
  room.eventBuffer.length = 0;
  const hpBefore = B.hp;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  const h2 = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('...so the follow-up swing lands for real damage',
    !!h2 && h2.payload.blocked === false && B.hp < hpBefore, { blocked: h2 && h2.payload.blocked, hpBefore, hp: B.hp });
}

/* ── 5. v2.3.3264: a block on time is a PARRY, against a player as against a monster ──
   Owner: "Yes the monster only extras should work on players too".  A block
   in the first PARRY_WINDOW_MS of raising the shield costs nothing, pays
   PARRY_STAMINA_REWARD and staggers whoever swung for PARRY_STAGGER_MS
   (pvpextras.js _pvpParry) -- their next blow is refused. */
{
  room._pvpHitLanes = new Map();
  A._staggerUntil = 0; A.dying = false; A.dead = false;
  B.stamina = 50; B.blocking = true; B.ba = Math.PI; B._guardBrokenUntil = 0; B.hp = 5000;
  B.blockStartT = Date.now() - 100;   /* raised 100 ms ago: inside the 250 ms window */
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  const parry = room.eventBuffer.find((e) => e.type === 'parry');
  check('a block on time is a parry: blocked, marked parried, no damage',
    !!hit && hit.payload.blocked === true && hit.payload.parried === true && B.hp === 5000, hit && hit.payload);
  check('...free, and it pays the parry\'s stamina back',
    B.stamina === 50 + room.PARRY_STAMINA_REWARD && !(hit && hit.payload.staminaDrain), { stamina: B.stamina, drain: hit && hit.payload.staminaDrain });
  check('...the parry event names the player who swung, and how long they are staggered',
    !!parry && parry.payload.attackerId === 'bp_bc_a' && parry.payload.targetId === 'bp_bc_b'
      && parry.payload.ms === room.PARRY_STAGGER_MS, parry && parry.payload);
  check('...who is staggered for PARRY_STAGGER_MS', A._staggerUntil === Date.now() + room.PARRY_STAGGER_MS || A._staggerUntil > Date.now(), A._staggerUntil);
  /* the staggered swing is refused: no event, no damage, even unblocked */
  room._pvpHitLanes = new Map();
  B.blocking = false; room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  check('...and their next blow is refused while they are', !room.eventBuffer.some((e) => e.type === 'pvp_hit') && B.hp === 5000,
    room.eventBuffer.map((e) => e.type));
  /* ...and an ability too */
  const wsA_sent = [];
  A.stamina = 100; A.shield = { name: 'Shield' };
  const origWs = room._wsBySessionId.bind(room);
  room._wsBySessionId = (id) => (id === 'bp_bc_a' ? { send: (m) => wsA_sent.push(JSON.parse(m)) } : origWs(id));
  room._handleAbility({ id: 'bp_bc_a' }, { kind: 'bash' });
  room._wsBySessionId = origWs;
  const rej = wsA_sent.find((m) => m.type === 'ability_rejected');
  check('...and their abilities, said so ("staggered"), nothing spent', !!rej && rej.payload.reason === 'staggered' && A.stamina === 100, { rej, stamina: A.stamina });
  /* with the extras off there is no parry against a player: the old block */
  A._staggerUntil = 0; room._pvpHitLanes = new Map();
  room._liveFlags = { pvpextras: false };
  B.stamina = 50; B.blocking = true; B.blockStartT = Date.now() - 100;
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, dmgBase: 20, critChance: 0 });
  const h3 = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('with pvpextras: false a block on time is an ordinary block (it costs stamina, nobody is staggered)',
    !!h3 && h3.payload.blocked === true && !h3.payload.parried && B.stamina < 50 && !(A._staggerUntil > Date.now()),
    { p: h3 && h3.payload, stamina: B.stamina, stag: A._staggerUntil });
  room._liveFlags = null;
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
