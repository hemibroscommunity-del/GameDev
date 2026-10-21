/* A REAL REST, AND THE HOTEL OPENS -- v2.3.3539 (docs/specs/hotel-rest.md).
 *
 * The owner: "I value SIMPLICITY and INTELLIGIBILITY".  The farm's bed rested
 * you on the phone alone (its bars put back by the next echo, a +10% XP the
 * worker never paid), so the Hotel stood shut.  The worker pays the rest now
 * (server/src/rest.js):
 *
 *   1. At the Hotel's door, in the Wheel this room plays (either size): full
 *      health, stamina and mana, Well Rested for 30 minutes, saved (one row)
 *      and echoed, answered rest_result {ok, until, ms, where}.
 *   2. On your farm: the same.
 *   3. Refused, each answered and nothing changed or written: away from the
 *      Hotel, the wrong place for `where`, an unknown `where`, a blow dealt or
 *      taken in the last 10 s, a fight with a player, a second rest within a
 *      minute; a dead player is answered nothing.
 *   4. Well Rested pays: +10% of the XP a fight pays, adding to the Pumpkin
 *      Pie's (both +20%), never a flat award, nothing once it runs out; a meal
 *      or a brew never clears it, and it outlives a reconnect.
 *   5. `rest: false`: answered 'off', nobody rested, no Well Rested XP, and
 *      caps.rest false at the next join (true otherwise).
 *   6. The wire: rest_request is routed (not relayed), rest_result is
 *      privileged.
 *   7. The page (src/game/rest.js): asks only a worker that rests, only for
 *      'hotel' or 'farm', one ask at a time; says what came back in the
 *      worker's terms; mirrors Well Rested only against a worker that rests. */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { REST } from '../src/rest.js';
import { PROG3 } from '../src/prog3.js';
import * as LONG from '../src/wheelspawns.js';
import * as SHORT from '../src/wheelspawns1.js';
import * as RS from '../../src/game/rest.js';

function makeState() {
  const store = new Map();
  let puts = 0;
  return {
    _store: store,
    _puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => {
        if (typeof k === 'string' && k.startsWith('rpg:')) puts++;
        store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function makeRoom(flags) {
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  if (flags) room._liveFlags = flags;
  return { room, state };
}
async function join(room, ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  return room.sessions.get(ws);
}
async function send(room, ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const answerOf = (ws) => (ws.sent.find((m) => m.type === 'rest_result') || {}).payload || null;

/* a player worn down, out of every fight, standing at the Hotel's door of the
   Wheel this room plays */
function atHotel(room, P, dx, dy) {
  const c = room._wheelT().WHEEL_CENTRE;
  P.z = 'wheel';
  P.x = c[0] + REST.HOTEL[0] + (dx || 0);
  P.y = c[1] + REST.HOTEL[1] + (dy || 0);
}
function worn(P) {
  P.dead = false; P.dying = false;
  P.maxHp = 900; P.hp = 120; P.maxStamina = 100; P.stamina = 7; P.maxMana = 80; P.mana = 3;
  P.lastDamageAt = 0; P._lastDealtAt = 0; P._restAt = 0;
  if (P._buffs) delete P._buffs.wellRested;
}

// ── 1. at the Hotel, on either Wheel ──
for (const long of [LONG.WHEEL_LONG, SHORT.WHEEL_LONG]) {
  const { room, state } = await makeRoom();
  const ws = fakeWs();
  await join(room, ws, 'bp_rest_a');
  const P = room.playerState.bp_rest_a;
  room._wheelLong = long;
  check(`1 (${long}x): the room plays the Wheel asked for (guard)`, room._wheelT().WHEEL_LONG === long);
  worn(P);
  atHotel(room, P, 40, 150);   /* standing at the door: your middle ~155 px from its foot */
  const puts0 = state._puts();
  const t0 = Date.now();
  await send(room, ws, 'rest_request', { where: 'hotel' });
  const a = answerOf(ws);
  check(`1 (${long}x): at the Hotel's door a rest fills health, stamina and mana`,
    P.hp === 900 && P.stamina === 100 && P.mana === 80, { hp: P.hp, st: P.stamina, mana: P.mana });
  check(`1 (${long}x): ...and starts Well Rested for 30 minutes`,
    REST.MS === 30 * 60 * 1000 && P._buffs.wellRested >= t0 + REST.MS && P._buffs.wellRested <= Date.now() + REST.MS, P._buffs);
  check(`1 (${long}x): ...answered rest_result {ok, until, ms, where}`,
    !!a && a.ok === true && a.until === P._buffs.wellRested && a.ms === REST.MS && a.where === 'hotel', a);
  const echo = ws.sent.find((m) => m.type === 'player_state');
  check(`1 (${long}x): ...the bars and Well Rested echoed in player_state`,
    !!echo && echo.payload.hp === 900 && echo.payload._buffs && echo.payload._buffs.wellRested === P._buffs.wellRested, echo && echo.payload._buffs);
  const saved = state._store.get('rpg:bp_rest_a');
  check(`1 (${long}x): ...saved, one row`,
    state._puts() - puts0 === 1 && !!saved && saved._buffs && saved._buffs.wellRested === P._buffs.wellRested, { puts: state._puts() - puts0 });
  check(`1 (${long}x): ...and the in-memory clock never saved`, !!saved && !('_restAt' in saved), saved && Object.keys(saved).filter((k) => /rest/i.test(k)));
}

const { room, state } = await makeRoom();
const ws = fakeWs();
await join(room, ws, 'bp_rest_b');
const P = room.playerState.bp_rest_b;

// ── 2. on your farm ──
{
  worn(P);
  P.z = 'farm_home'; P.x = 132; P.y = 500;
  await send(room, ws, 'rest_request', { where: 'farm' });
  const a = answerOf(ws);
  check('2: on your farm the bed rests you the same', !!a && a.ok && a.where === 'farm' && P.hp === 900 && P.stamina === 100 && P.mana === 80
    && P._buffs.wellRested > Date.now(), { a, hp: P.hp });
}

// ── 3. refusals ──
async function refused(label, setup, payload, err) {
  worn(P);
  setup();
  const puts0 = state._puts();
  const before = JSON.stringify([P.hp, P.stamina, P.mana, P._buffs && P._buffs.wellRested]);
  await send(room, ws, 'rest_request', payload);
  const a = answerOf(ws);
  const after = JSON.stringify([P.hp, P.stamina, P.mana, P._buffs && P._buffs.wellRested]);
  check(`3: ${label} -- refused '${err}', nothing changed or written`,
    !!a && a.ok === false && a.err === err && before === after && state._puts() === puts0, { a, before, after, puts: state._puts() - puts0 });
  return a;
}
await refused('300 px from the Hotel\'s door', () => atHotel(room, P, 0, REST.HOTEL_R + 40), { where: 'hotel' }, 'where');
await refused('at the Hotel\'s spot in today\'s town, not the Wheel', () => { atHotel(room, P); P.z = 'town'; }, { where: 'hotel' }, 'where');
await refused('"farm" asked in the Wheel', () => atHotel(room, P), { where: 'farm' }, 'where');
await refused('"hotel" asked on the farm', () => { P.z = 'farm_home'; P.x = 132; P.y = 500; }, { where: 'hotel' }, 'where');
await refused('no `where`', () => atHotel(room, P), {}, 'where');
await refused('an unknown `where`', () => atHotel(room, P), { where: '__proto__' }, 'where');
await refused('hit by a monster 3 s ago', () => { atHotel(room, P); P.lastDamageAt = Date.now() - 3000; }, { where: 'hotel' }, 'fight');
await refused('a hit landed 9 s ago', () => { atHotel(room, P); P._lastDealtAt = Date.now() - 9000; }, { where: 'hotel' }, 'fight');
await refused('in a fight with a player (a hit between players 2 s ago)', () => { atHotel(room, P); room._pvpHealClock('bp_rest_b').pvpAt = Date.now() - 2000; }, { where: 'hotel' }, 'fight');
room._pvpHealClock('bp_rest_b').pvpAt = 0;
{
  /* 11 s after the last blow is no fight */
  worn(P); atHotel(room, P); P.lastDamageAt = Date.now() - 11000;
  await send(room, ws, 'rest_request', { where: 'hotel' });
  const a = answerOf(ws);
  check('3: 11 s after the last blow, a rest is taken', !!a && a.ok === true, a);
  /* ...and a second within the minute is not, saying how long */
  P.hp = 5;
  await send(room, ws, 'rest_request', { where: 'hotel' });
  const b = answerOf(ws);
  check('3: a second rest within a minute -- refused \'soon\' with the wait, the bar left alone',
    !!b && b.ok === false && b.err === 'soon' && b.wait > 0 && b.wait <= REST.GAP_MS && P.hp === 5, b);
  /* a minute later it is */
  P._restAt = Date.now() - REST.GAP_MS - 1;
  await send(room, ws, 'rest_request', { where: 'hotel' });
  check('3: ...a minute on, it is', (answerOf(ws) || {}).ok === true && P.hp === P.maxHp, answerOf(ws));
}
{
  worn(P); atHotel(room, P); P.dead = true;
  const puts0 = state._puts();
  await send(room, ws, 'rest_request', { where: 'hotel' });
  check('3: a dead player is answered nothing and rested not at all', answerOf(ws) === null && P.hp === 120 && state._puts() === puts0, ws.sent.map((m) => m.type));
  P.dead = false;
}

// ── 4. Well Rested pays ──
{
  const sk = P.prog3 && P.prog3.sk && P.prog3.sk.sword;
  check('4: the character has a sword skill to train (guard)', !!sk, P.prog3);
  /* XP from 10 damage, in a skill well below its next level */
  const gain = (opts) => {
    sk.level = 50; sk.xp = 0;
    room._prog3AwardXp('bp_rest_b', P, 'sword', 10, opts);
    return sk.xp;
  };
  P._buffs = {};
  const plain = gain();
  P._buffs.wellRested = Date.now() + 60000;
  const rested = gain();
  check(`4: Well Rested pays +10% of a fight's XP (${plain} -> ${rested})`,
    Math.abs(plain - 10 * PROG3.XP_PER_DMG) < 1e-9 && Math.abs(rested - plain * 1.10) < 1e-9, { plain, rested });
  P._buffs.xp = Date.now() + 60000; P._buffs.xpMul = 1.10;
  const both = gain();
  check(`4: ...and adds to the Pumpkin Pie's: both pay +20% (${both})`, Math.abs(both - plain * 1.20) < 1e-9, { both, plain });
  delete P._buffs.xp; delete P._buffs.xpMul;
  const flatR = gain({ flat: true });
  check('4: ...never a flat award (a quest\'s XP)', flatR === 10, flatR);
  P._buffs.wellRested = Date.now() - 1;
  check('4: ...nothing once it runs out', Math.abs(gain() - plain) < 1e-9);
  /* a meal or a brew clears its own slot only */
  P._buffs.wellRested = Date.now() + 60000;
  room._clearBuffSlot(P, 'meal'); room._clearBuffSlot(P, 'brew');
  check('4: a meal or a brew never clears Well Rested', P._buffs.wellRested > Date.now(), P._buffs);
  /* a reconnect keeps it: the saved _buffs come back at the join */
  worn(P); atHotel(room, P);
  await send(room, ws, 'rest_request', { where: 'hotel' });
  const until = P._buffs.wellRested;
  const ws2 = fakeWs();
  await join(room, ws2, 'bp_rest_b');
  const P2 = room.playerState.bp_rest_b;
  check('4: Well Rested outlives a reconnect (saved, read back at the join)', !!P2 && P2._buffs && P2._buffs.wellRested === until, P2 && P2._buffs);
}

// ── 5. the switch ──
{
  const ws3 = fakeWs();
  await join(room, ws3, 'bp_rest_c');
  const P3 = room.playerState.bp_rest_c;
  const sync = ws3.sent.find((m) => m.type === 'state_sync');
  check('5: caps.rest says the worker rests', !!sync && sync.caps && sync.caps.rest === true, sync && sync.caps && sync.caps.rest);
  room._liveFlags = { rest: false };
  worn(P3); atHotel(room, P3);
  const puts0 = state._puts();
  await send(room, ws3, 'rest_request', { where: 'hotel' });
  const a = answerOf(ws3);
  check('5: rest: false -- refused \'off\', nobody rested, nothing written',
    !!a && a.ok === false && a.err === 'off' && P3.hp === 120 && !(P3._buffs && P3._buffs.wellRested) && state._puts() === puts0, a);
  const sk = P3.prog3.sk.sword;
  P3._buffs = { wellRested: Date.now() + 60000 };
  sk.level = 50; sk.xp = 0;
  room._prog3AwardXp('bp_rest_c', P3, 'sword', 10);
  check('5: ...and pays no Well Rested XP', Math.abs(sk.xp - 10 * PROG3.XP_PER_DMG) < 1e-9, sk.xp);
  const ws4 = fakeWs();
  await join(room, ws4, 'bp_rest_d');
  const sync4 = ws4.sent.find((m) => m.type === 'state_sync');
  check('5: ...and caps.rest is false at the next join', !!sync4 && sync4.caps && sync4.caps.rest === false, sync4 && sync4.caps && sync4.caps.rest);
  room._liveFlags = {};
}

// ── 6. the wire ──
{
  check('6: rest_result is privileged (a relayed one would tell another player they had rested)', PRIVILEGED_EVENTS.has('rest_result'));
  const ws5 = fakeWs(), ws6 = fakeWs();
  await join(room, ws5, 'bp_rest_e');
  await join(room, ws6, 'bp_rest_f');
  const P5 = room.playerState.bp_rest_e;
  worn(P5); atHotel(room, P5);
  ws6.sent.length = 0;
  room.broadcast = ((orig) => function (m, ...rest) { if (m && m.type === 'rest_request') ws6.sent.push({ type: 'relayed' }); return orig.call(this, m, ...rest); })(room.broadcast);
  await send(room, ws5, 'rest_request', { where: 'hotel' });
  check('6: rest_request is routed to the rest and never relayed', (answerOf(ws5) || {}).ok === true && !ws6.sent.some((m) => m.type === 'relayed' || m.type === 'rest_request'),
    ws6.sent.map((m) => m.type));
}

// ── 7. the page (src/game/rest.js) ──
{
  const sent = [];
  const S = { channel: { send: (m) => sent.push(m) }, _serverCaps: { rest: true }, rpg: {} };
  check('7: the page asks a worker that rests, for the Hotel', RS.requestRest(S, 'hotel', 1000) === true && sent.length === 1
    && sent[0].type === 'rest_request' && sent[0].payload.where === 'hotel', sent);
  check('7: ...one ask at a time (a second within 4 s waits for the answer)', RS.requestRest(S, 'hotel', 2000) === false && sent.length === 1);
  check('7: ...and asks again once answered', (RS.onRestResult(S, { ok: false, err: 'fight' }, {}), RS.requestRest(S, 'farm', 2100) === true && sent[1].payload.where === 'farm'), sent);
  S._restAsked = 0;
  check('7: ...never for an unknown place', RS.requestRest(S, 'tavern', 9000) === false && RS.requestRest(S, '__proto__', 9000) === false && sent.length === 2);
  const old = { channel: { send: (m) => sent.push(m) }, _serverCaps: {}, rpg: {} };
  check('7: ...and never asks a worker that does not rest', RS.requestRest(old, 'hotel', 1) === false && sent.length === 2 && !RS.restOn(old) && !RS.restMapsBuffs(old) && RS.restMapsBuffs(S));
  const said = [], played = [];
  const out = { say: (t, c, dy) => said.push(t), sound: (n) => played.push(n) };
  RS.onRestResult(S, { ok: true, until: 5000 + REST.MS, ms: REST.MS, where: 'hotel' }, out);
  check('7: a rest is said ("Fully Rested!", "+10% combat XP for 30 min"), heard, and its Well Rested kept',
    said.join('|') === 'Fully Rested!|+10% combat XP for 30 min' && played.join() === 'rested' && S.rpg._wellRestedUntil === 5000 + REST.MS
      && RS.wellRestedLeft(S, 5000) === REST.MS && RS.restLeftWords(RS.wellRestedLeft(S, 5000)) === '30 min' && RS.wellRestedLeft(S, 5000 + REST.MS) === 0,
    { said, played, until: S.rpg._wellRestedUntil });
  const words = ['fight', 'soon', 'where', 'off', 'bogus', undefined].map((err) => RS.restResultLines({ ok: false, err })[0].text);
  check('7: a refusal says why in plain words', words.join('|') === "Can't rest in a fight|You just rested|Rest at the Hotel or on your farm|Can't rest right now|Can't rest right now|Can't rest right now", words);
  check('7: the page\'s numbers are the worker\'s', RS.REST_MS === REST.MS && RS.REST_XP_PCT === Math.round(REST.XP * 100), { page: [RS.REST_MS, RS.REST_XP_PCT], worker: [REST.MS, REST.XP] });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
