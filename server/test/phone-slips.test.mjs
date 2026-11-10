/* v2.3.4411: three small slips on the phone (the state-machine sweep, VA).
 *
 *   1. THE RIDE BUTTON (P3-8): a rider with a monster locked, or with the
 *      Block button live, still has the board button (a lock never steps you
 *      off, so hiding it left no way off); on foot the fight's buttons keep
 *      the place; the shield up hides it either way.
 *   2. THE PEER'S FREEZE AND WOBBLE (R4-13): the filter before another
 *      player's status looks passes a snowman's freeze and the rock monster's
 *      wobble, and effectsRenderer reads that one list.
 *   3. THE CHAT BOX'S MICROPHONE (M4-2): closing the box aborts the running
 *      recogniser, and a let-go recogniser's late words, error or end change
 *      nothing; ChatBubble does both.
 *
 * Imports are dynamic so a missing rule reads as a FAIL, not a crash. */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const load = async (p) => { try { return await import(p); } catch (e) { return {}; } };
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* ── 1. the ride button ── */
const ride = await load('../../src/game/ride.js');
const hides = ride.rideFightHides;
check('1a the rule exists', typeof hides === 'function');
if (typeof hides === 'function') {
  const riding = (extra) => Object.assign({ _ride: { on: true }, _serverCaps: { ride: true } }, extra);
  const foot = (extra) => Object.assign({ _ride: { on: false }, _serverCaps: { ride: true } }, extra);
  const mon = { type: 'monster', id: 'm1' };
  check('1b riding with a monster locked: the button stays', hides(riding({ lockedTarget: mon }), false) === false);
  check('1c riding with Block live: the button stays', hides(riding({}), true) === false);
  check('1d riding with the shield up: hidden (Bash has the place)', hides(riding({ _shieldUp: true }), false) === true);
  check('1e on foot with a monster locked: hidden (as before)', hides(foot({ lockedTarget: mon }), false) === true);
  check('1f on foot with Block live: hidden (as before)', hides(foot({}), true) === true);
  check('1g on foot, a player targeted, nothing near: shown', hides(foot({ lockedTarget: { type: 'player' } }), false) === false);
  check('1h a rider with a lock is not stepped off (why the button must stay)',
    ride.rideCheck(riding({ lockedTarget: mon, currentZone: 'wheel', player: { x: 0, y: 0 } }), 1, { centre: [0, 0], safeR: 100 }) === null);
}
const rb = src('src/ui/panels/RideButton.jsx');
check('1i RideButton decides through rideFightHides', /rideFightHides\(S,/.test(rb)
  && !/S\._shieldUp \|\| \(S\.lockedTarget/.test(rb));

/* ── 2. the peer's freeze and wobble ── */
const eh = await load('../../src/game/elemHits.js');
const live = eh.elemFxLive;
check('2a the rule exists', typeof live === 'function');
if (typeof live === 'function') {
  const now = 10000;
  check('2b a frozen peer is drawn', live({ _frozenUntil: now + 500 }, now, 650) === true);
  check('2c a wobbling peer (after the daze) is drawn', live({ _dazeUntil: now - 10, _wobbleFrom: now - 10, _wobbleUntil: now + 700 }, now, 650) === true);
  check('2d the older statuses still pass', live({ _chillUntil: now + 1 }, now, 650) && live({ _thornUntil: now + 1 }, now, 650)
    && live({ _gustAt: now - 100 }, now, 650));
  check('2e nothing live: skipped', live({ _frozenUntil: now - 1, _wobbleUntil: now - 1, _gustAt: now - 5000 }, now, 650) === false
    && live({}, now, 650) === false && live(null, now, 650) === false);
}
const er = src('src/rendering/systems/effectsRenderer.js');
check('2f the peer filter reads elemFxLive', /if \(!elemFxLive\(o, now, GUST_FX_MS\)\) continue;/.test(er));

/* ── 3. the microphone ── */
const dict = await load('../../src/game/dictation.js');
check('3a the rules exist', typeof dict.dictationClose === 'function' && typeof dict.dictationOwns === 'function');
if (typeof dict.dictationClose === 'function') {
  /* a fake recogniser wired the way ChatBubble wires it */
  let draft = '', mic = 'idle';
  const ref = { current: null };
  const rec = { aborted: 0, abort() { this.aborted++; } };
  ref.current = rec; mic = 'listening';
  const onresult = (said) => { if (!dict.dictationOwns(ref, rec)) return; draft += said; };
  const onend = () => { if (!dict.dictationOwns(ref, rec)) return; mic = 'idle'; ref.current = null; };
  check('3b closing the box aborts the live recogniser', dict.dictationClose(ref) === true && rec.aborted === 1 && ref.current === null);
  mic = 'idle';
  onresult('hello'); onend();
  check('3c its late words never reach the next draft', draft === '');
  /* a new dictation in the reopened box is not touched by the old one's end */
  const rec2 = { abort() {} }; ref.current = rec2; mic = 'listening';
  onend();
  check('3d the old recogniser\'s end leaves the new one live', ref.current === rec2 && mic === 'listening');
  check('3e closing with nothing running does nothing', dict.dictationClose({ current: null }) === false);
}
const cb = src('src/ui/mobile/ChatBubble.jsx');
check('3f ChatBubble aborts on close (the open effect\'s else)', /setVal\(''\);[\s\S]{0,300}dictationClose\(recRef\)/.test(cb));
check('3g ChatBubble drops a let-go recogniser\'s result', /rec\.onresult = \(ev\) => \{\s*if \(!dictationOwns\(recRef, rec\)\) return;/.test(cb));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
