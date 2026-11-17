/* THE ROOM FORGETS WHO LEFT -- v2.3.5544 (server/src/heapforget.js; the red
 * team's RT-1 N11; card K).
 *
 * RT-1: a throwaway guest's refused strike kept the phone's raw `zone` (up to
 * the 16 KB frame) on the room's heap for good, ~27 KB a guest; ~4,000 of
 * them reset the room (Cloudflare's 128 MB).  Six smaller maps the same shape.
 *   1. THE STRIKE: a refused strike's record keeps a string field only to
 *      STR_MAX; at the leave it goes, and the arrow's refusals with it.
 *   2. THE BUCKETS: a spent chat bucket stays past the leave (a rejoin gets
 *      no fresh allowance); once it would be full again the room's sweep
 *      drops it, at most once a SWEEP_MS.
 *   3. THE CLOSED LIST: guests send every message the table lets in, each
 *      string field 7 KB, and leave; a map on the room still keyed by one of
 *      them is a HEAP_FORGET row kept past the leave, or one of BOUNDED (a
 *      cap of its own).  A new map keyed by a player fails here.
 *   4. THE HEAP: 1,000 guests, each a 7 KB strike, in and out; after a
 *      full collection at least half the zone is forgotten a guest (off - on
 *      >= 3,500 B) and the room grew under 4 KB a guest (it was ~7 KB more,
 *      the zone).  v2.3.5725: the line measured on CI's runner (below).
 *   5. THE SWITCH: `heapforget: false` keeps the record whole and forgets
 *      nothing, as before.
 * Break proofs (tried by hand): the _heapForget call out of leave.js -> 1
 * to 4 red (v2.3.5725, again with the new lines: on 8,027, off 7,848, the
 * forgotten -179: both of 4's lines red); _heapClip returning `extra` -> 1 red; the sweep's time test
 * inverted -> 2 red. */
import v8 from 'node:v8';
import vm from 'node:vm';
import { WIRE_IN } from '../src/wire/in.js';
import { HEAP_FORGET, HEAP_FORGET_CFG } from '../src/heapforget.js';
import { CHAT_LANES } from '../src/chatlanes.js';
import { BOTFP } from '../src/botfp.js';
import { LAST_PLACE } from '../src/lastplace.js';
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}

const BIG = 'z'.repeat(7000);   /* a frame is 16 KB: one field this size, sent at the top and in the payload */
const send = async (room, ws, type, p) => { await room.webSocketMessage(ws, JSON.stringify({ type, ...p, payload: p })); await settle(); };
const leave = async (room, ws) => { await room.webSocketClose(ws, 1000, 'bye', true); await settle(); };
const held = (room, name, pid) => { const s = room[name]; if (!s) return undefined; return s instanceof Map ? s.get(pid) : s[pid]; };

/* ── 1. the strike ── */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('g1'); await join(room, ws, 'bp_strike1');
  await send(room, ws, 'node_strike', { id: 'nope', zone: BIG });
  await send(room, ws, 'arrow_blast', { zone: 'nope', x: 0, y: 0 });
  const rec = held(room, '_lastStrikeById', 'bp_strike1');
  check('1: a refused strike is kept for the operator\'s view, its zone clipped to STR_MAX', !!rec && typeof rec.zone === 'string' && rec.zone.length <= HEAP_FORGET_CFG.STR_MAX + 3 && JSON.stringify(rec).length < 400, rec && JSON.stringify(rec).length);
  check('1: the arrow\'s refusal counted', !!held(room, '_arrowBlastRejects', 'bp_strike1'));
  await leave(room, ws);
  check('1: at the leave both go', held(room, '_lastStrikeById', 'bp_strike1') === undefined && held(room, '_arrowBlastRejects', 'bp_strike1') === undefined);
}

/* ── 2. the buckets ── */
{
  const clock = seededClock().install();
  try {
    const room = await openRoom(makeStorage());
    const ws = fakeWs('g2'); await join(room, ws, 'bp_chat2');
    for (let i = 0; i < CHAT_LANES.BURST + 2; i++) await send(room, ws, 'area_chat', { text: 'hi ' + i });
    check('2: the chat bucket is spent', !!held(room, '_laneBuckets', 'bp_chat2') && held(room, '_laneBuckets', 'bp_chat2').tokens <= 0, held(room, '_laneBuckets', 'bp_chat2'));
    await leave(room, ws);
    check('2: a spent bucket stays past the leave (a rejoin gets no fresh allowance)', !!held(room, '_laneBuckets', 'bp_chat2'));
    clock.advance(CHAT_LANES.REFILL_MS * (CHAT_LANES.BURST + 1) + HEAP_FORGET_CFG.SWEEP_MS);
    const ws2 = fakeWs('g2b'); await join(room, ws2, 'bp_other2'); await leave(room, ws2);
    check('2: once full again, the next leave\'s sweep drops it', held(room, '_laneBuckets', 'bp_chat2') === undefined);
    room._heapSweptAt = Date.now();
    const ws3 = fakeWs('g2c'); await join(room, ws3, 'bp_chat3');
    for (let i = 0; i < CHAT_LANES.BURST + 2; i++) await send(room, ws3, 'area_chat', { text: 'yo ' + i });
    await leave(room, ws3);
    clock.advance(CHAT_LANES.REFILL_MS * (CHAT_LANES.BURST + 1));
    const ws4 = fakeWs('g2d'); await join(room, ws4, 'bp_other4'); await leave(room, ws4);
    check('2: ...at most once a SWEEP_MS', !!held(room, '_laneBuckets', 'bp_chat3') || HEAP_FORGET_CFG.SWEEP_MS <= CHAT_LANES.REFILL_MS * (CHAT_LANES.BURST + 1));
  } finally { clock.restore(); }
}

/* ── 3. the closed list ── */
const BOUNDED = Object.freeze({
  _botfp: 'botfp.js: at most BOTFP.MAP_CAP, the offline evicted first (flushed at their close)',
  _deviceIndex: 'botfp.js: beside _botfp, evicted with it',
  _lastPlaces: 'lastplace.js: at most LAST_PLACE.MAX, the oldest dropped',
  _accBook: 'accuracy.js: an offline player\'s clean entry swept at the next write',
  pendingPlayerStateFlush: 'persistence.js: emptied at every flush',
  chatSeen: 'chatmod.js: at most CHATMOD.SEEN_MAX senders, the oldest dropped (the report\'s evidence)',
  _farmRate: 'farm.js: swept of every window past a minute once over 256',
});
{
  const room = await openRoom(makeStorage());
  const guests = ['bp_list1', 'bp_list2'];
  for (const pid of guests) {
    const ws = fakeWs(pid); await join(room, ws, pid);
    for (const row of WIRE_IN) {
      if (row.name === 'join' || row.wayIn !== 'socket') continue;
      const p = {};
      for (const k of Object.keys(row.trust || {})) p[k.split('.')[0]] = BIG.slice(0, 3000);
      try { await room.webSocketMessage(ws, JSON.stringify({ type: row.name, ...p, payload: p })); } catch { /* a refusal is fine */ }
    }
    await send(room, ws, 'node_strike', { id: 'nope', zone: BIG });
    await send(room, ws, 'arrow_blast', { zone: 'nope', x: 0, y: 0 });
    for (let i = 0; i < 8; i++) await send(room, ws, 'area_chat', { text: 'hi ' + i });
    await leave(room, ws);
  }
  const strays = [];
  for (const name of Object.keys(room)) {
    const v = room[name];
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const keys = v instanceof Map || v instanceof Set ? [...v.keys()] : Object.keys(v);
    const n = keys.filter((k) => guests.includes(k)).length;
    if (!n) continue;
    const row = HEAP_FORGET[name];
    if (row && row.when !== 'leave') continue;
    if (BOUNDED[name]) continue;
    strays.push(name + ' (' + n + ')');
  }
  check('3: no map on the room keeps a guest who left but a HEAP_FORGET row kept past the leave or a BOUNDED one', strays.length === 0, strays);
  check('3: BOUNDED\'s caps are what they say', BOTFP.MAP_CAP <= 256 && LAST_PLACE.MAX <= 1000, { botfp: BOTFP.MAP_CAP, places: LAST_PLACE.MAX });
}

/* ── 4. the heap ── */
/* A storage that keeps nothing (the guests are new: nothing is read back),
   so the heap measured is the room's own, not the test's copy of every
   guest's saved records. */
v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
const forgetful = () => {
  const storage = { get: async () => undefined, put: async () => {}, delete: async () => false, list: async () => new Map() };
  storage.transaction = async (f) => f(storage);
  return { storage, getWebSockets: () => [], acceptWebSocket: () => {} };
};
async function perGuest(flags, n) {
  const room = await openRoom(forgetful(), flags);
  let k = 0;
  const run = async (m) => {
    for (let i = 0; i < m; i++) {
      const pid = 'bp_heap' + (k++);
      const ws = fakeWs(pid); await join(room, ws, pid);
      await send(room, ws, 'node_strike', { id: 'nope', zone: BIG + pid });
      await leave(room, ws);
    }
  };
  await run(50);   /* the room's own first-use caches settle */
  gc(); gc();
  const b = process.memoryUsage().heapUsed;
  await run(n);
  gc(); gc();
  return Math.round((process.memoryUsage().heapUsed - b) / n);
}
{
  const N = 1000;
  const on = await perGuest(null, N);
  const off = await perGuest({ heapforget: false }, N);
  console.log('   the room a guest:', { on, off });
  /* v2.3.5725 (card K2; sitting 38's Found, the planning session): THE LINE
     MEASURED, NOT RAISED.  The check is there to catch the ZONE kept: some
     7 KB a guest (BIG and its id), which `heapforget: false` shows.  The
     absolute figure a guest leaves is the runner's as much as the room's:
     here (node 22, 4 cores) `on` read 247, 643, 1,543 in three runs; on
     CI's runner 2,563, 2,571 and 2,573 (runs 44147025437, 44147020446,
     44158898401), over the old 2,560 line, and `off` 7,119 to 8,423 here,
     7,923 and 8,327 there.  So:
       FORGOTTEN  off - on, the zone the room no longer keeps: at least half
                  of it (3,500 B).  Measured 5,350 to 5,756 on CI, 5,576 to
                  8,176 here; with the forget broken (the break proof below)
                  on is off and this is about 0, so it goes red whatever the
                  runner;
       CEILING    on < 4 KB a guest: anything ELSE a guest leaves behind (a
                  new map keyed by a player that nothing forgets; part 3
                  names them one by one) still shows; 1.5 KB above CI's
                  highest reading, 2.5 KB above this box's. */
  check('4: 1,000 guests in and out, each a 7 KB strike: at least half the zone forgotten a guest (off - on >= 3,500 B)', off - on >= 3500, { on, off, forgotten: off - on });
  check('4: ...and the room grows under 4 KB a guest', on < 4096, { on, off });
  check('4: ...where it grew by the zone, some 7 KB, before (`heapforget: false`)', off > 6000, { on, off });
}

/* ── 5. the switch ── */
{
  const room = await openRoom(makeStorage(), { heapforget: false });
  const ws = fakeWs('g5'); await join(room, ws, 'bp_switch5');
  await send(room, ws, 'node_strike', { id: 'nope', zone: BIG });
  const rec = held(room, '_lastStrikeById', 'bp_switch5');
  check('5: thrown, the strike\'s record is kept whole', !!rec && rec.zone === BIG);
  await leave(room, ws);
  check('5: ...and kept past the leave, as before', !!held(room, '_lastStrikeById', 'bp_switch5'));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
