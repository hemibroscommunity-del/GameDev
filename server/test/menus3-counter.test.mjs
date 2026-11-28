/* ═══ v2.3.6872: THE COUNTER'S RULES AND THE ONE QUANTITY PICKER (card MN step 13) ═══
 *
 * src/game/menus3Counter.js (the stations, the Blacksmith's tabs, the make
 * queue) and src/game/menus3Qty.js (the one picker), played on the modules
 * themselves.  This suite imports nothing from server/src: it tests the
 * page's own rules (as menus3-quests.test does) and reads two worker files as
 * TEXT only, to hold a mirrored number and today's requests to the page.
 *
 *   1. THE PICKER: the cap is the fewest whole makes any cost allows, held
 *      under a bench's own room; 1..cap always; minus at 1 and plus at the cap
 *      greyed, Max to the cap; the order's costs are each cost times the
 *      number;
 *   2. THE STATIONS: under ?menus3 the Blacksmith's window opens the Counter
 *      in Make; the other three benches open today's windows until built;
 *      off (?menus3=0), nothing does; a forged id is no station;
 *   3. THE TABS: today's six, each on today's cap; the Amulet tab only with
 *      gold for it; a tab not listed shows the first;
 *   4. THE QUEUE: a number is the bench's own request sent one after another,
 *      each waiting for the character to change; a silence stops it and what
 *      landed stays; the smelter's count goes in pieces of the worker's 50;
 *      leaving sends nothing more;
 *   5. NOTHING LOST: every request today's Blacksmith sends, the Counter's
 *      Make sends with the same payload's keys (read from both files), and
 *      it sends no other; the Salvage tab is today's very one.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { qtyMax, qtyClamp, qtyPress, qtyView, qtyTimes } from '../../src/game/menus3Qty.js';
import {
  COUNTER_MODES, COUNTER_STATIONS, counterStation, SMITH_TABS, smithTabs, smithTab,
  makePlan, makeIdle, makeBegin, makeSend, makeRead, makeRefused, makeCut, SMELT_PER_REQUEST,
  WOOD_TABS, woodTabs, cookCarries, cookShown, cookHave,
} from '../../src/game/menus3Counter.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}
const read = (rel) => readFileSync(fileURLToPath(new URL('../../' + rel, import.meta.url)), 'utf8');

/* ── 1. the picker ── */
{
  check('1a the fewest makes any cost allows', qtyMax([{ have: 17, need: 5 }, { have: 1000, need: 100 }]) === 3);
  check('1b gold is a cost like any other', qtyMax([{ have: 50, need: 5 }, { have: 250, need: 100 }]) === 2);
  check('1c short of one make: 0', qtyMax([{ have: 4, need: 5 }]) === 0);
  check('1d the bench\'s room caps it', qtyMax([{ have: 100, need: 1 }], 3) === 3 && qtyMax([{ have: 100, need: 1 }], 0) === 0);
  check('1e a free cost caps nothing (one at a time)', qtyMax([{ have: 0, need: 0 }]) === 1 && qtyMax([]) === 1);
  check('1f junk reads as nothing', qtyMax([{ have: 'x', need: 2 }]) === 0 && qtyMax(null) === 1 && qtyMax([{ have: -9, need: 2 }]) === 0);
  check('1g 1..cap', qtyClamp(9, 4) === 4 && qtyClamp(0, 4) === 1 && qtyClamp(3, 0) === 1 && qtyClamp(-2, 5) === 1);
  check('1h minus, plus, max', qtyPress(2, 5, 'minus') === 1 && qtyPress(1, 5, 'minus') === 1 && qtyPress(4, 5, 'plus') === 5
    && qtyPress(5, 5, 'plus') === 5 && qtyPress(1, 5, 'max') === 5 && qtyPress(3, 5, 'junk') === 3);
  const a = qtyView(1, 5), b = qtyView(5, 5), c = qtyView(1, 1), d = qtyView(1, 0);
  check('1i minus greyed at 1, plus and Max at the cap', !a.minus && a.plus && a.max && b.minus && !b.plus && !b.max);
  check('1j a cap of one or none: nothing to pick', !c.minus && !c.plus && !c.max && d.n === 1 && d.cap === 0 && !d.plus);
  const t = qtyTimes([{ icon: 'o', have: 12, need: 5 }], 3);
  check('1k the order: each cost times the number, have kept', t[0].need === 15 && t[0].have === 12 && t[0].icon === 'o');
}

/* ── 2. the stations ── */
{
  check('2a four modes', COUNTER_MODES.join() === 'make,trade,keep,play');
  const f = counterStation('forge', true);
  check('2b the Blacksmith opens the Counter, in Make', !!f && f.mode === 'make' && f.bench === 'blacksmith' && f.id === 'forge');
  /* v2.3.6873 (card MN step 13b): the Woodworker and the Cookhouse are built; the Gem Works waits */
  check('2c the Gem Works: today\'s window until built', ['gemcut', 'enchant'].every((k) => COUNTER_STATIONS[k] && COUNTER_STATIONS[k].mode === 'make' && counterStation(k, true) === null));
  const w = counterStation('woodwork', true), ck = counterStation('cook', true);
  check('2f the Woodworker and the Cookhouse open the Counter, in Make', !!w && w.bench === 'woodworker' && w.mode === 'make' && !!ck && ck.bench === 'cookhouse' && ck.mode === 'make'
    && counterStation('woodwork', false) === null && counterStation('cook', false) === null);
  check('2d off: nothing opens the Counter', counterStation('forge', false) === null);
  check('2e a forged id is no station', ['__proto__', 'constructor', 'bank', '', null, 7].every((k) => counterStation(k, true) === null));
}

/* ── 3. the tabs ── */
{
  const all = { smelting: true, armorforge: true, harden: true, gemExtract: true, amuletForge: true, salvage: true };
  check('3a today\'s six, in today\'s order', SMITH_TABS.join() === 'smelt,forge,armor,upgrade,amulet,salvage');
  check('3b every cap: five (the Amulet tab needs gold to work)', smithTabs(all, {}).join() === 'smelt,forge,armor,upgrade,salvage');
  check('3c a nugget shows the Amulet tab', smithTabs(all, { goldNuggets: 1 }).indexOf('amulet') === 4);
  check('3d an older worker: Forge alone', smithTabs({}, {}).join() === 'forge' && smithTabs(null, null).join() === 'forge');
  check('3e Upgrade on either of its caps', smithTabs({ gemExtract: true }, {}).indexOf('upgrade') >= 0 && smithTabs({ harden: true }, {}).indexOf('upgrade') >= 0);
  check('3f a tab not listed shows the first', smithTab('amulet', ['smelt', 'forge']) === 'smelt' && smithTab('forge', ['smelt', 'forge']) === 'forge' && smithTab('x', []) === 'forge');
}

/* ── 4. the queue ── */
{
  check('4a one a send', makePlan(3, 1).join() === '1,1,1');
  check('4b the smelter\'s count in pieces of 50', makePlan(120, SMELT_PER_REQUEST).join() === '50,50,20' && makePlan(7, 50).join() === '7');
  check('4c nothing to make: no plan', makePlan(0, 1).length === 0 && makeBegin([]).on === false);
  const smelting = read('server/src/smelting.js');
  check('4d the 50 is the worker\'s own', new RegExp('MAX_PER_REQUEST:\\s*' + SMELT_PER_REQUEST + '\\b').test(smelting));
  let q = makeBegin(makePlan(3, 1));
  let r = makeSend(q, 'a');
  check('4e the first send', r.count === 1 && r.q.waiting && r.q.before === 'a');
  q = r.q;
  check('4f nothing more while one is in flight', makeSend(q, 'a').count === null);
  check('4g the same reading: wait', makeRead(q, 'a').then === 'wait');
  let s = makeRead(q, 'b');
  check('4h a change: landed, the next may go', s.then === 'landed' && s.q.made === 1 && !s.q.waiting && s.q.on);
  r = makeSend(s.q, 'b'); s = makeRead(r.q, 'c');
  r = makeSend(s.q, 'c'); s = makeRead(r.q, 'd');
  check('4i the last lands: done, all made', s.then === 'done' && s.q.made === 3 && !s.q.on && s.q.stop === 'done' && makeSend(s.q, 'd').count === null);
  q = makeBegin(makePlan(5, 1));
  r = makeSend(q, 'a'); s = makeRead(r.q, 'b');
  r = makeSend(s.q, 'b');
  const stop = makeRefused(r.q);
  check('4j a silence: refused, the queue stops, what landed stays', !stop.on && stop.stop === 'refused' && stop.made === 1 && makeSend(stop, 'b').count === null);
  r = makeSend(makeBegin(makePlan(4, 1)), 'a');
  const cut = makeCut(r.q);
  check('4k leaving: nothing more is sent', !cut.on && cut.stop === 'cut' && makeSend(cut, 'a').count === null);
  check('4l idle reads nothing', makeRead(makeIdle(), 'x').then === 'wait' && makeSend(makeIdle(), 'x').count === null);
}

/* every request today's bench writes: `type: 'x'` (its ask), `event: 'x'` (a broadcast), and act('x' (Salvage) */
const reqs = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/(?:type|event):\s*'([a-z_]+)'/g)) if (m[1] !== 'broadcast') out.add(m[1]);
  for (const m of src.matchAll(/act\('([a-z_]+)'/g)) out.add(m[1]);
  return out;
};
/* each request's payload keys, as written in both */
const keysOf = (src, type) => {
  const m = src.match(new RegExp("(?:type|event):\\s*'" + type + "',\\s*payload:\\s*\\{([^}]*)\\}")) || src.match(new RegExp("act\\('" + type + "',\\s*\\{([^}]*)\\}"));
  return m ? m[1].split(',').map((p) => p.split(':')[0].trim()).filter(Boolean).sort().join() : null;
};

/* ── 5. nothing lost: today's requests, the same ones ── */
{
  const today = read('src/ui/panels/buildings/SmithyPanel.jsx');
  const mine = read('src/ui/menus3/Menus3Make.jsx');
  const salvageOnly = new Set(['smith_salvage', 'essence_apply']);
  const T = [...reqs(today)].filter((x) => !salvageOnly.has(x)).sort();
  const M = [...reqs(mine)].sort();
  check('5a the Counter sends today\'s requests, and no other', T.join() === M.join(), { today: T, mine: M });
  check('5b today\'s are the six', T.join() === 'amulet_forge_request,forge_armor,forge_weapon,harden_weapon,smelt_bar');
  for (const t of ['smelt_bar', 'forge_weapon', 'forge_armor', 'harden_weapon']) {
    check('5c ' + t + ' carries today\'s payload', keysOf(today, t) !== null && keysOf(today, t) === keysOf(mine, t), { today: keysOf(today, t), mine: keysOf(mine, t) });
  }
  const ops = (src) => [...new Set([...src.matchAll(/op:\s*'([a-z]+)'/g)].map((m) => m[1]))].sort().join();
  check('5d the amulet bench\'s three ops, the same', ops(today) === 'craft,extract,smelt' && ops(mine) === ops(today));
  check('5e Salvage is today\'s very tab', /export function SalvageTab/.test(today) && /SalvageTab\b.*from '\.\.\/panels\/buildings\/SmithyPanel\.jsx'/.test(mine) && /<SalvageTab /.test(mine));
  check('5f every request leaves through the action door', !/channel\.send|\.postMessage|sendMessage\(/.test(mine) && /from '@\/game\/actions\.js'/.test(mine));
  check('5g one at a time where one is today\'s: harden, the gem, the amulet', (mine.match(/multi: false/g) || []).length === 3);
}

/* ── 6. v2.3.6873 (card MN step 13b): the Woodworker ── */
{
  check('6a today\'s five tabs, in today\'s order', WOOD_TABS.join() === 'bow,staff,hardwood,upgrade,traps');
  check('6b an older worker: Bow and Staff', woodTabs({}).join() === 'bow,staff' && woodTabs(null).join() === 'bow,staff');
  check('6c each tab on its cap', woodTabs({ hardenedwood: true, harden: true, trapcraft: true }).join() === WOOD_TABS.join()
    && woodTabs({ trapcraft: true }).join() === 'bow,staff,traps' && woodTabs({ harden: true }).join() === 'bow,staff,upgrade');
  const today = ['WoodworkPanel', 'HardenedWoodTab', 'TrapsTab'].map((f) => read('src/ui/panels/buildings/' + f + '.jsx')).join('\n');
  const panel = read('src/ui/panels/buildings/WoodworkPanel.jsx');
  /* the caps today's window reads for its tabs, the same as the rule's */
  check('6d the rule reads today\'s caps', ['hardenedwood', 'harden', 'trapcraft'].every((c) => new RegExp('_serverCaps\\.' + c + '\\)\\s*&&\\s*\\{\\s*id:').test(panel)));
  const mine = read('src/ui/menus3/Menus3Wood.jsx');
  const T = [...reqs(today)].sort(), M = [...reqs(mine)].sort();
  check('6e the Woodworker sends today\'s requests, and no other', T.join() === M.join() && T.join() === 'forge_weapon,harden_weapon,make_hardened_wood,make_traps', { today: T, mine: M });
  for (const t of ['forge_weapon', 'harden_weapon', 'make_hardened_wood', 'make_traps']) {
    check('6f ' + t + ' carries today\'s payload', keysOf(today, t) !== null && keysOf(today, t) === keysOf(mine, t), { today: keysOf(today, t), mine: keysOf(mine, t) });
  }
  check('6g a bow or a staff is the woodworker\'s', /isWoodwork: true/.test(mine) && /isWoodwork: true/.test(panel));
  /* a count today's tab sends whole: in pieces of the worker's own 50 */
  const hw = read('src/data/hardenedWood.js'), tr = read('src/data/trapping.js');
  check('6h the hardened wood\'s 50 is the worker\'s own', /HARDENED_WOOD_MAX_PER_REQUEST = 50\b/.test(hw) && /MAX_PER_REQUEST:\s*50\b/.test(read('server/src/hardenedwood.js'))
    && /per: HARDENED_WOOD_MAX_PER_REQUEST/.test(mine));
  check('6i the traps\' 50 is the worker\'s own', /MAX_PER_REQUEST:\s*50\b/.test(tr) && /MAX_PER_REQUEST:\s*50\b/.test(read('server/src/trapping.js')) && /per: TRAPPING\.MAX_PER_REQUEST/.test(mine));
  check('6j a hardening one at a time, as today', (mine.match(/multi: false/g) || []).length === 1 && /harden_weapon[\s\S]{0,200}/.test(mine));
  check('6k every request through the action door', !/channel\.send|\.postMessage|sendMessage\(/.test(mine) && /from '@\/game\/actions\.js'/.test(mine));
}

/* ── 7. v2.3.6873 (card MN step 13b): the Cookhouse ── */
{
  const R = [{ buff: 'heal' }, { buff: 'all' }, { buff: 'damage' }, { buff: null }, { buff: null }];
  check('7a a worker with meals: the first cookRows', cookShown(R, { meals: true, cookRows: 4 }).join() === '0,1,2,3');
  check('7b cookRows unsaid: three', cookShown(R, { meals: true }).join() === '0,1,2');
  check('7c an older worker: the instant buffs only', cookShown(R, {}).join() === '0,1,2' && cookShown([{ buff: 'heal' }, {}, { buff: 'x' }], null).join() === '0,2');
  check('7d carried only with meals', cookCarries({ meals: true }) && !cookCarries({}) && !cookCarries(null));
  check('7e an herb counted in any bag key that names it', cookHave({ herb_firebloom: 2, seed_herb_firebloom: 1, herb_rock_vine: 4, x: -3 }, 'herb_firebloom') === 3
    && cookHave({ herb_firebloom: 0 }, 'herb_firebloom') === 0 && cookHave(null, 'herb') === 0 && cookHave({ a: 1 }, '') === 0);
  const today = read('src/ui/panels/buildings/CookPanel.jsx');
  const mine = read('src/ui/menus3/Menus3Cook.jsx');
  check('7f today\'s reading of the herbs is the rule\'s', /k\.includes\(type\) && v > 0/.test(today));
  check('7g today\'s rows rule is the rule\'s', /if \(!mealsOn && !recipe\.buff\) return null/.test(today) && /if \(mealsOn && ri >= _cookRows\(\)\) return null/.test(today)
    && /typeof n === 'number' \? n : 3/.test(today));
  check('7h the cook sends today\'s request with today\'s payloads', /act\('cook_recipe', carryCook \? \{ recipeIdx: ri, carry: true \} : \{ recipeIdx: ri \}\)/.test(today)
    && /act\('cook_recipe', carry \? \{ recipeIdx: ri, carry: true \} : \{ recipeIdx: ri \}\)/.test(mine) && [...reqs(mine)].join() === 'cook_recipe');
  check('7i a number only where the dish is carried', /multi: carry,/.test(mine));
  check('7j the Eat list is gone (Decided 11): no eat here, the bag eats', !/eat_request/.test(mine) && /if \(a\.eat\) add\('eat'/.test(read('src/ui/mobile/dash/itemActions.js')));
}

console.log(`menus3-counter: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
