/* v2.3.3734: the owner's coin piles, one an amount (src/game/coinArt.js).
 *   1. an amount shows the pile whose label is the largest at or under it;
 *   2. nothing, zero, a negative or a broken number shows the single coin;
 *   3. the table is the owner's fourteen labels, in order, each picture on
 *      file, small (the UI icon slot: under ~50 KB decoded) and on 256
 *      colours or fewer (a palette PNG). */
import { readFileSync, existsSync } from 'node:fs';

const C = await import('../../src/game/coinArt.js');
const root = new URL('../../public', import.meta.url).pathname;
let failures = 0;
function check(name, ok, info) {
  if (ok) console.log('  ok  ' + name);
  else { failures++; console.log('  FAIL ' + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); }
}
const minOf = (n) => C.coinPileFor(n).min;

console.log('§1 by amount');
for (const [n, want] of [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [7, 5], [9, 5], [10, 10], [49, 10], [50, 50],
  [99, 50], [100, 100], [999, 100], [1000, 1000], [4999, 1000], [5000, 5000], [9999, 5000], [10000, 10000],
  [12345, 10000], [50000, 50000], [99999, 50000], [100000, 100000], [199999, 100000], [200000, 200000],
  [250000, 200000], [1e9, 200000], ['42', 10], [7.9, 5]]) {
  check(`${JSON.stringify(n)} coins -> the ${want} pile`, minOf(n) === want, minOf(n));
}
check('coinArtFor is the pile\'s address', C.coinArtFor(12345) === '/icons/coins/coin-10000.png', C.coinArtFor(12345));

console.log('§2 no amount');
for (const n of [0, -5, 0.5, NaN, null, undefined, 'abc', {}]) check(`${String(n)} -> the single coin`, minOf(n) === 1, minOf(n));
check('COIN_ONE is the single coin', C.COIN_ONE === '/icons/coins/coin-1.png', C.COIN_ONE);

console.log('§3 the table');
check('the owner\'s fourteen labels in order',
  JSON.stringify(C.COIN_PILES.map((p) => p.min)) === JSON.stringify([1, 2, 3, 4, 5, 10, 50, 100, 1000, 5000, 10000, 50000, 100000, 200000]));
check('COIN_PILE_URLS lists every pile', C.COIN_PILE_URLS.length === 14);
for (const p of C.COIN_PILES) {
  const f = root + p.url;
  if (!existsSync(f)) { check(p.url + ' on file', false); continue; }
  const b = readFileSync(f);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  check(`${p.url}: ${w} x ${h} as listed, a palette PNG, under 50 KB decoded`,
    w === p.w && h === p.h && b[25] === 3 && w * h * 4 <= 50 * 1024, { w, h, type: b[25] });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
