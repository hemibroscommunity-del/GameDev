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
 *   1b. (v2.3.6445, card DG PR 6) BYTES: a frame is counted in UTF-8 bytes.
 *   9. (v2.3.6445) sendOutside, the door's uncounted form before a room, is
 *      imported only in the files listed (OUTSIDE), send.js by names alone.
 *   10. (v2.3.6446, card DG, sitting 59's mend) THE SENDERS AND THE COUNT, in
 *      the tree, allow lists: a socket's send in send.js only in `_send` and
 *      `sendOutside` (SOCKET_SENDERS); sendOutside only called, by a listed
 *      function, on a socket it made (OUTSIDE_CALLERS: no wrapper, no second
 *      name); the door's names given a body only in send.js; the count one
 *      `this._sendCount(type, utf8Bytes(s))` in `_send`, `s` the frame it
 *      wrote, and a `.length` only in utf8Bytes (LENGTH_READS).
 * Break proof (tried by hand): `_send` writing `s + ' '` -> 1 and 3 red; a
 * helper put back to `ws.send(JSON.stringify(` -> 4 and 8 red.
 * v2.3.6446 (plants-gaps.json, run by tools/dev/plants/batch.mjs): a wrapper
 * `tell(sock, m) { sendOutside(sock, m) }` in origin.js -> 10b red; `const say
 * = sendOutside` -> 10b red; `_sendRoom` writing `ws.send(s)` and counting
 * `s.length` -> 10a and 10d red. */
import { readFileSync, readdirSync } from 'node:fs';
import { SEND, sendOutside, utf8Bytes } from '../src/send.js';
import { DAYBOOK, bookAdd, bookPut, bookRead } from '../src/daybook.js';
import { makeStorage, openRoom, join, settle } from './testroom.mjs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { doorCalls, where, visit, fnName } from '../../tools/guards/lib/writesOf.mjs';   /* v2.3.6441: the census reads the syntax tree (card DG PR 2) */

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
  /* v2.3.6445 (card DG PR 6): its length in BYTES as the socket writes them (UTF-8), not characters */
  check('1: each counted under its type with its length in bytes', tally(room, 'door_probe')[0] === 1 && tally(room, 'door_probe')[1] === Buffer.byteLength(ws.raw[0], 'utf8') && tally(room, 'tick_probe')[1] === 23, [tally(room, 'door_probe'), tally(room, 'tick_probe')]);
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

/* ── 1b. bytes, not characters (v2.3.6445, card DG PR 6; the plan's 4.1b "counting bytes by type";
   shape-doors.md part 8: send.js counted `s.length`, UTF-16 units) ── */
{
  const ws = rawWs('b');
  const words = ['plain', 'Zoë', '€ uro', '⚔ sword', '😀 grin', 'あ', 'a\u0000b', '\ud83d\ude00\ud83d\ude00'];
  const wrong = [];
  for (const w of words) {
    const r = await openRoom(makeStorage());
    r._send(ws, { type: 'bytes_probe', payload: { w } });
    const frame = ws.raw[ws.raw.length - 1];
    const [n, len] = tally(r, 'bytes_probe');
    if (n !== 1 || len !== Buffer.byteLength(frame, 'utf8')) wrong.push({ w, len, bytes: Buffer.byteLength(frame, 'utf8'), chars: frame.length });
    /* the frame made first (the tick's way) is counted the same */
    r._send(ws, frame, 'bytes_made');
    if (tally(r, 'bytes_made')[1] !== Buffer.byteLength(frame, 'utf8')) wrong.push({ w, made: tally(r, 'bytes_made')[1] });
  }
  check('1b: a frame is counted in UTF-8 bytes (an emoji four, an accented letter two), an object or a frame made first', wrong.length === 0, wrong);
  check('1b: ...utf8Bytes agrees with the engine on every character width (guard)', ['', 'abc', 'é', '€', '😀', 'x😀é€'].every((t) => utf8Bytes(t) === Buffer.byteLength(t, 'utf8')) && utf8Bytes(null) === 0);
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

/* ── 9. sendOutside is the worker's, before a room (v2.3.6445, card DG PR 6; shape-doors.md SEND-2) ──
   The door's form outside a room writes a frame nothing counts.  Imported
   into a room's file, it is a raw write the census of part 8 never sees.
   Read off the syntax tree: every import of send.js (a named import by any
   name, the module whole, a re-export, `import()`), by file; sendOutside only
   in the files listed. */
{
  const raw = Object.create(null);
  for (const f of srcFiles()) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
  const OUTSIDE = { 'origin.js': 'the worker refuses a socket from a site not the game\'s before it reaches a room (refuseOrigin)' };
  const found = [];
  const seen = new Set();
  const isSend = (src) => typeof src === 'string' && /(^|\/)send(\.js)?$/.test(src);
  for (const f of Object.keys(raw)) {
    if (f === 'send.js') continue;
    const at = (node, what) => found.push(f + ':' + raw[f].slice(0, node.start).split('\n').length + ' ' + what);
    visit(raw[f], {
      ImportDeclaration(path) {
        if (!isSend(path.node.source.value)) return;
        for (const sp of path.node.specifiers) {
          if (sp.type === 'ImportNamespaceSpecifier' || sp.type === 'ImportDefaultSpecifier') at(path.node, 'send.js whole (`' + sp.local.name + '`): name what you take');
          else if ((sp.imported.name || sp.imported.value) === 'sendOutside') { if (OUTSIDE[f]) seen.add(f); else at(path.node, 'sendOutside imported' + (sp.local.name !== 'sendOutside' ? ' as `' + sp.local.name + '`' : '')); }
        }
      },
      ExportNamedDeclaration(path) { if (path.node.source && isSend(path.node.source.value)) at(path.node, 'send.js re-exported'); },
      ExportAllDeclaration(path) { if (isSend(path.node.source.value)) at(path.node, 'send.js re-exported whole'); },
      CallExpression(path) {
        const c = path.node.callee, a = path.node.arguments[0];
        if ((c.type === 'Import' || (c.type === 'Identifier' && c.name === 'require')) && a && (a.type !== 'StringLiteral' || isSend(a.value))) at(path.node, 'send.js loaded by `' + (c.type === 'Import' ? 'import()' : 'require') + '`');
      },
    });
  }
  check('9: sendOutside is imported only where no room is (OUTSIDE), and send.js by its names alone', found.length === 0, found);
  check('9: ...each file listed still imports it (a stale one is deleted)', seen.size === Object.keys(OUTSIDE).length, [...seen]);
}

/* ── 10. THE SENDERS AND THE COUNT, in the tree (v2.3.6446, card DG, sitting 59's mend) ──
   Sitting 59's review: a wrapper `tell(sock, m) { sendOutside(sock, m) }` in
   origin.js (part 9 asks only who imports it) and, in send.js, a socket
   written and counted `s.length` beside the door (part 8 skips send.js,
   part 1b runs `_send` alone) stayed green.  An ALLOW list:
   10a. a socket's `.send` is written in send.js only by the listed senders
        (SOCKET_SENDERS, counted): `_send`, and `sendOutside` before a room.
   10b. `sendOutside`, in any file and by any name it is given, is only ever
        CALLED, by a listed function (OUTSIDE_CALLERS, counted), on a socket
        that function made (never one of its parameters: a wrapper takes its
        socket from its caller).  A second name, `.bind`, handed on: red.
   10c. the door's names (`_send`, `_sendRoom`, `_sendCount`, `_sendTally`,
        `sendOutside`, `utf8Bytes`) are given a body only in send.js, and
        the count's (`_sendCount`, `_sendTally`) are named nowhere else.
   10d. the count is in bytes, in the tree: `_sendCount` is called once, in
        `_send`, as `this._sendCount(<type>, utf8Bytes(<s>))` with <s> the
        frame `ws.send(<s>)` wrote; a `.length` in send.js is read only in
        `utf8Bytes` (LENGTH_READS, counted). */
{
  const raw = Object.create(null);
  for (const f of srcFiles()) raw[f] = readFileSync(new URL(f, SRC_DIR), 'utf8');
  const SEND_SRC = raw['send.js'];
  const lineIn = (f, n) => raw[f].slice(0, n.start).split('\n').length;
  const held = (list, got) => {
    const bad = [];
    for (const [k, n] of got) if (!list[k] || n > list[k][0]) bad.push(k + ' (x' + n + (list[k] ? ', listed ' + list[k][0] : ', not listed') + ')');
    for (const k of Object.keys(list)) if ((got.get(k) || 0) < list[k][0]) bad.push(k + ' stale (seen ' + (got.get(k) || 0) + ', listed ' + list[k][0] + ')');
    return bad;
  };
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

  /* 10a */
  const SOCKET_SENDERS = { 'send.js _send': [1, 'THE DOOR: writes the frame, then counts it'], 'send.js sendOutside': [1, 'the door\'s form before a room (origin.js\'s refusal): nothing to count it'] };
  {
    const { calls, odd } = doorCalls({ 'send.js': SEND_SRC }, { names: ['send'], membersOnly: true });
    const got = new Map();
    for (const r of calls) bump(got, r.file + ' ' + r.fn);
    const bad = [...held(SOCKET_SENDERS, got), ...odd.map((r) => where(r) + ' (' + r.how + ')')];
    check('10a: a socket\'s send is written in send.js only by the listed senders (SOCKET_SENDERS, counted): no second sender beside the door', bad.length === 0, bad);
  }

  /* 10b */
  const OUTSIDE_CALLERS = { 'origin.js refuseOrigin': [1, 'the refusal of a page not the game\'s, on the socket it made (`new Pair()`)'] };
  {
    const got = new Map(), bad = [];
    for (const f of Object.keys(raw)) {
      visit(raw[f], {
        'ImportSpecifier|FunctionDeclaration'(path) {
          let name = null;
          if (path.isImportSpecifier() && (path.node.imported.name || path.node.imported.value) === 'sendOutside') name = path.node.local.name;
          if (path.isFunctionDeclaration() && f === 'send.js' && path.node.id && path.node.id.name === 'sendOutside') name = 'sendOutside';
          if (!name) return;
          const b = (path.isFunctionDeclaration() ? path.parentPath.scope : path.scope).getBinding(name);
          if (!b) { bad.push(f + ':' + lineIn(f, path.node) + ' `' + name + '` not followed'); return; }
          for (const v of b.constantViolations) bad.push(f + ':' + lineIn(f, v.node) + ' `' + name + '` given another value');
          for (const r of b.referencePaths) {
            const at = f + ':' + lineIn(f, r.node);
            if (r.node === path.node.id || r.isExportNamedDeclaration() || r.parentPath.isExportNamedDeclaration()) continue;   /* its own declaration, exported */
            if (r.parentPath.isExportSpecifier()) { bad.push(at + ' exported again'); continue; }
            if (!(r.parentPath.isCallExpression() && r.parentKey === 'callee')) { bad.push(at + ' `' + name + '` not called (a second name, a bind, handed on)'); continue; }
            const fnP = r.getFunctionParent();
            const who = f + ' ' + fnName(r);
            bump(got, who);
            const sock = r.parent.arguments[0];
            const params = new Set(fnP ? fnP.node.params.flatMap((p) => (p.type === 'Identifier' ? [p.name] : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? [p.left.name] : [])) : []);
            if (!sock || sock.type !== 'Identifier') bad.push(at + ' [' + who + '] its socket is no name the guard can follow');
            else if (params.has(sock.name)) bad.push(at + ' [' + who + '] its socket is a parameter `' + sock.name + '`: a wrapper (write through the room\'s _send)');
            else {
              const sb = r.scope.getBinding(sock.name);
              if (!sb || sb.kind === 'param' || (sb.scope.getFunctionParent() || sb.scope) !== (r.scope.getFunctionParent() || r.scope)) bad.push(at + ' [' + who + '] its socket `' + sock.name + '` is not made in the function that writes it');
            }
          }
        },
      });
    }
    bad.push(...held(OUTSIDE_CALLERS, got));
    check('10b: sendOutside is only ever called, by a listed function (OUTSIDE_CALLERS, counted), on a socket that function made: no wrapper, no second name', bad.length === 0, bad);
  }

  /* 10c */
  {
    const DOOR_NAMES = new Set(['_send', '_sendRoom', '_sendCount', '_sendTally', 'sendOutside', 'utf8Bytes']);
    const COUNT_NAMES = new Set(['_sendCount', '_sendTally']);
    const bad = [];
    for (const f of Object.keys(raw)) {
      if (f === 'send.js') continue;
      visit(raw[f], {
        'ObjectMethod|ClassMethod|ObjectProperty|ClassProperty|FunctionDeclaration|VariableDeclarator'(path) {
          const k = path.node.key || path.node.id;
          const name = k && !path.node.computed && (k.name || k.value);
          /* a local of a function's own (duel.js's `_send = true`, whether a card goes) is no body of the door's */
          if (path.isVariableDeclarator() && !path.scope.path.isProgram()) return;
          if (name && DOOR_NAMES.has(name) && !(path.isObjectProperty() && path.parentPath.isObjectPattern())) bad.push(f + ':' + lineIn(f, path.node) + ' `' + name + '` given a body outside send.js');
        },
        'MemberExpression|OptionalMemberExpression'(path) {
          const n = path.node;
          const name = !n.computed ? n.property.name : (n.property.type === 'StringLiteral' ? n.property.value : null);
          if (!name) return;
          if (DOOR_NAMES.has(name) && path.parentPath.isAssignmentExpression() && path.parentKey === 'left') bad.push(f + ':' + lineIn(f, n) + ' `' + name + '` given a body outside send.js');
          else if (COUNT_NAMES.has(name)) bad.push(f + ':' + lineIn(f, n) + ' `' + name + '` (the count is the door\'s own)');
        },
        StringLiteral(path) {
          if (DOOR_NAMES.has(path.node.value) && !path.parentPath.isImportSpecifier() && !path.parentPath.isExportSpecifier()) bad.push(f + ':' + lineIn(f, path.node) + ' `' + path.node.value + '` reached by a string');
        },
      });
    }
    check('10c: the door\'s names are given a body only in send.js, and its count is named nowhere else', bad.length === 0, bad);
  }

  /* 10d */
  const LENGTH_READS = { utf8Bytes: [3, 'an all-ASCII frame is its length in bytes; the walk over a wider one starts from it'] };
  {
    const bad = [], lens = new Map();
    let counted = 0;
    visit(SEND_SRC, {
      'MemberExpression|OptionalMemberExpression'(path) {
        const n = path.node;
        if ((!n.computed && n.property.name === 'length') || (n.computed && n.property.type === 'StringLiteral' && n.property.value === 'length')) bump(lens, fnName(path));
        if (!n.computed && n.property.name === '_sendCount') {
          const at = 'send.js:' + lineIn('send.js', n);
          const call = path.parentPath;
          const fn = fnName(path);
          if (!(call.isCallExpression() && path.parentKey === 'callee' && n.object.type === 'ThisExpression') || fn !== '_send') { bad.push(at + ' [' + fn + '] `_sendCount` reached outside `_send`\'s one call'); return; }
          counted++;
          const a = call.node.arguments[1];
          const s = a && a.type === 'CallExpression' && a.callee.type === 'Identifier' && a.callee.name === 'utf8Bytes' && a.arguments.length === 1 && a.arguments[0].type === 'Identifier' ? a.arguments[0].name : null;
          if (!s || call.node.arguments.length !== 2) { bad.push(at + ' the count\'s length is not `utf8Bytes(<the frame>)`: `' + SEND_SRC.slice(call.node.start, call.node.end).slice(0, 100) + '`'); return; }
          /* the frame counted is the frame written */
          let wrote = null;
          path.getFunctionParent().traverse({ CallExpression(q) { const c = q.node.callee; if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'send' && q.node.arguments[0] && q.node.arguments[0].type === 'Identifier') wrote = q.node.arguments[0].name; } });
          if (wrote !== s) bad.push(at + ' the frame counted (`' + s + '`) is not the frame written (`' + wrote + '`)');
        }
      },
    });
    if (counted !== 1) bad.push('`this._sendCount(...)` called ' + counted + ' times in `_send` (one listed)');
    bad.push(...held(LENGTH_READS, lens));
    check('10d: the count is in bytes, in the tree: one `this._sendCount(type, utf8Bytes(s))` in `_send`, `s` the frame it wrote; a `.length` in send.js only in utf8Bytes (LENGTH_READS, counted)', bad.length === 0, bad);
  }
}

await settle();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
