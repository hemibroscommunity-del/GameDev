/* ═══ v2.3.4482: A RETURN TO THE TAB RUNS THE RECOVERY ONCE, THE LIVE SET-UP'S ═══
 *
 * wsClient's setupWebSocket added `visibilitychange` and `pageshow` listeners
 * on every set-up and its teardown never removed them; the set-up runs again
 * each time the game is entered (BroTown.jsx's effect).  After N entries a
 * single return to the app ran the recovery N times, N-1 of them from closed
 * set-ups (whose `ws` is null: "connect now").
 *   1. the REAL src/game/resumeListeners.js against a stand-in document and
 *      window: N set-ups and teardowns, then one return -> the live one's
 *      recovery runs exactly once, a torn-down one's never;
 *   2. the wiring in the REAL wsClient.js: the pair is armed through the
 *      helper, the teardown disarms it, and no bare listener is left.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

let arm = null;
try { arm = (await import('../../src/game/resumeListeners.js')).armResumeListeners; } catch (e) { arm = null; }

/* a tiny EventTarget: what the browser does with add/removeEventListener */
function target(extra) {
  const map = new Map();
  return Object.assign({
    addEventListener(t, fn) { if (!map.has(t)) map.set(t, new Set()); map.get(t).add(fn); },
    removeEventListener(t, fn) { if (map.has(t)) map.get(t).delete(fn); },
    fire(t, ev) { for (const fn of [...(map.get(t) || [])]) fn(ev); },
    count(t) { return map.has(t) ? map.get(t).size : 0; }
  }, extra || {});
}

/* ── 1. the rule ── */
check('1a armResumeListeners exported', typeof arm === 'function', typeof arm);
if (typeof arm === 'function') {
  for (const N of [1, 2, 5]) {
    const doc = target({ visibilityState: 'visible' });
    const win = target();
    const runs = [];   /* [set-up index, tag] each time a recovery ran */
    const hidden = [];
    let disarm = null;
    for (let i = 0; i < N; i++) {
      if (disarm) disarm();   /* the previous set-up's teardown */
      const me = i;
      disarm = arm(doc, win,
        () => hidden.push(me),
        () => runs.push([me, 'visible']),
        () => runs.push([me, 'bfcache']));
    }
    check('1b N=' + N + ': one pair of listeners on the page, not ' + N,
      doc.count('visibilitychange') === 1 && win.count('pageshow') === 1,
      { vis: doc.count('visibilitychange'), show: win.count('pageshow') });
    doc.visibilityState = 'hidden'; doc.fire('visibilitychange');
    doc.visibilityState = 'visible'; doc.fire('visibilitychange');
    check('1c N=' + N + ': going hidden stamps the live set-up only', JSON.stringify(hidden) === JSON.stringify([N - 1]), hidden);
    check('1d N=' + N + ': one return runs the recovery exactly once, the live one\'s',
      runs.length === 1 && runs[0][0] === N - 1 && runs[0][1] === 'visible', runs);
    runs.length = 0;
    win.fire('pageshow', { persisted: true });
    win.fire('pageshow', { persisted: false });   /* an ordinary load is not a return */
    check('1e N=' + N + ': a page back from Safari\'s cache runs it once too',
      runs.length === 1 && runs[0][0] === N - 1 && runs[0][1] === 'bfcache', runs);
    runs.length = 0;
    disarm();   /* the live set-up's own teardown */
    doc.fire('visibilitychange'); win.fire('pageshow', { persisted: true });
    check('1f N=' + N + ': after the last teardown nothing runs, nothing is left',
      runs.length === 0 && doc.count('visibilitychange') === 0 && win.count('pageshow') === 0, runs);
  }
  /* no document or window (a server-side render, a worker): no throw */
  let threw = false;
  try { const d = arm(null, null, () => 0, () => 0, () => 0); d(); d(); } catch (e) { threw = true; }
  check('1g no document or window: no throw, disarm twice is safe', !threw);
}

/* ── 2. the wiring in the real wsClient.js ── */
{
  const ws = src('src/networking/wsClient.js');
  check('2a wsClient imports armResumeListeners',
    /import\s*\{\s*armResumeListeners\s*\}\s*from\s*'@\/game\/resumeListeners\.js'/.test(ws));
  check('2b no bare visibilitychange or pageshow listener is left in wsClient',
    !/addEventListener\(\s*'visibilitychange'/.test(ws) && !/addEventListener\(\s*'pageshow'/.test(ws));
  check('2c the set-up arms the pair through the helper', /var _disarmResume = armResumeListeners\(/.test(ws));
  /* the teardown: the function setupWebSocket returns (its last `return function () {`) */
  const at = ws.lastIndexOf('    return function () {');
  const body = at >= 0 ? ws.slice(at, ws.indexOf('\n    };', at)) : '';
  check('2d the set-up\'s teardown disarms the pair', /_disarmResume\(\)/.test(body), body.slice(0, 200));
  /* the arm sits after _resumeRecover is defined and before the teardown */
  const armAt = ws.indexOf('var _disarmResume = armResumeListeners(');
  check('2e armed inside setupWebSocket, after its recovery, before its teardown',
    armAt > ws.indexOf('export function setupWebSocket(') && armAt > ws.indexOf('function _resumeRecover(') && armAt < at);
}

console.log(`\nresume-once: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
