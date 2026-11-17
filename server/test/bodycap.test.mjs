/* ═══ v2.3.5720: A BODY'S SIZE, BEFORE ANYTHING READS IT (card K2 PR 1) ═══
 *
 * The second red team's CRITICAL 1 (session "Grand plan red team review",
 * proved on the test room): the routes' door (wire/door.js `_wireDoorHttp`)
 * read every non-GET body whole (`request.clone().text()`) and parsed it
 * before any route asked who sends, reached from the outer router
 * (index.js `routeHttp`) with no limit at all.  A 24 MB POST with no key
 * held the room's thread 2.8 to 4.5 s and several hundred MB.  This holds:
 *
 *   1. the outer router: a 24 MB unkeyed POST that declares its length is a
 *      413, the room never asked (no forward, nothing read);
 *   2. the outer router: a 24 MB body with NO length (a stream) is read
 *      through the cap and refused: at most the cap and a chunk pulled,
 *      the room never asked;
 *   3. the room's door: the same 24 MB stream sent to the room itself is a
 *      413 with at most the cap and a chunk pulled, counted under `size`,
 *      and the room answers its next request at once;
 *   4. every honest body goes on as before: a small POST with its length
 *      is forwarded untouched, one with no length goes on as the same bytes,
 *      a GET is never read, a crash report past 32 KB passes on its own
 *      64 KB cap, the leaderboard's POST is still 405, and a market order
 *      reaches its route as on main;
 *   5. the switches: `bodycap: false` (the room's live flag) reads a body
 *      whole as before; `BODY_CAP = "off"` (the worker's setting) forwards
 *      as before;
 *   6. the reader the Feedback object will use (`readBodyCapped`): exact
 *      bytes under the cap, refused past it.
 *
 * Red on main (v2.3.5719): 1, 2, 3 and 5's `bodycap` checks fail (the body
 * reaches the room, which reads all 24 MB). */
import worker from '../src/index.js';
import * as door from '../src/wire/door.js';

/* read as a namespace so the suite runs on main too (its red run) */
const BODY_CAP = door.BODY_CAP || { BYTES: 32 * 1024 };
const bodyCapFor = door.bodyCapFor || ((p) => (p === '/api/feedback/crash' ? 64 * 1024 : BODY_CAP.BYTES));
const readBodyCapped = door.readBodyCapped || (async () => ({ ok: null }));
import { makeStorage, openRoom } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const MB24 = 24 * 1024 * 1024;
const CHUNK = 64 * 1024;
const PULL_MAX = (BODY_CAP.BYTES || 32768) + 4 * CHUNK;   /* the cap, the chunk that passed it, and the few a clone's tee reads ahead (its queue) */

/* a 24 MB JSON body made as it is read, counting what was pulled */
function bigStream(total = MB24) {
  const meter = { pulled: 0 };
  const head = new TextEncoder().encode('{"playerId":"bp_nokey","blob":"');
  const tail = new TextEncoder().encode('"}');
  const fill = new Uint8Array(CHUNK).fill(120);
  let sentHead = false;
  const stream = new ReadableStream({
    pull(c) {
      if (!sentHead) { sentHead = true; meter.pulled += head.length; c.enqueue(head); return; }
      if (meter.pulled >= total) { c.enqueue(tail); meter.pulled += tail.length; c.close(); return; }
      meter.pulled += fill.length;
      c.enqueue(fill.slice());
    },
  });
  return { stream, meter };
}
const bigText = () => '{"playerId":"bp_nokey","blob":"' + 'x'.repeat(MB24) + '"}';

/* an env whose room is a real GameRoom, counting what reaches it */
async function roomEnv(extra = {}) {
  const room = await openRoom(makeStorage());
  const seen = { n: 0, bodies: [] };
  const stub = { fetch: async (req) => { seen.n++; return room.fetch(req); } };
  const env = {
    GAME_ROOM: { idFromName: () => 'brotown-1', get: () => stub },
    LEADERBOARD: { idFromName: () => 'g', get: () => ({ fetch: async () => { seen.n++; return new Response('{"ok":true}'); } }) },
    FEEDBACK: { idFromName: () => 'f', get: () => ({ fetch: async (req) => { seen.n++; seen.bodies.push(await req.text()); return new Response('{"ok":true}'); } }) },
    ...extra,
  };
  return { room, env, seen };
}
const quiet = async (f) => { const w = console.warn; console.warn = () => {}; try { return await f(); } finally { console.warn = w; } };

/* ── 1. the outer router: a declared 24 MB is a 413, unread, unforwarded ── */
{
  const { env, seen } = await roomEnv();
  const text = bigText();
  const t0 = performance.now();
  const res = await quiet(() => worker.fetch(new Request('https://api.brotown.net/api/market/place', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(text)) }, body: text,
  }), env));
  const ms = performance.now() - t0;
  check('1. a 24 MB unkeyed POST that declares its length is a 413', res.status === 413, res.status);
  check('1. ...and never reaches the room (no forward)', seen.n === 0, seen.n);
  let j = null; try { j = await res.json(); } catch (e) { j = null; }
  check('1. ...answered as JSON with CORS, like every route', j && j.ok === false && res.headers.get('Access-Control-Allow-Origin') === '*', j);
  console.log('     (the outer refusal took ' + ms.toFixed(1) + ' ms)');
}

/* ── 2. the outer router: 24 MB with no length, read through the cap ── */
{
  const { env, seen } = await roomEnv();
  const { stream, meter } = bigStream();
  const res = await quiet(() => worker.fetch(new Request('https://api.brotown.net/api/market/place', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  }), env));
  check('2. a 24 MB body with no length is a 413', res.status === 413, res.status);
  check('2. ...the room never asked', seen.n === 0, seen.n);
  check('2. ...and at most the cap and a chunk pulled (' + PULL_MAX + ' bytes)', meter.pulled <= PULL_MAX, meter.pulled);
}

/* ── 3. the room's own door: the same stream sent to the room ── */
{
  const room = await openRoom(makeStorage());
  const { stream, meter } = bigStream();
  const t0 = performance.now();
  const res = await quiet(() => room.fetch(new Request('https://room/api/market/place', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half',
  })));
  const ms = performance.now() - t0;
  check('3. the room\'s door: a 24 MB body with no length is a 413', res.status === 413, res.status);
  check('3. ...at most the cap and a chunk pulled (' + PULL_MAX + ' bytes)', meter.pulled <= PULL_MAX, meter.pulled);
  const counts = room._wireDoorCounts || {};
  check('3. ...counted under its row and `size`', counts['http:/api/market/place size'] === 1, counts);
  const t1 = performance.now();
  const next = await room.fetch(new Request('https://room/api/market/orders?category=wood'));
  const ms2 = performance.now() - t1;
  check('3. the room answers its next request (the thread free)', next.status === 200, next.status);
  console.log('     (the room\'s refusal took ' + ms.toFixed(1) + ' ms; its next read ' + ms2.toFixed(1) + ' ms)');
  /* a declared length past the cap: refused unread, the stream never pulled */
  const big2 = bigStream();
  const res2 = await quiet(() => room.fetch(new Request('https://room/api/store/list', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(MB24) }, body: big2.stream, duplex: 'half',
  })));
  check('3. a declared length past the cap is refused before a byte is read', res2.status === 413 && big2.meter.pulled <= CHUNK, { status: res2.status, pulled: big2.meter.pulled });
}

/* ── 4. every honest body goes on as before ── */
{
  const { env, seen } = await roomEnv();
  /* a small POST with no length (a test's Request; a chunked upload): the same bytes go on */
  const body = JSON.stringify({ playerId: 'bp_fb', playerName: 'Bro', category: 'bug', topic: 'other', text: 'é'.repeat(500) });
  const r1 = await worker.fetch(new Request('https://api.brotown.net/api/feedback/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }), env);
  check('4. a feedback post (500 characters, no length) goes on as the same bytes', r1.status === 200 && seen.bodies[0] === body, { status: r1.status, same: seen.bodies[0] === body });
  /* with its length: forwarded untouched */
  const r2 = await worker.fetch(new Request('https://api.brotown.net/api/feedback/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) }, body }), env);
  check('4. ...and with its length, forwarded untouched', r2.status === 200 && seen.bodies[1] === body, r2.status);
  /* a crash report past 32 KB, under its own 64 KB cap */
  const crash = JSON.stringify({ sid: 's1', v: 'v2.3.5720', log: Array.from({ length: 16 }, (_, i) => ({ t: '2026-11-17T00:00:00.000Z', kind: 'error', msg: '\u0001'.repeat(500) + i })) });
  check('4. (the worst crash report is past 32 KB and under 64 KB)', crash.length > BODY_CAP.BYTES && crash.length < bodyCapFor('/api/feedback/crash'), crash.length);
  const r3 = await worker.fetch(new Request('https://api.brotown.net/api/feedback/crash', { method: 'POST', headers: { 'Content-Length': String(Buffer.byteLength(crash)) }, body: crash }), env);
  check('4. a crash report past 32 KB passes on its own cap', r3.status === 200 && seen.bodies[2] === crash, r3.status);
  const over = 'x'.repeat(bodyCapFor('/api/feedback/crash') + 1);
  const r4 = await quiet(() => worker.fetch(new Request('https://api.brotown.net/api/feedback/crash', { method: 'POST', headers: { 'Content-Length': String(over.length) }, body: over }), env));
  check('4. ...and past its own cap is a 413', r4.status === 413, r4.status);
  /* a GET is never read; the leaderboard's POST is still 405 */
  const before = seen.n;
  const r5 = await worker.fetch(new Request('https://api.brotown.net/api/market/orders?category=wood'), env);
  check('4. a GET goes on as before', r5.status === 200 && seen.n === before + 1, r5.status);
  const r6 = await worker.fetch(new Request('https://x/api/leaderboard/update', { method: 'POST', body: '{"playerId":"bp_forged","level":999}' }), env);
  check('4. the leaderboard\'s POST is still 405 (read-only)', r6.status === 405, r6.status);
  /* a market order with no key reaches its route as on main (its own refusal, not the cap's) */
  const order = JSON.stringify({ playerId: 'bp_nokey', side: 'sell', category: 'wood', subtype: 'oak', tier: 1, qty: 1, price: 5, reqId: 'r1' });
  const r7 = await worker.fetch(new Request('https://api.brotown.net/api/market/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: order }), env);
  check('4. a market order reaches its route (its own answer, never 413)', r7.status !== 413 && r7.status < 500, r7.status);
}

/* ── 5. the switches ── */
{
  const body = '{"playerId":"bp_nokey","blob":"' + 'x'.repeat(40 * 1024) + '"}';
  const room = await openRoom(makeStorage(), { bodycap: false });
  const r1 = await quiet(() => room.fetch(new Request('https://room/api/market/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })));
  check('5. `bodycap: false`: the room reads a 40 KB body whole, as before (no 413)', r1.status !== 413, r1.status);
  const on = await openRoom(makeStorage());
  const r2 = await quiet(() => on.fetch(new Request('https://room/api/market/place', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })));
  check('5. `bodycap` on: the same body is a 413', r2.status === 413, r2.status);
  const { env, seen } = await roomEnv({ BODY_CAP: 'off' });
  const r3 = await quiet(() => worker.fetch(new Request('https://api.brotown.net/api/feedback/submit', { method: 'POST', headers: { 'Content-Length': String(body.length) }, body }), env));
  check('5. `BODY_CAP = "off"`: the outer router forwards a 40 KB body, as before', r3.status === 200 && seen.n === 1, { status: r3.status, n: seen.n });
}

/* ── 6. the reader (for the Feedback object: card SEC) ── */
{
  const exact = 'a'.repeat(1000) + 'é';
  const r1 = await readBodyCapped(new Request('https://x/', { method: 'POST', body: exact }), 2000);
  check('6. readBodyCapped: the exact text under the cap', r1.ok && r1.text === exact && r1.bytes === Buffer.byteLength(exact), r1.bytes);
  const r2 = await readBodyCapped(new Request('https://x/', { method: 'POST', body: exact }), 1000);
  check('6. ...refused one byte past it', r2.ok === false, r2);
  const r3 = await readBodyCapped(new Request('https://x/'));
  check('6. ...a request with no body is an empty one', r3.ok && r3.text === '' && r3.bytes === 0, r3);
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
