/* ═══ v2.3.5707: THE PUBLIC READS' PACE HAS NO SIDE DOOR (card SEC PR 8) ═══
 * (server/src/publicreads.js "NO SIDE DOOR"; docs/specs/public-reads.md)
 *
 *   1. A request with a junk `Authorization` header is paced as one without:
 *      past PER_S in a second, 429 (it skipped both the kept answer and the
 *      pace), and it is served the kept answer as one without is.
 *   2. The surfaces' other reads -- /api/market/my, /api/market/history,
 *      /api/store/mine, /api/arena/tournament -- are paced by address, and
 *      never kept (each is one player's own).
 *   3. A signed-in player's own reads are still answered: a phone's honest
 *      reads (a few a second at most) all 200, each its own answer.
 *   4. The room's health with the owner's key still passes through (its own
 *      lockout, health.js), never kept, never paced here.
 *   5. `publicreads: false`: everything as before (nothing kept or paced).
 *
 * BREAK PROOF (rule 8), tried by hand: main's publicreads.js -> FAIL 1, 2.
 * Not a phone test: node, the methods on a bare object (public-reads.test's way). */
import { publicReadMethods, PUBLIC_READS } from '../src/publicreads.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
let NOW = Date.UTC(2026, 10, 17, 12, 0, 0, 10);
Date.now = () => NOW;
const room = (flags) => Object.assign(Object.create(null), publicReadMethods, { _liveFlags: flags || {} });
let served = 0;
const serve = () => async () => { served++; return new Response(JSON.stringify({ ok: true, n: served }), { status: 200 }); };
async function get(R, path, ip, auth) {
  const headers = {};
  if (ip) headers['CF-Connecting-IP'] = ip;
  if (auth) headers.Authorization = auth;
  const r = new Request('https://room' + path, { headers });
  const res = await R._publicReadDo(r, new URL(r.url), serve());
  return { status: res.status, body: await res.text() };
}
const nextSecond = () => { NOW = Math.ceil(NOW / 1000) * 1000 + 10; };

/* 1. the junk header */
{
  const R = room(); served = 0; nextSecond();
  const st = [];
  for (let i = 0; i < PUBLIC_READS.PER_S + 5; i++) st.push((await get(R, '/api/market/orders?q=' + i, '9.9.9.9', 'x')).status);
  check('1. a junk header is paced as one without: ' + PUBLIC_READS.PER_S + ' a second, then 429', st.slice(0, PUBLIC_READS.PER_S).every((x) => x === 200) && st.slice(PUBLIC_READS.PER_S).every((x) => x === 429), st);
  nextSecond(); served = 0;
  await get(R, '/api/store/browse?cat=all', '9.9.9.8');
  const kept = await get(R, '/api/store/browse?cat=all', '9.9.9.8', 'Bearer anything');
  check('1. ...and is served the kept answer, never a walk of its own', served === 1 && kept.status === 200, served);
  nextSecond(); served = 0;
  const bearer = [];
  for (let i = 0; i < PUBLIC_READS.PER_S + 2; i++) bearer.push((await get(R, '/api/arena/status?playerId=p' + i, '9.9.9.7', 'Bearer ' + 'k'.repeat(40))).status);
  check('1. a header that looks like a key, on the arena, the same', bearer.filter((x) => x === 429).length === 2, bearer);
}

/* 2. the four other reads */
for (const path of ['/api/market/my?playerId=bp_a', '/api/market/history?category=weapon', '/api/store/mine?playerId=bp_a', '/api/arena/tournament']) {
  const R = room(); served = 0; nextSecond();
  const st = [];
  for (let i = 0; i < PUBLIC_READS.PER_S + 3; i++) st.push((await get(R, path, '7.7.7.7')).status);
  check('2. ' + path.split('?')[0] + ' is paced by address (' + PUBLIC_READS.PER_S + ' a second, then 429)', st.slice(0, PUBLIC_READS.PER_S).every((x) => x === 200) && st.slice(PUBLIC_READS.PER_S).every((x) => x === 429), st);
  check('2. ...and never kept (each read reached the surface)', served === PUBLIC_READS.PER_S, served);
}

/* 3. a player's own reads */
{
  const R = room(); served = 0; nextSecond();
  const a = await get(R, '/api/market/my?playerId=bp_me', '5.5.5.5', 'Bearer real-session');
  const b = await get(R, '/api/store/mine?playerId=bp_me', '5.5.5.5', 'Bearer real-session');
  const c = await get(R, '/api/market/my?playerId=bp_me', '5.5.5.5', 'Bearer real-session');
  check('3. a signed-in player\'s own reads are answered, each its own (never another\'s kept answer)', [a, b, c].every((x) => x.status === 200) && served === 3 && a.body !== c.body, { served });
}

/* 4. the health check's key */
{
  const R = room(); served = 0; nextSecond();
  const st = [];
  for (let i = 0; i < PUBLIC_READS.PER_S + 5; i++) st.push((await get(R, '/_room_health', '6.6.6.6', 'Bearer k')).status);
  check('4. the room\'s health with a key passes through: never kept, never paced here (its own lockout)', st.every((x) => x === 200) && served === PUBLIC_READS.PER_S + 5, { st, served });
}

/* 5. the switch */
{
  const R = room({ publicreads: false }); served = 0; nextSecond();
  const st = [];
  for (let i = 0; i < PUBLIC_READS.PER_S + 5; i++) st.push((await get(R, '/api/market/my?playerId=x', '8.8.8.8')).status);
  check('5. publicreads: false: nothing paced or kept, as before', st.every((x) => x === 200) && served === PUBLIC_READS.PER_S + 5, st);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
