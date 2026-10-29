/* The pet's fetch -- v2.3.3806 (server/src/pets.js _petPickupRange; spec
 * docs/specs/pet-fetch.md).  The owner: "Also make pets run towards loot
 * drops and pick them up for you".
 *
 *   1. CAPS: state_sync advertises caps.petfetch; `petfetch: false` in the
 *      live flags un-advertises it; the name is one the operator's route takes.
 *   2. THE REACH: a viaPet pickup of a monster pile you are a recipient of
 *      succeeds from 450 px (where the phone's pet runs to) and from 590
 *      (you walked on while it ran), and fails past PETS.FETCH_RANGE.
 *   3. DEATH DROPS keep the vacuum's 240: your own death pile from 400 px is
 *      refused (max 240), and from 200 px taken.
 *   4. NOT YOURS: a pile you are not a recipient of is refused, near or far.
 *   5. THE SWITCH: `petfetch: false` puts a monster pile back on 240.
 *   6. NO PET: the wider reach is the pet's -- no active pet, 'no-pet'.
 *   7. ONE PICKUP A PILE: a second viaPet ask is 'already-claimed'.
 *   8. THE PHONE'S RULES (src/game/petFetch.js): its radius under the
 *      worker's reach with the walk lag, and the pile it picks.
 */
import { GameRoom } from '../src/index.js';
import { PETS } from '../src/pets.js';
import { flagNameOk } from '../src/liveops.js';
import * as F from '../../src/game/petFetch.js';

const store = new Map();
const mockState = {
  storage: {
    get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
    list: async () => new Map(), delete: async (k) => { store.delete(k); },
  },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const room = new GameRoom(mockState, mockEnv);
async function join(ws, id) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
function giveActivePet(pid) {
  const book = room._petbookOf(pid);
  const pet = { id: 'p_' + pid.replace(/[^a-z0-9]/g, '0'), kind: 'gobling', look: 'fireGoblin', home: 'ember', stage: 1,
    gold: false, size: 1, name: null, lv: 1, xp: 0, at: Date.now(), caughtBy: pid, owners: 1, tradeAfter: Date.now() };
  book.rec.list.push(pet);
  book.rec.active = pet.id;
  return book;
}
const msgs = (w, t) => w.sent.filter((m) => m.type === t);
const last = (w, t) => { const r = msgs(w, t); return r.length ? r[r.length - 1].payload : null; };

const wsA = fakeWs('a'), wsB = fakeWs('b');
await join(wsA, 'bp_fetch_a');
await join(wsB, 'bp_fetch_b');
const sync = msgs(wsA, 'state_sync')[0];
const psA = room.playerState.bp_fetch_a, psB = room.playerState.bp_fetch_b;
const bookA = giveActivePet('bp_fetch_a');
giveActivePet('bp_fetch_b');
for (const p of [psA, psB]) { p.z = 'meadow'; p.dead = false; p.dying = false; p.disconnected = false; p.x = 1000; p.y = 1000; p.coins = 0; }

let seq = 0;
function monsterPile(dx, recipients) {
  const pile = { lootId: 'pf-' + (++seq), zone: 'meadow', x: 1000 + dx, y: 1000, coins: 30, skull: null, shard: null,
    recipients, shares: Object.fromEntries(recipients.map((r) => [r, 1 / recipients.length])),
    killerName: 'T', ts: Date.now(), inventoryClaimed: false, claimedBy: {}, weapon: null, weaponClaimed: false };
  (room.loot.meadow = room.loot.meadow || []).push(pile);
  return pile;
}
const ask = async (w, pile, viaPet = true) => {
  w.sent.length = 0;
  await room.webSocketMessage(w, JSON.stringify({ type: 'loot_pickup', payload: { lootId: pile.lootId, zone: 'meadow', viaPet } }));
  return { credit: last(w, 'loot_credit'), reject: last(w, 'loot_pickup_rejected') };
};

// ── 1. caps ──
check('1. state_sync advertises caps.petfetch, and caps.petLoot stays', sync && sync.caps && sync.caps.petfetch === true && sync.caps.petLoot === true, sync && sync.caps);
check('1. `petfetch` is a name POST /flags takes', flagNameOk('petfetch'));
{
  room._liveFlags = { petfetch: false };
  const w = fakeWs('c'); await join(w, 'bp_fetch_c');
  const s2 = msgs(w, 'state_sync')[0];
  check('1. `petfetch: false` un-advertises the cap', s2 && s2.caps && s2.caps.petfetch === false, s2 && s2.caps);
  room._liveFlags = {};
  check('1. ...and nothing set leaves the switch on', room._petFetchOff() === false);
}

// ── 2. the reach ──
check('2. the worker\'s reach is wider than the vacuum\'s', PETS.FETCH_RANGE > PETS.VACUUM_RANGE, PETS);
{
  const r = await ask(wsA, monsterPile(450, ['bp_fetch_a']));
  check('2. a viaPet pickup of your monster pile from 450 px is credited', r.credit && r.credit.coins === 30 && r.credit.viaPet === true && psA.coins === 30, r);
  const r2 = await ask(wsA, monsterPile(590, ['bp_fetch_a']));
  check('2. ...and from 590 px (you walked on while it ran)', r2.credit && r2.credit.coins === 30 && psA.coins === 60, r2);
  const r3 = await ask(wsA, monsterPile(PETS.FETCH_RANGE + 40, ['bp_fetch_a']));
  check('2. past FETCH_RANGE it is refused out-of-range', r3.reject && r3.reject.reason === 'out-of-range' && r3.reject.max === PETS.FETCH_RANGE && psA.coins === 60, r3);
  const r4 = await ask(wsA, monsterPile(400, ['bp_fetch_a']), false);
  check('2. a hand pickup from 400 px is still refused (160)', r4.reject && r4.reject.reason === 'out-of-range' && r4.reject.max === room.LOOT_PICKUP_RANGE, r4);
}

// ── 3. death drops keep 240 ──
{
  psA.inventory = { copper_ore: 3 };
  psA.x = 1400; // the pile is spawned where they stand
  const pile = room._spawnDeathPile(psA, 'bp_fetch_a');
  psA.inventory = {};
  psA.x = 1000;
  check('3. a death pile is spawned for the test', pile && pile.isDeathDrop === true && pile.recipients.includes('bp_fetch_a'), pile);
  const r = await ask(wsA, pile);
  check('3. your own death pile from 400 px via the pet is refused, max 240', r.reject && r.reject.reason === 'out-of-range' && r.reject.max === PETS.VACUUM_RANGE && !psA.inventory.copper_ore, r);
  psA.x = 1200;
  const r2 = await ask(wsA, pile);
  check('3. ...and from 200 px it is taken whole', r2.credit && r2.credit.isDeathDrop === true && psA.inventory.copper_ore === 3, r2);
  psA.x = 1000;
  // a dropped item (itemdrop.js) is a death drop too
  const drop = monsterPile(400, ['bp_fetch_a']);
  drop.isDeathDrop = true; drop.deathItems = [{ key: 'tin_ore', qty: 1 }];
  const r3 = await ask(wsA, drop);
  check('3. any pile marked isDeathDrop keeps 240 (a dropped item)', r3.reject && r3.reject.reason === 'out-of-range' && r3.reject.max === PETS.VACUUM_RANGE, r3);
}

// ── 4. not yours ──
{
  const far = monsterPile(400, ['bp_fetch_b']);
  const r = await ask(wsA, far);
  check('4. someone else\'s pile from 400 px is refused not-recipient', r.reject && r.reject.reason === 'not-recipient' && psA.coins === 60, r);
  const near = monsterPile(100, ['bp_fetch_b']);
  const r2 = await ask(wsA, near);
  check('4. ...and from 100 px too', r2.reject && r2.reject.reason === 'not-recipient', r2);
  check('4. the range for a pile you are not on is the vacuum\'s', room._petPickupRange(far, 'bp_fetch_a') === PETS.VACUUM_RANGE);
}

// ── 5. the switch ──
{
  room._liveFlags = { petfetch: false };
  const r = await ask(wsA, monsterPile(400, ['bp_fetch_a']));
  check('5. `petfetch: false`: your monster pile from 400 px is refused, max 240', r.reject && r.reject.reason === 'out-of-range' && r.reject.max === PETS.VACUUM_RANGE, r);
  const r2 = await ask(wsA, monsterPile(200, ['bp_fetch_a']));
  check('5. ...and the vacuum\'s 200 px still works', r2.credit && r2.credit.coins === 30, r2);
  room._liveFlags = {};
}

// ── 6. no pet ──
{
  const was = bookA.rec.active; bookA.rec.active = null;
  const r = await ask(wsA, monsterPile(400, ['bp_fetch_a']));
  check('6. with no active pet a viaPet ask is refused no-pet', r.reject && r.reject.reason === 'no-pet', r);
  bookA.rec.active = was;
}

// ── 7. one pickup a pile ──
{
  const pile = monsterPile(400, ['bp_fetch_a', 'bp_fetch_b']);
  const r = await ask(wsA, pile);
  const r2 = await ask(wsA, pile);
  check('7. the first fetch credits, a second is already-claimed', r.credit && r.credit.coins === 15 && r2.reject && r2.reject.reason === 'already-claimed', { r, r2 });
  const r3 = await ask(wsB, pile);
  check('7. the other recipient\'s pet still gets their share', r3.credit && r3.credit.coins === 15, r3);
}

// ── 8. the phone's rules ──
check('8. the phone\'s leash plus the walk lag sits inside the worker\'s reach', F.PET_FETCH.LEASH + 50 <= PETS.FETCH_RANGE && F.PET_FETCH.RADIUS < F.PET_FETCH.LEASH, F.PET_FETCH);
{
  const me = 'bp_me';
  const piles = [
    { lootId: 'far', x: 400, y: 0, _serverLoot: true, recipients: [me] },
    { lootId: 'near', x: 200, y: 0, _serverLoot: true, recipients: [me] },
    { lootId: 'death', x: 50, y: 0, _serverLoot: true, recipients: [me], isDeathDrop: true },
    { lootId: 'theirs', x: 60, y: 0, _serverLoot: true, recipients: ['bp_x'] },
    { lootId: 'mine-dropped', x: 70, y: 0, _serverLoot: true, recipients: [me], dropped: true, dropBy: me },
    { lootId: 'taken', x: 80, y: 0, _serverLoot: true, recipients: [me], _collected: true },
    { lootId: 'out', x: 900, y: 0, _serverLoot: true, recipients: [me] },
    { lootId: 'local', x: 90, y: 0, recipients: [me] },
  ];
  const pick = F.petFetchPick(piles, 0, 0, me, null);
  check('8. it picks the nearest monster pile of yours in the radius', pick && pick.lootId === 'near', pick);
  const skip = F.petFetchPick(piles, 0, 0, me, (id) => id === 'near');
  check('8. ...skipping a pile it already gave up on', skip && skip.lootId === 'far', skip);
  check('8. nothing in reach: null', F.petFetchPick(piles, 5000, 5000, me, null) === null);
  check('8. the pet runs at 1.5x your run', F.PET_FETCH.SPEED_K === 1.5);
}
{
  // a run: out to the pile, waiting for the vacuum's ask, then home
  const me = 'bp_me', S = F.petFetchState();
  const pile = { lootId: 'p1', x: 300, y: 0, _serverLoot: true, recipients: [me] };
  let pet = { x: -30, y: 20 }, t = 1000, frames = 0, sawGo = false;
  const c = () => ({ now: t, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: pet.x, petY: pet.y, stepPx: 6, blockedAt: null });
  while (frames++ < 400) {
    const r = F.petFetchStep(S, c()); t += 16;
    if (S.phase === 'go') sawGo = true;
    if (r) pet = r;
    if (S.phase === 'go' && Math.hypot(pet.x - pile.x, pet.y - pile.y) < 1 && frames > 100) pile._petPickupPending = true;
    if (sawGo && !S.phase) break;
  }
  check('8. a run goes out, waits for the ask at the pile, and comes home', sawGo && S.got === 1 && Math.hypot(pet.x, pet.y) <= F.PET_FETCH.HOME + 1, { S, pet, frames });
  const again = F.petFetchStep(S, c()); t += F.PET_FETCH.LOOK_MS + 1;
  check('8. ...and never runs to the same pile twice', again === null && F.petFetchStep(S, c()) === null && !S.phase);
}
{
  const me = 'bp_me', S = F.petFetchState();
  const pile = { lootId: 'p2', x: 300, y: 0, _serverLoot: true, recipients: [me] };
  F.petFetchStep(S, { now: 1, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: 0, petY: 0, stepPx: 6, blockedAt: null });
  F.petFetchStep(S, { now: 20, zone: 'wheel', me, piles: [pile], px: -400, py: 0, petX: 6, petY: 0, stepPx: 6, blockedAt: null });
  check('8. you walking past the leash sends it home', S.phase === 'back', S.phase);
  const S2 = F.petFetchState(), wet = (x) => x > 100 && x < 140;
  F.petFetchStep(S2, { now: 1, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: 0, petY: 0, stepPx: 6, blockedAt: wet, waterAt: wet });
  check('8. water on its line: it does not set off', !S2.phase && S2.skip.has('p2') && S2.why === 'water', S2);
  // a bush on the way (a 40 px box across its line): it goes round and gets there
  const bush = (x, y) => x > 130 && x < 170 && Math.abs(y) < 20;
  const S5 = F.petFetchState(); let q = { x: 0, y: 0 }, t5 = 1, hit = false;
  for (let i = 0; i < 200 && (i === 0 || S5.phase === 'go'); i++) {
    const r = F.petFetchStep(S5, { now: t5, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: q.x, petY: q.y, stepPx: 6, blockedAt: bush, waterAt: () => false });
    if (r) { if (bush(r.x, r.y)) hit = true; q = r; } t5 += 16;
    if (S5.atPile) pile._petPickupPending = true;
  }
  check('8. a bush on its line: it goes round it, never through, and fetches', !hit && S5.got === 1, { S5, q });
  delete pile._petPickupPending;
  // a wall right by the pile: it runs, stops at the wall, and waits there for the ask
  const S4 = F.petFetchState(); let pp = { x: 0, y: 0 }, tt = 1;
  const wallAt = (x) => x > 270;
  for (let i = 0; i < 200 && (i === 0 || S4.phase === 'go'); i++) {
    const r = F.petFetchStep(S4, { now: tt, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: pp.x, petY: pp.y, stepPx: 6, blockedAt: wallAt });
    if (r) pp = r; tt += 16;
    if (S4.atPile && !pile._petPickupPending) { check('8. a wall by the pile: it waits within REACH, and the vacuum may ask', F.petFetchHolds(S4, 'p2') === false && 300 - pp.x <= F.PET_FETCH.REACH, { pp, S4 }); pile._petPickupPending = true; }
  }
  check('8. ...then comes home with it fetched', S4.got === 1 && S4.why === 'near', S4);
  delete pile._petPickupPending;
  const S3 = F.petFetchState();
  F.petFetchStep(S3, { now: 1, zone: 'wheel', me, piles: [pile], px: 0, py: 0, petX: 0, petY: 0, stepPx: 6, blockedAt: null });
  F.petFetchStep(S3, { now: 20, zone: 'dungeon_x', me, piles: [pile], px: 0, py: 0, petX: 6, petY: 0, stepPx: 6, blockedAt: null });
  check('8. a zone change drops the run', !S3.phase || S3.lootId !== 'p2', S3);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
