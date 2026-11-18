/* ═══ v2.3.5818 (card RV, from card R's Found): A NOTED BUY ORDER'S GOLD IS
 * COUNTED ONCE, NOT AGAIN AFTER ITS GOLD LEG IS PAID ═══
 *
 * The world's sum (server/src/worldsum.js) counted a General Store buy order's
 * price as escrow until the record was deleted, but a buy order a sell taker
 * crossed pays its gold to the seller first (market.js _mktSettleRun, the
 * stamp `settle:<id>:gold`) and goes only when every leg is: between the two
 * the price stood twice, in the seller's purse and in the escrow.  Now not
 * once the stamp is on file (as a sell order's weapon is not once its item
 * leg is).  The sum is the owner's measure: nothing a player sees changes,
 * so there is no switch.
 *
 *   1. a buy order resting: its price counted as escrow;
 *   2. a noted buy order whose gold leg is stamped paid: not counted;
 *   3. a noted one whose gold leg is not yet paid: counted;
 *   4. a sell order: no gold, as before.
 *
 * Red on main before this change: check 2 fails.
 */
import { count } from '../src/worldsum.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const sumOf = (entries) => count(null, new Map(entries)).gold;
const note = { v: 1, at: 1, taker: 'bp_t', takerOrder: 'x', takerType: 'sell', bid: 300, exec: 300, label: 'Iron greatsword',
  legs: [{ leg: 'item', to: 'bp_buyer', weapon: { name: 'w', gid: 'g_rvws1' } }, { leg: 'gold', to: 'bp_seller', amount: 300 }] };

check('1. a buy order resting: its 300 counted', sumOf([['mkt_order:B1', { id: 'B1', type: 'buy', price: 300 }]]) === 300);
check('2. a noted buy order with its gold leg stamped paid: not counted again',
  sumOf([['mkt_order:B2', { id: 'B2', type: 'buy', price: 300, settle: note }], ['oplog:settle:B2:gold', 1]]) === 0,
  sumOf([['mkt_order:B2', { id: 'B2', type: 'buy', price: 300, settle: note }], ['oplog:settle:B2:gold', 1]]));
check('3. a noted buy order whose gold leg is not paid yet: counted',
  sumOf([['mkt_order:B3', { id: 'B3', type: 'buy', price: 300, settle: note }], ['oplog:settle:B3:item', 1]]) === 300);
check('4. a sell order holds no gold', sumOf([['mkt_order:S1', { id: 'S1', type: 'sell', price: 300, item: { name: 'w' } }]]) === 0);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
