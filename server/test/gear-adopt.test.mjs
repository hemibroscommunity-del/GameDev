/* ═══ v2.3.6801 (card SHOP-gearbag): THE PHONE'S GEAR BAG READS THE WORKER'S COPY ═══
 *
 * The bug (docs/plan/debts.md "Found (no card's debt)"): the phone put a
 * piece of armour, legs, cosmetic gear or an amulet in its bag only from the
 * one reply that brought it.  A lost reply (forge_armor_result has no request
 * id; a re-sent chest open is answered only while _reqRecall holds it) left
 * the player paid, the worker holding the piece, and the phone never showing
 * it.  The mend: src/game/gearAdopt.js, the page's rule, ADOPTS the worker's
 * four lists from every player_state (add by id, never take, never past the
 * cap) and is the ONE WAY IN for every reply's piece.
 *
 * THE PHONE here is that rule, called exactly as the page's handlers call it
 * (wsClient.js: player_state, loot_credit through _applyLootCredit, which
 * chest_opened and forge_armor_result answer through, quest_reward_stashed;
 * gameEvents.js: inbox_delivered).  Part 7 reads the two files' syntax trees
 * to hold that binding: each handler calls the rule, and none pushes into a
 * bag list past it.  A frame the phone LOST never reaches it.
 *
 * THE DODGES (the card's, each planted and seen red):
 *   (a) the adopt left out for one list: part 1, one check a list;
 *   (b) a piece by its reply AND by the echo counted twice: part 2, both orders;
 *   (c) the adopt takes a piece the phone holds and the echo lacks: part 3;
 *   (d) an old copy with no gid doubled by its echo with a gid: part 4;
 *   (e) the cap passed by the adopt: part 5;
 *   (f) an unrevealed "?" revealed by the adopt, or doubled at its reveal: part 6;
 *   (g) a worn piece also put in the bag: part 4;
 *   (h) mail's piece pushed past the rule: parts 2 (the room) and 7 (the tree);
 *   (i) the lost reply, for chest and forge, and the rejoin with the phone's
 *       own seed: part 1.
 */
import { GameRoom } from '../src/index.js';
import { ARMOR_FORGE } from '../src/armorforge.js';
import { GEAR_STASH_CAP, GEAR_STASH_SEED_KEYS } from '../src/gearstash.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { GEAR_ADOPT, gearBagPut, adoptGearLists, adoptStateGear } = await import('../../src/game/gearAdopt.js');

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, structuredClone(v)); },
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
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const tick = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

/* ── the phone: its copy of the bag, its worn cosmetics (gearCatalog's store), and the page's calls ── */
const BAG = ['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash'];
const newPhone = () => ({ rpg: { armor: null, legsArmor: null, shield: null, amulet: null, armorStash: [], legsStash: [], shieldStash: [], gearStash: [], amuletStash: [] }, worn: Object.create(null) });
const wornOf = (phone) => (slot) => phone.worn[slot] || 'none';
function receive(phone, frames) {
  for (const m of frames) {
    const p = (m && m.payload) || {};
    if (m.type === 'player_state') adoptStateGear(phone, p, wornOf(phone), false);
    else if (m.type === 'loot_credit') { for (const pc of (Array.isArray(p.armor) ? p.armor : [])) if (pc) gearBagPut(phone.rpg, null, pc, 'reply', { name: 'Armor' }); }
    else if (m.type === 'chest_opened') { if (p.prize && p.prize.kind === 'armor' && p.prize.piece) gearBagPut(phone.rpg, null, p.prize.piece, 'reply', { name: 'Armor' }); }
    else if (m.type === 'forge_armor_result') { if (p.piece && typeof p.piece === 'object') gearBagPut(phone.rpg, null, p.piece, 'reply', { name: 'Armor' }); }
    else if (m.type === 'quest_reward_stashed') { if (p.item) gearBagPut(phone.rpg, null, p.item, 'reply', { name: 'Quest Armor' }); }
    else if (m.type === 'inbox_delivered') {
      for (const e of (Array.isArray(p.entries) ? p.entries : [])) {
        const ep = (e && e.payload) || {};
        if (e && e.kind === 'gear' && BAG.includes(ep.field) && ep.piece) gearBagPut(phone.rpg, ep.field, ep.piece, 'mail');
      }
    }
  }
}
/* how many copies of a gid the phone shows (worn or in a list) */
const sees = (phone, field, gid) => {
  const worn = { armorStash: 'armor', legsStash: 'legsArmor', shieldStash: 'shield', amuletStash: 'amulet' }[field];
  return [worn ? phone.rpg[worn] : null, ...phone.rpg[field]].filter((x) => x && x.gid === gid).length;
};
/* the join a page sends, its seeds from its own bag (wsClient _stashSeed) */
const seedsOf = (phone) => {
  const d = {};
  for (const [f, key] of Object.entries(GEAR_STASH_SEED_KEYS)) if (phone && phone.rpg[f].length) d[key] = phone.rpg[f].slice(0, 32);
  return d;
};
async function joinAs(id, phone, v) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ws: [1, 5], rb: 1, ...(v === 2 ? { protocolVersion: 2 } : null), data: { x: 0, y: 0, z: 'town', ...seedsOf(phone) } }));
  await tick();
  return ws;
}
const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await tick(); };
const recipes = Object.entries(ARMOR_FORGE.RECIPES);
const [chestKey, chestR] = recipes.find(([, r]) => r.slot === 'armor');
const [legsKey, legsR] = recipes.find(([, r]) => r.slot === 'legsArmor');
const smith = (ps) => {
  ps.lifeSkills = ps.lifeSkills || {};
  ps.lifeSkills.blacksmithing = { level: 99, xp: 0 };
  ps.inventory = ps.inventory || {};
  ps.inventory[chestR.bar] = 50; ps.inventory[legsR.bar] = 50;
  ps.level = 99;
};
const typesOf = (ws) => ws.sent.map((m) => m.type);

check('0. the rule\'s cap is the worker\'s own (gearstash.js GEAR_STASH_CAP)', GEAR_ADOPT.CAP === GEAR_STASH_CAP, { rule: GEAR_ADOPT.CAP, worker: GEAR_STASH_CAP });

/* ═══ 1. (a) (i) THE LOST REPLY: each list, the chest and the forge; and the rejoin with the phone's own seed ═══ */
for (const v of [1, 2]) {
  const tag = '1 (v' + v + '). ';
  /* the forge, a chest piece: the answer lost, the state that follows it seen */
  {
    const id = 'bp_gadopt_forge' + v, phone = newPhone();
    let ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    const ps = room.playerState[id];
    smith(ps);
    ws.sent.length = 0;
    await send(ws, 'forge_armor', { recipe: chestKey });
    const res = ws.sent.find((m) => m.type === 'forge_armor_result');
    const gid = res && res.payload.piece && res.payload.piece.gid;
    receive(phone, ws.sent.filter((m) => m.type !== 'forge_armor_result'));   /* the answer: LOST */
    check(tag + '(i) forge: the answer lost, the next player_state puts the piece in the bag (armour)', !!gid && sees(phone, 'armorStash', gid) === 1, { gid, sent: typesOf(ws), bag: phone.rpg.armorStash });
    /* legs, the same way */
    ws.sent.length = 0;
    await send(ws, 'forge_armor', { recipe: legsKey });
    const resL = ws.sent.find((m) => m.type === 'forge_armor_result');
    const gidL = resL && resL.payload.piece && resL.payload.piece.gid;
    receive(phone, ws.sent.filter((m) => m.type !== 'forge_armor_result'));
    check(tag + '(a) legs: the forge\'s legs piece, its answer lost, is in the legs bag', !!gidL && sees(phone, 'legsStash', gidL) === 1 && sees(phone, 'armorStash', gidL) === 0, { gidL, legs: phone.rpg.legsStash });
    /* the rejoin, the phone's own seed sent: still once, the worker's once */
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    const ps2 = room.playerState[id];
    check(tag + '(i) forge: a rejoin with the phone\'s own seed keeps each piece once, on the phone and on the worker',
      sees(phone, 'armorStash', gid) === 1 && sees(phone, 'legsStash', gidL) === 1
      && ps2.armorStash.filter((g) => g && g.gid === gid).length === 1 && ps2.legsStash.filter((g) => g && g.gid === gidL).length === 1,
      { phone: phone.rpg.armorStash.map((g) => g.gid), worker: ps2.armorStash.map((g) => g.gid) });
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    check(tag + '(i) ...and a second rejoin too', sees(phone, 'armorStash', gid) === 1 && phone.rpg.armorStash.length === 1 && phone.rpg.legsStash.length === 1, phone.rpg);
  }
  /* the chest: the answer lost; a rejoin (a reload) is where the phone looks again */
  {
    const id = 'bp_gadopt_chest' + v, phone = newPhone();
    let ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    const ps = room.playerState[id];
    ps.inventory = ps.inventory || {};
    ps.inventory.daily_chest = 1;
    let i = 0; const vals = [0.97, 0.99];
    room._chestRand = () => (i < vals.length ? vals[i++] : 0.5);   /* the armour row (dailychest.test's) */
    ws.sent.length = 0;
    await send(ws, 'chest_open', { invKey: 'daily_chest' });
    const res = ws.sent.find((m) => m.type === 'chest_opened');
    const pc = res && res.payload.prize && res.payload.prize.piece;
    const field = pc && pc.slot === 'legsArmor' ? 'legsStash' : 'armorStash';
    check(tag + 'setup: the chest gave a piece of armour with an id', !!pc && typeof pc.gid === 'string', res && res.payload);
    /* the socket drops before ANY of the answer: nothing of it arrives */
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    check(tag + '(i) chest: the answer and its state both lost, the rejoin\'s state puts the piece in the bag, once', !!pc && sees(phone, field, pc.gid) === 1, { bag: phone.rpg[field], sent: typesOf(ws) });
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    check(tag + '(i) chest: ...and a rejoin with the phone\'s own seed keeps it once', !!pc && sees(phone, field, pc.gid) === 1 && room.playerState[id][field].filter((g) => g && g.gid === pc.gid).length === 1, phone.rpg[field]);
  }
  /* (a) the cosmetic and the amulet lists: pieces the worker holds, the phone never told */
  {
    const id = 'bp_gadopt_cos' + v, phone = newPhone();
    let ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    const ps = room.playerState[id];
    /* each minted in the player's ledger (gearprov.js), as a road that hands one out does */
    const cos = room._gearProvRecord(id, 'gear', { slot: 'hat', gearId: 'tophat', name: 'Top Hat' }, 'test');
    const amu = room._gearProvRecord(id, 'amulet', { tier: 'ornate', gem: 'flame', name: 'Flame Amulet' }, 'test');
    ps.gearStash = [cos];
    ps.amuletStash = [amu];
    room._saveRpg(id, ps);
    await tick();
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    check(tag + '(a) cosmetic: a piece the worker holds is in the phone\'s cosmetic bag after the join, once', !!cos.gid && sees(phone, 'gearStash', cos.gid) === 1, { worker: room.playerState[id].gearStash, phone: phone.rpg.gearStash });
    check(tag + '(a) amulet: a piece the worker holds is in the phone\'s amulet bag after the join, once', !!amu.gid && sees(phone, 'amuletStash', amu.gid) === 1, { worker: room.playerState[id].amuletStash, phone: phone.rpg.amuletStash });
    ws = await joinAs(id, phone, v);
    receive(phone, ws.sent);
    check(tag + '(a) ...and once after a second join (the seed sent)', sees(phone, 'gearStash', cos.gid) === 1 && sees(phone, 'amuletStash', amu.gid) === 1 && phone.rpg.gearStash.length === 1 && phone.rpg.amuletStash.length === 1, phone.rpg);
  }
}

/* ═══ 2. (b) (h) THE REPLY AND THE ECHO, IN EITHER ORDER: ONCE ═══ */
for (const v of [1, 2]) {
  const tag = '2 (v' + v + '). ';
  const id = 'bp_gadopt_both' + v;
  const ws0 = await joinAs(id, null, v);
  const ps = room.playerState[id];
  smith(ps);
  ws0.sent.length = 0;
  await send(ws0, 'forge_armor', { recipe: chestKey });
  const frames = ws0.sent.slice();
  const gid = (frames.find((m) => m.type === 'forge_armor_result') || { payload: {} }).payload.piece?.gid;
  const echo = frames.filter((m) => m.type === 'player_state');
  const reply = frames.filter((m) => m.type === 'forge_armor_result');
  check(tag + 'setup: the forge answered and a state followed, carrying the piece',
    !!gid && reply.length === 1 && echo.some((m) => Array.isArray(m.payload.armorStash) && m.payload.armorStash.some((g) => g && g.gid === gid)), typesOf(ws0));
  const a = newPhone(); receive(a, [...reply, ...echo]);
  check(tag + '(b) the reply first, then the echo: the piece once', sees(a, 'armorStash', gid) === 1, a.rpg.armorStash);
  const b = newPhone(); receive(b, [...echo, ...reply]);
  check(tag + '(b) the echo first, then the reply: the piece once', sees(b, 'armorStash', gid) === 1, b.rpg.armorStash);
  const c = newPhone(); receive(c, [...reply, ...reply, ...echo, ...echo]);
  check(tag + '(b) each twice: the piece once', sees(c, 'armorStash', gid) === 1, c.rpg.armorStash);
  /* the quest's reply: its piece by the same one way */
  const q = newPhone();
  receive(q, [{ type: 'quest_reward_stashed', payload: { item: { name: 'Iron Greaves', tierMult: 2, slot: 'legsArmor', gid: 'q-gid-' + v, prov: 'minted' } } }]);
  receive(q, [{ type: 'player_state', payload: { legsStash: [{ name: 'Iron Greaves', tierMult: 2, slot: 'legsArmor', gid: 'q-gid-' + v, prov: 'minted', gearBase: 'iron', tier: 'T2' }] } }]);
  receive(q, [{ type: 'quest_reward_stashed', payload: { item: { name: 'Iron Greaves', tierMult: 2, slot: 'legsArmor', gid: 'q-gid-' + v } } }]);
  check(tag + '(b) the quest\'s piece: reply, echo, the reply again: once, in the legs bag', sees(q, 'legsStash', 'q-gid-' + v) === 1 && q.rpg.armorStash.length === 0, q.rpg.legsStash);
}
/* (h) the mail: a piece bought, credited to an online buyer; its delivery and the echo, either order */
{
  const sellerId = 'bp_gadopt_mail_s', buyerId = 'bp_gadopt_mail_b';
  const wsS = await joinAs(sellerId, null, 2);
  smith(room.playerState[sellerId]);
  await send(wsS, 'forge_armor', { recipe: chestKey });
  const gid = (wsS.sent.find((m) => m.type === 'forge_armor_result') || { payload: {} }).payload.piece?.gid;
  const taken = room._gearProvTake(sellerId, 'armor', gid);
  const wsB = await joinAs(buyerId, null, 2);
  wsB.sent.length = 0;
  const res = await room._creditPlayer(buyerId, { opId: 'store:gadopt:goods', source: 'market', kind: 'gear', payload: { field: 'armorStash', piece: taken && taken.piece, row: taken && taken.row }, note: 'bought' });
  await tick();
  const frames = wsB.sent.slice();
  const mail = frames.filter((m) => m.type === 'inbox_delivered');
  const echo = frames.filter((m) => m.type === 'player_state');
  if (!echo.length) { room._sendPlayerState(wsB, buyerId); await tick(); echo.push(...wsB.sent.filter((m) => m.type === 'player_state')); }
  check('2. setup: the mail delivered the piece to the online buyer, and the worker holds it',
    !!taken && res !== 'inboxed' && mail.length >= 1 && room.playerState[buyerId].armorStash.some((g) => g && g.gid === gid), { res, sent: typesOf(wsB) });
  const a = newPhone(); receive(a, [...mail, ...echo]);
  const b = newPhone(); receive(b, [...echo, ...mail]);
  check('2. (h) the mail\'s piece, the delivery first then the echo: once', sees(a, 'armorStash', gid) === 1, a.rpg.armorStash);
  check('2. (h) the mail\'s piece, the echo first then the delivery: once', sees(b, 'armorStash', gid) === 1, b.rpg.armorStash);
  /* every list the mail can name refuses a second copy of an id */
  for (const f of BAG) {
    const ph = newPhone();
    const pc = f === 'gearStash' ? { slot: 'hat', gearId: 'tophat', gid: 'm-' + f } : { name: 'P', tierMult: 1, gid: 'm-' + f };
    gearBagPut(ph.rpg, f, pc, 'mail'); gearBagPut(ph.rpg, f, { ...pc }, 'mail');
    check('2. (h) mail into ' + f + ': the same id twice is one piece', ph.rpg[f].length === 1, ph.rpg[f]);
  }
  const ph = newPhone();
  gearBagPut(ph.rpg, 'armorStash', { name: 'Old', tierMult: 1 }, 'mail'); gearBagPut(ph.rpg, 'armorStash', { name: 'Old', tierMult: 1 }, 'mail');
  check('2. a mailed piece with no id goes in as before (two are two)', ph.rpg.armorStash.length === 2, ph.rpg.armorStash);
  check('2. the mail names a list it may not: nothing', gearBagPut(ph.rpg, '__proto__', { gid: 'x' }, 'mail') === null && gearBagPut(ph.rpg, 'weaponStash', { gid: 'x' }, 'mail') === null);
}

/* ═══ 3. (c) ADD, NEVER TAKE ═══ */
{
  const ph = newPhone();
  ph.rpg.armorStash = [{ name: 'Mine', tierMult: 1, gid: 'only-mine' }, { name: 'Legacy', tierMult: 1 }];
  ph.rpg.legsStash = [{ name: 'MyLegs', tierMult: 1, gid: 'legs-mine' }];
  ph.rpg.gearStash = [{ slot: 'hat', gearId: 'cap' }];
  ph.rpg.amuletStash = [{ tier: 'T1', gem: 'ice', name: 'Ice', gid: 'amu-mine' }];
  const n = adoptGearLists(ph.rpg, { armorStash: [{ name: 'Theirs', tierMult: 1, gid: 'theirs' }], legsStash: [], gearStash: [], amuletStash: [] }, () => 'none');
  check('3. (c) a piece the phone holds and the echo lacks stays (every list); the worker\'s is added',
    n === 1 && ph.rpg.armorStash.map((g) => g.gid || g.name).join(',') === 'only-mine,Legacy,theirs'
    && ph.rpg.legsStash.length === 1 && ph.rpg.gearStash.length === 1 && ph.rpg.amuletStash.length === 1, ph.rpg);
  const n0 = adoptGearLists(ph.rpg, { armorStash: [] }, () => 'none');
  check('3. (c) an empty list from the worker takes nothing', n0 === 0 && ph.rpg.armorStash.length === 3, ph.rpg.armorStash);
}

/* ═══ 4. (d) AN OLD COPY WITH NO ID, AND (g) A WORN PIECE ═══ */
{
  const ph = newPhone();
  ph.rpg.armorStash = [{ name: 'Iron Torso', tierMult: 2 }];
  ph.rpg.legsStash = [{ name: 'Iron Greaves', tierMult: 2 }];
  ph.rpg.amuletStash = [{ tier: 'T2', gem: 'fire', name: 'Fire Amulet' }];
  ph.rpg.gearStash = [{ slot: 'hat', gearId: 'tophat', name: 'Top Hat' }];
  const n = adoptGearLists(ph.rpg, {
    armorStash: [{ name: 'Iron Torso', tierMult: 2, gearBase: 'iron', tier: 'T2', gid: 'old-a' }],
    legsStash: [{ name: 'Iron Greaves', tierMult: 2, gearBase: 'iron', tier: 'T2', gid: 'old-l' }],
    amuletStash: [{ tier: 'T2', gem: 'fire', name: 'Fire Amulet', gid: 'old-m' }],
    gearStash: [{ slot: 'hat', gearId: 'tophat', name: 'Top Hat', gid: 'old-c' }],
  }, () => 'none');
  check('4. (d) an old copy with no id is the piece its echo names with one: nothing doubled (every list)',
    n === 0 && ph.rpg.armorStash.length === 1 && ph.rpg.legsStash.length === 1 && ph.rpg.amuletStash.length === 1 && ph.rpg.gearStash.length === 1, ph.rpg);
  const n2 = adoptGearLists(ph.rpg, { armorStash: [{ name: 'Iron Torso', tierMult: 2, gid: 'old-a' }, { name: 'Iron Torso', tierMult: 2, gid: 'second-a' }] }, () => 'none');
  check('4. (d) ...it answers for ONE piece: a second of the same look with its own id comes in', n2 === 1 && ph.rpg.armorStash.length === 2 && sees(ph, 'armorStash', 'second-a') === 1, ph.rpg.armorStash);
  const n3 = adoptGearLists(ph.rpg, { armorStash: [{ name: 'Iron Torso', tierMult: 2, gid: 'old-a' }, { name: 'Iron Torso', tierMult: 2, gid: 'second-a' }] }, () => 'none');
  check('4. (d) ...and the next echo adds nothing', n3 === 0 && ph.rpg.armorStash.length === 2, ph.rpg.armorStash);
  const w = newPhone();
  w.rpg.armor = { name: 'Steel Torso', tierMult: 3, gid: 'worn-a' };
  w.rpg.legsArmor = { name: 'Steel Greaves', tierMult: 3, gid: 'worn-l' };
  w.rpg.amulet = { tier: 'T3', gem: 'ice', name: 'Ice Amulet', gid: 'worn-m' };
  w.worn.hat = 'crown';
  const nw = adoptGearLists(w.rpg, {
    armorStash: [{ name: 'Steel Torso', tierMult: 3, gid: 'worn-a' }],
    legsStash: [{ name: 'Steel Greaves', tierMult: 3, gid: 'worn-l' }],
    amuletStash: [{ tier: 'T3', gem: 'ice', name: 'Ice Amulet', gid: 'worn-m' }],
    gearStash: [{ slot: 'hat', gearId: 'crown', name: 'Crown', gid: 'worn-c' }],
  }, wornOf(w));
  check('4. (g) a worn piece the echo still lists is not put in the bag too (armour, legs, amulet by id; a worn cosmetic by its look)',
    nw === 0 && !w.rpg.armorStash.length && !w.rpg.legsStash.length && !w.rpg.amuletStash.length && !w.rpg.gearStash.length, w.rpg);
  const nw2 = adoptGearLists(w.rpg, { gearStash: [{ slot: 'hat', gearId: 'crown', gid: 'worn-c' }, { slot: 'hat', gearId: 'crown', gid: 'second-c' }] }, wornOf(w));
  check('4. (g) ...a worn cosmetic answers for one: a second Crown the worker holds is in the bag', nw2 === 1 && w.rpg.gearStash.length === 1 && w.rpg.gearStash[0].gid === 'second-c', w.rpg.gearStash);
  /* the room: a piece forged, put on by the phone, the state that follows sent before the worker heard */
  const id = 'bp_gadopt_worn';
  const ws = await joinAs(id, null, 2);
  smith(room.playerState[id]);
  ws.sent.length = 0;
  await send(ws, 'forge_armor', { recipe: chestKey });
  const pc = ws.sent.find((m) => m.type === 'forge_armor_result').payload.piece;
  const ph2 = newPhone();
  receive(ph2, ws.sent.filter((m) => m.type === 'forge_armor_result'));
  /* the phone's own equip (equipActions.js): out of the bag, onto the slot */
  ph2.rpg.armor = ph2.rpg.armorStash.splice(0, 1)[0];
  receive(ph2, ws.sent.filter((m) => m.type === 'player_state'));
  check('4. (g) the room: the phone put the forged piece on; the state that still lists it puts no copy in the bag', sees(ph2, 'armorStash', pc.gid) === 1 && ph2.rpg.armorStash.length === 0, ph2.rpg);
  /* the worker's own equip (stats_update armorRef): the state that follows says it is worn */
  ws.sent.length = 0;
  await send(ws, 'stats_update', { armorRef: pc.gid });
  const ph3 = newPhone();
  receive(ph3, [{ type: 'player_state', payload: { armor: room.playerState[id].armor, armorStash: room.playerState[id].armorStash } }]);
  ph3.rpg.armor = room.playerState[id].armor;
  receive(ph3, [{ type: 'player_state', payload: { armorStash: room.playerState[id].armorStash } }]);
  check('4. (g) the room: worn on the worker, it is out of the worker\'s list and never in the phone\'s bag',
    room.playerState[id].armor && room.playerState[id].armor.gid === pc.gid && ph3.rpg.armorStash.every((g) => g.gid !== pc.gid), { worn: room.playerState[id].armor, list: room.playerState[id].armorStash });
}

/* ═══ 5. (e) NEVER PAST THE CAP ═══ */
{
  const many = (n, p) => Array.from({ length: n }, (_, i) => ({ name: 'P' + i, tierMult: 1, gid: p + i }));
  const full = newPhone();
  full.rpg.armorStash = many(GEAR_ADOPT.CAP, 'mine-');
  const n = adoptGearLists(full.rpg, { armorStash: [{ name: 'New', tierMult: 1, gid: 'over' }] }, () => 'none');
  check('5. (e) a full bag (the cap): the worker\'s piece is not added past it', n === 0 && full.rpg.armorStash.length === GEAR_ADOPT.CAP, full.rpg.armorStash.length);
  const near = newPhone();
  near.rpg.legsStash = many(GEAR_ADOPT.CAP - 2, 'n-');
  const n2 = adoptGearLists(near.rpg, { legsStash: many(10, 'w-') }, () => 'none');
  check('5. (e) two places left: two come in, the list stops at the cap', n2 === 2 && near.rpg.legsStash.length === GEAR_ADOPT.CAP, near.rpg.legsStash.length);
  const empty = newPhone();
  const n3 = adoptGearLists(empty.rpg, { amuletStash: many(GEAR_ADOPT.CAP + 12, 'a-') }, () => 'none');
  check('5. (e) a list longer than the cap: the cap at most', n3 === GEAR_ADOPT.CAP && empty.rpg.amuletStash.length === GEAR_ADOPT.CAP, empty.rpg.amuletStash.length);
  const over = newPhone();
  over.rpg.gearStash = many(GEAR_ADOPT.CAP + 3, 'g-').map((g, i) => ({ slot: 's' + i, gearId: 'x' + i }));
  const n4 = adoptGearLists(over.rpg, { gearStash: [{ slot: 'hat', gearId: 'tophat', gid: 'c1' }] }, () => 'none');
  check('5. (e) a phone already over the cap adds nothing (and keeps its own)', n4 === 0 && over.rpg.gearStash.length === GEAR_ADOPT.CAP + 3, over.rpg.gearStash.length);
}

/* ═══ 6. (f) A "?" STAYS A "?", AND ITS REVEAL BRINGS NO SECOND COPY ═══ */
{
  const id = 'bp_gadopt_reveal', phone = newPhone();
  let ws = await joinAs(id, phone, 2);
  receive(phone, ws.sent);
  const ps = room.playerState[id];
  const q = room._gearProvRecord(id, 'armor', { name: 'Iron Torso', tierMult: 2, slot: 'armor', mat: 'iron', quality: 'elite', unrevealed: true }, 'test');
  const QG = q.gid;
  ps.armorStash = [q];
  room._saveRpg(id, ps);
  await tick();
  ws = await joinAs(id, phone, 2);
  receive(phone, ws.sent);
  const mine = phone.rpg.armorStash.find((g) => g.gid === QG);
  check('6. (f) an unrevealed piece adopted: in the bag once, still a "?" (no grade on the phone)', sees(phone, 'armorStash', QG) === 1 && !!mine && mine.unrevealed === true && mine.quality === undefined, mine);
  ws.sent.length = 0;
  await send(ws, 'reveal_item', { field: 'armorStash', gid: QG });
  const rev = ws.sent.find((m) => m.type === 'item_reveal');
  check('6. setup: the worker opened it (its own road)', !!rev && rev.payload.ok === true && !room.playerState[id].armorStash[0].unrevealed, rev && rev.payload);
  ws = await joinAs(id, phone, 2);
  receive(phone, ws.sent);
  check('6. (f) the state after its reveal brings no second copy (the reveal keeps the id)', sees(phone, 'armorStash', QG) === 1 && phone.rpg.armorStash.length === 1, phone.rpg.armorStash);
  /* a "?" by its reply, then the echo: once, and still a "?" */
  const r = newPhone();
  receive(r, [{ type: 'loot_credit', payload: { armor: [{ name: 'Steel Torso', tierMult: 3, slot: 'armor', unrevealed: true, gid: 'q2', prov: 'minted' }] } }]);
  receive(r, [{ type: 'player_state', payload: { armorStash: [{ name: 'Steel Torso', tierMult: 3, slot: 'armor', unrevealed: true, gid: 'q2' }] } }]);
  check('6. (f) a "?" by its reply then the echo: once, still a "?"', r.rpg.armorStash.length === 1 && r.rpg.armorStash[0].unrevealed === true && r.rpg.armorStash[0].quality === undefined, r.rpg.armorStash);
}

/* ═══ 7. (h) THE PAGE'S HANDLERS CALL THE RULE, AND NONE PUTS A PIECE PAST IT (the syntax tree) ═══ */
{
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  let babel = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(join(root, pkg)); const t = req('@babel/traverse'); babel = { parser: req('@babel/parser'), traverse: t.default || t }; break; } catch { /* the next */ }
  }
  check('7. the syntax tree can be read (@babel/parser)', !!babel);
  if (babel) {
    const parse = (rel) => babel.parser.parse(readFileSync(join(root, rel), 'utf8'), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const LISTS = new Set(['armorStash', 'legsStash', 'gearStash', 'amuletStash', 'shieldStash']);
    const caseOf = (path) => { const c = path.findParent((p) => p.isSwitchCase()); return c && c.node.test && c.node.test.value; };
    const fnOf = (path) => { const f = path.findParent((p) => p.isFunctionDeclaration()); return f && f.node.id && f.node.id.name; };
    const scan = (rel) => {
      const calls = [], pushes = [];
      babel.traverse(parse(rel), {
        CallExpression(path) {
          const c = path.node.callee;
          if (c.type === 'Identifier' && (c.name === 'gearBagPut' || c.name === 'adoptStateGear' || c.name === '_applyLootCredit')) calls.push({ name: c.name, kase: caseOf(path), fn: fnOf(path), args: path.node.arguments });
          /* a piece put into a bag list: `X.armorStash.push(..)`, or `R[key].push(..)` / `S.rpg[f].unshift(..)` */
          if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier' && /^(push|unshift|splice)$/.test(c.property.name)) {
            const o = c.object;
            const named = o.type === 'MemberExpression' && !o.computed && o.property.type === 'Identifier' && LISTS.has(o.property.name);
            const keyed = o.type === 'MemberExpression' && o.computed && (
              (o.object.type === 'Identifier' && o.object.name === 'R')
              || (o.object.type === 'MemberExpression' && !o.object.computed && o.object.property.name === 'rpg'));
            const insert = c.property.name !== 'splice' || path.node.arguments.length > 2;
            if ((named || keyed) && insert) {
              const a0 = path.node.arguments[c.property.name === 'splice' ? 2 : 0];
              pushes.push({ line: path.node.loc.start.line, arg: a0 && a0.type === 'Identifier' ? a0.name : a0 && a0.type, fn: fnOf(path), kase: caseOf(path) });
            }
          }
        },
      });
      return { calls, pushes };
    };
    const W = scan('src/networking/wsClient.js');
    const G = scan('src/networking/gameEvents.js');
    const has = (S, name, where) => S.calls.some((c) => c.name === name && (c.kase === where || c.fn === where));
    check('7. wsClient\'s player_state case adopts the worker\'s lists (adoptStateGear, the switch passed)',
      W.calls.some((c) => c.name === 'adoptStateGear' && c.kase === 'player_state' && c.args.length === 4), W.calls.filter((c) => c.name === 'adoptStateGear'));
    check('7. loot_credit\'s armour goes in by the rule (_applyLootCredit: gearBagPut \'reply\')', W.calls.some((c) => c.name === 'gearBagPut' && c.fn === '_applyLootCredit' && c.args[3] && c.args[3].value === 'reply'));
    check('7. the chest\'s and the forge\'s answers go through _applyLootCredit', has(W, '_applyLootCredit', 'chest_opened') && has(W, '_applyLootCredit', 'forge_armor_result') && has(W, '_applyLootCredit', 'loot_credit'));
    check('7. the quest\'s armour goes in by the rule (quest_reward_stashed: gearBagPut \'reply\')', W.calls.some((c) => c.name === 'gearBagPut' && c.kase === 'quest_reward_stashed' && c.args[3] && c.args[3].value === 'reply'));
    check('7. (h) the mail\'s piece goes in by the rule (gameEvents inbox_delivered: gearBagPut \'mail\')', G.calls.some((c) => c.name === 'gearBagPut' && c.kase === 'inbox_delivered' && c.args[3] && c.args[3].value === 'mail'));
    /* the two moves a list keeps (a piece the phone already held, never a new one):
       the displaced armour back to the bag (_rescueDisplacedArmor) and the worn
       shield the worker took off (the player_state case's `_svShield`) */
    const MOVES = new Set(['worn@_rescueDisplacedArmor', '_svShield@player_state']);
    const past = [...W.pushes, ...G.pushes].filter((p) => !MOVES.has(p.arg + '@' + (p.fn === '_rescueDisplacedArmor' ? p.fn : p.kase)));
    check('7. (h) no handler in wsClient.js or gameEvents.js puts a piece in a bag list past the rule', past.length === 0, past);
    check('7. ...and the two moves are still where the census says (it would go stale otherwise)', [...W.pushes, ...G.pushes].length === MOVES.size, [...W.pushes, ...G.pushes]);
  }
}

/* ═══ 8. the off-ramp and the edges ═══ */
{
  const ph = newPhone();
  check('8. `?gearadopt=0`: the state adopts nothing', adoptStateGear(ph, { armorStash: [{ name: 'X', tierMult: 1, gid: 'x' }] }, () => 'none', true) === 0 && !ph.rpg.armorStash.length);
  check('8. a piece with no id is never adopted', adoptGearLists(ph.rpg, { armorStash: [{ name: 'X', tierMult: 1 }], gearStash: [{ slot: 'hat', gearId: 'x' }] }, () => 'none') === 0 && !ph.rpg.armorStash.length && !ph.rpg.gearStash.length);
  check('8. a junk state throws nothing and adds nothing', adoptStateGear(ph, { armorStash: 'x', legsStash: [null, 7, [], 'y'] }, null, false) === 0 && adoptStateGear(null, {}, null, false) === 0 && adoptStateGear({}, null, null, false) === 0);
  check('8. the shield\'s list is not this rule\'s to adopt (shieldAdopt.js, behind its cap)', adoptGearLists(ph.rpg, { shieldStash: [{ name: 'S', gid: 's1' }] }, () => 'none') === 0 && !ph.rpg.shieldStash.length);
  const t = newPhone();
  gearBagPut(t.rpg, null, { name: 'Iron Greaves', tierMult: 2, slot: 'legsArmor', mat: 'iron', quality: 'rare', gid: 'g', prov: 'legacy', junk: 1 }, 'reply');
  const g = t.rpg.legsStash[0];
  check('8. a reply\'s piece goes in in the bag\'s shape (its list from its slot; mat, grade, id; prov only if minted; nothing else)',
    !!g && g.slot === 'legsArmor' && g.mat === 'iron' && g.quality === 'rare' && g.gid === 'g' && g.prov === undefined && g.junk === undefined && !t.rpg.armorStash.length, t.rpg);
  const o = newPhone();
  o.rpg.armor = { name: 'Old Torso', tierMult: 1 };
  check('8. a reply with no id (an old worker): the old guard by name and tierMult, worn or in the bag',
    gearBagPut(o.rpg, null, { name: 'Old Torso', tierMult: 1 }, 'reply') === null && !!gearBagPut(o.rpg, null, { name: 'Old Torso', tierMult: 2 }, 'reply')
    && gearBagPut(o.rpg, null, { name: 'Old Torso', tierMult: 2 }, 'reply') === null, o.rpg);
  const k = newPhone();
  check('8. an unknown way puts nothing', gearBagPut(k.rpg, 'armorStash', { gid: 'z' }, 'claim') === null && !k.rpg.armorStash.length);
}

/* ═══ 9. the rule's edges, each a mutant of its lines that the parts above let live ═══ */
{
  const none = () => 'none';
  /* an old copy answers only for its own look */
  const a = newPhone();
  a.rpg.armorStash = [{ name: 'Iron Torso', tierMult: 2 }];
  a.rpg.amuletStash = [{ tier: 'ornate', gem: 'frost', name: 'Amulet' }, { tier: 'regal', gem: 'flame', name: 'Amulet2' }];
  a.rpg.gearStash = [{ slot: 'hat', gearId: 'crown' }, { slot: 'cape', gearId: 'red' }];
  const na = adoptGearLists(a.rpg, {
    armorStash: [{ name: 'Iron Torso', tierMult: 3, gid: 'l-1' }, { name: 'Steel Torso', tierMult: 2, gid: 'l-2' }],
    amuletStash: [{ tier: 'ornate', gem: 'flame', name: 'Amulet', gid: 'm-1' }, { tier: 'simple', gem: 'frost', name: 'Amulet', gid: 'm-2' }, { tier: 'ornate', gem: 'frost', name: 'Other', gid: 'm-3' }],
    gearStash: [{ slot: 'cape', gearId: 'crown', gid: 'c-1' }, { slot: 'hat', gearId: 'red', gid: 'c-2' }],
  }, none);
  check('9. an old copy hides only a piece of its own look (armour: name and tier; amulet: tier, gem and name; cosmetic: slot and gearId)',
    na === 7 && a.rpg.armorStash.length === 3 && a.rpg.amuletStash.length === 5 && a.rpg.gearStash.length === 4, { na, rpg: a.rpg });
  const t1 = newPhone();
  t1.rpg.legsStash = [{ name: 'Greaves' }];
  check('9. an old copy with no tierMult is the tier-1 piece', adoptGearLists(t1.rpg, { legsStash: [{ name: 'Greaves', tierMult: 1, gid: 't1' }] }, none) === 0 && t1.rpg.legsStash.length === 1, t1.rpg.legsStash);
  /* a piece with no id, or one held by id, uses no old copy */
  const b = newPhone();
  b.rpg.armorStash = [{ name: 'Torso', tierMult: 1, gid: 'held' }, { name: 'Torso', tierMult: 1 }];
  const nb = adoptGearLists(b.rpg, { armorStash: [{ name: 'Torso', tierMult: 1 }, { name: 'Torso', tierMult: 1, gid: 'held' }, { name: 'Torso', tierMult: 1, gid: 'its-own' }] }, none);
  check('9. the old copy answers for the piece with an id it matches: one with no id, or one held by its id, does not take it', nb === 0 && b.rpg.armorStash.length === 2, b.rpg.armorStash);
  const c = newPhone();
  c.rpg.armorStash = [{ name: 'Torso', tierMult: 1 }, { name: 'Torso', tierMult: 1 }];
  check('9. two old copies answer for two pieces, one each', adoptGearLists(c.rpg, { armorStash: [{ name: 'Torso', tierMult: 1, gid: 'x1' }, { name: 'Torso', tierMult: 1, gid: 'x2' }] }, none) === 0 && c.rpg.armorStash.length === 2, c.rpg.armorStash);
  /* a worn cosmetic is only a real id */
  const w = newPhone();
  const nw = adoptGearLists(w.rpg, { gearStash: [{ slot: 'hat', gearId: 'none', gid: 'w1' }, { slot: 'cape', gearId: 'red', gid: 'w2' }] }, (slot) => (slot === 'hat' ? 'none' : undefined));
  check('9. a slot worn "none" (or nothing) hides no piece', nw === 2 && w.rpg.gearStash.length === 2, w.rpg.gearStash);
  /* the lists made where missing */
  const m = { armor: null };
  check('9. a bag with no list yet: the adopt makes it', adoptGearLists(m, { armorStash: [{ name: 'X', tierMult: 1, gid: 'mk' }] }, none) === 1 && Array.isArray(m.armorStash) && m.armorStash.length === 1, m);
  const m2 = {};
  check('9. ...and the mail', !!gearBagPut(m2, 'gearStash', { slot: 'hat', gearId: 'x', gid: 'mm' }, 'mail') && m2.gearStash.length === 1, m2);
  /* null, never a truthy nothing, for what is refused (the loot handler counts and announces a truthy answer) */
  const h = newPhone();
  h.rpg.armor = { name: 'W', tierMult: 1, gid: 'wg' };
  check('9. a piece held (worn) is refused with null', gearBagPut(h.rpg, null, { name: 'W', tierMult: 1, gid: 'wg' }, 'reply') === null && gearBagPut(h.rpg, 'armorStash', { gid: 'wg' }, 'mail') === null && !h.rpg.armorStash.length);
  check('9. junk in: null, and nothing changes', gearBagPut(null, 'armorStash', { gid: 'z' }, 'mail') === null && gearBagPut(h.rpg, 'armorStash', null, 'mail') === null && gearBagPut(h.rpg, 'armorStash', [1], 'mail') === null && !h.rpg.armorStash.length);
  check('9. the adopt of junk: 0', adoptGearLists(null, { armorStash: [{ gid: 'j' }] }, none) === 0 && adoptGearLists(h.rpg, null, none) === 0 && adoptGearLists(h.rpg, [1], none) === 0 && !h.rpg.armorStash.length);
  const boom = { get armorStash() { throw new Error('boom'); } };
  check('9. a state that throws: 0, nothing thrown', adoptStateGear(newPhone(), boom, none, false) === 0);
  /* the reply's shape: the defaults and the clamps */
  const r = newPhone();
  const r1 = gearBagPut(r.rpg, null, { gid: 'r1' }, 'reply', { name: 'Quest Armor' });
  const r2 = gearBagPut(r.rpg, null, { gid: 'r2' }, 'reply');
  const r3 = gearBagPut(r.rpg, null, { name: 'M', gid: 'r3', mat: 'x'.repeat(30), prov: 'minted' }, 'reply');
  check('9. a reply\'s piece: its name from the reply\'s default, else "Armor"; tierMult 1 when it has none; mat at most 16; prov minted kept',
    r1 && r1.name === 'Quest Armor' && r1.tierMult === 1 && r2 && r2.name === 'Armor' && r3 && r3.mat.length === 16 && r3.prov === 'minted', r.rpg.armorStash);
  const o = newPhone();
  o.rpg.armorStash = [{ name: 'Plain' }];
  check('9. a reply with no id and no tierMult is the tier-1 piece already held', gearBagPut(o.rpg, null, { name: 'Plain' }, 'reply') === null && o.rpg.armorStash.length === 1, o.rpg.armorStash);
}

console.log(failures ? `\n${failures} FAIL` : '\nall PASS');
if (failures) process.exitCode = 1;
