/* v2.3.4156: a full crash ring still uploads a new crash (sweep N2-1). */
import { readFileSync } from 'node:fs';
import { ringUploadKey } from '../../src/debug/crashRing.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const entry = (i, kind = 'error') => ({ t: new Date(1700000000000 + i * 1000).toISOString(), kind, msg: 'boom ' + i });
const ring = (from) => Array.from({ length: 16 }, (_, i) => entry(from + i));

const full = ring(0);
const k1 = ringUploadKey(full, '');
check('1a a full ring never sent uploads', !!k1, k1);
check('1b the same full ring does not re-upload', ringUploadKey(full, k1) === '');
const shifted = ring(1); // one more crash: pushed, oldest shifted, length still 16
check('1c a full ring with a new newest entry uploads', shifted.length === 16 && !!ringUploadKey(shifted, k1));
check('1d a new quiet kind with the same time still differs', !!ringUploadKey([entry(0, 'resume')], ringUploadKey([entry(0, 'error')], '')));
check('2a an empty ring does not upload', ringUploadKey([], '') === '' && ringUploadKey([], 'x') === '');
check('2b a missing ring does not upload', ringUploadKey(null, '') === '');

const src = readFileSync(new URL('../../src/debug/crashTrap.js', import.meta.url), 'utf8');
check('3 crashTrap decides through ringUploadKey, not the length', /ringUploadKey\(/.test(src) && !/log\.length === _lastSentLen/.test(src));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
