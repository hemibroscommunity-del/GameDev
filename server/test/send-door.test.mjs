/* THE SEND DOOR -- v2.3.5193 (server/src/send.js; grand plan step 4.1b,
 * step 1; card K PR 8; docs/specs/send-door.md).
 *
 * One `_send` writes a frame to a socket and counts it by type, in memory;
 * the counts ride the day's book (daybook.js sendRide, part `send`).  It
 * changes nothing a phone reads.
 *   1. THE DOOR: an object goes out as JSON.stringify of it, byte for byte; a
 *      frame already made goes out as it is; each counted under its type with
 *      its length; a socket that throws throws to the caller, counted nothing.
 *   2. THE ROOM'S FORM (broadcastAll / broadcastExcept): one frame, every
 *      socket but the one left out, a dead socket passed over.
 *   3. EACH HELPER'S FRAME: the systems' helpers that take a type and a
 *      payload (or a payload of their one type) write exactly
 *      JSON.stringify({ type, payload }) -- words past ASCII, nesting, numbers.
 *   4. THE HELPERS: each one this PR moved writes through `this._send` and no
 *      longer writes a socket itself (HELPERS, a file each).
 *   5. THE TICK: a room's ticks and pings go through the door, counted.
 *   6. INTO THE BOOK: the counts ride a put the book makes anyway, and the
 *      Test panel's route reads what is not yet folded.
 *   7. THE SWITCH: `sendcount: false` -- the frames the same, nothing counted.
 *   8. THE CENSUS, STRICT (v2.3.5671, the gatekeeper, sitting 33; the plan's
 *      rule 3): a raw `.send(` in server/src outside send.js fails.  Card K
 *      PR 13 (#2013, #2014) took it 93 -> 0; a frame leaves through `_send`.
 * Break proof (tried by hand): `_send` writing `s + ' '` -> 1 and 3 red; a
 * helper put back to `ws.send(JSON.stringify(` -> 4 and 8 red. */
import { readFileSync, readdirSync } from 'node:fs';
import { SEND, sendOutside } from '../src/send.js';
import { DAYBOOK, bookAdd, bookPut, bookRead } from '../src/daybook.js';
import { makeStorage, openRoom, join, settle } from './testroom.mjs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { doorCalls, where } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the census reads the syntax tree (card DG PR 2) */

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}
/* a socket that keeps each frame as it was written */
const rawWs = (label) => ({ label, raw: [], sent: [], closed: null, send(s) { this.raw.push(s); this.sent.push(JSON.parse(s)); }, close(code, why) { this.closed = { code, why }; } });
const tally = (room, type) => (room._sendTally && room._sendTally.get(type)) || [0, 0];

const room = await openRoom(makeStorage());

/* ── 1. the door ── */
{
  const ws = rawWs('d');
  const msg = { type: 'door_probe', payload: { name: 'Broé ⚔', n: [1, 2.5, -0, 1e21], deep: { a: { b: [null, true] } }, gone: undefined } };
  room._send(ws, msg);
  check('1: an object goes out as JSON.stringify of it, byte for byte', ws.raw[0] === JSON.stringify(msg), ws.raw[0]);
  room._send(ws, '{"type":"tick","seq":1}', 'tick_probe');
  check('1: a frame already made goes out as it is', ws.raw[1] === '{"type":"tick","seq":1}', ws.raw[1]);
  check('1: each counted under its type with its length', tally(room, 'door_probe')[0] === 1 && tally(room, 'door_probe')[1] === ws.raw[0].length && tally(room, 'tick_probe')[1] === 23, [tally(room, 'door_probe'), tally(room, 'tick_probe')]);
  const dead = { send() { throw new Error('closed'); } };
  let threw = false;
  try { room._send(dead, { type: 'dead_probe' }); } catch (e) { threw = true; }
  check('1: a socket that throws throws to the caller, and is counted nothing', threw && tally(room, 'dead_probe')[0] === 0);
  /* v2.3.5198: outside any room (origin.js's refusal): written the same, counted nowhere */
  const wo = rawWs('o');
  const om = { type: 'join_rejected', reason: 'origin', home: 'https://brotown.net' };
  sendOutside(wo, om);
  check('1: a frame outside any room is written byte for byte', wo.raw[0] === JSON.stringify(om), wo.raw);
  room._send(ws, { type: 'Not A Type' });
  check('1: a type out of form is counted under OTHER', tally(room, SEND.OTHER)[0] === 1);
}

/* ── 2. the room's form ── */
{
  const r2 = await openRoom(makeStorage());
  const a = rawWs('a'), b = rawWs('b'), dead = { send() { throw new Error('closed'); } };
  /* v2.3.5724: each a joined player's (the room's send passes over a socket
     that never joined: relaytyped.test §5) */
  r2.sessions.set(a, { id: 'bp_sd_a' }); r2.sessions.set(dead, { id: 'bp_sd_d' }); r2.sessions.set(b, { id: 'bp_sd_b' });
  const msg = { type: 'room_probe', payload: { t: 'hé' } };
  r2.broadcastAll(msg);
  r2.broadcastExcept(a, msg);
  check('2: one frame to every socket, the one left out passed over, a dead socket passed over', a.raw.length === 1 && b.raw.length === 2 && b.raw.every((s) => s === JSON.stringify(msg)), [a.raw.length, b.raw.length]);
  check('2: ...counted a frame a socket written', tally(r2, 'room_probe')[0] === 3, tally(r2, 'room_probe'));
}

/* ── 3. each helper's frame ── */
{
  const ws = rawWs('h');
  await join(room, ws, 'bp_send_h');
  const pid = 'bp_send_h';
  const payload = { text: 'café \u{1F600}', list: [1, 'two', { three: 3 }], z: 0.1 + 0.2 };
  const TYPED = ['_boardSend', '_laneSend', '_chatModSend', '_fishSend', '_friendsSend', '_guildSend', '_partySend', '_petSend', '_raceSend', '_shopSend', '_scSend', '_soSend', '_threatSend', '_t2Send', '_salvageSend', '_shardCrackSend'];
  const ONE = { _farmSend: 'farm_state', _hardenSend: 'harden_result', _pointsResetSend: 'points_reset_result', _restSend: 'rest_result', _rideSend: 'ride_state', _riseChestSend: 'rise_chest', _weaponGemSend: 'weapon_gem_result', _shieldGemSend: 'shield_gem_result' };
  const bad = [];
  for (const h of TYPED) {
    const type = 'probe_' + h.replace(/[^a-z]/gi, '').toLowerCase();
    ws.raw.length = 0;
    room[h](pid, type, payload);
    const f = ws.raw.find((s) => s.includes('"' + type + '"'));
    if (f !== JSON.stringify({ type, payload })) bad.push([h, f]);
  }
  for (const [h, type] of Object.entries(ONE)) {
    ws.raw.length = 0;
    room[h](pid, payload);
    const f = ws.raw.find((s) => s.startsWith('{"type":"' + type + '"'));
    if (f !== JSON.stringify({ type, payload })) bad.push([h, f]);
  }
  check(`3: ${TYPED.length + Object.keys(ONE).length} helpers write exactly JSON.stringify({ type, payload })`, bad.length === 0, bad);
}

/* ── 4. the helpers ── */
const HELPERS = Object.freeze({
  'achievements.js': ['_achvSend'], 'bank.js': ['_bankSend'], 'boards.js': ['_boardSend'], 'bodytake.js': ['_bodyTakeSend'],
  'cadence.js': ['_jackpotSend'], 'chatlanes.js': ['_laneSend'], 'chatmod.js': ['_chatModSend'], 'clans.js': ['_clanSendState', '_clanError'],
  'codex.js': ['_codexSend'], 'dailyrewards.js': ['_drSendProgress', '_drSendState'], 'dungeon.js': ['_dungeonSend'], 'farm.js': ['_farmSend'],
  'firetrail.js': ['_sendFireTrailSnapshot'], 'fishlog.js': ['_fishSend'], 'friends.js': ['_friendsSend'], 'gamble.js': ['_aceBoardSend'],
  'gathering.js': ['_sendGatherHits'], 'guilds.js': ['_guildSend'], 'hardening.js': ['_hardenSend'], 'inbox.js': ['_sendInboxDelivered'],
  'index.js': ['broadcastAll', 'broadcastExcept'], 'loginspin.js': ['_loginSpinSend'], 'nearjoin.js': ['_nearJoinJoinBroadcast'],
  'nomansland.js': ['_nmlSend', '_nmlLockSend', '_nmlTellKiller'], 'party.js': ['_partySend'], 'persistence.js': ['_sendPlayerState'],
  'petbook.js': ['_petbookSend'], 'pets.js': ['_petSend'], 'pointsreset.js': ['_pointsResetSend'], 'race.js': ['_raceSend'],
  'rejoinresend.js': ['_duelResend', '_t2Resend'], 'rest.js': ['_restSend'], 'revealbag.js': ['_revealBagSend', '_revealBagSendJoin'],
  'ride.js': ['_rideSend'], 'risechest.js': ['_riseChestSend'], 'salvage.js': ['_salvageSend'], 'shardcrack.js': ['_shardCrackSend'],
  'shieldgem.js': ['_shieldGemSend'], 'shop.js': ['_shopSend'], 'spar.js': ['_sparTell'], 'storechat.js': ['_scSend'], 'storeoffer.js': ['_soSend'],
  'testmode.js': ['_testModeTell'], 'threat.js': ['_threatSend'], 'tick.js': ['_tickPingAndAfk', 'startTickLoop'], 'trade2.js': ['_t2Send'],
  'weapongem.js': ['_weaponGemSend'],
});
/* a method's body: from its line to the next method's at the same depth */
function body(src, name) {
  const lines = src.split('\n');
  const at = lines.findIndex((l) => new RegExp('^  (async )?' + name + '\\(').test(l));
  if (at < 0) return null;
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (/^  (async )?[A-Za-z_$][\w$]*\(.*\)\s*\{/.test(lines[i]) || /^\};?\s*$/.test(lines[i])) { end = i; break; }
  return lines.slice(at, end).filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
}
{
  const bad = [];
  let n = 0;
  for (const [f, names] of Object.entries(HELPERS)) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    for (const name of names) {
      n++;
      const b = body(src, name);
      if (!b) { bad.push(f + ' ' + name + ': not found'); continue; }
      if (!/this\._send(Room)?\(/.test(b)) bad.push(f + ' ' + name + ': no this._send');
      if (/(?<!this\._)\b\w+\.send\(/.test(b.replace(/this\._send/g, ''))) bad.push(f + ' ' + name + ': still writes a socket');
    }
  }
  check(`4: the ${n} helpers write through this._send, none a socket itself`, bad.length === 0, bad);
}

/* ── 5. the tick ── */
{
  const r5 = await openRoom(makeStorage());
  const ws = rawWs('t');
  await join(r5, ws, 'bp_send_t');
  /* the tick's own function, caught as cost-guard catches it */
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === r5.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  try { r5.startTickLoop(); } finally { globalThis.setInterval = realSetInterval; }
  ws.raw.length = 0;
  const before = tally(r5, 'tick')[0];
  for (let i = 0; i < 5 && tickFn; i++) { try { await tickFn(); } catch (e) { /* a test room's tick */ } }
  const ticks = ws.raw.filter((s) => s.startsWith('{"type":"tick"'));
  const src = readFileSync(new URL('../src/tick.js', import.meta.url), 'utf8');
  check('5: the tick and the ping go through the door', /this\._send\(ws, msg, 'tick'\)/.test(src) && /this\._send\(ws, pingMsg, 'ping'\)/.test(src));
  check('5: ...each tick frame written is counted, its length too', !!tickFn && ticks.length >= 1 && tally(r5, 'tick')[0] - before === ticks.length, { ticks: ticks.length, counted: tally(r5, 'tick'), before });
}

/* ── 6. into the book ── */
{
  const r6 = await openRoom(makeStorage());
  const ws = rawWs('b');
  r6._send(ws, { type: 'book_probe', payload: 1 });
  r6._send(ws, { type: 'book_probe', payload: 2 });
  const read1 = await bookRead(r6, 1);
  const today = read1.days && read1.days[0];
  check('6: the route reads what is counted and not yet folded', !!today && Array.isArray(today.send.book_probe) && today.send.book_probe[0] === 2, today && today.send);
  check('6: ...and the read changes nothing', tally(r6, 'book_probe')[0] === 2);
  check('6: the part rides: never a put of its own', DAYBOOK.RIDES.includes('send') && DAYBOOK.PARTS.includes('send'));
  bookAdd(r6, 'room', { tick: { n: 1 } });
  await bookPut(r6);
  const stored = [...(await r6.state.storage.list({ prefix: DAYBOOK.PREFIX })).values()][0];
  check('6: a put the book makes anyway carries the counts, and the door\'s are folded', stored && stored.send && stored.send.book_probe[0] === 2 && tally(r6, 'book_probe')[0] === 0, stored && stored.send);
  const read2 = await bookRead(r6, 1);
  check('6: read again, counted once', read2.days[0].send.book_probe[0] === 2, read2.days[0].send);
}

/* ── 7. the switch ── */
{
  const r7 = await openRoom(makeStorage(), { sendcount: false });
  const ws = rawWs('s');
  const msg = { type: 'off_probe', payload: { a: 1 } };
  r7._send(ws, msg);
  check('7: `sendcount: false`: the frame the same, nothing counted', ws.raw[0] === JSON.stringify(msg) && tally(r7, 'off_probe')[0] === 0);
}

/* ── 8. the census, strict ── */
/* v2.3.5193: 150 on main 78f70f4a (140 `.send(JSON.stringify` and 10 of frames made first); 57 moved behind the helpers.
   v2.3.5198 (card K PR 13, batch 1): every file no card holds, 65 more: 28 left.
   v2.3.5199 (batch 2): those 28: 0, the door the one place a frame is written.
   v2.3.5671 (the gatekeeper, sitting 33, after #2013 and #2014 merged on main 35aa7f7b): strict, no line --
   any raw socket write outside send.js fails (`this._send`, `room._send`, or `sendOutside` before a room). */
{
  /* v2.3.6441 (card DG PR 2): read off the syntax tree, any receiver and any
     position: `ws.send(...)`, `ws.send.bind(ws)` and a name made of it
     (plants2 SEND-1), `ws['send'](...)`, `.call`, `.apply`, handed on as a
     value.  Only asking whether it is there (`if (ws.send)`) is no write. */
  const raw = Object.create(null);
  for (const f of srcFiles()) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
  const { calls, odd } = doorCalls(raw, { skip: ['send.js'], names: ['send'], membersOnly: true });
  /* a field of the same name put, not a socket's: by file and function */
  const NOT_A_SOCKET = { 'daybook.js bookRead': 'the book\'s part named `send` (`src.parts.send = sends`): the day\'s counts, not a socket' };
  const seen = new Set();
  const found = [...calls, ...odd].filter((r) => { const k = r.file + ' ' + r.fn; if (r.how === 'put' && NOT_A_SOCKET[k]) { seen.add(k); return false; } return true; })
    .map((r) => where(r) + (r.how === 'call' ? '' : ' (' + r.how + ')'));
  check('8: ...every NOT_A_SOCKET row is still there (a stale one is deleted)', seen.size === Object.keys(NOT_A_SOCKET).length, Object.keys(NOT_A_SOCKET).filter((k) => !seen.has(k)));
  check(`8: no raw socket write outside send.js (strict; ${found.length} found): write through _send`, found.length === 0, found.slice(0, 40));
  const probe = (t) => { const r = doorCalls({ 'x.js': 'function f(ws, s) {\n' + t + '\n}' }, { names: ['send'], membersOnly: true }); return r.calls.length + r.odd.length; };
  check('8: ...the census finds a write however it is spelled (a bind, a name made of it, a string key, .call)',
    probe('ws.send(s);') === 1 && probe('const out = ws.send.bind(ws); out(s);') === 1 && probe("ws['send'](s);") === 1 && probe('ws.send.call(ws, s);') === 1 && probe('const { send } = ws;') === 1 && probe('if (ws.send) x();') === 0 && probe('const send = (t) => t; send(s);') === 0);
}

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
