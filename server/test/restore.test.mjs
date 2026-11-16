/* ═══ v2.3.5285: ONE PLAYER'S RESTORE, MADE FROM THE REGISTRY (grand plan step 4.7, card R PR 6) ═══
 * (the restore: server/src/playerrestore.js; its table: storagemarks.js
 *  RESTORE_WAYS; the spec: docs/specs/restore.md, "One player's restore")
 *
 *   1. THE TABLE: every record the marks call a player's is placed,
 *      restored or left, with why; nothing else is; the login, the owner's
 *      levers, the snapshots and the anti-bot's records are left;
 *   2. THE RESTORE, on a room: the character, the vault and the pets put
 *      back from a full copy through the doors (the difference booked: the
 *      world's sum unexplained 0), the `prerestore-` copy of every record it
 *      overwrites in the SAME run of writes (a restart at that run keeps
 *      neither), the copy restores everything back, the records it leaves
 *      untouched, what of theirs is held between players named, a dry run
 *      writes nothing, a newer worker's record refused, and a daily copy
 *      without `_with` (today's) puts back the character alone;
 *   3. THE SNAPSHOT: `fullsnap` off, the daily copy is the character as
 *      before; on, it carries the vault and the pets (`_with`);
 *   4. THE RESTART (`character_reset`), card K's hostile census: off (the
 *      default), the world's sum reads it as before (value gone); with
 *      `resetbook: true` the character and its vault are booked into
 *      `econ_gone` in their deletes' own run, and the sum is 0;
 *   5. THE ROUTE: the owner's POST /api/admin/restore answers the same.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-15:
 *   - `'farm:'` deleted from RESTORE_WAYS                           -> FAIL 1
 *   - restoredCharacter's `room._goldSet(...)` line deleted           -> FAIL 2 (the purse not the copy's), FAIL 5
 *   - the copy put on its own, awaited, before the restore's put       -> FAIL 2 (one run: 2 batches)
 *   - goneAdd's `g.g.b = ...` line deleted                            -> FAIL 4 (unexplained gold)
 *   - (sitting 20) the `dry` type check deleted                        -> FAIL 2 (a "true" restored for real)
 *   - (sitting 20) the copy's null for a created record dropped         -> FAIL 2 (its way back kept the vault)
 */
import { GameRoom } from '../src/index.js';
import { STORAGE_MARKS, RESTORE_WAYS, RESTORE_WAY_NAMES, restoredPrefixes } from '../src/storagemarks.js';
import { playerRestore, snapshotCopy, PLAYER_RESTORE } from '../src/playerrestore.js';
import { count, unexplained, GONE_KEY } from '../src/worldsum.js';
import { makeStorage, mockEnv, fakeWs, settle, join, seededClock } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900))); }
}
const clock = seededClock().install();

/* ══════════ 1. THE TABLE ══════════ */
{
  const players = Object.keys(STORAGE_MARKS).filter((p) => STORAGE_MARKS[p].whose === 'player');
  const placed = Object.keys(RESTORE_WAYS);
  check('1. every record the marks call a player\'s is placed (restored or left)', players.every((p) => placed.includes(p)), players.filter((p) => !placed.includes(p)));
  check('1. ...and nothing else is (a between or a room record is never rewound)', placed.every((p) => players.includes(p)), placed.filter((p) => !players.includes(p)));
  check('1. each way is restored or left, and says why', placed.every((p) => RESTORE_WAY_NAMES.includes(RESTORE_WAYS[p].way) && typeof RESTORE_WAYS[p].why === 'string' && RESTORE_WAYS[p].why.length > 8));
  const mustLeave = ['auth:', 'keyidx:', 'frozen:', 'testmode:', 'rpgsnap:', 'rpgsnap_at:', 'botstat:', 'inbox:'];
  check('1. left: the login (an old key never comes back), the owner\'s levers, the snapshots, the anti-bot\'s, the mail', mustLeave.every((p) => RESTORE_WAYS[p] && RESTORE_WAYS[p].way === 'left'));
  check('1. restored: the character first, the vault, the pets', restoredPrefixes().join() === 'rpg:,bank:,pets:');
  check('1. every restored record holds value (the marks), one key a player', restoredPrefixes().every((p) => STORAGE_MARKS[p].value !== 'none' && p.endsWith(':')));
}

/* ══════════ 2. THE RESTORE ══════════ */
const P = 'bp_rs_a', Q = 'bp_rs_b';
const NOW = { _v: 21, coins: 1000, level: 12, xp: 50, inventory: { copper_ore: 4, wood_oak: 9 }, weaponStash: [{ name: 'Now Blade' }], armorStash: [],
  _econ: { v: 1, g: { m: 300, b: 40 }, i: { copper_ore: { m: 4, b: 0 } } } };
const THEN = { _v: 21, coins: 5000, level: 10, xp: 5, inventory: { copper_ore: 20, iron_bar: 5 }, weaponStash: [{ name: 'Old Blade' }, { name: 'Old Bow' }], armorStash: [{ name: 'Old Mail' }],
  _econ: { v: 1, g: { m: 9999, b: 0 }, i: {} } };
const VAULT_NOW = { _v: 1, gold: 100, items: [{ key: 'fish_minnow', n: 3 }] };
const VAULT_THEN = { _v: 1, gold: 700, items: [{ key: 'fish_minnow', n: 10 }, { key: 'wood_oak', n: 2 }] };
const PETS_NOW = { v: 1, cap: 30, active: null, list: [{ id: 'p_now' }] };
const PETS_THEN = { v: 1, cap: 30, active: null, list: [{ id: 'p_then' }] };
const LEFT = { ['auth:' + P]: { phrase: 'h' }, ['frozen:' + P]: null, ['codex:' + P]: { kills: 3 }, ['inbox:' + P]: [{ kind: 'gold', opId: 'admin:1', payload: { amount: 50 } }] };
const SNAP = 'rpgsnap:' + P + ':20261101';

function seed(extra, joinable) {
  const m = new Map([
    ['rpg:' + P, NOW], ['bank:' + P, VAULT_NOW], ['pets:' + P, PETS_NOW],
    [SNAP, { ...THEN, _with: { 'bank:': VAULT_THEN, 'pets:': PETS_THEN } }],
    ['rpg:' + Q, { _v: 21, coins: 50, level: 3, inventory: {} }],
    /* held between players: a fine on P's head, P's listing, someone else's listing */
    ['bounty:' + P, { amount: 80, by: Q, ts: 1 }],
    ['store_listing:l1', { kind: 'item', seller: P, invKey: 'iron_bar', qty: 2 }],
    ['store_listing:l2', { kind: 'item', seller: Q, invKey: 'iron_bar', qty: 1 }],
  ]);
  /* a character the test joins carries no login of its own (the join makes it) */
  for (const [k, v] of Object.entries(LEFT)) if (v !== null && !(joinable && k.startsWith('auth:'))) m.set(k, v);
  for (const [k, v] of extra || []) m.set(k, v);
  return m;
}
async function room(st, flags, env) {
  const r = new GameRoom(st, { ...mockEnv, ...(env || {}) });
  await r._liveFlagsEnsure();
  if (flags) { Object.assign(r._liveFlags, flags); r._syncBagCaps(); }
  return r;
}
const sumNow = (r, st) => count(r, st);
{
  const st = makeStorage(seed());
  const r = await room(st);
  const start = sumNow(r, st);
  /* a dry run first: everything answered, nothing written */
  const b0 = st.batches();
  const dry = await playerRestore(r, { playerId: P, snapKey: SNAP, dry: true }, 1_800_000_000_000);
  await settle();
  check('2. a dry run answers what it would do and writes nothing', dry.ok && dry.dry && st.batches() === b0 && dry.restored.join() === 'rpg:,bank:,pets:' && dry.copy === null, { dry, b: st.batches() - b0 });
  check('2. ...the gold it would book: the purse and the vault, then less now', dry.booked.gold === (5000 + 700) - (1000 + 100), dry.booked);

  const left0 = Object.keys(LEFT).map((k) => JSON.stringify(st._store.get(k)));
  const r1 = await playerRestore(r, { playerId: P, snapKey: SNAP }, 1_800_000_000_000);
  await settle();
  check('2. the restore answers ok, what it restored, and what it booked', r1.status === 200 && r1.ok && !r1.dry && r1.restored.join() === 'rpg:,bank:,pets:' && r1.booked.gold === dry.booked.gold, r1);
  check('2. ONE run of writes: the copy, the restore and its deletes together', st.batches() === b0 + 1, st.batches() - b0);
  const rec = st._store.get('rpg:' + P);
  check('2. the character is the copy\'s: purse, bag, level, stashes', rec.coins === 5000 && rec.level === 10 && rec.inventory.copper_ore === 20 && rec.inventory.iron_bar === 5 && !('wood_oak' in rec.inventory)
    && rec.weaponStash.length === 2 && rec.armorStash.length === 1 && !('_with' in rec), rec);
  check('2. ...its count kept from now, the difference booked by the doors (not the copy\'s 9999)', rec._econ.g.m === 300 + (5000 - 1000) + (700 - 100) && rec._econ.g.b === 40, rec._econ);
  check('2. the vault and the pets are the copy\'s', JSON.stringify(st._store.get('bank:' + P)) === JSON.stringify(VAULT_THEN) && st._store.get('pets:' + P).list[0].id === 'p_then');
  const end = sumNow(r, st);
  const u = unexplained(start, end);
  check('2. the world\'s sum: nothing unexplained after a restore (gold and every key)', u.gold === 0 && Object.keys(u.goods).length === 0, u);
  const copy = r1.copy && st._store.get(r1.copy);
  check('2. the prerestore copy covers every record it overwrote: the character at its top, the vault and the pets under _with',
    !!copy && copy.coins === 1000 && JSON.stringify(copy._with['bank:']) === JSON.stringify(VAULT_NOW) && copy._with['pets:'].list[0].id === 'p_now' && r1.copy.startsWith('rpgsnap:' + P + ':prerestore-'), copy);
  check('2. the records it leaves are untouched (the login, the codex, the mail)', Object.keys(LEFT).every((k, i) => JSON.stringify(st._store.get(k)) === left0[i]));
  const names = r1.between.map((x) => x.key).sort();
  check('2. what of theirs is held between players is named, never rewound (the fine, their listing; not another\'s)', names.join() === ['bounty:' + P, 'store_listing:l1'].sort().join() && r1.betweenRead >= 3, r1.between);
  check('2. the rest of their records are left, by the table', r1.left.includes('auth:') && r1.left.includes('inbox:') && !r1.left.includes('rpg:'));

  /* and the way back: the copy restores all of it */
  const r2 = await playerRestore(r, { playerId: P, snapKey: r1.copy }, 1_800_000_001_000);
  await settle();
  const back = st._store.get('rpg:' + P);
  check('2. restoring the prerestore copy puts every record back', r2.ok && back.coins === 1000 && back.level === 12 && back.inventory.wood_oak === 9 && JSON.stringify(st._store.get('bank:' + P)) === JSON.stringify(VAULT_NOW) && st._store.get('pets:' + P).list[0].id === 'p_now', { r2, back });
  const u2 = unexplained(start, sumNow(r, st));
  check('2. ...and the sum is still 0 (two restores, each booked)', u2.gold === 0 && Object.keys(u2.goods).length === 0, u2);
}
{
  /* a restart at the restore's run: neither the restore nor its copy */
  const st = makeStorage(seed());
  const r = await room(st);
  st.crashAt(st.batches());
  await playerRestore(r, { playerId: P, snapKey: SNAP }, 1_800_000_000_000);
  await settle();
  const copies = [...st._store.keys()].filter((k) => k.includes(':prerestore-'));
  check('2. a restart at that run keeps neither the restore nor its copy', st._store.get('rpg:' + P).coins === 1000 && copies.length === 0, { coins: st._store.get('rpg:' + P).coins, copies });
}
{
  /* a newer worker's copy, or a record now: refused, nothing written */
  const st = makeStorage(seed([[SNAP + 'n', { ...THEN, _v: 999 }], ['rpgsnap:' + P + ':20261102', { ...THEN, _with: { 'bank:': { ...VAULT_THEN, _v: 9 } } }]]));
  const r = await room(st);
  const b0 = st.batches();
  const n1 = await playerRestore(r, { playerId: P, snapKey: SNAP + 'n' });
  const n2 = await playerRestore(r, { playerId: P, snapKey: 'rpgsnap:' + P + ':20261102' });
  await settle();
  check('2. a newer worker\'s copy (the character, or a vault in it) is refused, nothing written', n1.status === 409 && n1.error === 'newer' && n2.status === 409 && st.batches() === b0, { n1, n2 });
  const st2 = makeStorage(seed([['rpg:' + P, { ...NOW, _econ: { v: 9, g: { m: 0, b: 0 }, i: {} } }]]));
  const r2 = await room(st2);
  const n3 = await playerRestore(r2, { playerId: P, snapKey: SNAP });
  check('2. ...and a character now whose count is a newer worker\'s', n3.status === 409 && n3.error === 'newer', n3);
}
{
  /* today's daily copy (no _with): the character alone */
  const st = makeStorage(seed([[SNAP, { ...THEN }]]));
  const r = await room(st);
  const start = sumNow(r, st);
  const r1 = await playerRestore(r, { playerId: P, snapKey: SNAP }, 1_800_000_000_000);
  await settle();
  const copy = st._store.get(r1.copy);
  check('2. a copy without _with (today\'s daily) puts back the character alone; the vault and pets stay', r1.ok && r1.restored.join() === 'rpg:' && JSON.stringify(st._store.get('bank:' + P)) === JSON.stringify(VAULT_NOW) && !('_with' in copy), { r1, copy });
  const u = unexplained(start, sumNow(r, st));
  check('2. ...the sum 0 too', u.gold === 0 && Object.keys(u.goods).length === 0, u);
  check('2. wrong asks: no player, a copy of another\'s, none such', (await playerRestore(r, {})).status === 400 && (await playerRestore(r, { playerId: P, snapKey: 'rpgsnap:' + Q + ':1' })).status === 400 && (await playerRestore(r, { playerId: P, snapKey: 'rpgsnap:' + P + ':nope' })).status === 404);
}

{
  /* the sitting 20 review (low): a `dry` that is not a boolean is refused,
     never read as "not dry" */
  const st = makeStorage(seed());
  const r = await room(st);
  const b0 = st.batches();
  const asText = await playerRestore(r, { playerId: P, snapKey: SNAP, dry: 'true' });
  const asOne = await playerRestore(r, { playerId: P, snapKey: SNAP, dry: 1 });
  await settle();
  check('2. a `dry` that is not true or false ("true", 1) is refused (400), nothing written', asText.status === 400 && asOne.status === 400 && st.batches() === b0 && st._store.get('rpg:' + P).coins === 1000, { asText, asOne });
}
{
  /* the sitting 20 review (low): a restore that CREATES a record (no vault
     now, one in the copy) -- its way back deletes it again */
  const m = seed();
  m.delete('bank:' + P);
  const st = makeStorage(m);
  const r = await room(st);
  const start = sumNow(r, st);
  const r1 = await playerRestore(r, { playerId: P, snapKey: SNAP }, 1_800_000_000_000);
  await settle();
  const copy = st._store.get(r1.copy);
  check('2. a restore that creates the vault: the copy names it null (it was not there)', r1.ok && st._store.has('bank:' + P) && copy && copy._with && copy._with['bank:'] === null, copy && copy._with);
  const r2 = await playerRestore(r, { playerId: P, snapKey: r1.copy }, 1_800_000_001_000);
  await settle();
  const u = unexplained(start, sumNow(r, st));
  check('2. ...and its way back deletes it again; the sum still 0', r2.ok && !st._store.has('bank:' + P) && st._store.get('rpg:' + P).coins === 1000 && u.gold === 0 && Object.keys(u.goods).length === 0, { r2, u });
}

/* ══════════ 3. THE SNAPSHOT ══════════ */
{
  const st = makeStorage(seed());
  const r = await room(st);
  const blob = { ...NOW };
  const off = await snapshotCopy(r, P, blob);
  check('3. fullsnap off (the default): the daily copy is the character as before', off === blob && !('_with' in off));
  r._liveFlags.fullsnap = true;
  const on = await snapshotCopy(r, P, blob);
  check('3. fullsnap on: it carries the vault and the pets at that moment', on.coins === 1000 && JSON.stringify(on._with['bank:']) === JSON.stringify(VAULT_NOW) && on._with['pets:'].list[0].id === 'p_now' && !('rpg:' in on._with));
  const none = await snapshotCopy(r, Q, { coins: 50 });
  check('3. ...null where there is none (a restore of it deletes one made since)', none._with['bank:'] === null && none._with['pets:'] === null);
  /* through the join: a daily copy taken at the first join of the day */
  const st2 = makeStorage(seed(null, true));
  const r2 = await room(st2, { fullsnap: true });
  await join(r2, fakeWs('p'), P, { loginTaken: true });
  const snaps = [...st2._store.keys()].filter((k) => k.startsWith('rpgsnap:' + P + ':') && /:\d{8}$/.test(k) && k !== SNAP);
  const s = snaps.length ? st2._store.get(snaps[0]) : null;
  check('3. the join\'s daily copy carries them with fullsnap on', !!s && s.coins === 1000 && JSON.stringify(s._with['bank:']) === JSON.stringify(VAULT_NOW), { snaps, s });
}

/* ══════════ 4. THE RESTART ══════════ */
async function restart(flags) {
  const st = makeStorage(seed(null, true));
  const r = await room(st, flags);
  const ws = await join(r, fakeWs('p'), P, { loginTaken: true });
  await settle();
  const start = sumNow(r, st);
  const writes = [];
  const del = st.storage.delete;
  st.storage.delete = function (k) { writes.push(...(Array.isArray(k) ? k : [k])); return del.call(this, k); };
  await r.webSocketMessage(ws, JSON.stringify({ type: 'character_reset', payload: { confirm: true } }));
  await settle();
  st.storage.delete = del;
  return { st, r, u: unexplained(start, sumNow(r, st)), writes };
}
{
  const off = await restart(null);
  check('4. resetbook off (the default): as before -- the character gone, nothing booked (the census\'s value gone)', !off.st._store.has('rpg:' + P) && !off.st._store.has(GONE_KEY) && off.u.gold === -((1000 + 100) - (300 - 40)) && off.u.goods.wood_oak === -9, off.u);   /* held less its own count */
  const on = await restart({ resetbook: true });
  const g = on.st._store.get(GONE_KEY);
  check('4. resetbook on: the character and its vault are booked into econ_gone', !on.st._store.has('rpg:' + P) && !on.st._store.has('bank:' + P) && !!g && g.n === 1, g);
  check('4. ...and the world\'s sum is 0: no value gone unexplained (gold and every key)', on.u.gold === 0 && Object.keys(on.u.goods).length === 0, on.u);
  check('4. ...the vault deleted once, in the character\'s run', on.writes.filter((k) => k === 'bank:' + P).length === 1, on.writes);
}
{
  /* the restart's run: a crash there keeps neither the booking nor the deletes */
  const st = makeStorage(seed(null, true));
  const r = await room(st, { resetbook: true });
  const ws = await join(r, fakeWs('p'), P, { loginTaken: true });
  await settle();
  const put = st.storage.put;
  let armed = false;
  st.storage.put = function (k, v) { if (k === GONE_KEY && !armed) { armed = true; st.crashAt(st.batches()); } return put.call(this, k, v); };
  await r.webSocketMessage(ws, JSON.stringify({ type: 'character_reset', payload: { confirm: true } }));
  await settle();
  st.storage.put = put;
  check('4. a restart at the booking\'s run keeps the character and books nothing (one run)', armed && st._store.has('rpg:' + P) && st._store.has('bank:' + P) && !st._store.has(GONE_KEY));
}

/* ══════════ 5. THE ROUTE ══════════ */
{
  const st = makeStorage(seed());
  const r = await room(st, null, { ADMIN_KEY: 'k' });
  const req = (body) => r.fetch(new Request('https://x/api/admin/restore', { method: 'POST', headers: { Authorization: 'Bearer k' }, body: JSON.stringify(body) }));
  const a = await req({ playerId: P, snapKey: SNAP, dry: true });
  const ja = await a.json();
  check('5. the owner\'s route answers the dry run', a.status === 200 && ja.dry === true && ja.restored.length === 3 && !('status' in ja), ja);
  const c = await req({ playerId: P, snapKey: SNAP });
  const jc = await c.json();
  await settle();
  const log = st._store.get('admin_log') || [];
  check('5. ...and the restore, logged with what it restored and its copy', c.status === 200 && jc.ok && st._store.get('rpg:' + P).coins === 5000 && log.some((e) => e.op === 'restore' && e.copy === jc.copy && e.restored.length === 3), { jc, log });
  check('5. a page of each between record read at most (PLAYER_RESTORE.BETWEEN_PAGE)', PLAYER_RESTORE.BETWEEN_PAGE === 200);
}

clock.restore();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all restore checks passed');
process.exit(0);
