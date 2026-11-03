/* v2.3.3922: the place chip's words and numbers (src/game/placeSafety.js).
   node tools/dev/test-place-safety.mjs */
import { pvpRange, placeState, chipWords, bagRiskCount, riskWords, placeLines } from '../../src/game/placeSafety.js';

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

/* the owner's example: a level-7 bro in No man's land 1 -- the worker's
   |a - b| <= min(na, nb) allows 6 to 8 */
eq('pvpRange 7 in 1', pvpRange(7, 1), { lo: 6, hi: 8 });
eq('pvpRange never under 1', pvpRange(2, 5), { lo: 1, hi: 7 });
eq('safe off No man\'s land', placeState({ nml: 0, myLv: 7 }).kind, 'safe');
eq('pvp in it', placeState({ nml: 1, myLv: 7 }).kind, 'pvp');
eq('outlaw beats pvp', placeState({ nml: 1, myLv: 7, redMin: 18 }).kind, 'outlaw');
eq('outlaw in town too', placeState({ nml: 0, myLv: 7, redMin: 3 }).kind, 'outlaw');
eq('chip: safe', chipWords(placeState({}), false), 'Safe');
eq('chip: pvp wide', chipWords(placeState({ nml: 1, myLv: 7 }), false), 'PvP · Lv 6–8');
eq('chip: pvp narrow', chipWords(placeState({ nml: 1, myLv: 7 }), true), 'Lv 6–8');
eq('chip: outlaw', chipWords(placeState({ nml: 1, redMin: 2 }), false), 'Outlaw');
eq('bag count: kinds with some, and spare weapons',
  bagRiskCount({ inventory: { ore: 3, fish: 0, log: 12 }, weaponStash: [{ name: 'a' }, null] }), 3);
eq('risk words', riskWords(2306, 8), 'your 2,306 gold and the 8 things in your bag');
eq('risk words: one thing', riskWords(0, 1), 'the 1 thing in your bag');
const pv = placeLines(placeState({ nml: 1, myLv: 7 }), { gold: 2306, things: 8 });
eq('pvp lead', pv.lead, 'Players Lv 6–8 can attack you here.');
eq('pvp risk names the bank', /Bank in BroTown/.test(pv.more) && /2,306 gold/.test(pv.more), true);
eq('safe lead', placeLines(placeState({}), { place: 'BroTown' }).lead, 'BroTown is safe. No one can attack you here.');
eq('outlaw lead', placeLines(placeState({ nml: 1, redMin: 18 })).lead, 'You attacked a player first, so you\'re an outlaw for 18 more minutes.');

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
