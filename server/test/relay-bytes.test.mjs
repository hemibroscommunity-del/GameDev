/* ═══ v2.3.5543: THE RELAY'S BYTES (the red team's RT-1, N10; card K) ═══
 *
 * A relay was copied with every field the phone put in it, up to the 16 KB
 * frame, and the tick kept what it could not send queued with no cap: 48
 * guests relaying a 14 KB `stunned` 4 times a second sent an honest player
 * 2.25 MB a second (RT-1), 2,417 KB here on main.  relay.js
 * _relayBytesDrop bounds a relay's bytes three ways (RELAY.MAX_BYTES, a
 * socket's BYTES_BURST / BYTES_PER_S, the queue's QUEUE_BYTES_MAX).  This
 * holds:
 *
 *   1. one relay past MAX_BYTES is dropped and counted (`size`); an honest
 *      one goes out as before;
 *   2. a socket's byte budget: a burst, then BYTES_PER_S (`budget`); an
 *      honest stream (a swing, a dodge and a jump a second, 120 s) is never
 *      dropped;
 *   3. the queue's cap (`queue`): a relay past it is dropped, the worker's own
 *      events never are, and the tick's drain gives the bytes back;
 *   4. THE SWITCH THROWN (the plan's rule 4): `relaybytes: false`, and a 14 KB
 *      relay is queued as before, nothing counted;
 *   5. the flood in a real tick loop: what an honest player is sent, with the
 *      switch off and on.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-15:
 *   1. index.js: the router's `_relayBytesDrop` line removed     -> FAIL 1, 2, 3, 5
 *   2. tick.js: the `_relayDrained` line removed                  -> FAIL 3 (the drain)
 *   3. liveops.js: `_relayBytesOff` answering true always        -> FAIL 1, 2, 3, 5
 */
import { RELAY } from '../src/relay.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}

const A = 'bp_rb_aaa', B = 'bp_rb_bbb';
async function newRoom(flags) {
  const room = await openRoom(makeStorage(new Map()), flags);
  const wa = await join(room, fakeWs('a'), A, { name: 'Ada', data: { x: 1000, y: 1000, z: 'town' } });
  const wb = await join(room, fakeWs('b'), B, { name: 'Bob', data: { x: 1040, y: 1000, z: 'town' } });
  await settle();
  return { room, wa, wb, sa: room.sessions.get(wa) };
}
/* one relay from A: what reached the queue.  The count's own bucket (RELAY_BURST)
   is kept full, so only the byte bounds are tested */
async function relay(w, msg) {
  w.sa.relayTokens = w.room.RELAY_BURST; w.sa.relayAt = Date.now();
  const before = w.room.eventBuffer.length;
  await w.room.webSocketMessage(w.wa, JSON.stringify(msg));
  await settle();
  return w.room.eventBuffer.length - before;
}
const stun = (junk) => ({ type: 'stunned', payload: { target: B, duration: 2000, ...(junk ? { junk: 'y'.repeat(junk) } : {}) } });
const swing = () => ({ type: 'player_swing', payload: { ang: 1.2, wpn: 'sword', r: 60 } });

/* ── 1. one relay too big ── */
{
  const w = await newRoom();
  const big = await relay(w, stun(14000));
  const ok = await relay(w, stun(0));
  check('1: a 14 KB stunned is dropped (size) and counted; an honest one goes out', big === 0 && ok === 1 && w.room._relayByteDrops && w.room._relayByteDrops.size === 1 && w.sa.relayBytesDropped === 1, { big, ok, drops: w.room._relayByteDrops });
  check('1: ...the bound sits above every honest relay (MAX_BYTES 4 KB; an honest one is under 1 KB)', RELAY.MAX_BYTES >= 4096 && JSON.stringify(stun(0)).length < 1024);
}

/* ── 2. a socket's byte budget ── */
{
  const realNow = Date.now; let T = realNow();
  Date.now = () => T;
  const w = await newRoom();
  let went = 0;
  for (let i = 0; i < 10; i++) went += await relay(w, stun(3500));   /* ~3.6 KB each, at once */
  const burst = went;
  T += 10000; went = 0;
  for (let i = 0; i < 10; i++) { T += 250; went += await relay(w, stun(3500)); }   /* 4 a second for 2.5 s */
  check(`2: a socket's burst is BYTES_BURST (${burst} of 10 went at once), then BYTES_PER_S`, burst === 2 && went >= 2 && went <= 4 && w.room._relayByteDrops.budget >= 14, { burst, went, drops: w.room._relayByteDrops });
  /* honest: a swing, a dodge and a jump each second, for 120 s */
  const h = await newRoom(); went = 0; let tried = 0;
  for (let s = 0; s < 120; s++) {
    for (const m of [swing(), { type: 'player_dodge', payload: { kind: 'roll', angle: 0.4, dur: 300 } }, { type: 'player_jump', payload: { dur: 500, peak: 30, flip: 0, h0: 0, v: 1, g: 1, ang: 0 } }]) {
      T += 333; h.sa.relayTokens = h.room.RELAY_BURST; tried++; went += await relay(h, m);
    }
    h.room.eventBuffer.length = 0; h.room._relayQueued = 0;   /* as a tick drains them */
  }
  check(`2: an honest stream (a swing, a dodge and a jump each second, 120 s: ${tried}) is never dropped`, went === tried && !h.room._relayByteDrops, { went, tried, drops: h.room._relayByteDrops });
  Date.now = realNow;
}

/* ── 3. the queue's cap ── */
{
  const w = await newRoom();
  w.room._relayQueued = RELAY.QUEUE_BYTES_MAX - 100;
  const past = await relay(w, stun(0));
  const own = w.room.eventBuffer.length;
  w.room.eventBuffer.push({ type: 'zz_worker_own', payload: {} });
  check('3: past the queue\'s cap a relay is dropped (queue); the worker\'s own events still go in', past === 0 && w.room._relayByteDrops.queue === 1 && w.room.eventBuffer.length === own + 1, { past, drops: w.room._relayByteDrops });
  w.room._relayQueued = 0; w.room.eventBuffer.length = 0;
  await relay(w, stun(0)); await relay(w, swing());
  const held = w.room._relayQueued;
  w.room.startTickLoop();
  await new Promise((r) => setTimeout(r, 400));
  if (w.room.tickInterval) clearInterval(w.room.tickInterval);
  check(`3: the tick's drain gives the queue's bytes back (${held} -> ${w.room._relayQueued})`, held > 0 && w.room._relayQueued === 0 && w.room.eventBuffer.length === 0, { held, after: w.room._relayQueued, left: w.room.eventBuffer.length });
}

/* ── 4. the switch thrown ── */
{
  const w = await newRoom({ relaybytes: false });
  const big = await relay(w, stun(14000));
  check('4: relaybytes: false -- a 14 KB stunned is queued as before, nothing counted', big === 1 && !w.room._relayByteDrops && !w.room._relayQueued, { big, drops: w.room._relayByteDrops });
}

/* ── 5. the flood, in a real tick loop ── */
async function flood(flags, guests, secs, junk) {
  const room = await openRoom(makeStorage(new Map()), flags);
  const hon = fakeWs('honest'); let got = 0; hon.send = (s) => { got += s.length; };
  await join(room, hon, 'bp_rb_honest', { name: 'Hon', data: { x: 1000, y: 1000, z: 'town' } });
  const gs = [];
  for (let i = 0; i < guests; i++) { const g = fakeWs('g' + i); g.send = () => {}; await join(room, g, 'bp_rb_g' + String(i).padStart(3, '0'), { name: 'G' + i, data: { x: 1000 + i, y: 1000, z: 'town' } }); gs.push(g); }
  await settle();
  room.startTickLoop();
  const pad = 'y'.repeat(junk);
  const t0 = Date.now(); got = 0;
  const every = setInterval(() => { for (const g of gs) room.webSocketMessage(g, JSON.stringify({ type: 'stunned', payload: { target: 'bp_rb_honest', duration: 2000, junk: pad } })); }, 250);
  await new Promise((r) => setTimeout(r, secs * 1000));
  clearInterval(every);
  const kbps = Math.round(got / ((Date.now() - t0) / 1000) / 1024);
  if (room.tickInterval) clearInterval(room.tickInterval);
  return kbps;
}
{
  const off = await flood({ relaybytes: false }, 24, 4, 14000);
  const on = await flood({}, 24, 4, 14000);
  const onUnder = await flood({}, 24, 4, 3900);
  console.log(`     the flood (24 guests, a stunned 4 times a second each, 4 s): off ${off} KB/s; on ${on} KB/s (14 KB junk), ${onUnder} KB/s (3.9 KB junk, under the size bound)`);
  check(`5: an honest player is sent a tenth or less of the flood with the switch on (${off} -> ${on} KB/s; ${onUnder} under the size bound)`, off > 500 && on * 10 <= off && onUnder * 10 <= off, { off, on, onUnder });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
