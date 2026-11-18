/* ═══ v2.3.5816 (card RV, PR 16): THE TEST PANEL'S PASS WORDS SAY WHAT A PASS DOES NOW ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding SEC-F6 (card SEC's Found; the
 * owner's call, decided while away: "Go recommended on all").  Since
 * v2.3.5716 (`oldkeyheld`) a pass lets no old key in and a new key needs none,
 * so "Let one new device in" opens nothing for a player moving to a new device
 * while the Test panel still called it the way; "Give it a new key" is.  The
 * words are the owner's alone (src/ui/panels/DevPanel.jsx), held here at
 * their source:
 *   1. the logins note says a new key is the way onto a new device;
 *   2. the pass button and its answer say it lets an old key in only with
 *      `oldkeyheld` off;
 *   3. Forget's note says a new key is the way back in.
 *
 * Red on main before this change: all three fail.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name, cond) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name); }
}
const src = readFileSync(new URL('../../src/ui/panels/DevPanel.jsx', import.meta.url), 'utf8');

check('1. the logins note: a new key is the way onto a new device', /give it a new key \(below\):\s*\n?\s*a new key works on any device/.test(src));
check('2. the pass button and its answer: an old key only with oldkeyheld off', /Let one new device in \(30 min; only with oldkeyheld off\)/.test(src) && /only while oldkeyheld is off; otherwise give it a new key/.test(src));
check('3. Forget\'s note: a new key is the way back in', /nobody can play it until you give it a new key/.test(src));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
