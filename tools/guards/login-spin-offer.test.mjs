/* ═══ v2.3.6560 (card LS): THE LOGIN WHEEL OPENS ONLY FROM ITS BUTTON ═══
 *
 * The owner, 2026-11-24: "the daily spin popup wouldn't leave me alone.  Can
 * you disable the immediate pop up feature when logging in for that and just
 * leave it as a button in the top right?"
 *
 * The decision is one pure rule, src/game/loginSpinWheel.js spinOffersItself
 * (state, switchValue, offeredOnce), which LoginSpinWindow.jsx's poll calls.
 * This suite runs it, and a mount's poll against the real bus (its close()
 * leaves `avail` alone, v2.3.4345: the reason a closed window came back a
 * second later), and the page's real switch reader for the addresses:
 *   1. by default (no `?loginspin`), `=0` and every other word: never;
 *   2. `?loginspin=1`: once, while a spin is ready and the window is shut;
 *   3. a mount's poll, ten ticks with a close after each open: no opens by
 *      default or on `=0`, exactly one on `=1` (closed without a spin, it
 *      never comes back by itself), none once the spin is spent;
 *   4. the switch reader's answer for each address goes through the rule
 *      the way the component asks it (swValue).
 * No deploy: tools/guards/ (run by server/test/run.mjs).
 *
 * Plants (each goes red here):
 *   - the rule reading `=0` as "offer" (`switchValue !== '1'` made
 *     `switchValue === null`, or `=== '0'`)          -> FAIL 1, FAIL 3, FAIL 4
 *   - the once-guard dropped (`if (offeredOnce) return false;` deleted)
 *                                                    -> FAIL 2, FAIL 3
 *   - the rule offering whatever the switch says (`return !!state.avail`)
 *                                                    -> FAIL 1, FAIL 3, FAIL 4
 * The component's half (the unconditional open put back in the poll, the
 * ask removed, a second ask each second) is the phone test's:
 * tools/qa/mp/mp-loginspin.mjs.
 */
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { spinOffersItself, loginSpinBus, LOGIN_SPIN_OFFER_VALUE } = await import(pathToFileURL(join(ROOT, 'src/game/loginSpinWheel.js')).href);
const { readerFor } = await import(pathToFileURL(join(ROOT, 'src/game/switches.js')).href);

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

const READY = Object.freeze({ avail: true, open: false });

/* 1. never by itself, but on `=1` */
{
  const words = [null, undefined, '', '0', 'off', 'false', 'no', 'true', 'yes', 'on', '2', '01', ' 1', '1 ', 'all'];
  const wrong = words.filter((w) => spinOffersItself(READY, w, false) !== false);
  check(`1: no switch, \`=0\` and every other word (${words.length}) never offer it, a spin ready or not`, wrong.length === 0, wrong);
  check('1: ...and `=1` offers it while a spin is ready and the window is shut', spinOffersItself(READY, '1', false) === true && LOGIN_SPIN_OFFER_VALUE === '1');
}

/* 2. on `=1`: once, and only when it can be */
{
  const cases = [
    ['offered already this mount', spinOffersItself(READY, '1', true), false],
    ['no spin today', spinOffersItself({ avail: false, open: false }, '1', false), false],
    ['already open', spinOffersItself({ avail: true, open: true }, '1', false), false],
    ['no state yet', spinOffersItself(null, '1', false), false],
    ['the worker has not answered (avail absent)', spinOffersItself({ open: false }, '1', false), false],
  ];
  const wrong = cases.filter(([, got, want]) => got !== want).map(([n, got]) => `${n}: ${got}`);
  check('2: on `=1` it never offers twice a mount, nor with no spin, nor over itself', wrong.length === 0, wrong);
}

/* 3. a mount's poll against the real bus: the component's own call (LoginSpinWindow.jsx), ten ticks,
      the player closing the window without a spin after each open */
function mount(switchValue, avail) {
  loginSpinBus.close();
  loginSpinBus.state({ avail });
  const offered = { current: false };
  let opens = 0;
  for (let tick = 0; tick < 10; tick++) {
    const b = loginSpinBus.get();
    if (b.open) continue;
    if (spinOffersItself(b, switchValue, offered.current)) { offered.current = true; loginSpinBus.open(); opens++; }
    if (loginSpinBus.get().open) loginSpinBus.close();   /* closed without a spin: avail stays true (v2.3.4345) */
  }
  return { opens, availAfter: loginSpinBus.get().avail };
}
{
  const def = mount(null, true), zero = mount('0', true), one = mount('1', true), spent = mount('1', false);
  check('3: a mount with a spin ready: no opens by default, none on `=0`', def.opens === 0 && zero.opens === 0, { def, zero });
  check('3: ...exactly one on `=1`, and closed without a spin it never comes back by itself (avail still true)', one.opens === 1 && one.availAfter === true, one);
  check('3: ...and none on `=1` once the day\'s spin is spent', spent.opens === 0, spent);
}

/* 4. the page's real reader, asked as the component asks it */
{
  const asks = [['', false], ['?x=1', false], ['?loginspin=0', false], ['?loginspin', false], ['?loginspin=', false],
    ['?loginspin=off', false], ['?xloginspin=1', false], ['?loginspin=1', true], ['?guest=1&loginspin=1&manual=0', true],
    ['?loginspin=1&loginspin=0', true]];
  const wrong = asks.filter(([S, want]) => spinOffersItself(READY, readerFor(S).swValue('loginspin'), false) !== want).map(([S]) => S || '(none)');
  check(`4: each address (${asks.length}), read by the page's switch reader (swValue), offers it only with \`?loginspin=1\``, wrong.length === 0, wrong);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
