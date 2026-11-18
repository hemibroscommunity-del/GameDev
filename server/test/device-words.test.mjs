/* ═══ v2.3.6020 (card RV): THE PLAYERS' DEVICE WORDS SAY THE WAY THAT WORKS ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md): since v2.3.5716 (`oldkeyheld`) an old key
 * never works from a device not on the character's list, and the owner's
 * pass lets no old key in.  The player's two refusals still said "ask the
 * game's owner to let this device in": a door that stays shut.  Ruled by the
 * planning session (decided for the owner while away): the words name a new
 * Login Key, which works from any device.  Held at their source:
 *
 *   1. the device screen (src/ui/DeviceScreen.js) names the Login Key on the
 *      Account card, and no longer "let this device in";
 *   2. ...and shows its "Use a Login Key" button in the device mode too;
 *   3. the login door's `device` refusal (src/ui/account/AccountLoginForm.jsx)
 *      says the same.
 *
 * Red on main before this change: all three fail.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name, cond) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name); }
}
const screen = readFileSync(new URL('../../src/ui/DeviceScreen.js', import.meta.url), 'utf8');
const form = readFileSync(new URL('../../src/ui/account/AccountLoginForm.jsx', import.meta.url), 'utf8');
const deviceCopy = (screen.match(/device:\s*\{[\s\S]*?\n\s*\},/) || [''])[0];
const formDevice = (form.match(/\n\s*device: '([^\n]*)',/) || ['', ''])[1];

check('1. the device screen names the Login Key on the Account card, not "let this device in"',
  /Login Key on the Account card/.test(deviceCopy) && !/let this device in/.test(deviceCopy));
check('2. ...and shows "Use a Login Key" in the device mode too',
  /\.bt-dv-door'\)\.style\.display = '';/.test(screen) && !/bt-dv-door'\)\.style\.display = mode === 'key'/.test(screen));
check('3. the login door\'s device refusal says the same',
  /Login Key on the Account card/.test(formDevice) && !/let this device in/.test(formDevice));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
