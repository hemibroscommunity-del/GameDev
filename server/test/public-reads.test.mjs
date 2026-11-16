/* ═══ v2.3.5609: THE ROOM'S PUBLIC READS, KEPT AND PACED (server/src/publicreads.js; card OPS PR 10) ═══
 *
 * Red team RT-1 N8: the market's orders, the store's browse and the arena's
 * status are public reads that woke the room's one thread and walked a whole
 * book each time.  This holds:
 *
 *   1. an answer is kept 3 s: the second read inside it never reaches the
 *      surface; past it, read again; each query its own;
 *   2. a write on the surface (anything but a GET) drops what was kept for
 *      it, so the player who acted reads it at once; a read begun before
 *      the write is not kept after it; another surface's kept answers stay;
 *   3. only the three reads are kept (`/api/market/my`, `/history`, the
 *      store's `/mine` walk every time); an answer that is not a 200 is
 *      never kept;
 *   4. the pace: past 10 reads a second that wake the room from one
 *      address, 429 with Retry-After: 1; a kept answer is never refused;
 *      another address, or the next second, goes on; no address (local,
 *      loopback) is never paced;
 *   5. RT-1's flood: 400 reads of one answer wake the room once; 400 reads
 *      each with its own query wake it at most 10 times in their second;
 *   6. `publicreads: false`: every read reaches the surface, nothing is
 *      refused;
 *   7. at most 256 answers kept, the oldest out;
 *   8. index.js sends the three surfaces through it.
 */
import { readFileSync } from 'node:fs';
import { publicReadMethods, PUBLIC_READS, surfaceOf } from '../src/publicreads.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

let NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
const realNow = Date.now;
Date.now = () => NOW;

function room(flags) {
  const r = Object.assign(Object.create(null), publicReadMethods);
  r._liveFlags = flags || {};
  return r;
}
let served = 0;
const serveOk = (body) => async () => { served++; return new Response(JSON.stringify(body || { ok: true, n: served }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
const req = (path, ip, method) => {
  const headers = ip ? { 'CF-Connecting-IP': ip } : {};
  const r = new Request('https://room' + path, { method: method || 'GET', headers });
  return { r, url: new URL(r.url) };
};
async function read(R, path, ip, serve) {
  const { r, url } = req(path, ip);
  const res = await R._publicReadDo(r, url, serve || serveOk());
  return { status: res.status, body: await res.text(), retry: res.headers.get('Retry-After') };
}

/* ── 1. kept ── */
{
  const R = room(); served = 0;
  const a = await read(R, '/api/market/orders?category=weapon', '1.2.3.4');
  const b = await read(R, '/api/market/orders?category=weapon', '1.2.3.4');
  check('1. the second read inside 3 s never reaches the surface, and is the same answer', served === 1 && a.body === b.body && b.status === 200, { served });
  await read(R, '/api/market/orders?category=armor', '1.2.3.4');
  check('1. each query its own', served === 2);
  NOW += PUBLIC_READS.KEEP_MS;
  await read(R, '/api/market/orders?category=weapon', '1.2.3.4');
  check('1. past 3 s, read again', served === 3, served);
  await read(R, '/api/store/browse?cat=all', '1.2.3.4'); await read(R, '/api/store/browse?cat=all', '1.2.3.4');
  await read(R, '/api/arena/status?playerId=bp_a', '1.2.3.4'); await read(R, '/api/arena/status?playerId=bp_a', '1.2.3.4');
  check('1. the store\'s browse and the arena\'s status kept the same', served === 5, served);
}

/* ── 2. a write drops it ── */
{
  const R = room(); served = 0;
  await read(R, '/api/market/orders', '1.2.3.4');
  await read(R, '/api/arena/status', '1.2.3.4');
  const { r, url } = req('/api/market/place', '1.2.3.4', 'POST');
  let wrote = 0;
  await R._publicReadDo(r, url, async () => { wrote++; return new Response('{"ok":true,"settled":true}', { status: 200 }); });
  await read(R, '/api/market/orders', '1.2.3.4');
  check('2. a write on the surface drops what was kept: the next read reaches it', wrote === 1 && served === 3, { wrote, served });
  await read(R, '/api/arena/status', '1.2.3.4');
  check('2. ...another surface\'s kept answer stays', served === 3, served);
  /* a read begun before a write, finishing after it */
  NOW += PUBLIC_READS.KEEP_MS;
  let release;
  const slow = async () => { served++; await new Promise((res) => { release = res; }); return new Response('{"ok":true,"old":1}', { status: 200 }); };
  const { r: r2, url: u2 } = req('/api/market/orders', '1.2.3.4');
  const pending = R._publicReadDo(r2, u2, slow);
  await new Promise((res) => setTimeout(res, 0));
  const { r: w, url: wu } = req('/api/market/buy', '1.2.3.4', 'POST');
  await R._publicReadDo(w, wu, async () => new Response('{"ok":true}', { status: 200 }));
  release();
  await pending;
  const before = served;
  await read(R, '/api/market/orders', '1.2.3.4');
  check('2. a read begun before a write is not kept after it', served === before + 1, { before, served });
}

/* ── 3. only the three, and only a 200 ── */
{
  const R = room(); served = 0;
  for (const p of ['/api/market/my?playerId=bp_a', '/api/market/history?category=weapon', '/api/store/mine?playerId=bp_a', '/api/arena/tournament']) {
    await read(R, p, '1.2.3.4'); await read(R, p, '1.2.3.4');
  }
  check('3. the other reads (my, history, mine, tournament) walk every time', served === 8, served);
  served = 0;
  const bad = async () => { served++; return new Response('{"ok":false}', { status: 500 }); };
  await read(R, '/api/market/orders?x=1', '1.2.3.4', bad); await read(R, '/api/market/orders?x=1', '1.2.3.4', bad);
  check('3. an answer that is not a 200 is never kept', served === 2, served);
  check('3. the surfaces', surfaceOf('/api/market/orders') === '/api/market' && surfaceOf('/api/storefront') === null && surfaceOf('/api/arena') === '/api/arena');
}

/* ── 4. the pace ── */
{
  const R = room(); served = 0;
  NOW = Math.ceil(NOW / 1000) * 1000 + 10;
  const res = [];
  for (let i = 0; i < 11; i++) res.push(await read(R, '/api/store/browse?cursor=' + i, '9.9.9.9'));
  check('4. past 10 reads a second that wake the room, 429 with Retry-After: 1', res.slice(0, 10).every((x) => x.status === 200) && res[10].status === 429 && res[10].retry === '1' && served === 10, res.map((x) => x.status));
  const keptAgain = await read(R, '/api/store/browse?cursor=3', '9.9.9.9');
  check('4. a kept answer is never refused', keptAgain.status === 200 && served === 10);
  const other = await read(R, '/api/store/browse?cursor=99', '8.8.8.8');
  check('4. another address goes on', other.status === 200);
  NOW += 1000;
  const next = await read(R, '/api/store/browse?cursor=50', '9.9.9.9');
  check('4. the next second goes on', next.status === 200);
  served = 0;
  const local = [];
  for (let i = 0; i < 30; i++) local.push((await read(R, '/api/store/browse?l=' + i, null)).status);
  for (let i = 0; i < 30; i++) local.push((await read(R, '/api/store/browse?k=' + i, '127.0.0.1')).status);
  check('4. no address (local) and loopback are never paced', local.every((s) => s === 200) && served === 60, served);
}

/* ── 5. RT-1's flood ── */
{
  const R = room(); served = 0;
  NOW = Math.ceil(NOW / 1000) * 1000 + 10;
  for (let i = 0; i < 400; i++) await read(R, '/api/market/orders?category=weapon', '6.6.6.6');
  check('5. 400 reads of one answer wake the room once', served === 1, served);
  served = 0;
  let refused = 0;
  for (let i = 0; i < 400; i++) if ((await read(R, '/api/market/orders?bust=' + i, '6.6.6.6')).status === 429) refused++;
  check('5. 400 reads each with its own query wake it at most 10 times in their second', served <= PUBLIC_READS.PER_S && refused >= 390, { served, refused });
}

/* ── 6. the switch ── */
{
  const R = room({ publicreads: false }); served = 0;
  NOW = Math.ceil(NOW / 1000) * 1000 + 10;
  const st = [];
  for (let i = 0; i < 20; i++) st.push((await read(R, '/api/market/orders', '5.5.5.5')).status);
  check('6. publicreads: false -- every read reaches the surface, nothing refused', served === 20 && st.every((s) => s === 200), { served });
  const R2 = room({ publicreads: true }); served = 0;
  await read(R2, '/api/market/orders', '5.5.5.5'); await read(R2, '/api/market/orders', '5.5.5.5');
  check('6. unset or true is on', served === 1);
}

/* ── 7. the cap ── */
{
  const R = room(); served = 0;
  for (let i = 0; i < 300; i++) await read(R, '/api/arena/status?playerId=bp_' + i, null);
  check('7. at most 256 answers kept, the oldest out', R._pr.kept.size === PUBLIC_READS.MAX_KEPT && !R._pr.kept.has('/api/arena/status?playerId=bp_0') && R._pr.kept.has('/api/arena/status?playerId=bp_299'), R._pr.kept.size);
}

/* ── 7b. /health/room (v2.3.5609, sitting 19b's gatekeeper) ── */
{
  const R = room(); served = 0;
  NOW = Math.ceil(NOW / 1000) * 1000 + 10;
  await read(R, '/_room_health', '4.4.4.4'); await read(R, '/_room_health', '4.4.4.4');
  check('7b. the room\'s health (its public up-or-down) is kept like the rest', served === 1, served);
  const keyed = async () => {
    const r = new Request('https://room/_room_health', { headers: { 'CF-Connecting-IP': '4.4.4.4', Authorization: 'Bearer k' } });
    const res = await R._publicReadDo(r, new URL(r.url), serveOk({ ok: true, players: 3 }));
    return res.json();
  };
  const k1 = await keyed(); const k2 = await keyed();
  check('7b. ...a request with a key passes through: never kept, never the kept public answer', served === 3 && k1.players === 3 && k2.players === 3, { served, k1 });
  served = 0;
  const st = [];
  for (let i = 0; i < 12; i++) st.push((await read(R, '/_room_health?x=' + i, '4.4.4.5')).status);
  check('7b. ...and paced by address', st.slice(0, 10).every((x) => x === 200) && st[10] === 429, st);
}

/* ── 8. the room ── */
{
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const ok = ['_marketFetch', '_storeFetch', '_arenaFetch'].every((f) => new RegExp('return this\\._publicReadDo\\(request, url, \\(\\) => this\\.' + f + '\\(request\\)\\);').test(src));
  check('8. index.js sends the three surfaces through it', ok && /Object\.assign\(GameRoom\.prototype, publicReadMethods\)/.test(src));
  check('8. ...and the room\'s health', /return this\._publicReadDo\(request, url, \(\) => this\._roomHealthFetch\(request\)\);/.test(src));
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
