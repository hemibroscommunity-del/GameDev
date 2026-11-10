/* ═══ v2.3.4367: THE PHONE'S GAME SOCKET, ONE LINE AT A TIME ═══
 *
 * The state-machine sweep (2026-11-03, V4 N1-2 / U3-20 / N1-4; plan reviews
 * R1-R3 item 16): opening, retrying and closing the phone's socket happened in
 * a dozen places, only some closed the old line first, and no handler asked
 * whether its line was still the current one.  "Try now" on the "BroTown is
 * full" screen during the automatic try's handshake left a stray line that
 * later knocked the live one off.  And a drop just as the loading screen
 * lifted left a frozen world with no words.
 *   1. retireSocket (src/game/socketLine.js): handlers off, then closed;
 *   2. wsClient's REAL connect() and scheduleReconnect, cut from the file and
 *      run here with stubs: a second connect retires the first line, and the
 *      first line's handlers, even if something still held them, do nothing;
 *   3. the wiring: state_sync writes 'connected', the effect's cleanup
 *      retires its socket, every handler asks `sock !== ws` first;
 *   4. the veil (the REAL src/networking/serverReady.js, its one import
 *      stubbed): a drop under the loading screen veils the world once the
 *      screen lifts, and an ordinary login never shows it.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import * as L from '../../src/game/socketLine.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const retire = typeof L.retireSocket === 'function' ? L.retireSocket : null;

/* a WebSocket stand-in: records every line made, and what was done to it */
function makeWS() {
  const made = [];
  class FakeWS {
    constructor(url) { this.url = url; this.readyState = 0; this.closed = null; this.sent = []; made.push(this); }
    close(code, reason) { this.closed = { code, reason }; this.readyState = 2; }
    send(d) { this.sent.push(d); }
  }
  FakeWS.CONNECTING = 0; FakeWS.OPEN = 1; FakeWS.CLOSING = 2; FakeWS.CLOSED = 3;
  return { FakeWS, made };
}

/* ── 1. retireSocket ── */
check('1a retireSocket exported', !!retire, typeof L.retireSocket);
if (retire) {
  const { FakeWS } = makeWS();
  const a = new FakeWS('x'); a.onopen = a.onmessage = a.onclose = a.onerror = () => 1;
  retire(a, 1000, 'replaced');
  check('1b a CONNECTING line: all four handlers off, then closed',
    a.onopen === null && a.onmessage === null && a.onclose === null && a.onerror === null && !!a.closed, a.closed);
  const b = new FakeWS('x'); b.readyState = 3; b.onclose = () => 1;
  retire(b, 1000, 'replaced');
  check('1c a CLOSED line: handlers off, no second close', b.onclose === null && b.closed === null);
  check('1d nothing to retire: no throw, false', retire(null) === false && retire(undefined) === false);
  const c = { readyState: 1, close() { throw new Error('gone'); } };
  let threw = false; try { retire(c); } catch (e) { threw = true; }
  check('1e a close that throws does not escape', !threw);
}

/* ── 2. the real connect(), cut from wsClient.js ── */
const WSC = src('src/networking/wsClient.js');
function cut(startMark, endMark) {
  const i = WSC.indexOf(startMark);
  const j = WSC.indexOf(endMark, i + startMark.length);
  return i < 0 || j < 0 ? '' : WSC.slice(i, j);
}
const connectSrc = cut('    function connect() {', '    /* v2.3.1913: the "we stopped on purpose');
const schedSrc = cut('    function scheduleReconnect() {', '    /* v2.3.771: iPhone tab-resume recovery.');
check('2a connect() and scheduleReconnect found in wsClient.js', connectSrc.length > 1000 && schedSrc.length > 50,
  [connectSrc.length, schedSrc.length]);

function rig() {
  const { FakeWS, made } = makeWS();
  const timers = [];
  const S = { _realtimeStatus: 'connecting', _frozenByAdmin: false, _characterReset: false, _joinRejectedFatal: false };
  const banners = [];
  /* anything connect() touches that this test does not care about is a
     do-nothing stub that answers every call and every property */
  const stub = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : stub),
    apply: () => stub, construct: () => stub,
  });
  const base = {
    console, Math, Date, JSON, Object, Array, String, Number, Error, isFinite, Promise, performance,
    WebSocket: FakeWS, S,
    retireSocket: retire || function () {},
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    showResumeBanner: (t) => banners.push(t),
    resetServerReady: () => {},
  };
  const ctx = new Proxy(base, {
    has: () => true,
    get: (t, k) => (k in t ? t[k] : (k === Symbol.unscopables ? undefined : stub)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  vm.createContext(ctx);
  const api = vm.runInContext('(function () {\n'
    + 'var ws = null, reconnectTimer = null, reconnectDelay = 1000, _connectAt = 0;\n'
    /* the refusal holders, empty: an ordinary close (wsClient.js's own) */
    + 'var _rfPending = null, _vfPending = null, _ogPending = null, _dvPending = null, _kyPending = null, _lkPending = null, _lgPending = null;\n'
    + 'var WS_URL = "wss://test/ws?room=brotown-1&rf=1";\n'
    + schedSrc + '\n' + connectSrc + '\n'
    + 'return { connect: connect, ws: function () { return ws; } };\n})()', ctx);
  return { api, made, timers, S, banners };
}

if (connectSrc && schedSrc) {
  /* 2b-2e: the room-full screen's automatic try is connecting (line A) and
     the player taps Try now (line B) */
  const r = rig();
  r.api.connect();
  const A = r.made[0];
  const heldA = { onopen: A.onopen, onmessage: A.onmessage, onclose: A.onclose, onerror: A.onerror };
  r.api.connect();
  const B = r.made[1];
  check('2b Try now while the automatic try connects: the first line is closed', !!A.closed, A.closed);
  check('2c ...with its handlers off before the close', A.onclose === null && A.onmessage === null && A.onopen === null && A.onerror === null);
  check('2d ...and the second line is the current one', r.api.ws() === B && !!B && !B.closed);
  /* B gets in; then the stray's close comes, the worker having closed it
     'superseded by reconnect' (join.js) -- something still holding A's
     handler must not paint the banner over B's live world, nor re-arm */
  B.readyState = 1;
  r.S._realtimeStatus = 'connected';
  const before = r.timers.length;
  try { heldA.onclose && heldA.onclose({ code: 1000, reason: 'superseded by reconnect' }); } catch (e) { /* stubbed body */ }
  check('2e a replaced line\'s close: no "connected from another window" over the live line',
    r.S._realtimeStatus === 'connected' && r.banners.length === 0, { st: r.S._realtimeStatus, banners: r.banners });
  try { heldA.onclose && heldA.onclose({ code: 1006, reason: '' }); } catch (e) { /* stubbed body */ }
  check('2f ...nor a reconnect armed by an ordinary drop of the replaced line',
    r.timers.length === before && r.S._realtimeStatus === 'connected', { timers: r.timers.length - before, st: r.S._realtimeStatus });
  try { heldA.onerror && heldA.onerror(); } catch (e) { /* stubbed body */ }
  check('2g ...nor its error', r.S._realtimeStatus === 'connected', r.S._realtimeStatus);
  A.readyState = 1;
  let opened = false;
  try { heldA.onopen && heldA.onopen(); opened = A.sent.length > 0; } catch (e) { opened = 'threw'; }
  check('2h ...nor its open sends a join', opened === false && r.S._realtimeStatus === 'connected', opened);
  /* the current line's own ordinary close still comes back on its own */
  try { B.onclose && B.onclose({ code: 1006, reason: '' }); } catch (e) { /* stubbed body */ }
  check('2i the CURRENT line\'s drop still reconnects (unchanged)',
    r.S._realtimeStatus === 'disconnected' && r.timers.length === before + 1, { st: r.S._realtimeStatus, timers: r.timers.length - before });
  /* a tab return that finds the line CLOSING (V4: _resumeRecover connects
     without detaching it) */
  const r2 = rig();
  r2.api.connect();
  const C = r2.made[0]; C.readyState = 2; const heldC = C.onclose;
  r2.api.connect();
  r2.made[1].readyState = 1; r2.S._realtimeStatus = 'connected';
  const t2 = r2.timers.length;
  try { heldC && heldC({ code: 1006, reason: '' }); } catch (e) { /* stubbed body */ }
  check('2j a CLOSING line replaced at a tab return: its late close orphans nothing',
    C.onclose === null && r2.timers.length === t2 && r2.S._realtimeStatus === 'connected', { st: r2.S._realtimeStatus });
}

/* ── 3. the wiring ── */
const ssAt = WSC.indexOf("case 'state_sync':");
const ssBody = ssAt < 0 ? '' : WSC.slice(ssAt, WSC.indexOf("case '", ssAt + 20));
check('3a state_sync writes \'connected\' (a stray \'superseded\' heals at the next sync)',
  /S\._realtimeStatus\s*=\s*'connected'/.test(ssBody));
const cleanupAt = WSC.lastIndexOf('    return function () {');
const cleanup = cleanupAt < 0 ? '' : WSC.slice(cleanupAt, WSC.indexOf('\n    };', cleanupAt));
check('3b the effect\'s cleanup retires its socket (handlers off before the close)',
  /retireSocket\(/.test(cleanup) && !/\bws\.close\(/.test(cleanup), cleanup.slice(-300));
for (const h of ['onopen', 'onmessage', 'onclose', 'onerror']) {
  const at = connectSrc.indexOf('ws.' + h + ' = function');
  const head = at < 0 ? '' : connectSrc.slice(at, at + 200);
  check('3c ' + h + ' asks first whether its line is still the current one', /\{\s*if \(sock !== ws\) return;/.test(head), head.slice(0, 120));
}
check('3d connect() retires the line it replaces before making a new one',
  (() => { const r = connectSrc.indexOf('retireSocket('); const n = connectSrc.indexOf('new WebSocket('); return r > 0 && n > r; })());

/* ── 4. the veil, with the real serverReady.js ── */
const dir = mkdtempSync(join(tmpdir(), 'socket-one-'));
const stubPath = join(dir, 'common.mjs');
writeFileSync(stubPath, 'export const S = { _netHold: false };\nexport function getState() { return S; }\n');
const srSrc = src('src/networking/serverReady.js')
  .replace(/from '@\/ui\/mobile\/dash\/common\.js'/, 'from ' + JSON.stringify(pathToFileURL(stubPath).href));
check('4a serverReady.js\'s one import stubbed', srSrc.includes(pathToFileURL(stubPath).href));

/* a clock, and a page: the loading screen is `.bt-intro` */
let now = 0; let tq = []; let tid = 0;
globalThis.setTimeout = (fn, ms) => { const id = ++tid; tq.push({ id, at: now + (ms || 0), fn }); return id; };
globalThis.clearTimeout = (id) => { tq = tq.filter((t) => t.id !== id); };
const realNow = Date.now; Date.now = () => now;
function advance(ms) {
  const end = now + ms;
  for (;;) {
    tq.sort((a, b) => a.at - b.at);
    const t = tq[0];
    if (!t || t.at > end) break;
    tq.shift(); now = t.at; t.fn();
  }
  now = end;
}
let introUp = true;
const body = { kids: [], appendChild(el) { this.kids.push(el); el._parent = this; } };
function mkEl() {
  return { className: '', textContent: '', kids: [], appendChild(c) { this.kids.push(c); },
    querySelector() { return null; }, remove() { body.kids = body.kids.filter((k) => k !== this); } };
}
globalThis.document = {
  body,
  createElement: mkEl,
  querySelector: (sel) => (sel === '.bt-intro' && introUp ? {} : null),
};
const veilUp = () => body.kids.some((k) => /bt-connect-veil/.test(k.className));

/* each scenario gets a fresh copy of the module (its state is module-level) */
let n = 0;
async function freshSR() {
  const p = join(dir, 'serverReady' + (n++) + '.mjs');
  writeFileSync(p, srSrc);
  return import(pathToFileURL(p).href);
}
const CAPS = { prog3: true };
try {
  /* 4b an ordinary login: the loading screen up, the server answers in 5 s,
     the screen lifts -- the veil must never show (a mistake here would flash
     "Reconnecting" at every login: review R1) */
  {
    const sr = await freshSR(); introUp = true; body.kids = []; tq = [];
    sr.installWorldHold();
    let seen = false;
    for (let i = 0; i < 10; i++) { advance(500); seen = seen || veilUp(); }
    sr.markServerReady(CAPS);
    advance(1500); introUp = false;
    for (let i = 0; i < 20; i++) { advance(500); seen = seen || veilUp(); }
    check('4b an ordinary login: the veil never shows', !seen && tq.length === 0, { seen, timers: tq.length });
  }
  /* 4c the bug: ready, then the line drops while the loading screen is
     still finishing; the screen lifts on a frozen world */
  {
    const sr = await freshSR(); introUp = true; body.kids = []; tq = [];
    sr.installWorldHold();
    sr.markServerReady(CAPS);
    advance(200);
    sr.resetServerReady('lost');
    advance(4000);
    check('4c a drop under the loading screen: no veil while the screen is up', !veilUp());
    introUp = false;
    advance(600);
    check('4d ...the screen lifts on a dropped line: the veil is up ("Reconnecting...")', veilUp(), { kids: body.kids.length });
    sr.resetServerReady('lost'); advance(5000);   /* a failed reconnect */
    check('4e ...and stays up through a failed reconnect', veilUp());
    sr.markServerReady(CAPS);
    check('4f ...and the next ready sync lifts it', !veilUp());
  }
  /* 4g the line drops under the screen but is back before the screen lifts:
     nothing to say, nothing shown */
  {
    const sr = await freshSR(); introUp = true; body.kids = []; tq = [];
    sr.installWorldHold();
    sr.markServerReady(CAPS);
    sr.resetServerReady('lost');
    advance(4000);
    sr.markServerReady(CAPS);
    introUp = false;
    let seen = false;
    for (let i = 0; i < 10; i++) { advance(500); seen = seen || veilUp(); }
    check('4g a drop healed before the screen lifts: no veil, no timer left', !seen && tq.length === 0, { seen, timers: tq.length });
  }
  /* 4h with no loading screen (a resume): a drop veils after the grace,
     as before */
  {
    const sr = await freshSR(); introUp = false; body.kids = []; tq = [];
    sr.installWorldHold();
    sr.markServerReady(CAPS);
    sr.resetServerReady('lost');
    advance(2900);
    const early = veilUp();
    advance(200);
    check('4h no loading screen: a drop veils after the 3 s grace, not before (unchanged)', !early && veilUp(), { early });
  }
} finally {
  Date.now = realNow;
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
