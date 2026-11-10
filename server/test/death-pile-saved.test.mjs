/* ═══ v2.3.4384: A DEAD PLAYER'S BAG ON THE GROUND SURVIVES A RESTART ═══
 *
 * The state-machine sweep (2026-11-03, V22 S1-9): the death pile lived only in
 * memory, and the death's save had already left its items out of the bag, so a
 * worker deploy inside its two minutes destroyed the bag.  The owner,
 * 2026-11-10: "save it".  One row a death pile (`death_pile:<lootId>`,
 * deathpile.js), every check against the real GameRoom, and a "restart" is a
 * NEW GameRoom on the same storage:
 *   1. a death writes the row with the save that empties the bag; after a
 *      restart the bag is back on the ground for its owner, with the time it
 *      had left and its owner's minute;
 *   2. protocol 2 and protocol 1 phones are sent the restored pile in their
 *      join's state_sync, and a zone list, as any other;
 *   3. the owner takes it: the items in the bag, the row gone; after a
 *      restart the pile is not back;
 *   4. a pile past its time is not back, and its row is deleted at the start;
 *      one past it in memory goes with its row (_tickLoot);
 *   5. No man's land's rights survive: the killer's minute, then anyone's;
 *   6. one bounded read a worker's life, at the first join, never again;
 *   7. EVERY CRASH POINT: a restart before any write of the death, and of the
 *      pickup, leaves each item in exactly one place (the record or the
 *      ground), never two, never none;
 *   8. the kill switch `deathpilesave: false`: no row (memory only, as
 *      before); a row already saved is still restored, deleted on a pickup
 *      and swept;
 *   9. a dropped item (itemdrop.js) and a monster's pile write no row.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { DEATHPILE, DEATH_PILE_KEY } from '../src/deathpile.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

let NOW = 1_770_000_000_000;
const realNow = Date.now;
Date.now = () => NOW;

/* A Durable Object's storage, as inbox.test §8c has it: every write of one
   synchronous run commits as ONE batch (at the end of the run), and the room
   can die before batch `crashAt`.  `list` honours prefix and limit, as the
   runtime does, and logs its calls. */
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
function mkState(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, crashAt = Infinity, dead = false;
  const lists = [];
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
  };
  const write = (op, k, v) => {
    if (!pending) { pending = []; queueMicrotask(commit); }
    pending.push([op, k, clone(v)]);
  };
  const view = (k) => {
    if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
    return clone(store.get(k));
  };
  return {
    _store: store, lists,
    batches: () => batches,
    crashAt(n) { crashAt = n; },
    storage: {
      get: async (k) => {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) { const v = view(x); if (v !== undefined) r.set(x, v); } return r; }
        return view(k);
      },
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
      list: async (opts) => {
        lists.push({ prefix: opts && opts.prefix, limit: opts && opts.limit });
        const out = new Map();
        const keys = [...store.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort();
        for (const k of keys) { if (opts?.limit && out.size >= opts.limit) break; out.set(k, clone(store.get(k))); }
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
const settle = () => new Promise((r) => setTimeout(r, 5));
const msgs = (ws) => ws.sent.map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);

async function join(room, id, pv = 2) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, ws: [1, 5], protocolVersion: pv, data: { x: 1000, y: 1000, z: WHEEL_ZONE } }));
  await settle();
  return { ws, id, session: room.sessions.get(ws) };
}
function newRoom(state, flags) {
  const room = new GameRoom(state, mockEnv);
  room._liveFlags = Object.assign(Object.create(null), flags || {});
  return room;
}
/* a player in the Wheel holding `bag`, saved */
async function world(pid, bag, flags) {
  const s = mkState();
  const r = newRoom(s, flags);
  const p = await join(r, pid);
  const ps = r.playerState[pid];
  ps.z = WHEEL_ZONE; ps.x = 1000; ps.y = 1000;
  ps.inventory = Object.assign(Object.create(null), bag);
  r._saveRpg(pid, ps);
  await settle();
  return { s, r, p, ps };
}
const BAG = { wood_pine: 7, fish_trout: 3 };
const pilesOf = (store) => [...store.entries()].filter(([k]) => k.startsWith(DEATHPILE.PREFIX)).map(([, v]) => v);
const deathPileIn = (room, owner) => (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + owner));
/* stand a player on a pile, alive, and ask for it */
async function take(room, p, pile) {
  const ps = room.playerState[p.id];
  ps.z = pile.zone; ps.x = pile.x; ps.y = pile.y; ps.dead = false; ps.dying = false; ps.disconnected = false;
  if (typeof ps.hp !== 'number' || ps.hp <= 0) ps.hp = ps.maxHp || 100;
  room._handleLootPickup(p.session, { lootId: pile.lootId, zone: pile.zone });
  await settle();
  const ok = msgs(p.ws).filter((m) => m.type === 'loot_credit' && m.payload.lootId === pile.lootId);
  const no = msgs(p.ws).filter((m) => m.type === 'loot_pickup_rejected' && m.payload.lootId === pile.lootId);
  return { ok: ok.length > 0, reason: no.length ? no[no.length - 1].payload.reason : null };
}

/* ── 1. the death, the restart, the owner's bag back ── */
let storeAfterDeath, deathPile;
{
  const P = 'bp_dps_a';
  const { s, r, ps } = await world(P, BAG);
  r._handlePlayerDeath(ps, P, 'monster');
  await settle();
  deathPile = deathPileIn(r, P);
  check('1a the death lays the bag on the ground', !!deathPile && deathPile.deathItems.length === 2, deathPile && deathPile.deathItems);
  const rows = pilesOf(s._store);
  const rec = s._store.get('rpg:' + P);
  check('1b ...one row for it, its shape numbered, its items the bag\'s',
    rows.length === 1 && rows[0].v === DEATHPILE.V && rows[0].id === deathPile.lootId && rows[0].owner === P
      && JSON.stringify(rows[0].items) === JSON.stringify(deathPile.deathItems), rows);
  check('1c ...and the record\'s bag no longer holds them (they are in one place)', !rec.inventory.wood_pine && !rec.inventory.fish_trout, rec.inventory);
  storeAfterDeath = new Map(s._store);

  /* 30 s later, a deploy: a new room on the same storage */
  NOW += 30000;
  const s2 = mkState(storeAfterDeath);
  const r2 = newRoom(s2);
  check('1d a new room holds no pile before anyone joins', !deathPileIn(r2, P));
  const p2 = await join(r2, P);
  const back = deathPileIn(r2, P);
  check('1e after the restart the bag is back on the ground, the same pile', !!back && back.lootId === deathPile.lootId && back.x === deathPile.x && back.y === deathPile.y
    && JSON.stringify(back.deathItems) === JSON.stringify(deathPile.deathItems), back);
  check('1f ...with the time it had left (90 s of 120) and its owner\'s minute (30 s left)',
    !!back && back.expiry - NOW === r2.DEATH_PILE_TOTAL_MS - 30000 && back.ownerOnlyUntil - NOW === r2.DEATH_PILE_OWNER_MS - 30000,
    back && { left: back.expiry - NOW, open: back.ownerOnlyUntil - NOW });
  check('1g ...still its owner\'s alone', !!back && JSON.stringify(back.recipients) === JSON.stringify([P]), back && back.recipients);
  /* a stranger in the minute is refused; the owner takes it */
  const X = await join(r2, 'bp_dps_x');
  const tx = await take(r2, X, back);
  check('1h a stranger inside the owner\'s minute is refused (not-recipient)', !tx.ok && tx.reason === 'not-recipient', tx);
  const t = await take(r2, p2, back);
  const psA = r2.playerState[P];
  check('3a the owner takes it: the items are in the bag', t.ok && psA.inventory.wood_pine === 7 && psA.inventory.fish_trout === 3, { t, inv: psA.inventory });
  check('3b ...the row is gone, and so is the pile', pilesOf(s2._store).length === 0 && !deathPileIn(r2, P), pilesOf(s2._store));
  /* and another restart: not back */
  const s3 = mkState(s2._store);
  const r3 = newRoom(s3);
  await join(r3, P);
  check('3c a restart after the pickup brings no pile back', !deathPileIn(r3, P) && (s3._store.get('rpg:' + P).inventory.wood_pine === 7));
}

/* ── 2. protocol 2 and protocol 1 phones, and a zone list ── */
{
  for (const pv of [2, 1]) {
    const s = mkState(storeAfterDeath);
    const r = newRoom(s);
    const p = await join(r, 'bp_dps_v' + pv, pv);
    const sync = msgs(p.ws).find((m) => m.type === 'state_sync');
    const w = sync && Array.isArray(sync.loot) && sync.loot.find((x) => x.lootId === deathPile.lootId);
    check(`2${pv === 2 ? 'a' : 'b'} a protocol ${pv} phone's join is sent the restored pile in its state_sync, as any death pile`,
      !!w && w.isDeathDrop === true && Array.isArray(w.deathItems) && w.deathItems.length === 2 && w.expiry === deathPile.expiry && w.ownerOnlyUntil === deathPile.ownerOnlyUntil,
      w || (sync && sync.loot));
    if (pv === 2) {
      const snap = r._zoneSnapshotWire ? r._zoneSnapshotWire(WHEEL_ZONE) : null;
      check('2c ...and a zone list (zone_state, the roster push) carries it', !snap || (snap.loot || []).some((x) => x.lootId === deathPile.lootId), snap && snap.loot);
    }
  }
}

/* ── 4. past its time ── */
{
  /* the room was down past the pile's two minutes */
  const s = mkState(storeAfterDeath);
  NOW += 120000;
  const r = newRoom(s);
  await join(r, 'bp_dps_late');
  await settle();
  check('4a a pile past its time is not back', !deathPileIn(r, 'bp_dps_a'));
  check('4b ...and its row is deleted at the start', pilesOf(s._store).length === 0, pilesOf(s._store));
  NOW -= 120000;
}
{
  /* the pile runs out with the room up: its row goes with it */
  const s = mkState(storeAfterDeath);
  const r = newRoom(s);
  await join(r, 'bp_dps_tick');
  check('4c (restored, then...)', !!deathPileIn(r, 'bp_dps_a'));
  NOW += 120000;
  r._tickLoot();
  await settle();
  check('4d ...runs out on the tick: the pile and its row both gone', !deathPileIn(r, 'bp_dps_a') && pilesOf(s._store).length === 0, pilesOf(s._store));
  NOW -= 120000;
}

/* ── 5. No man's land: the killer's minute survives ── */
{
  const P = 'bp_dps_nml', K = 'bp_dps_killer';
  const { s, r, ps } = await world(P, { ore_copper: 4 });
  /* what _handlePlayerDeath does with No man's land's answer (nomansland.js
     _nmlOnDeath): the pile is the killer's for its minute, the whole bag */
  const pile = r._spawnDeathPile(ps, P, { recipients: [K], ownerName: 'Killer', all: true });
  ps.inventory = r._wipeInventoryOnDeath(ps, true);
  r._deathPileSave(pile, P, ps);
  r._saveRpg(P, ps);
  await settle();
  NOW += 10000;
  const s2 = mkState(s._store);
  const r2 = newRoom(s2);
  const pd = await join(r2, P);
  const pk = await join(r2, K);
  const back = deathPileIn(r2, P);
  check('5a a No man\'s land pile comes back the killer\'s, with its name', !!back && JSON.stringify(back.recipients) === JSON.stringify([K]) && back.killerName === 'Killer', back);
  const t1 = await take(r2, pd, back);
  check('5b ...the dead player is refused inside the killer\'s minute', !t1.ok && t1.reason === 'not-recipient', t1);
  const t2 = await take(r2, pk, back);
  check('5c ...the killer takes it', t2.ok && r2.playerState[K].inventory.ore_copper === 4 && pilesOf(s2._store).length === 0, { t2, inv: r2.playerState[K].inventory });
  /* a red skull's (nobody's minute) is anyone's at once after a restart too */
  const { s: s3, r: r3, ps: ps3 } = await world('bp_dps_red', { ore_iron: 2 });
  const red = r3._spawnDeathPile(ps3, 'bp_dps_red', { recipients: [], ownerOnlyUntil: NOW, all: true });
  ps3.inventory = r3._wipeInventoryOnDeath(ps3, true);
  r3._deathPileSave(red, 'bp_dps_red', ps3); r3._saveRpg('bp_dps_red', ps3);
  await settle();
  NOW += 1000;
  const r4 = newRoom(mkState(s3._store));
  const any = await join(r4, 'bp_dps_any');
  const t3 = await take(r4, any, deathPileIn(r4, 'bp_dps_red'));
  check('5d a red skull\'s pile (nobody\'s minute) is anyone\'s after a restart', t3.ok && r4.playerState.bp_dps_any.inventory.ore_iron === 2, t3);
}

/* ── 6. one bounded read, at the first join only ── */
{
  const s = mkState(storeAfterDeath);
  const r = newRoom(s);
  await join(r, 'bp_dps_r1');
  await join(r, 'bp_dps_r2');
  await join(r, 'bp_dps_r3');
  for (let i = 0; i < 20; i++) { NOW += 100; r._tickLoot(); }
  const reads = s.lists.filter((l) => l.prefix === DEATHPILE.PREFIX);
  check('6a three joins and twenty ticks read the piles once, one page with a limit',
    reads.length === 1 && reads[0].limit === DEATHPILE.READ_MAX && DEATHPILE.READ_MAX > 0, reads);
  check('6b ...and a pile already on the ground is never put there twice', (r.loot[WHEEL_ZONE] || []).filter((p) => p.lootId === deathPile.lootId).length === 1);
}

/* ── 7. every crash point ── */
/* counts of each key in the record's bag, every row and every pile restored */
async function where(store, owner, takers) {
  const s = mkState(store);
  const r = newRoom(s);
  await join(r, 'bp_dps_look');
  const total = Object.create(null);
  const add = (k, q) => { total[k] = (total[k] || 0) + q; };
  for (const id of [owner, ...(takers || [])]) {
    const rec = store.get('rpg:' + id);
    for (const [k, q] of Object.entries((rec && rec.inventory) || {})) if (k in BAG) add(k, q);
  }
  for (const p of (r.loot[WHEEL_ZONE] || [])) if (p.isDeathDrop) for (const it of p.deathItems) add(it.key, it.qty);
  return total;
}
const exact = (t) => Object.keys(BAG).every((k) => t[k] === BAG[k]) && Object.keys(t).length === Object.keys(BAG).length;
{
  /* the death: how many batches it writes */
  const P = 'bp_dps_crash';
  const base = await world(P, BAG);
  const seed = new Map(base.s._store);
  const probe = mkState(seed); const pr = newRoom(probe);
  const pp = await join(pr, P); pr.playerState[P].z = WHEEL_ZONE; pr.playerState[P].inventory = Object.assign(Object.create(null), BAG);
  const b0 = probe.batches();
  pr._handlePlayerDeath(pr.playerState[P], P, 'monster');
  await settle();
  const n = probe.batches() - b0;
  const wrong = [];
  for (let k = 0; k <= n; k++) {
    const s1 = mkState(seed); const r1 = newRoom(s1);
    await join(r1, P);
    const ps1 = r1.playerState[P]; ps1.z = WHEEL_ZONE; ps1.x = 1000; ps1.y = 1000; ps1.inventory = Object.assign(Object.create(null), BAG);
    r1._saveRpg(P, ps1); await settle();
    s1.crashAt(s1.batches() + k);
    r1._handlePlayerDeath(ps1, P, 'monster');
    await settle();
    const t = await where(s1._store, P);
    if (!exact(t)) wrong.push({ crashAt: k, t });
  }
  check(`7a a restart before any of the death's ${n} writes leaves every item in exactly one place (the record or the ground)`, wrong.length === 0 && n >= 1, wrong);

  /* the pickup, by the owner after a restart and by a stranger after the minute */
  for (const who of ['owner', 'stranger']) {
    const T = who === 'owner' ? P : 'bp_dps_taker';
    const wrongT = [];
    let nT = 0;
    for (let k = 0; ; k++) {
      const s1 = mkState(storeAfterDeath); const r1 = newRoom(s1);
      const p = await join(r1, who === 'owner' ? 'bp_dps_a' : T);
      if (who === 'stranger') NOW += 61000;
      const pile = deathPileIn(r1, 'bp_dps_a');
      const b = s1.batches();
      s1.crashAt(b + k);
      const t = await take(r1, p, pile);
      if (who === 'stranger') NOW -= 61000;
      nT = Math.max(nT, s1.batches() - b);
      const tot = await where(s1._store, 'bp_dps_a', who === 'owner' ? [] : [T]);
      if (!t.ok || !exact(tot)) wrongT.push({ crashAt: k, ok: t.ok, reason: t.reason, tot });
      if (k >= nT) break;
    }
    check(`7${who === 'owner' ? 'b' : 'c'} a restart before any of a pickup's writes (${who}, ${nT}) leaves every item in exactly one place: the taker's record or the ground`, wrongT.length === 0 && nT >= 1, wrongT);
  }
}

/* ── 8. the kill switch ── */
{
  const P = 'bp_dps_off';
  const { s, r, ps } = await world(P, BAG, { deathpilesave: false });
  check('8a `deathpilesave: false` reads as off; absent reads as on', r._deathPileSaveOff() === true && newRoom(mkState())._deathPileSaveOff() === false);
  r._handlePlayerDeath(ps, P, 'monster');
  await settle();
  check('8b ...a death with it off still lays the pile, and writes no row (memory only, as before)', !!deathPileIn(r, P) && pilesOf(s._store).length === 0, pilesOf(s._store));
  /* a row saved before it was thrown is still restored, taken and swept */
  const s2 = mkState(storeAfterDeath);
  const r2 = newRoom(s2, { deathpilesave: false });
  const p2 = await join(r2, 'bp_dps_a');
  const back = deathPileIn(r2, 'bp_dps_a');
  check('8c ...a row saved before the switch is still restored', !!back);
  const t = await take(r2, p2, back);
  check('8d ...and deleted when it is taken', t.ok && pilesOf(s2._store).length === 0);
  const s3 = mkState(storeAfterDeath);
  NOW += 200000;
  const r3 = newRoom(s3, { deathpilesave: false });
  await join(r3, 'bp_dps_off3');
  check('8e ...and one past its time is swept', pilesOf(s3._store).length === 0);
  NOW -= 200000;
}

/* ── 9. only a death's pile is saved ── */
{
  const P = 'bp_dps_drop';
  const { s, r, ps } = await world(P, BAG);
  const p = { id: P };
  const before = pilesOf(s._store).length;
  if (r._handleItemDrop) {
    const sess = [...r.sessions.values()].find((x) => x.id === P);
    await r._handleItemDrop(sess, { key: 'wood_pine', qty: 2 });
  }
  const drop = (r.loot[WHEEL_ZONE] || []).find((x) => x.dropped);
  r._deathPileSave(drop, P, ps);   /* even asked directly, a drop writes none */
  await settle();
  check('9a a dropped item writes no row', pilesOf(s._store).length === before, { drop: !!drop, rows: pilesOf(s._store) });
  const kill = { lootId: 'mk-1', zone: WHEEL_ZONE, x: 1, y: 1, coins: 3, recipients: [P], shares: { [P]: 1 }, claimedBy: {}, ts: NOW };
  r._deathPileSave(kill, P, ps);
  await settle();
  check('9b a monster\'s pile writes no row', pilesOf(s._store).length === before);
  void p;
}

/* ── 10. a junk or newer row ── */
{
  const s = mkState();
  s._store.set(DEATH_PILE_KEY('dd-x-1'), { v: DEATHPILE.V + 1, id: 'dd-x-1', zone: WHEEL_ZONE, end: NOW + 60000, ts: NOW, items: [{ key: 'wood_pine', qty: 1 }] });
  s._store.set(DEATH_PILE_KEY('dd-x-2'), { junk: true });
  s._store.set(DEATH_PILE_KEY('dd-x-3'), { v: DEATHPILE.V, id: 'dd-x-3', owner: 'x', zone: '__proto__', end: NOW + 60000, ts: NOW, items: [{ key: 'wood_pine', qty: 1 }] });
  const r = newRoom(s);
  await join(r, 'bp_dps_junk');
  await settle();
  check('10a a newer worker\'s row is left whole and not restored', s._store.has(DEATH_PILE_KEY('dd-x-1')) && !(r.loot[WHEEL_ZONE] || []).some((p) => p.lootId === 'dd-x-1'));
  check('10b a junk row, or one for a zone that is no zone, is deleted, never restored', !s._store.has(DEATH_PILE_KEY('dd-x-2')) && !s._store.has(DEATH_PILE_KEY('dd-x-3')) && !Object.prototype.hasOwnProperty.call(r.loot, '__proto__'));
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all death-pile-saved checks passed');
process.exit(0);
