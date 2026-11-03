/* A MYSTERY PIECE WAITS IN YOUR BAG UNTIL YOU REVEAL IT (v2.3.3951;
 * spec docs/specs/reveal-in-bag.md, server/src/revealbag.js).
 *
 * The owner: "Mystery item launched automatically. Should go to inventory
 * then have reveal option."
 *
 * What this pins, through the real socket handler wherever a phone could:
 *   1. the public face: revealPublic strips the grade and marks the piece;
 *   2. a pickup by a phone that says `rb: 1` keeps a rare-or-better piece
 *      unrevealed -- NO GRADE ON THE WIRE in any frame until the reveal
 *      (a frame scanner, not one assert per door), the grade kept on the
 *      server's own copies, and no Elite/Godly achievement yet;
 *   3. a rejoin keeps the secret: the bag's claim resolves to the ledger's
 *      copy, and the echo still strips it;
 *   4. reveal_item opens it ONCE (ledger, stash copy, achievement, the
 *      ladder), answers `already` after, and refuses what is not yours;
 *   5. the reveal is one synchronous run of writes (ledger and record);
 *   6. EQUIPPING REVEALS: stats_update's armorRef and equip_request's blade;
 *   7. a phone cannot forge a "?" (stripProv, the weapon sanitizer);
 *   8. an old phone (no `rb`) gets today's at-once reveal;
 *   9. THE KILL SWITCH `revealbag: false`: caps off, pickups reveal at once,
 *      and a held "?" is opened at the next join -- a reveal always works;
 *  10. the ledger cap never forgets an unrevealed row;
 *  11. the test lever.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { revealPublic, revealPublicList, isUnrevealed } from '../src/revealbag.js';
import { GEAR_PROV_CAP, GEAR_PROV_KEY, capProvLedger, findProvRow, stripProv } from '../src/gearprov.js';

function makeState(store = new Map()) {
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
  return { label, sent: [], raw: [], send(s) { this.raw.push(s); this.sent.push(JSON.parse(s)); }, close() {} };
}
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* A character on file (a first join takes no claims: join.js), then a join
   through the real handler.  `top` rides the join message itself (`rb`). */
async function join(room, ws, id, data, top) {
  room.sessions.set(ws, { id: null, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.state.storage.put('cadence:login:' + id, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  if (!room.state._store.has('rpg:' + id)) room.state._store.set('rpg:' + id, { coins: 0, inventory: {}, lifeSkills: {} });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'T-' + id, phrase: 'p-' + id,
    ...(top || {}),
    data: { x: 100, y: 100, z: 'town', ...(data || {}) },
  }));
}
async function send(room, ws, msg) { await room.webSocketMessage(ws, JSON.stringify(msg)); }
function framesOf(ws, type) { return ws.sent.filter((m) => m && m.type === type); }
function lastOf(ws, type) { const f = framesOf(ws, type); return f.length ? f[f.length - 1] : null; }

/* A monster's pile, as _spawnLootForKill builds one, at the player's feet. */
let pileN = 0;
function pileFor(room, pid, { armor, weapon }) {
  const ps = room.playerState[pid];
  const lootId = 'mk-test-' + (++pileN);
  const p = {
    lootId, zone: ps.z, x: ps.x, y: ps.y, coins: 0, skull: null, shard: null, gem: null,
    recipients: [pid], shares: { [pid]: 1 }, killerName: 'T', ts: Date.now(),
    inventoryClaimed: false, claimedBy: {},
    weapon: weapon || null, weaponClaimed: false,
    armor: armor || null, armorClaimed: false,
  };
  if (!room.loot[ps.z]) room.loot[ps.z] = [];
  room.loot[ps.z].push(p);
  return p;
}
const TORSO = (q) => ({ name: 'Iron Torso', mat: 'iron', slot: 'armor', tierMult: 2.0, quality: q });
const GREAVES = (q) => ({ name: 'Iron Greaves', mat: 'iron', slot: 'legsArmor', tierMult: 2.0, quality: q });
function blade(room, q) { const w = room._rollIronWeaponForKill(1, true); w.quality = q; return w; }
function pickUp(room, ws, pile) {
  const session = room.sessions.get(ws);
  room._handleLootPickup(session, { lootId: pile.lootId, zone: pile.zone });
}
/* Every frame sent from `from` on, as text: the grade must not be in it. */
/* ...the grade itself, the ladder that plays it, and the achievements only a
   grade earns (an achv_state naming one would say "elite" before the "?") */
const GRADE_RE = /"quality":"(rare|elite|godly)"|"ladder"|elite_piece|elite_iron|"godly"/;
function leaks(ws, from) { return ws.raw.slice(from).filter((s) => GRADE_RE.test(s)); }

/* ════════════════════════════════════════════════════════════════════
   1. The public face
   ════════════════════════════════════════════════════════════════════ */
{
  const hidden = { name: 'Iron Torso', quality: 'godly', unrevealed: 1, gid: 'g1' };
  const pub = revealPublic(hidden);
  check('1. revealPublic strips the grade of an unrevealed piece', pub.quality === undefined && pub.unrevealed === true && pub.gid === 'g1', pub);
  check('1. ...as a copy (the server keeps its grade)', hidden.quality === 'godly' && hidden.unrevealed === 1, hidden);
  const open = { name: 'Iron Torso', quality: 'elite' };
  check('1. ...and an open piece passes through unchanged', revealPublic(open) === open);
  check('1. ...a list too', JSON.stringify(revealPublicList([hidden, open])) === JSON.stringify([pub, open]));
  check('1. the answer is a privileged event (a relay can never forge it)', PRIVILEGED_EVENTS.has('item_reveal'));
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
room.loot = room.loot || {};

/* ════════════════════════════════════════════════════════════════════
   2. A pickup keeps the grade to itself
   ════════════════════════════════════════════════════════════════════ */
const PID = 'bp_reveal_a';
const wsA = fakeWs('A');
await join(room, wsA, PID, {}, { rb: 1 });
const sessA = room.sessions.get(wsA);
check('2. a phone that says rb: 1 is a reveal-in-bag session', sessA && sessA.revealBag === true, sessA && sessA.revealBag);
const ss = lastOf(wsA, 'state_sync');
check('2. the worker advertises caps.revealbag', !!(ss && ss.caps && ss.caps.revealbag === true), ss && ss.caps && ss.caps.revealbag);
const psA = room.playerState[PID];

const from2 = wsA.raw.length;
pickUp(room, wsA, pileFor(room, PID, { armor: [TORSO('elite')], weapon: blade(room, 'godly') }));
const credit = lastOf(wsA, 'loot_credit');
check('2. the pickup is credited', !!credit, wsA.sent.map((m) => m.type));
const cA = credit && credit.payload;
const cPiece = cA && cA.armor && cA.armor[0];
check('2. the armour reaches the bag without its grade, marked unrevealed, with its id',
  !!cPiece && cPiece.quality === undefined && cPiece.unrevealed === true && typeof cPiece.gid === 'string', cPiece);
check('2. ...and so does the blade', !!cA && !!cA.weapon && cA.weapon.quality === undefined && cA.weapon.unrevealed === true, cA && cA.weapon);
check('2. ...and the credit plays no ceremony (it waits for Reveal)', !!cA && cA.reveals === null, cA && cA.reveals);
check('2. NO GRADE ON THE WIRE in any frame since the pickup (credit, echo, anything)', leaks(wsA, from2).length === 0, leaks(wsA, from2));
const TORSO_GID = cPiece && cPiece.gid;
const row = findProvRow(room._gearProvOf(PID), TORSO_GID);
check('2. the server keeps the grade: the ledger row holds it beside the mark',
  !!row && row.p.quality === 'elite' && row.p.unrevealed === 1, row && row.p);
const wIdx = psA.weaponStash.findIndex((w) => w && w.gearBase === 'iron');
check('2. ...and its own weapon bag entry the blade\'s', wIdx >= 0 && psA.weaponStash[wIdx].quality === 'godly' && psA.weaponStash[wIdx].unrevealed === 1, psA.weaponStash);
const echo = lastOf(wsA, 'player_state');
const echoW = echo && echo.payload && echo.payload.weaponStash;
check('2. the player_state echo sends the blade without its grade',
  Array.isArray(echoW) && echoW.some((w) => w && w.unrevealed === true && w.quality === undefined), echoW);
const achvGot = () => { const b = room._achvOf && room._achvOf(PID); return (b && b.rec && b.rec.got) || {}; };
check('2. no Elite or Godly achievement before the reveal (it would pop before the "?" opened)',
  !achvGot().elite_piece && !achvGot().godly && !achvGot().elite_iron, Object.keys(achvGot()));

/* ════════════════════════════════════════════════════════════════════
   3. A rejoin keeps the secret
   ════════════════════════════════════════════════════════════════════ */
{
  const wsA2 = fakeWs('A2');
  room.sessions.delete(wsA);
  const bagCopy = { ...cPiece };   /* exactly what the phone's bag holds */
  await join(room, wsA2, PID, { rpgArmorStash: [bagCopy] }, { rb: 1 });
  const ps2 = room.playerState[PID];
  const held = (ps2.armorStash || []).find((g) => g && g.gid === TORSO_GID);
  check('3. a rejoin adopts the bag\'s "?" from the ledger\'s own copy (grade and mark kept)',
    !!held && held.quality === 'elite' && !!held.unrevealed, ps2.armorStash);
  check('3. ...and nothing the join sent carries a grade', leaks(wsA2, 0).length === 0, leaks(wsA2, 0));
  const e2 = lastOf(wsA2, 'player_state');
  const echoA = e2 && e2.payload && e2.payload.armorStash;
  check('3. the echo\'s armour stash says unrevealed, without the grade',
    Array.isArray(echoA) && echoA.some((g) => g && g.gid === TORSO_GID && g.unrevealed === true && g.quality === undefined), echoA);
  /* carry on with the first socket, holding the rejoined session */
  wsA.sent.length = 0; wsA.raw.length = 0;
  const s2 = room.sessions.get(wsA2);
  room.sessions.delete(wsA2);
  room.sessions.set(wsA, s2);
}
const ps = room.playerState[PID];

/* ════════════════════════════════════════════════════════════════════
   4. Reveal: once, the holder only
   ════════════════════════════════════════════════════════════════════ */
{
  const before = wsA.raw.length;
  await send(room, wsA, { type: 'reveal_item', payload: { field: 'armorStash', gid: TORSO_GID } });
  const ans = lastOf(wsA, 'item_reveal');
  const p = ans && ans.payload;
  check('4. reveal_item answers item_reveal with the opened piece', !!p && p.ok === true && p.gid === TORSO_GID && p.piece && p.piece.quality === 'elite', p);
  check('4. ...and the ladder the overlay plays (elite: one stage)',
    !!p && Array.isArray(p.reveals) && p.reveals.length === 1 && JSON.stringify(p.reveals[0].ladder) === '["elite"]' && p.reveals[0].kind === 'armor', p && p.reveals);
  const r2 = findProvRow(room._gearProvOf(PID), TORSO_GID);
  check('4. the mark is gone from the ledger row, the grade stays', !!r2 && !r2.p.unrevealed && r2.p.quality === 'elite', r2 && r2.p);
  const sc = (ps.armorStash || []).find((g) => g && g.gid === TORSO_GID);
  check('4. ...and from the server\'s stash copy', !!sc && !sc.unrevealed && sc.quality === 'elite', sc);
  check('4. the grade\'s achievement is earned AT the reveal', !!achvGot().elite_piece, Object.keys(achvGot()));
  const after = wsA.sent.slice(wsA.sent.length - (wsA.raw.length - before));
  const iRev = after.findIndex((m) => m.type === 'item_reveal');
  const iAch = after.findIndex((m) => m.type === 'achv_state' && m.payload && Array.isArray(m.payload.new) && m.payload.new.includes('elite_piece'));
  check('4. ...and told the phone AFTER the answer that starts the ceremony (never before it)', iRev >= 0 && iAch > iRev, after.map((m) => m.type));
  check('4. only one answer went (no duplicate frames)', framesOf(wsA, 'item_reveal').length === 1, wsA.raw.slice(before));

  await send(room, wsA, { type: 'reveal_item', payload: { field: 'armorStash', gid: TORSO_GID } });
  const again = lastOf(wsA, 'item_reveal').payload;
  check('4. a second reveal (another tab) answers already, with the piece and no ceremony',
    again.ok === true && again.already === true && again.reveals === null && again.piece && again.piece.quality === 'elite', again);

  await send(room, wsA, { type: 'reveal_item', payload: { field: 'weaponStash', idx: wIdx, name: 'not the name' } });
  check('4. a blade named wrongly is refused `changed` (the list moved)', lastOf(wsA, 'item_reveal').payload.reason === 'changed', lastOf(wsA, 'item_reveal').payload);
  await send(room, wsA, { type: 'reveal_item', payload: { field: 'armorStash', gid: 'g-not-mine' } });
  check('4. an id not in your ledger is refused `not_held`', lastOf(wsA, 'item_reveal').payload.reason === 'not_held');
  await send(room, wsA, { type: 'reveal_item', payload: { field: '__proto__', gid: TORSO_GID } });
  check('4. a list that is not one of the three is refused `bad`', lastOf(wsA, 'item_reveal').payload.reason === 'bad');

  const w = ps.weaponStash[wIdx];
  await send(room, wsA, { type: 'reveal_item', payload: { field: 'weaponStash', idx: wIdx, name: w.name } });
  const wa = lastOf(wsA, 'item_reveal').payload;
  check('4. the blade opens by its place and name, a godly playing two stages',
    wa.ok === true && wa.idx === wIdx && Array.isArray(wa.reveals) && JSON.stringify(wa.reveals[0].ladder) === '["elite","godly"]' && wa.reveals[0].kind === 'weapon', wa);
  check('4. ...the server\'s blade loses the mark, keeps the grade', !ps.weaponStash[wIdx].unrevealed && ps.weaponStash[wIdx].quality === 'godly', ps.weaponStash[wIdx]);
  const eW = lastOf(wsA, 'player_state');
  check('4. ...and the echo after it carries the opened blade', !!eW && Array.isArray(eW.payload.weaponStash) && eW.payload.weaponStash[wIdx].quality === 'godly', eW && eW.payload.weaponStash);
  check('4. ...and its achievements (Godly, Elite iron)', !!achvGot().godly && !!achvGot().elite_iron, Object.keys(achvGot()));

  /* another player cannot open A's piece by naming its id */
  const wsB = fakeWs('B');
  await join(room, wsB, 'bp_reveal_b', {}, { rb: 1 });
  pickUp(room, wsA, pileFor(room, PID, { armor: [GREAVES('rare')] }));
  const g2 = lastOf(wsA, 'loot_credit').payload.armor[0].gid;
  await send(room, wsB, { type: 'reveal_item', payload: { field: 'legsStash', gid: g2 } });
  check('4. another player naming your piece\'s id is refused `not_held`', lastOf(wsB, 'item_reveal').payload.reason === 'not_held', lastOf(wsB, 'item_reveal'));
  check('4. ...and your piece stays unrevealed', !!findProvRow(room._gearProvOf(PID), g2).p.unrevealed);
  room._g2 = g2;
}

/* ════════════════════════════════════════════════════════════════════
   5. One synchronous run of writes
   ════════════════════════════════════════════════════════════════════ */
{
  const g2 = room._g2;
  const puts = [];
  const realPut = state.storage.put;
  state.storage.put = (k, v) => { puts.push(k); return realPut(k, v); };
  const res = room._handleRevealItem(room.sessions.get(wsA), { field: 'legsStash', gid: g2 });
  state.storage.put = realPut;
  check('5. the reveal handler is synchronous (no await between its writes)', !!res && typeof res.then !== 'function' && res.ok === true, res);
  check('5. ...and writes the ledger and the record in that one run',
    puts.includes(GEAR_PROV_KEY(PID)) && puts.includes('rpg:' + PID), puts);
}

/* ════════════════════════════════════════════════════════════════════
   6. Equipping reveals
   ════════════════════════════════════════════════════════════════════ */
{
  pickUp(room, wsA, pileFor(room, PID, { armor: [TORSO('rare')] }));
  const g3 = lastOf(wsA, 'loot_credit').payload.armor[0].gid;
  const n0 = framesOf(wsA, 'item_reveal').length;
  await send(room, wsA, { type: 'stats_update', payload: { armorRef: g3 } });
  const ans = lastOf(wsA, 'item_reveal');
  check('6. putting on a "?" torso (armorRef) opens it, with its ceremony',
    framesOf(wsA, 'item_reveal').length === n0 + 1 && ans.payload.gid === g3 && Array.isArray(ans.payload.reveals) && ans.payload.reveals[0].quality === 'rare', ans && ans.payload);
  check('6. ...and the piece worn is open, its grade counted', !!ps.armor && ps.armor.gid === g3 && ps.armor.quality === 'rare' && !ps.armor.unrevealed, ps.armor);
  check('6. ...the row is open too', !findProvRow(room._gearProvOf(PID), g3).p.unrevealed);

  /* the blade: equip_request from the weapon bag */
  pickUp(room, wsA, pileFor(room, PID, { weapon: blade(room, 'rare') }));
  const idx = ps.weaponStash.findIndex((w) => w && w.unrevealed);
  check('6. (a second "?" blade is in the bag)', idx >= 0, ps.weaponStash);
  const n1 = framesOf(wsA, 'item_reveal').length;
  const slot = room._weaponSlotFor(ps.weaponStash[idx]);
  await send(room, wsA, { type: 'equip_request', payload: { stashIdx: idx, slot } });
  const wa = lastOf(wsA, 'item_reveal');
  check('6. equipping a "?" blade opens it first, with its ceremony',
    framesOf(wsA, 'item_reveal').length === n1 + 1 && Array.isArray(wa.payload.reveals) && wa.payload.reveals[0].kind === 'weapon', wa && wa.payload);
  check('6. ...and it is wielded open', !!ps[slot] && ps[slot].quality === 'rare' && !ps[slot].unrevealed, ps[slot]);
}

/* ════════════════════════════════════════════════════════════════════
   7. A phone cannot forge a "?"
   ════════════════════════════════════════════════════════════════════ */
{
  check('7. stripProv takes the mark off a claim with no recorded id', stripProv({ name: 'X', unrevealed: true }).unrevealed === undefined);
  check('7. the weapon sanitizer\'s strict branch (a phone\'s claim) drops it', room._sanitizeWeapon({ type: 'greatsword', name: 'x', tierMult: 1, unrevealed: 1 }, true).unrevealed === undefined);
  check('7. ...its own-copy branch keeps it (the worker wrote it)', room._sanitizeWeapon({ type: 'greatsword', name: 'x', tierMult: 1, unrevealed: 1 }, false).unrevealed === 1);
  const wsF = fakeWs('F');
  await join(room, wsF, 'bp_reveal_f', { rpgArmorStash: [{ name: 'Iron Torso', mat: 'iron', slot: 'armor', tierMult: 2, unrevealed: true }] }, { rb: 1 });
  const fs = room.playerState.bp_reveal_f.armorStash || [];
  check('7. a forged "?" in a join claim (no id) lands as a plain piece', fs.length === 1 && !fs[0].unrevealed, fs);
}

/* ════════════════════════════════════════════════════════════════════
   8. An old phone (no rb) gets today's at-once reveal
   ════════════════════════════════════════════════════════════════════ */
{
  const wsO = fakeWs('O');
  await join(room, wsO, 'bp_reveal_old', {}, {});
  check('8. no rb: not a reveal-in-bag session', room.sessions.get(wsO).revealBag === false);
  pickUp(room, wsO, pileFor(room, 'bp_reveal_old', { armor: [TORSO('elite')] }));
  const c = lastOf(wsO, 'loot_credit').payload;
  check('8. the old phone\'s credit carries the grade and the ceremony, as before',
    c.armor[0].quality === 'elite' && !c.armor[0].unrevealed && Array.isArray(c.reveals) && c.reveals.length === 1, c);
  check('8. ...and nothing is held unrevealed for it', !findProvRow(room._gearProvOf('bp_reveal_old'), c.armor[0].gid).p.unrevealed);
}

/* ════════════════════════════════════════════════════════════════════
   9. The kill switch
   ════════════════════════════════════════════════════════════════════ */
{
  const id = 'bp_reveal_sw';
  const ws1 = fakeWs('S1');
  await join(room, ws1, id, {}, { rb: 1 });
  pickUp(room, ws1, pileFor(room, id, { armor: [TORSO('rare')], weapon: blade(room, 'elite') }));
  const held = lastOf(ws1, 'loot_credit').payload.armor[0];
  check('9. (before the switch: a "?" torso and blade are held)', held.unrevealed === true && room.playerState[id].weaponStash.some((w) => w && w.unrevealed));

  room._liveFlags = { ...(room._liveFlags || {}), revealbag: false };
  pickUp(room, ws1, pileFor(room, id, { armor: [GREAVES('elite')] }));
  const c = lastOf(ws1, 'loot_credit').payload;
  check('9. revealbag: false -- a pickup reveals at once again (grade, ceremony)',
    c.armor[0].quality === 'elite' && !c.armor[0].unrevealed && Array.isArray(c.reveals) && c.reveals.length === 1, c);

  const ws2 = fakeWs('S2');
  room.sessions.delete(ws1);
  await join(room, ws2, id, { rpgArmorStash: [held] }, { rb: 1 });
  const ss2 = lastOf(ws2, 'state_sync');
  check('9. ...caps.revealbag is un-advertised', !!ss2 && ss2.caps.revealbag === false, ss2 && ss2.caps.revealbag);
  const rv = framesOf(ws2, 'item_reveal');
  const types = ws2.sent.map((m) => m.type);
  check('9. ...and every piece still a "?" is opened at the next join, its ceremony sent',
    rv.length === 2 && rv.every((r) => r.payload.ok && Array.isArray(r.payload.reveals)) && rv.some((r) => r.payload.gid === held.gid), rv.map((r) => r.payload));
  check('9. ...after player_state (the bag holds the pieces first)', types.indexOf('item_reveal') > types.indexOf('player_state'), types);
  const ps9 = room.playerState[id];
  check('9. ...and nothing is left unrevealed on the record or the ledger',
    !ps9.weaponStash.some((w) => w && w.unrevealed) && !(ps9.armorStash || []).some((g) => g && g.unrevealed)
      && !room._gearProvOf(id).list.some((r) => r.p && r.p.unrevealed), { w: ps9.weaponStash, a: ps9.armorStash });
  /* a reveal always works, switch or no switch */
  const ws3 = fakeWs('S3');
  room._liveFlags = { ...(room._liveFlags || {}), revealbag: true };
  await join(room, ws3, 'bp_reveal_sw2', {}, { rb: 1 });
  pickUp(room, ws3, pileFor(room, 'bp_reveal_sw2', { armor: [TORSO('rare')] }));
  const g = lastOf(ws3, 'loot_credit').payload.armor[0].gid;
  room._liveFlags = { ...(room._liveFlags || {}), revealbag: false };
  await send(room, ws3, { type: 'reveal_item', payload: { field: 'armorStash', gid: g } });
  check('9. reveal_item works with the switch off (opening is the safe direction)', lastOf(ws3, 'item_reveal').payload.ok === true && Array.isArray(lastOf(ws3, 'item_reveal').payload.reveals));
  room._liveFlags = { ...(room._liveFlags || {}), revealbag: true };
}

/* ════════════════════════════════════════════════════════════════════
   10. The ledger cap never forgets a "?"
   ════════════════════════════════════════════════════════════════════ */
{
  const list = Array.from({ length: GEAR_PROV_CAP + 3 }, (_, i) => ({ id: 'g' + i, slot: 'armor', p: { n: i, ...(i < 2 ? { unrevealed: 1 } : {}) } }));
  const led = capProvLedger({ seq: 0, forgotten: 0, list });
  check('10. at the cap the ledger keeps its size', led.list.length === GEAR_PROV_CAP, led.list.length);
  check('10. ...the two oldest rows, still "?", are kept', led.list[0].id === 'g0' && led.list[1].id === 'g1', led.list.slice(0, 3).map((r) => r.id));
  check('10. ...the oldest OPEN rows go instead, counted', !led.list.some((r) => r.id === 'g2' || r.id === 'g3' || r.id === 'g4') && led.forgotten === 3, led.forgotten);
}

/* ════════════════════════════════════════════════════════════════════
   11. The test lever
   ════════════════════════════════════════════════════════════════════ */
{
  const id = 'bp_reveal_dev';
  const ws = fakeWs('D');
  await join(room, ws, id, {}, { rb: 1 });
  check('11. a bad grade is refused', room._revealBagDev(id, { grade: 'normal' }).ok === false);
  check('11. {grade} sets the next mystery drop\'s grade, once', room._revealBagDev(id, { grade: 'godly' }).next === 'godly'
    && room._rollArmorDropsForKill(1, 'armor')[0].quality === 'godly' && room._revealBagNextGrade === null);
  const r = room._revealBagDev(id, { grade: 'elite', give: 'legsArmor' });
  const c = lastOf(ws, 'loot_credit');
  check('11. {grade, give} puts a "?" in the bag through the pickup\'s own credit',
    r.ok && r.unrevealed && !!c && c.payload.armor[0].unrevealed === true && c.payload.armor[0].quality === undefined && c.payload.armor[0].gid === r.gid, { r, c: c && c.payload });
  const rw = room._revealBagDev(id, { grade: 'rare', give: 'weapon' });
  check('11. ...a blade too', rw.ok && rw.unrevealed && isUnrevealed(room.playerState[id].weaponStash[rw.idx]), rw);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
