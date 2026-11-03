/* v2.3.4158: the Test panel's expo switch makes exactly the documented flag writes */
import { readFileSync } from 'node:fs';
import { expoAddressFlags, expoAddressWords } from '../../src/game/expoAddress.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const on = expoAddressFlags(true), off = expoAddressFlags(false);
check('1a on: two POSTs, both flags set to the number 0',
  JSON.stringify(on) === JSON.stringify([
    { path: '/flags', body: { name: 'ip_sockets', value: 0 }, method: 'POST' },
    { path: '/flags', body: { name: 'ip_joins_min', value: 0 }, method: 'POST' }]), on);
check('1b off: two DELETEs clearing both', JSON.stringify(off) === JSON.stringify([
  { path: '/flags?name=ip_sockets', body: null, method: 'DELETE' },
  { path: '/flags?name=ip_joins_min', body: null, method: 'DELETE' }]), off);
check('2 the server route takes both names', flagNameOk('ip_sockets') && flagNameOk('ip_joins_min'));
const flood = readFileSync(new URL('../src/flood.js', import.meta.url), 'utf8');
check('3 flood.js reads these very names live', flood.includes("_flagNum('ip_sockets'") && flood.includes("_flagNum('ip_joins_min'"));
check('4a words: not loaded', /not loaded/.test(expoAddressWords(null)));
check('4b words: normal', /^normal/.test(expoAddressWords({})));
check('4c words: expo', /^EXPO MODE/.test(expoAddressWords({ ip_sockets: 0, ip_joins_min: 0 })));
check('4d words: mixed', /^mixed: places no limit, connections a minute normal/.test(expoAddressWords({ ip_sockets: 0 })));
const panel = readFileSync(new URL('../../src/ui/panels/DevPanel.jsx', import.meta.url), 'utf8');
check('5 the panel uses the helper', panel.includes('expoAddressFlags(') && panel.includes("from '../../game/expoAddress.js'"));
console.log(failed ? `\n${failed} FAILED` : `\nAll ${passed} passed`);
process.exit(failed ? 1 : 0);
