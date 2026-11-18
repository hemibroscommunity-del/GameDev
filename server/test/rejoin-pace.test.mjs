/* ═══ v2.3.5921: A REQUEST'S PACE OUTLIVES A REJOIN (card V3 PR 2, TRAPS §276) ═══
 *
 * TRAPS §276: "A 'once every N' limit stamped on `ps` lasts one connection."
 * V2's guard (tools/guards/traps-saves.test.mjs) listed nine request paces
 * stamped on `ps`; eight are now kept by the room, by player id, in memory
 * (server/src/pacekeep.js; the daily spin is card RV's).  This holds:
 *
 *   1. the switch: `pacekeep` is on with no flag, off only with `false`;
 *   2. the keep itself: an unset stamp (a `ps` a join rebuilt) is filled from
 *      the room's copy, a set one is read as it is; nothing outside its eight
 *      fields; bounded at PACE_KEEP.CAP (the spent ones first, then the
 *      oldest); a `__proto__` id is just an id; nothing is written to storage;
 *   3. for each of the eight, through its real message: a request, a REJOIN
 *      (a new socket, a new `ps`), the same request inside the pace: still
 *      paced; past the pace: allowed;
 *   4. `pacekeep: false`: the rejoin forgets the pace, as before. */
import { readFileSync } from 'node:fs';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { PACE_KEEP, paceAt, paceStamp, paceKeepOn } from '../src/pacekeep.js';
import { DICE } from '../src/dice.js';
import { ITEM_DROP } from '../src/itemdrop.js';
import { ACE_FLIP } from '../src/gamble.js';
import { SALVAGE } from '../src/salvage.js';
import { REST } from '../src/rest.js';
import { RACE } from '../src/race.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

/* the clock stands still unless a test moves it: every request below lands
   where it is meant to, however slow this box is */
const realNow = Date.now;
let NOW = realNow();
Date.now = () => NOW;

async function setup(flags) {
  const storage = makeStorage();
  const room = await openRoom(storage, flags);
  const PID = 'bp_pacekeep';
  const P = { room, PID, storage, ws: null, ps: null };
  P.rejoin = async () => {
    P.ws = fakeWs('p');
    await join(room, P.ws, PID, { loginTaken: true });
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    P.ps = room.playerState[PID];
    return P.ps;
  };
  P.send = async (type, payload, extra) => {
    P.ws.sent.length = 0;
    await room.webSocketMessage(P.ws, JSON.stringify(Object.assign({ type }, payload === undefined ? {} : { payload }, extra || {})));
    await settle();
  };
  P.got = (type) => P.ws.sent.filter((m) => m.type === type).map((m) => m.payload);
  await P.rejoin();
  return P;
}

/* one request's pace across a rejoin: `prep` readies a fresh ps, `ask` sends
   the request, `took` says whether it was served (not paced) */
async function acrossRejoin(P, label, field, gapMs, prep, ask, took) {
  prep(P.ps);
  await ask();
  check(`3. ${label}: the first request is served`, took(), P.ws.sent.map((m) => m.type));
  const before = P.ps;
  NOW += 1;
  await P.rejoin();
  check(`3. ${label}: ...a rejoin rebuilds ps, the stamp unset on it`, P.ps !== before && P.ps[field] === undefined, P.ps[field]);
  prep(P.ps);
  await ask();
  check(`3. ${label}: a rejoin inside the pace is still paced`, !took(), P.ws.sent.map((m) => m.type));
  NOW += gapMs + 1;
  prep(P.ps);
  await ask();
  check(`3. ${label}: past the pace, served again`, took(), P.ws.sent.map((m) => m.type));
}

// ── 1. the switch ──
{
  check('1. `pacekeep` is on with no flag', paceKeepOn({ _liveFlags: {} }) === true && paceKeepOn({}) === true);
  check('1. ...off with `pacekeep: false`', paceKeepOn({ _liveFlags: { pacekeep: false } }) === false);
}

// ── 2. the keep ──
{
  const room = { _liveFlags: {} };
  const a = {};
  a._diceAt = paceStamp(room, 'bp_x', a, '_diceAt', 1000, 5000);
  check('2. a stamp is kept by the room, and returned for ps (its caller writes it by name)', a._diceAt === 1000 && room._paceKeep instanceof Map && room._paceKeep.get('bp_x')._diceAt === 1000);
  check('2. ...its entry has no prototype (the fields are the callers\' own names)', Object.getPrototypeOf(room._paceKeep.get('bp_x')) === null);
  const b = {};
  check('2. a rebuilt ps (the field unset) reads the room\'s copy, written onto it', paceAt(room, 'bp_x', b, '_diceAt') === 1000 && b._diceAt === 1000);
  const c = { _diceAt: 0 };
  check('2. a stamp already on ps is read as it is (a test\'s 0 included)', paceAt(room, 'bp_x', c, '_diceAt') === 0 && c._diceAt === 0);
  check('2. another player\'s id reads nothing', paceAt(room, 'bp_y', {}, '_diceAt') === 0);
  const d = {};
  check('2. a field not of the eight is never read or kept', paceAt(room, 'bp_x', d, 'until') === 0 && d.until === undefined
    && (paceStamp(room, 'bp_x', d, '_notAPace', 1, 1), d._notAPace === undefined));   /* v2.3.6024: the daily spin is a field now */
  paceStamp(room, '__proto__', {}, '_dropAt', 1000, 400);
  check('2. a `__proto__` id is just an id', room._paceKeep.get('__proto__')._dropAt === 1000 && paceAt(room, '__proto__', {}, '_dropAt') === 1000);
  /* v2.3.6024 (card RV): the daily spin is the ninth (server/test/spin-pace.test.mjs) */
  check('2. the nine fields are the §276 pace rows, the daily spin among them', PACE_KEEP.FIELDS.length === 9 && PACE_KEEP.FIELDS.includes('_lastDailySpinAt'));

  const big = { _liveFlags: {} };
  for (let i = 0; i < PACE_KEEP.CAP; i++) paceStamp(big, 'bp_' + i, {}, '_restAt', 1000 + i, i % 2 ? 1e9 : 10);
  check('2. it holds up to CAP players', big._paceKeep.size === PACE_KEEP.CAP);
  paceStamp(big, 'bp_new', {}, '_restAt', 100000, 10);
  check('2. at CAP the spent ones go first (every even one, whose pace ended), never past CAP',
    big._paceKeep.size === PACE_KEEP.CAP / 2 + 1 && big._paceKeep.has('bp_1') && !big._paceKeep.has('bp_0') && big._paceKeep.has('bp_new'), big._paceKeep.size);
  for (let i = 0; i < PACE_KEEP.CAP; i++) paceStamp(big, 'bp_more' + i, {}, '_restAt', 100000, 1e9);
  check('2. ...then the oldest, and it stays at CAP', big._paceKeep.size === PACE_KEEP.CAP && !big._paceKeep.has('bp_1') && big._paceKeep.has('bp_more' + (PACE_KEEP.CAP - 1)), big._paceKeep.size);
  const off = { _liveFlags: { pacekeep: false } };
  const e = {};
  e._diceAt = paceStamp(off, 'bp_x', e, '_diceAt', 7, 5000);
  check('2. switched off: the stamp on ps only, nothing kept', e._diceAt === 7 && !off._paceKeep);
  const src = readFileSync(new URL('../src/pacekeep.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  check('2. the keep writes nothing to storage (memory only: no new row)', !/storage|_saveRpg|\.put\(/.test(src));
}

// ── 3. each of the eight, across a real rejoin ──
/* a roll is a room event (the eventBuffer's dice_roll), not an answer */
const rolled = (room) => room.eventBuffer.some((e) => e.type === 'dice_roll');
const P = await setup();
await acrossRejoin(P, 'the dice', '_diceAt', DICE.GAP_MS,
  () => { P.room.eventBuffer.length = 0; }, () => P.send('dice', undefined, { kind: 'roll' }), () => rolled(P.room));

await acrossRejoin(P, 'a drop', '_dropAt', ITEM_DROP.GAP_MS,
  (ps) => { ps.z = WHEEL_ZONE; ps.inventory.log_pine = 5; },
  () => P.send('item_drop', undefined, { key: 'log_pine', qty: 1 }),
  () => { const a = P.got('item_drop_result'); return a.length > 0 && a[a.length - 1].ok === true; });

await acrossRejoin(P, 'the gamble', '_lastGambleAt', 2000,
  (ps) => { ps.coins = 1000; },
  () => P.send('gamble_request', { wager: 10 }),
  () => P.ps.coins !== 1000);

await acrossRejoin(P, 'an ace flip', '_lastAceFlipAt', ACE_FLIP.COOLDOWN_MS,
  (ps) => { ps.coins = 1000; },
  () => P.send('ace_flip_request', { stake: ACE_FLIP.MIN_STAKE }),
  () => P.ps.coins !== 1000);

await acrossRejoin(P, 'the rewards\' read', '_lastRewardsGetAt', 800,
  () => {}, () => P.send('rewards_get', {}), () => P.ws.sent.some((m) => m.type === 'rewards_state'));

/* a salvage of nothing is answered `bad` -- unless paced, which is silent */
await acrossRejoin(P, 'a salvage', '_lastSalvageAt', SALVAGE.COOLDOWN_MS,
  () => {}, () => P.send('smith_salvage', { field: 'nope' }), () => P.ws.sent.some((m) => m.type === 'smith_salvage_result'));

await acrossRejoin(P, 'a rest', '_restAt', REST.GAP_MS,
  (ps) => { ps.z = 'farm_home'; ps.x = 132; ps.y = 500; },
  () => P.send('rest_request', { where: 'farm' }),
  () => { const a = P.got('rest_result'); return a.length > 0 && a[a.length - 1].ok === true; });

{
  const [cx, cy] = P.room._wheelT().WHEEL_CENTRE;
  await acrossRejoin(P, 'the race\'s start', '_raceStartedAt', RACE.START_GAP_MS,
    (ps) => { ps.z = WHEEL_ZONE; ps.x = cx + RACE.START[0]; ps.y = cy + RACE.START[1]; ps._quests = Object.create(null); ps._quests[RACE.QUEST] = 'active'; ps._race = null; },
    () => P.send('race_start', {}),
    () => P.ws.sent.some((m) => m.type === 'race_state'));
}

// ── 4. `pacekeep: false`: as before ──
{
  const Q = await setup({ pacekeep: false });
  Q.room.eventBuffer.length = 0;
  await Q.send('dice', undefined, { kind: 'roll' });
  const first = rolled(Q.room);
  NOW += 1;
  await Q.rejoin();
  Q.room.eventBuffer.length = 0;
  await Q.send('dice', undefined, { kind: 'roll' });
  check('4. `pacekeep: false`: a rejoin forgets the dice\'s pace, as before', first && rolled(Q.room) && !Q.room._paceKeep);
}

Date.now = realNow;
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
