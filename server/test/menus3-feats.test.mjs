/* ═══ v2.3.6868: WORLD · FEATS' RULES (card MN step 9; src/game/menus3Feats.js) ═══
 *
 * The owner's Feats in the new panel, its rules played on the module itself.
 * This suite imports nothing from server/src: it tests the page's own rules
 * (as menus3-quests.test does) and does not deploy.
 *
 *   1. THE RAIL: Medals, Titles, Records in the owner's order; a forged place
 *      is Medals;
 *   2. THE AP LINE: off without the worker's achievements; loading (never 0)
 *      until its answer; the split only when the parts add up (a row the
 *      test lever lit pays nothing: the total alone);
 *   3. THE MEDALS: the four tiers in the table's order, every row of the
 *      table once; earned only what the worker sent; a tier's points each
 *      row's OWN; progress words only for a medal not earned, never "0 of 1";
 *   4. THE TITLES: the earned ones newest first, the worn one marked; the
 *      one family's next and locked rungs once one rung is earned, none
 *      before; Equip on an earned one, Remove on the worn one, none on a
 *      rung; every button held while an ask is out; a medal's page Equip
 *      only when earned;
 *   5. THE RECORDS: the counters the game keeps, never the two it does not;
 *   6. THE ROAD: World's Feats tab opens the new panel (built); F is NOT
 *      taken (the Element Burst). */
import { MENUS3_FEATS_RAIL, MENUS3_FEATS_PAGES, featsRailId, featsHead, featsMedalGroups, featsTitleRows, titleButton, medalButton, featsRecords } from '../../src/game/menus3Feats.js';
import { ACHIEVEMENTS, ACHV_TIERS, achvAp } from '../../src/data/achievements.js';
import { MENUS3_BUILT, MENUS3_KEYS } from '../../src/game/menus3Router.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

const ids = ACHIEVEMENTS.map((d) => d.id);
const rareId = ACHIEVEMENTS.find((d) => d.tier === 'rare').id;
const S0 = { _achv: { known: false, got: {} } };
const got = { first_blood: 100, combat_10: 300 };
got[rareId] = 200;
const pts = achvAp('first_blood') + achvAp('combat_10') + achvAp(rareId);
const S = { _achv: { known: true, got, t: 'combat_10', ap: pts + 15, titleAsk: null, rev: 1 }, _serverCaps: { achievements: true } };

/* ── 1. the rail ── */
check('1a the rail: Medals, Titles, Records', MENUS3_FEATS_RAIL.join() === 'medals,titles,records');
check('1b a forged place is Medals', featsRailId('__proto__') === 'medals' && featsRailId(null) === 'medals' && featsRailId('records') === 'records');
check('1c the pages', MENUS3_FEATS_PAGES.join() === 'root,ap,medal');

/* ── 2. the AP line ── */
check('2a off without the worker\'s achievements', featsHead(S, false).kind === 'off' && featsHead(S, false).total == null);
const h0 = featsHead(S0, true);
check('2b loading, never 0, until the answer', h0.kind === 'loading' && h0.total == null, h0);
const h = featsHead(S, true);
check('2c the split when the parts add up', h.kind === 'split' && h.total === pts + 15 && h.achv === pts && h.rest === 15 && h.earned === 3 && h.of === ids.length, h);
const lever = { _achv: { known: true, got: { first_blood: 1 }, ap: 0 } };
const hl = featsHead(lever, true);
check('2d the parts do not add up: the total alone, no split', hl.kind === 'total' && hl.achv == null && hl.rest == null && hl.total === 0, hl);

/* ── 3. the medals ── */
const G = featsMedalGroups(S);
check('3a the four tiers in the table\'s order', G.map((g) => g.tier).join() === Object.keys(ACHV_TIERS).join());
check('3b every row of the table once', G.reduce((n, g) => n + g.rows.length, 0) === ids.length && new Set(G.flatMap((g) => g.rows.map((r) => r.id))).size === ids.length);
const common = G.find((g) => g.tier === 'common');
check('3c earned only what the worker sent', common.rows.find((r) => r.id === 'first_blood').got === true && common.rows.filter((r) => r.got).length === 2, common.rows.filter((r) => r.got).map((r) => r.id));
check('3d a tier\'s points are each row\'s own', common.pts === achvAp('first_blood') + achvAp('combat_10') && common.max === ACHIEVEMENTS.filter((d) => d.tier === 'common').reduce((n, d) => n + achvAp(d.id), 0));
check('3e no progress on an earned medal', common.rows.filter((r) => r.got).every((r) => r.progress === ''));
check('3f not in yet: n null, nothing earned', featsMedalGroups(S0).every((g) => g.n == null && g.rows.every((r) => !r.got)));
check('3g no "0 of 1" for a medal with no progress the game keeps', G.flatMap((g) => g.rows).every((r) => !/^0 of /.test(r.progress)));

/* ── 4. the titles ── */
const T = featsTitleRows(S);
const gotRows = T.filter((r) => r.state === 'got');
check('4a the earned ones, newest first', gotRows.map((r) => r.id).join() === ['combat_10', rareId, 'first_blood'].join(), gotRows.map((r) => r.id));
check('4b the worn one marked', T.filter((r) => r.worn).map((r) => r.id).join() === 'combat_10');
const rungs = T.filter((r) => r.state !== 'got');
check('4c the family\'s next and locked rungs', rungs.map((r) => r.id + ':' + r.state).join() === 'combat_50:next,combat_100:locked', rungs);
const T2 = featsTitleRows({ _achv: { known: true, got: { first_blood: 1 } } });
check('4d no rung before one is earned', T2.length === 1 && T2[0].id === 'first_blood');
check('4e nothing until the answer', featsTitleRows(S0).length === 0);
const bEq = titleButton(gotRows.find((r) => r.id === 'first_blood'), null);
const bRm = titleButton(gotRows.find((r) => r.id === 'combat_10'), null);
check('4f Equip on an earned one, Remove on the worn one', bEq.kind === 'equip' && bEq.id === 'first_blood' && !bEq.held && bRm.kind === 'remove' && bRm.id === null);
check('4g no button on a rung', titleButton(rungs[0], null) === null);
check('4h every button held while an ask is out', titleButton(gotRows[1], { id: 'x', at: 1 }).held === true && titleButton(gotRows[0], { id: null, at: 1 }).held === true);
check('4i a medal\'s page: Equip only when earned', medalButton(S, 'first_blood', null).kind === 'equip' && medalButton(S, 'combat_10', null).kind === 'remove' && medalButton(S, 'combat_50', null) === null && medalButton(S0, 'first_blood', null) === null);

/* ── 5. the records ── */
const R = featsRecords({ svKills: 7, xp: 1234, _compStats: { deaths: 2, totalGoldEarned: 5000, duelsWon: 3, deepestZone: 'x' } });
check('5a the counters the game keeps', R.map((r) => r.id).join() === 'kills,deaths,gold,xp' && R[0].v === 7 && R[1].v === 2, R);
check('5b never the two it does not count', !R.some((r) => r.id === 'duelsWon' || r.id === 'deepestZone'));

/* ── 6. the road ── */
check('6a World\'s Feats is built (the new panel)', MENUS3_BUILT.includes('feats'));
check('6b F stays the Element Burst: no key', !!MENUS3_KEYS.F.taken && !MENUS3_KEYS.F.today);

console.log(`menus3-feats: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
