/* ═══ v2.3.3312: ONLY THE GAME'S OWN SITE MAY OPEN A GAME SOCKET (server/src/origin.js) ═══
 *
 * The owner: "I only use Brotown.net for this game and that's the only domain
 * I plan to keep using."  A copy of the game on another site must not play in
 * our world.  A browser names the page that opens a socket (Origin) and no
 * page can change it.  Checked here:
 *
 *   1. who is let in: brotown.net and every address under it, the Pages
 *      project and its previews, a machine's own pages, and a request with no
 *      Origin (a program: the load test, the bot lab) -- and who is not: any
 *      other site, look-alikes, `null`, other schemes, public addresses;
 *   2. ORIGINS adds sites (with every address under them, never their
 *      parents), ORIGIN_LOCK "off" lets everyone in, anything else is on;
 *   3. the refusal: a socket that says why (join_rejected 'origin', home) and
 *      closes 4015, a 403 for a plain request, a 403 when no socket can be
 *      made; each refused site written to the log once;
 *   4. through the worker: a refused page never reaches a room, an allowed one
 *      and a program do, the lever lets everyone through, and the HTTP routes
 *      are not part of it;
 *   5. the page and the worker agree: the reason, the close code (one no other
 *      refusal uses) and the home address.
 */
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { ORIGIN_LOCK, originAllowed, originSites, originLockOn, localHost, refuseOrigin } from '../src/origin.js';
import { FLOOD } from '../src/flood.js';
import { VERIFY } from '../src/verify.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the log, caught */
const logs = [];
const nativeLog = console.log;
const catchLog = (fn) => { console.log = (...a) => { const s = a.join(' '); if (s.startsWith('[bt] origin')) logs.push(s); else nativeLog(...a); }; try { return fn(); } finally { console.log = nativeLog; } };

/* ═══ 1. who is let in ═══ */
{
  const env = { ORIGIN_LOCK: 'on', ORIGINS: '' };
  const allowed = {
    site: ['https://brotown.net', 'https://www.brotown.net', 'https://api.brotown.net', 'https://brotown.net:8443',
      'https://BroTown.NET', 'https://brotown.net.', 'http://brotown.net',
      'https://gamedev-aix.pages.dev', 'https://4f2fc630.gamedev-aix.pages.dev', 'https://claude-origin-lock.gamedev-aix.pages.dev'],
    local: ['http://localhost:4173', 'http://localhost', 'http://127.0.0.1:5173', 'http://[::1]:4173', 'http://0.0.0.0:8080',
      'http://app.localhost:3000', 'http://127.0.0.2:4173', 'http://192.168.1.20:5173', 'http://10.0.0.5', 'http://172.16.0.1:5173',
      'http://172.31.255.254', 'https://localhost:4173'],
  };
  for (const [why, list] of Object.entries(allowed)) {
    const got = list.map((o) => [o, originAllowed(o, env)]).filter(([, r]) => !(r.ok && r.why === why));
    check(`1. let in as '${why}': ${list.length} addresses`, got.length === 0, got);
  }
  const none = [null, undefined, ''].map((o) => originAllowed(o, env));
  check("1. no Origin is a program (the load test, the bot lab, curl): let in as 'none'", none.every((r) => r.ok && r.why === 'none'), none);

  const refused = {
    elsewhere: ['https://evilbrotown.net', 'https://brotown.net.evil.com', 'https://brotown.network', 'https://notbrotown.net',
      'https://brotown.com', 'https://clone.pages.dev', 'https://gamedev-aix-clone.pages.dev', 'https://xgamedev-aix.pages.dev',
      'https://gamedev-aix.pages.dev.evil.com', 'https://pages.dev', 'https://brotown-server.hemibroscommunity.workers.dev',
      'https://brotown.net@evil.com', 'https://br\u043etown.net' /* a Cyrillic o */, 'http://localhost.evil.com', 'https://127.0.0.1.evil.com',
      'https://8.8.8.8', 'http://172.32.0.1', 'http://172.15.0.1', 'http://192.169.1.1', 'http://11.0.0.1', 'https://brotown-net.translate.goog'],
    unreadable: ['null', 'not an address', 'brotown.net'],
    scheme: ['file:///home/me/game/index.html', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop', 'capacitor://localhost', 'ftp://brotown.net'],
  };
  for (const [why, list] of Object.entries(refused)) {
    const got = list.map((o) => [o, originAllowed(o, env)]).filter(([, r]) => !(!r.ok && r.why === why));
    check(`1. refused as '${why}': ${list.length} addresses`, got.length === 0, got);
  }
  check('1. localHost: the loopback and private ranges only, by number',
    localHost('127.255.0.1') && localHost('10.200.3.4') && localHost('192.168.0.1') && localHost('172.20.1.1') && localHost('a.b.localhost')
    && !localHost('172.32.1.1') && !localHost('100.64.0.1') && !localHost('169.254.1.1') && !localHost('example.com') && !localHost('') && !localHost(null));
}

/* ═══ 2. the levers ═══ */
{
  const env = { ORIGIN_LOCK: 'on', ORIGINS: ' Brotown.com , https://play.example.org/game?x=1 ,, example.net:8443 ' };
  check('2. ORIGINS read as plain sites: the scheme, path, port and case dropped',
    JSON.stringify(originSites(env)) === JSON.stringify(['brotown.net', 'gamedev-aix.pages.dev', 'brotown.com', 'play.example.org', 'example.net']), originSites(env));
  const yes = ['https://brotown.com', 'https://www.brotown.com', 'https://play.example.org', 'https://a.play.example.org', 'https://example.net'];
  const no = ['https://example.org', 'https://evilbrotown.com', 'https://brotown.com.evil.io', 'https://otherexample.net'];
  check('2. a listed site is let in with every address under it', yes.every((o) => originAllowed(o, env).ok), yes.map((o) => [o, originAllowed(o, env)]));
  check('2. ...and never its parent or a look-alike', no.every((o) => !originAllowed(o, env).ok), no.map((o) => [o, originAllowed(o, env)]));
  check('2. the game\'s own sites stay in whatever ORIGINS says', originAllowed('https://brotown.net', { ORIGINS: 'x.com' }).ok && originAllowed('https://a.gamedev-aix.pages.dev', { ORIGINS: '' }).ok);
  const off = ['off', 'OFF', ' Off '].map((v) => originAllowed('https://evil.example', { ORIGIN_LOCK: v }));
  check('2. ORIGIN_LOCK "off" (any case, spaced) lets every site in', off.every((r) => r.ok && r.why === 'off'), off);
  check('2. "on", empty, absent, or anything else is ON: the lock fails closed',
    ['on', '', undefined, 'yes', 'false', '0'].every((v) => originLockOn({ ORIGIN_LOCK: v })) && originLockOn({}) && originLockOn(null)
    && !originAllowed('https://evil.example', {}).ok && !originAllowed('https://evil.example', null).ok);
}

/* ═══ 3. the refusal ═══ */
function fakeWs(label, order) {
  return {
    label, sent: [], closed: null, accepted: false,
    accept() { this.accepted = true; order.push(label + '.accept'); },
    send(s) { this.sent.push(JSON.parse(s)); order.push(label + '.send'); },
    close(code, reason) { this.closed = { code, reason }; order.push(label + '.close'); },
  };
}
class FakeResponse {
  constructor(body, init) {
    this.body = body;
    this.status = (init && init.status) || 200;
    this.webSocket = (init && init.webSocket) || null;
    this.headers = (init && init.headers) || {};
  }
}
const req = (path, origin, upgrade = true) => ({
  url: 'https://api.brotown.net' + path, method: 'GET',
  headers: { get: (k) => (k === 'Upgrade' ? (upgrade ? 'websocket' : null) : k === 'Origin' ? (origin === undefined ? null : origin) : null) },
});
{
  const order = [];
  let pair = null;
  const Pair = function () { pair = { 0: fakeWs('client', order), 1: fakeWs('server', order) }; return pair; };
  const r = catchLog(() => refuseOrigin(req('/ws', 'https://clone.example'), 'https://clone.example', 'elsewhere', { WebSocketPair: Pair, Response: FakeResponse }));
  const srv = pair && pair[1];
  check('3. a socket request is answered with a socket: 101, the client half handed back', r.status === 101 && r.webSocket === pair[0], { status: r.status });
  check('3. ...which says why: join_rejected, reason origin, home https://brotown.net',
    srv.sent.length === 1 && srv.sent[0].type === 'join_rejected' && srv.sent[0].reason === 'origin' && srv.sent[0].home === 'https://brotown.net', srv.sent);
  check('3. ...and closes with 4015, in that order (accept, say, close)',
    srv.closed && srv.closed.code === ORIGIN_LOCK.CLOSE && ORIGIN_LOCK.CLOSE === 4015 && order.join() === 'server.accept,server.send,server.close', { closed: srv.closed, order });
  check('3. the refused site is written to the log', logs.length === 1 && logs[0].includes('https://clone.example') && logs[0].includes('elsewhere'), logs);

  const plain = catchLog(() => refuseOrigin(req('/ws', 'https://clone.example', false), 'https://clone.example', 'elsewhere', { WebSocketPair: Pair, Response: FakeResponse }));
  const body = JSON.parse(plain.body);
  check('3. a plain request (no upgrade) gets a 403 that names the real site', plain.status === 403 && body.ok === false && body.home === 'https://brotown.net' && /official/.test(body.error), body);
  check('3. ...and the same site is not logged twice', logs.length === 1, logs);
  const noPair = catchLog(() => refuseOrigin(req('/ws', 'null'), 'null', 'unreadable', { WebSocketPair: null, Response: FakeResponse }));
  const throws = catchLog(() => refuseOrigin(req('/ws', 'https://b.example'), 'https://b.example', 'elsewhere', { WebSocketPair: function () { throw new Error('no'); }, Response: FakeResponse }));
  check('3. no socket can be made: a 403 instead, never a throw', noPair.status === 403 && throws.status === 403);
  check('3. a second refused site is logged too', logs.length === 3 && logs[1].includes('null') && logs[2].includes('b.example'), logs);
  catchLog(() => { for (let i = 0; i < 200; i++) refuseOrigin(req('/ws', 'https://c' + i + '.example'), 'https://c' + i + '.example', 'elsewhere', { WebSocketPair: null, Response: FakeResponse }); });
  check('3. the log keeps at most LOG_MAX sites (a flood of names cannot fill it)', logs.length === ORIGIN_LOCK.LOG_MAX, logs.length);
}

/* ═══ 4. through the worker ═══ */
{
  const order = [];
  let pair = null;
  const savedPair = globalThis.WebSocketPair, savedResp = globalThis.Response;
  globalThis.WebSocketPair = function () { pair = { 0: fakeWs('client', order), 1: fakeWs('server', order) }; return pair; };
  globalThis.Response = FakeResponse;
  try {
    const got = [];
    const room = { idFromName: (n) => 'id:' + n, get: (id) => ({ fetch: async () => { got.push(id); return new FakeResponse('room', { status: 101 }); } }) };
    const env = { GAME_ROOM: room, ORIGIN_LOCK: 'on', ORIGINS: '', ROOMS: 'brotown-1' };
    const quiet = (p) => { const l = console.log; console.log = () => {}; return p.finally(() => { console.log = l; }); };

    const r1 = await quiet(worker.fetch(req('/ws', 'https://clone.example'), env));
    check('4. a page on another site never reaches a room: 101 from the worker, the room untouched',
      r1.status === 101 && got.length === 0 && pair && pair[1].closed && pair[1].closed.code === 4015, { status: r1.status, got });
    const r1b = await quiet(worker.fetch(req('/ws?room=brotown-1', 'null'), env));
    check('4. ...nor a page with Origin null, by the main room\'s name', r1b.status === 101 && got.length === 0);

    await worker.fetch(req('/ws', 'https://brotown.net'), env);
    await worker.fetch(req('/ws', 'https://4f2fc630.gamedev-aix.pages.dev'), env);
    await worker.fetch(req('/ws', 'http://localhost:4173'), env);
    await worker.fetch(req('/ws', undefined), env);
    check('4. the game\'s site, a preview, a local page and a program each reach the room', got.length === 4 && got.every((g) => g === 'id:brotown-1'), got);

    got.length = 0;
    const r2 = await worker.fetch(req('/ws', 'https://clone.example'), { ...env, ORIGIN_LOCK: 'off' });
    check('4. ORIGIN_LOCK "off": the same page reaches the room', got.length === 1 && r2.body === 'room', { got, status: r2.status });

    got.length = 0;
    const r3 = await worker.fetch(req('/ws?room=evil', 'https://brotown.net'), env);
    check('4. the room rule still comes first: an unknown room is a 404 for anyone', r3.status === 404 && got.length === 0, r3.status);

    const lobby = await worker.fetch(req('/api/lobby', 'https://clone.example', false), env);
    check('4. the HTTP routes are not part of it (the lobby still answers a foreign page)', lobby.status === 200 && JSON.parse(lobby.body).room === 'brotown-1', lobby.status);
  } finally {
    globalThis.WebSocketPair = savedPair;
    globalThis.Response = savedResp;
  }
}

/* ═══ 5. the page and the worker agree ═══ */
{
  const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  const screen = readFileSync(new URL('../../src/ui/OriginScreen.js', import.meta.url), 'utf8');
  check("5. the page reads the worker's reason", ws.includes("_rejReason === '" + ORIGIN_LOCK.REASON + "'"));
  check("5. the page reads the worker's close code, and stops there (no reconnect on it)",
    new RegExp('event\\.code === ' + ORIGIN_LOCK.CLOSE + '\\)\\) \\{[\\s\\S]{0,240}?showOriginScreen\\([\\s\\S]{0,40}?return;').test(ws));
  check('5. ...and that stop comes before the ordinary reconnect', ws.indexOf('event.code === ' + ORIGIN_LOCK.CLOSE) > 0
    && ws.indexOf('event.code === ' + ORIGIN_LOCK.CLOSE) < ws.indexOf("resetServerReady('lost');\n        S._netHold = true;\n        scheduleReconnect();"));
  check("5. the screen's own home is the worker's", screen.includes("const HOME = '" + ORIGIN_LOCK.HOME + "';"));
  const others = [4003, 4004, 4005, 4006, 4009, 4010, FLOOD.CLOSE_JOIN, FLOOD.CLOSE_FLOOD, VERIFY.CLOSE_CODE];
  check('5. 4015 is no other refusal\'s code', !others.includes(ORIGIN_LOCK.CLOSE), others);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
