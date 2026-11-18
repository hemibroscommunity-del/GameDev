/* ═══ v2.3.5903: A HARVEST'S SHARD ONLY FOR A ZONE THAT HAS ONE (card K4 PR 4; TRAPS §154) ═══
 *
 * gathering.js _rollHarvestShard built `'shard_' + zoneId` from whatever zone
 * the node named (V4's Found: traps census §154).  A runtime zone (a dungeon
 * instance's 'dungeon:<id>') would mint a key that is no item.  Now, as the
 * kill's roll since v2.3.3170 (index.js _rollShardForKill):
 *   1. the reader: `harvestshard` on with no flag, off with `false`;
 *   2. a roll that hits in a zone with a shard (a ZONES key) pays its shard;
 *      in any other zone, none; the dice drawn the same either way;
 *   3. `harvestshard: false`: the key built as before.
 * Red on main (v2.3.5726): 1, and 2's runtime zone. */
import { makeStorage, openRoom } from './testroom.mjs';
import { ZONES } from '../src/data.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const realRandom = Math.random;
let draws = 0;
const roll = (room, zone, r) => { Math.random = () => { draws++; return r; }; try { return room._rollHarvestShard(zone); } finally { Math.random = realRandom; } };

{
  const a = await openRoom(makeStorage()), b = await openRoom(makeStorage(), { harvestshard: false });
  check('1. `harvestshard` is on with no flag, off with `harvestshard: false`', a._harvestShardOff() === false && b._harvestShardOff() === true);
}
{
  const room = await openRoom(makeStorage());
  const land = Object.keys(ZONES)[0];
  draws = 0;
  const hit = roll(room, land, 0.1), miss = roll(room, land, 0.9), odd = roll(room, 'dungeon:1a2b3c4d', 0.1);
  check('2. a roll that hits in a zone with a shard pays it (shard_' + land + ')', hit === 'shard_' + land, hit);
  check('2. ...a roll that misses pays none', miss === null);
  check('2. a runtime zone (a dungeon instance) pays none, even on a hit', odd === null, odd);
  check('2. ...each roll drew exactly one random number, as before', draws === 3, draws);
  const proto = roll(room, '__proto__', 0.1);
  check('2. a zone named like an Object key (`__proto__`) pays none', proto === null, proto);
}
{
  const room = await openRoom(makeStorage(), { harvestshard: false });
  check('3. `harvestshard: false`: the key built as before', roll(room, 'dungeon:1a2b3c4d', 0.1) === 'shard_dungeon:1a2b3c4d');
}
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
