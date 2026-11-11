/* ═══ v2.3.4455: THE PHONE'S HALF OF TAKING THE BODY OVER (src/game/bodyPlace.js) ═══
 *
 * A relaunch mid-fight lands at the body (server/src/bodytake.js sends
 * `body_place`).  The code under test is cut from src/ and run here with
 * stubs (zone-leftovers.test's way):
 *   1. onBodyPlace, from today's town: the Wheel's arrival is set to the
 *      body's spot and the trip down the stairs is asked for (once); the
 *      place itself is never written; anything but a Wheel spot, a tab
 *      without the Wheel, or a phone already elsewhere does nothing;
 *   2. the wire: the join says `tb: 1` only when the tab can be placed; the
 *      message is taken in the direct switch, never a relayed copy (`from`),
 *      and only from a worker that says caps.bodyTake; the cap is registered
 *      (CAP_GATES);
 *   4. v2.3.4831: a tab already in the Wheel steps to its body (bodyPlaceHere):
 *      not for a blip beside it, a jump across the Wheel, or a dying bro;
 *      `?bodyhere=0` the old way.
 *   3. the door: the stairs into the Wheel land at the arrival set
 *      (zoneTransitions.js takeWheelArrival) -- the same door the dungeon
 *      mouth uses, whose way in preloads around that point.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
function block(text, start, from) {
  const at = text.indexOf(start, from || 0);
  if (at < 0) return null;
  const open = text.indexOf('{', at + start.length - 1);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return null;
}

/* ── 1. onBodyPlace ── */
const bp = src('src/game/bodyPlace.js');
const body = block(bp, 'export function onBodyPlace(S, p) {');
check('1. (guard) onBodyPlace found', !!body);
function make(home) {
  const calls = { arrive: [], want: 0, veil: 0 };
  const deps = {
    canBePlaced: () => home,
    setWheelArrival: (p) => calls.arrive.push(p),
    wantWheelSpawn: (S) => { calls.want++; S._spawnToWheel = true; },
    veilWheelTrip: () => { calls.veil++; },
    bodyPlaceHere: (S, x, y) => { calls.here = (calls.here || 0) + 1; return 'here'; },   /* v2.3.4831: §4 tests it */
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('canBePlaced', 'setWheelArrival', 'wantWheelSpawn', 'veilWheelTrip', 'bodyPlaceHere', 'return function (S, p) {' + body + '};')(
    deps.canBePlaced, deps.setWheelArrival, deps.wantWheelSpawn, deps.veilWheelTrip, deps.bodyPlaceHere);
  return { fn, calls };
}
const SPOT = { z: 'wheel', x: 1234, y: 5678, d: 'left' };   /* any spot: no Wheel coordinate is meant */
{
  const { fn, calls } = make(true);
  const S = { currentZone: 'town', player: { x: 10, y: 20, dir: 'down' } };
  const r = fn(S, SPOT);
  check('1. from today\'s town: the arrival is the body\'s spot', r === true && calls.arrive.length === 1 && calls.arrive[0].x === 1234 && calls.arrive[0].y === 5678, calls);
  check('1. ...the trip down the stairs asked for, under its veil', calls.want === 1 && calls.veil === 1 && S._spawnToWheel === true);
  check('1. ...facing as the body faced', S.player.dir === 'left');
  check('1. ...and the place itself NOT written (the trip lands it)', S.player.x === 10 && S.player.y === 20 && S.currentZone === 'town');
  const { fn: fn2, calls: c2 } = make(true);
  const S2 = { currentZone: 'town', player: { x: 0, y: 0 }, _spawnToWheel: true };
  fn2(S2, SPOT);
  check('1. a trip already wanted (the login\'s own): the arrival set, the trip not asked twice', c2.arrive.length === 1 && c2.want === 0);
}
{
  const { fn, calls } = make(true);
  const S = { currentZone: 'wheel', player: { x: 1, y: 2 } };
  check('1. a phone already in the Wheel: no trip, it steps to the body itself (v2.3.4831, §4)', fn(S, SPOT) === 'here' && calls.here === 1 && calls.arrive.length === 0 && calls.want === 0);
  const S3 = { currentZone: 'dungeon_x', player: { x: 1, y: 2 } };
  check('1. a phone somewhere else (a dungeon): nothing (its next move answers)', fn(S3, SPOT) === false && calls.here === 1 && S3.player.x === 1);
  const S2 = { currentZone: 'town', player: { x: 1, y: 2 } };
  check('1. a spot that is not the Wheel: nothing', fn(S2, { z: 'town', x: 5, y: 5 }) === false && calls.arrive.length === 0);
  check('1. a spot with no numbers: nothing', fn(S2, { z: 'wheel', x: 'a', y: null }) === false && calls.arrive.length === 0);
  check('1. no payload: nothing', fn(S2, null) === false);
  const { fn: fnOff, calls: cOff } = make(false);
  check('1. a tab without the Wheel (?trial=off): nothing', fnOff({ currentZone: 'town', player: {} }, SPOT) === false && cOff.arrive.length === 0);
}
{
  /* the hold: state_sync says a place follows; the trip waits for it, 5 s at most */
  const due = block(bp, 'export function bodyPlaceDue(S, msg) {');
  const holds = block(bp, 'export function bodyPlaceHolds(S) {');
  const HOLD = Number((bp.match(/const HOLD_MS = (\d+);/) || [])[1]);
  let now = 1000;
  const fDue = new Function('Date', 'return function (S, msg) {' + due + '};')({ now: () => now });
  const fHolds = new Function('Date', 'HOLD_MS', 'return function (S) {' + holds + '};')({ now: () => now }, HOLD);
  const S = {};
  fDue(S, { bodyPlace: 1, caps: { bodyTake: 1 } });
  check('1. state_sync saying a place follows holds the trip', fHolds(S) === true && HOLD === 5000);
  now += HOLD;
  check('1. ...for 5 s at most', fHolds(S) === false);
  fDue(S, { caps: { bodyTake: 1 } });
  check('1. ...and an ordinary state_sync holds nothing', fHolds(S) === false);
  fDue(S, { bodyPlace: 1, caps: {} });
  check('1. ...nor one from a worker that does not say caps.bodyTake', fHolds(S) === false);
  check('1. body_place lets the trip go', /if \(S\) S\._bodyPlaceDue = 0;/.test(body));
  const wh = src('src/game/wheelHome.js');
  const tick = block(wh, 'export function wheelSpawnTick(S) {');
  check('1. the trip (wheelSpawnTick) asks bodyPlaceHolds before it starts its clock', !!tick && tick.indexOf('if (bodyPlaceHolds(S)) return;') >= 0
    && tick.indexOf('if (bodyPlaceHolds(S)) return;') < tick.indexOf('S._spawnSince = now'));
  check('1. the state_sync handler marks it', /bodyPlaceDue\(S, msg\);/.test(src('src/networking/wsClient.js')));
}
check('1. canBePlaced is the trip\'s own test (wheelIsHome)', /export function canBePlaced\(\)\s*\{[^}]*wheelIsHome\(\)/.test(bp));

/* ── 2. the wire ── */
const wc = src('src/networking/wsClient.js');
check('2. the join says `tb: 1` only when the tab can be placed', /\btb:\s*canBePlaced\(\)\s*\?\s*1\s*:\s*undefined/.test(wc));
const cs = block(wc, "case 'body_place':");
check('2. body_place is handled in the direct switch', !!cs);
check('2. ...never a relayed copy, and only from a worker that says caps.bodyTake', !!cs && /!msg\.from/.test(cs) && /S\._serverCaps\s*&&\s*S\._serverCaps\.bodyTake/.test(cs) && /onBodyPlace\(S, msg\.payload\)/.test(cs), cs);
const panel = src('src/ui/panels/DevPanel.jsx');
const gates = (panel.match(/const CAP_GATES = \[([\s\S]*?)\];/) || [])[1] || '';
check('2. bodyTake is in CAP_GATES', /'bodyTake'/.test(gates));
/* (PRIVILEGED_EVENTS itself: body-take.test §8, against the real worker) */

/* ── 3. the door ── */
const zt = src('src/game/zoneTransitions.js');
check('3. the stairs into the Wheel land at the arrival set (takeWheelArrival)', /bestExit\.zoneId === 'wheel' \? takeWheelArrival\(\) : null/.test(zt) && /P\.x = _arr \? _arr\.x/.test(zt));
const wt = src('src/game/worldTrial.js');
check('3. ...and the way in warms the ground round that point (arrivalPoint)', /function arrivalPoint\(\)\s*\{\s*return arriveLive\(\)/.test(wt));
/* v2.3.4831: one exception, bodyPlaceHere (a tab already in the Wheel, §4) */
const _bpRest = bp.replace(block(bp, 'export function bodyPlaceHere(S, x, y, d) {') || '', '');
check('3. bodyPlace.js writes no place outside bodyPlaceHere: no S.player.x / S.currentZone assignment', !/S\.player\.(x|y)\s*=[^=]/.test(_bpRest) && !/\bP\.(x|y)\s*=[^=]/.test(_bpRest) && !/S\.currentZone\s*=[^=]/.test(bp));

/* ── 4. v2.3.4831: a tab already in the Wheel steps to its body ── */
{
  const hb = block(bp, 'export function bodyPlaceHere(S, x, y, d) {');
  check('4. (guard) bodyPlaceHere found', !!hb);
  const NEAR = Number((bp.match(/NEAR_PX = (\d+)/) || [])[1]), FAR = Number((bp.match(/FAR_PX = (\d+)/) || [])[1]);
  const mk = (off) => new Function('NEAR_PX', 'FAR_PX', 'bodyHereOff', 'return function (S, x, y, d) {' + hb + '};')(NEAR, FAR, () => off);
  const here = mk(false);
  const S = { player: { x: 0, y: 0, vx: 3, vy: 4, dir: 'up' } };
  check('4. far from the body (600 px): it stands where the body stands, still, facing as the body faced',
    here(S, 600, 0, 'left') === true && S.player.x === 600 && S.player.y === 0 && S.player.vx === 0 && S.player.vy === 0 && S.player.dir === 'left' && S._bodyPlacedAt > 0, S.player);
  const S2 = { player: { x: 0, y: 0 } };
  check('4. beside it (inside NEAR_PX): nothing, no jump for a blip', here(S2, NEAR - 1, 0) === false && S2.player.x === 0);
  check('4. NEAR_PX sits inside the worker\'s RESUME_PX (300): the next move from the body answers', NEAR > 0 && NEAR < 300 && FAR > 300);
  check('4. across the Wheel (past FAR_PX): nothing, the countdown as before', here(S2, FAR + 1, 0) === false && S2.player.x === 0);
  const S3 = { _dying: true, player: { x: 0, y: 0 } };
  check('4. dying: nothing', here(S3, 600, 0) === false && S3.player.x === 0);
  const S4 = { player: { x: 0, y: 0, dead: true } };
  check('4. dead: nothing', here(S4, 600, 0) === false);
  check('4. `?bodyhere=0`: nothing, the old way for one phone', mk(true)({ player: { x: 0, y: 0 } }, 600, 0) === false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
