/* ═══ v2.3.5091: THE STORM (grand plan step 4.5, card E PR 10) ═══
 *
 * Step 4.4's sum (worldsum.mjs: everything held == the start + minted -
 * burned) replayed under the ONE closed list of disturbances (testroom.mjs
 * DISTURBANCES: what changes how an honest player looks without any
 * cheating).  Two honest players play an afternoon of the economy through
 * the real handlers -- a walk, the bank, the gamble, Diego's pile, the trade
 * window, a mint by the mail -- and the same afternoon is played once under
 * each disturbance, the deploy at EVERY message.  Each run ends with:
 *
 *   - UNEXPLAINED GOLD 0, and every bag key 0, from the start's count to the
 *     end's (what is live in the room and what is on file), with no piece of
 *     gear or pet held twice;
 *   - NO HONEST PLAYER FLAGGED: no bot flag (botfp.js _botfpFlag, the one
 *     door every flag goes through) and no move of theirs over the move
 *     budget (movement.js `_mvCount.followed`: the worker's copy left behind
 *     and catching up -- what an honest phone feels as a rubber band);
 *   - NO RELOAD: no socket of theirs closed by the room (a join refused, a
 *     linger, a failed join: each closes with a code the phone acts on) and
 *     no `character_reset` (the one message that wipes and reloads a page);
 *   - NO DEAD WORKER: no handler threw (the runtime's input gate would carry
 *     the throw to the socket), and the room still answers a new player's
 *     join with its state_sync at the end.
 *
 * THE DEPLOY is a restart between two messages, as a merge touching server/
 * makes it (TRAPS §277): what is written stays (the shared room's storage
 * commits each synchronous run as one batch; the old room's later batches,
 * its paced saves on their timers, are lost with it), memory is wiped, the
 * restart sweeps run, and every player joins again where their phone says it
 * is.  The message the deploy lands before goes to the new room after the
 * rejoin (the phone's queue sends it on the new socket).
 *
 * THE LOSS drops a socket at a seeded message: what is sent until the rejoin
 * is lost (it never left the phone's dead socket), and the player joins again.
 *
 * Where a player stands for a step is SET, not walked (the bank's door is far
 * from where a join lands): the walk's own honesty is the walk below, and
 * each signal's honest troubles are step 10.6's.
 *
 * BREAK PROOF (rule 8), tried by hand: `STORM_PLANT=1 node
 * test/storm.test.mjs` makes the bank's deposit lose its purse's save (the
 * vault on file, the purse only in memory, as a two-run deposit would) and
 * the deploy runs fail ("unexplained gold").
 */
import { makeStorage, openRoom, roomQueue, seededClock, join, fakeWs, settle, DISTURBANCES, schedule } from './testroom.mjs';
import { count, unexplained } from './worldsum.mjs';
import { BANK } from '../src/bank.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}

const clock = seededClock({ seed: 11 }).install();
const START = clock.now();
const IDS = { a: 'bp_storm_a', b: 'bp_storm_b' };

/* the characters, on file before anyone joins (a test seeds a character by
   putting its record first: CLAUDE.md §5) */
function seedStore() {
  const rec = (coins, inventory) => ({ _v: 21, coins, inventory, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
  return new Map([
    ['rpg:' + IDS.a, rec(1000, { wood_oak: 10, fish_minnow: 20, 'slime-remnants': 10 })],
    ['rpg:' + IDS.b, rec(800, { ore_iron_ore: 6 })],
  ]);
}

/* ══════════ THE AFTERNOON: the script every disturbance delivers ══════════
   Each step: who sends it, the message (a function of the room, so a move
   reads where the server holds the player), where the player must stand
   (`place`), and how long the phone waits before it (`wait`, ms: the trade
   window's accept cooldown). */
function placeOf(room, where) {
  const c = room._wheelT().WHEEL_CENTRE;
  const bank = [c[0] + BANK.DOOR[0] + 40, c[1] + BANK.DOOR[1] + 150];
  if (where === 'bank') return { z: 'wheel', x: bank[0], y: bank[1] };
  if (where === 'bank2') return { z: 'wheel', x: bank[0] + 30, y: bank[1] };
  return null;
}
const WALK_PX_S = 150;   /* an honest walk, well under MOVE_BUDGET's 500 */
function afternoon() {
  const s = [];
  const step = (who, msg, place, wait) => s.push({ who, msg, place, wait: wait || 0 });
  /* a short walk on the stick, a move each frame of the disturbance's rate */
  for (let i = 0; i < 6; i++) step('a', 'walk', null);
  step('a', { type: 'bank_open' }, 'bank');
  step('a', { type: 'bank_deposit', payload: { kind: 'gold', n: 300, opId: 'st-1' } }, 'bank');
  step('a', { type: 'bank_deposit', payload: { kind: 'item', id: 'wood_oak', n: 4, opId: 'st-2' } }, 'bank');
  step('a', { type: 'bank_withdraw', payload: { kind: 'gold', n: 120, opId: 'st-3' } }, 'bank');
  step('a', { type: 'bank_withdraw', payload: { kind: 'item', id: 'wood_oak', n: 1, opId: 'st-4' } }, 'bank');
  step('a', { type: 'gamble_request', payload: { wager: 100 } }, 'bank');
  step('a', { type: 'shop_sell', payload: { key: 'slime-remnants', qty: 10 } }, 'bank');
  step('b', { type: 'shop_buy', payload: { key: 'slime-remnants', qty: 2 } }, 'bank2');
  for (let i = 0; i < 4; i++) step('b', 'walk', null);
  step('a', { type: 'trade2_open', payload: { target: IDS.b } }, 'bank');
  step('b', { type: 'trade2_open', payload: { target: IDS.a } }, 'bank2');
  step('a', { type: 'trade2_set', payload: { offer: { fish_minnow: 5, _gold: 200 } } }, 'bank');
  step('b', { type: 'trade2_set', payload: { offer: { ore_iron_ore: 2 } } }, 'bank2');
  step('a', { type: 'trade2_ready', payload: { ready: true } }, 'bank');
  step('b', { type: 'trade2_ready', payload: { ready: true } }, 'bank2');
  step('a', { type: 'trade2_confirm' }, 'bank', 3000);
  step('b', { type: 'trade2_confirm' }, 'bank2');
  step('a', { type: 'bank_open' }, 'bank');
  step('a', { type: 'bank_deposit', payload: { kind: 'item', id: 'ore_iron_ore', n: 1, opId: 'st-5' } }, 'bank');
  step('room', 'grant', null);   /* a daily quest's gold by the mail, on A (a mint) */
  for (let i = 0; i < 4; i++) step('a', 'walk', null);
  return s;
}

/* ══════════ ONE RUN: the afternoon under one disturbance ══════════ */
async function run(d, opts = {}) {
  clock.advance(0);
  let now0 = clock.now();
  let st = makeStorage(seedStore());
  let room = await openRoom(st);
  const watch = { flags: [], closed: [], resets: 0, threw: [], followed: 0, deploys: 0, drops: 0 };
  const watchRoom = (r) => {
    const real = r._botfpFlag;
    r._botfpFlag = function (id, rec, kind, detail, now) { watch.flags.push([id, kind]); return real.call(this, id, rec, kind, detail, now); };
    if (process.env.STORM_PLANT === '1') {
      /* the break proof: the deposit's purse save lost (a two-run deposit) */
      const save = r._saveRpg;
      r._saveRpg = function (pid, ps, ...rest) { if (r._stormNoSave) return; return save.call(this, pid, ps, ...rest); };
      const h = r._handleBankMove;
      r._handleBankMove = async function (session, p, dir) { r._stormNoSave = dir === 'in'; try { return await h.call(this, session, p, dir); } finally { r._stormNoSave = false; } };
    }
  };
  watchRoom(room);
  const wss = {};
  const phone = { a: null, b: null };   /* where each phone believes it stands */
  const sockOf = (who) => wss[who];
  const joinAll = async (r) => {
    for (const who of ['a', 'b']) {
      const ws = fakeWs(who);
      const p = phone[who];
      await join(r, ws, IDS[who], { loginTaken: true, data: p ? { x: p.x, y: p.y, z: p.z } : { x: 100, y: 100, z: 'town' } });
      wss[who] = ws;
    }
  };
  await joinAll(room);
  await room._shopStock();   /* Diego's pile seeds itself once, the first time it is read: before the start */
  await settle();
  const ps = (who) => room.playerState[IDS[who]];
  const start = count(room, st);
  let q = roomQueue(room);
  const script = afternoon();
  const steps = schedule(script, d, { at: opts.deployAt, seed: 5 });
  let waits = 0;
  let lost = null;   /* who lost their socket, until the rejoin */
  for (const sp of steps) {
    const it = script[sp.i];
    waits += it.wait;
    const t = now0 + sp.at + waits;
    if (t > clock.now()) clock.advance(t - clock.now());
    if (sp.deploy) {
      /* the room dies between two messages: its later batches are lost */
      await q.drain(); await settle();
      st.crashAt(st.batches());
      for (const who of ['a', 'b']) { const p = ps(who); if (p) phone[who] = { x: p.x, y: p.y, z: p.z }; }
      st = makeStorage(st._store);
      room = await openRoom(st);
      watchRoom(room);
      for (const k of ['_duelEscrowSweep', '_arenaStakeSweep', '_arenaEntrySweep', '_trade2WpnSweep']) {
        if (typeof room[k] === 'function') { try { await room[k](); } catch (e) { watch.threw.push(k + ': ' + (e && e.message)); } }
      }
      await joinAll(room);
      q = roomQueue(room);
      watch.deploys++;
    }
    if (sp.drop) {
      const who = it.who === 'room' ? 'a' : it.who;
      await q.drain();
      const p = ps(who); if (p) phone[who] = { x: p.x, y: p.y, z: p.z };
      await room.webSocketClose(sockOf(who), 1006, 'line lost', false);
      await settle();
      lost = who;
      watch.drops++;
    }
    if (sp.rejoin && lost) {
      const ws = fakeWs(lost);
      const p = phone[lost];
      await join(room, ws, IDS[lost], { loginTaken: true, data: p ? { x: p.x, y: p.y, z: p.z } : undefined });
      wss[lost] = ws;
      lost = null;
    }
    if (it.who !== 'room' && lost === it.who) continue;   /* sent on a dead socket: never arrives */
    if (it.who === 'room') {
      await q.drain();
      try {
        await room._creditPlayer(IDS.a, { opId: 'dq:' + IDS.a + ':20261114:' + sp.i, source: 'daily', kind: 'gold', payload: { amount: 35 }, note: 'a daily quest' });
      } catch (e) { watch.threw.push('grant: ' + (e && e.message)); }
      await settle();
      continue;
    }
    const p = ps(it.who);
    if (!p) continue;
    if (it.place) { const at = placeOf(room, it.place); Object.assign(p, at); p.dead = false; p.dying = false; }
    let msg = it.msg;
    if (msg === 'walk') {
      const fps = d.kind === 'fps' ? d.fps : 10;
      msg = { type: 'move', x: p.x + WALK_PX_S / fps, y: p.y, z: p.z };
    }
    q.send(sockOf(it.who), msg).catch((e) => watch.threw.push((msg.type || '?') + ': ' + (e && e.message)));
    await q.drain();
  }
  await q.drain(); await settle();
  /* the phones' own sockets: closed by the room? a character reset? */
  for (const ws of Object.values(wss)) {
    if (ws.closed) watch.closed.push([ws.label, ws.closed]);
    if (ws.sent.some((m) => m && m.type === 'character_reset_done')) watch.resets++;
  }
  watch.followed = (room._mvCount && room._mvCount.followed) || 0;
  const end = count(room, st);
  const u = unexplained(start, end);
  /* the room still answers: a new player's join gets its state_sync */
  const nw = fakeWs('new');
  await join(room, nw, 'bp_storm_new', { loginTaken: true });
  const answered = nw.sent.some((m) => m && m.type === 'state_sync');
  const moved = { a: ps('a') && ps('a').coins, b: ps('b') && ps('b').coins };
  return { u, end, watch, answered, moved, start, room, st, A: ps('a'), B: ps('b') };
}

function judge(name, r) {
  const goods = Object.keys(r.u.goods).length ? r.u.goods : 0;
  check(`${name}: unexplained gold ${r.u.gold}, goods ${JSON.stringify(goods)}`, r.u.gold === 0 && goods === 0, r.u);
  check(`${name}: no piece of gear or pet held twice`, r.end.dup.length === 0, r.end.dup);
  check(`${name}: no honest player flagged (no bot flag, no move over the budget)`, r.watch.flags.length === 0 && r.watch.followed === 0, { flags: r.watch.flags, followed: r.watch.followed });
  check(`${name}: no reload (no socket closed by the room, no character reset)`, r.watch.closed.length === 0 && r.watch.resets === 0, { closed: r.watch.closed, resets: r.watch.resets });
  check(`${name}: no dead worker (no handler threw; the room answers a join)`, r.watch.threw.length === 0 && r.answered, { threw: r.watch.threw, answered: r.answered });
}

/* ══════════ 1. THE AFTERNOON, UNDISTURBED: value moved ══════════ */
const calm = DISTURBANCES.find((x) => x.id === 'lane_full');
{
  const r = await run(calm);
  const vault = r.st._store.get('bank:' + IDS.a) || {};
  const vItem = (k) => ((vault.items || []).find((x) => x && x.key === k) || {}).n || 0;
  check('1. the afternoon moved value (the storm is not empty): gold minted and burned', r.end.net.gold !== r.start.net.gold && r.end.net.gold - r.start.net.gold !== 35, r.end.net);
  check('1. ...the bank kept 180 gold, 3 oak and an ore (in, out, in again)', vault.gold === 180 && vItem('wood_oak') === 3 && vItem('ore_iron_ore') === 1, vault);
  check('1. ...Diego\'s pile sold B two of A\'s remnants', !r.A.inventory['slime-remnants'] && r.B.inventory['slime-remnants'] === 2, { a: r.A.inventory['slime-remnants'], b: r.B.inventory['slime-remnants'] });
  check('1. ...the trade settled: 5 fish to B, 2 ore to A (one banked)', r.B.inventory.fish_minnow === 5 && r.A.inventory.ore_iron_ore === 1, { fish: r.B.inventory.fish_minnow, ore: r.A.inventory.ore_iron_ore });
  check('1. ...and the walks moved A (the server took the moves)', r.room._mvCount && r.room._mvCount.judged >= 10, r.room._mvCount);
  judge('1. undisturbed', r);
}

/* ══════════ 2. EVERY DISTURBANCE ON THE LIST ══════════ */
check('2. the list is the closed one, and the storm plays every member', DISTURBANCES.length >= 9 && DISTURBANCES.every((x) => ['deploy', 'hidden', 'fps', 'delay', 'loss', 'lane'].includes(x.kind)), DISTURBANCES.map((x) => x.id));
for (const d of DISTURBANCES) {
  if (d.kind === 'deploy') continue;   /* §3: at every message */
  const r = await run(d);
  if (d.kind === 'loss') check('2. loss: the line did drop (and the player came back)', r.watch.drops === 1 && !!r.A && !!r.B, r.watch.drops);
  judge('2. ' + d.id, r);
}

/* ══════════ 3. A DEPLOY AT EVERY MESSAGE ══════════ */
{
  const d = DISTURBANCES.find((x) => x.kind === 'deploy');
  const n = afternoon().length;
  const bad = [];
  for (let at = 0; at < n; at++) {
    const r = await run(d, { deployAt: at });
    const goods = Object.keys(r.u.goods).length ? r.u.goods : 0;
    const ok = r.u.gold === 0 && goods === 0 && r.end.dup.length === 0 && r.watch.flags.length === 0 && r.watch.followed === 0
      && r.watch.closed.length === 0 && r.watch.resets === 0 && r.watch.threw.length === 0 && r.answered;
    if (r.watch.deploys !== 1) bad.push({ at, deploys: r.watch.deploys });
    if (!ok) bad.push({ at, gold: r.u.gold, goods, dup: r.end.dup.length, flags: r.watch.flags, followed: r.watch.followed, closed: r.watch.closed, resets: r.watch.resets, threw: r.watch.threw, answered: r.answered });
  }
  check(`3. a deploy before each of the ${n} messages: unexplained gold 0, nobody flagged, no reload, no dead worker`, bad.length === 0, bad);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all storm checks passed');
