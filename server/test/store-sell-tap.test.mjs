/* ═══ v2.3.4369: THE GENERAL STORE'S PLACE TAP, ONE AT A TIME ═══
 *
 * The state-machine sweep (2026-11-03, V8a P1-7): the General Store's "List
 * for Sale" / "Place Buy Order" button had no 'busy' lock, and the weapon to
 * sell is remembered by its PLACE in the stash (BroTown's mktSellItem, sent as
 * stashIndex).  A double tap, or a tap after a refusal, a "Server error!" or a
 * close and reopen with the old chip still lit, could list a weapon you did
 * not choose under another weapon's name, and sell it on the spot.
 *
 * The REAL panel (src/ui/panels/buildings/ExchangePanel.jsx) is run here with
 * a stub React and a stub fetch, and its real button is tapped:
 *   1. the rule itself (game/storeSellTap.js): claim once, release, claim again;
 *   2. a double tap on List for Sale posts ONCE;
 *   3. ...and on Place Buy Order (the gold escrowed once);
 *   4. a refusal clears the pick, and the lock is released;
 *   5. a "Server error!" (the fetch fails) clears the pick and releases;
 *   6. an "ok" clears the pick (as before) and the next tap posts;
 *   7. opening the window clears an old pick;
 *   8. closing and reopening while the answer is out does not open a second door;
 *   9. a buy's answer leaves a sell pick alone.
 * Interim patches (review R2) until the worker names a sold weapon by its id.
 */
import { readFileSync } from 'node:fs';
import * as T from '../../src/game/storeSellTap.js';
import * as BH from '../../src/lib/babelHelpers.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };

/* 1. the rule */
const S0 = {};
const c1 = typeof T.claimPlace === 'function' && T.claimPlace(S0);
const c2 = typeof T.claimPlace === 'function' && T.claimPlace(S0);
if (typeof T.releasePlace === 'function') T.releasePlace(S0);
const c3 = typeof T.claimPlace === 'function' && T.claimPlace(S0);
check('1 claimPlace: the first tap claims, a second while it is held does not, a release lets the next one in',
  c1 === true && c2 === false && c3 === true, { c1, c2, c3 });

/* the real panel, its imports replaced by stubs */
const src = readFileSync(new URL('../../src/ui/panels/buildings/ExchangePanel.jsx', import.meta.url), 'utf8');
const body = src.replace(/^import[^\n]*\n/gm, '').replace(/^export function ExchangePanel/m, 'function ExchangePanel') + '\nreturn ExchangePanel;';

let effects = [];
const React = {
  Fragment: 'Fragment',
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (init) => [init, () => {}],
  useEffect: (fn) => { effects.push(fn); },
  useRef: (init) => ({ current: init }),
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
};
let posts = [], answers = [];
const fetchStub = (url) => {
  if (String(url).indexOf('/api/market/place') < 0) return Promise.resolve({ json: () => Promise.resolve({ ok: true, orders: [] }) });
  posts.push(url);
  return new Promise((resolve, reject) => { answers.push({ resolve, reject }); });
};
const answer = (i, data) => answers[i].resolve({ json: () => Promise.resolve(data) });
const popups = [];
const make = new Function('React', 'fetch', 'BLACKSMITH_TIERS', 'ELEMENTS', 'MKT_CATEGORIES', 'MKT_TIERS', 'MKT_WOOD_TIERS', 'WEAPON_TYPES', 'WOODWORKING_TIERS',
  'estimateMktPrice', 'BT_API_BASE', 'storeEnabled', 'coinArtFor', 'COIN_ONE', '_asyncToGenerator', '_objectSpread', '_regenerator', '_slicedToArray',
  'pushDmgPopup', 'claimPlace', 'releasePlace', 'cue', body);
const ExchangePanel = make(React, fetchStub, {}, [], {}, [], [], { sword: { label: 'Sword', emoji: 's' } }, {},
  () => 100, 'http://x', () => false, () => '', '', BH._asyncToGenerator, BH._objectSpread, BH._regenerator, BH._slicedToArray,
  (S, x, y, text) => popups.push(text), T.claimPlace || (() => true), T.releasePlace || (() => {}), () => {});

function findButton(node, re) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findButton(n, re); if (f) return f; } return null; }
  if (node.props && typeof node.props.onClick === 'function') {
    const text = (node.children || []).filter((c) => typeof c === 'string').join('');
    if (re.test(text)) return node;
  }
  return findButton(node.children, re);
}
function world() {
  return { rpg: { coins: 1000, weaponStash: [{ type: 'sword', name: 'Fine Sword' }, { type: 'sword', name: 'Rusty Sword' }] },
    player: { x: 0, y: 0 }, myId: 'bp_t', myName: 't', _currentRoom: 'brotown-1' };
}
/* one open window: renders the panel, runs its effects (the open), returns the button and the pick's log */
function open(S, mode, pick, log) {
  effects = [];
  const tree = ExchangePanel({
    rpgState: S.rpg, stateRef: { current: S }, setRpgState: () => {},
    mktCategory: 'weapon', mktElement1: null, mktElement2: null, mktMode: mode, mktOrders: [], mktPrice: 50,
    mktSellItem: pick, mktSubtype: 'sword', mktTier: 'iron',
    setMktCategory() {}, setMktElement1() {}, setMktElement2() {}, setMktMode() {}, setMktOrders() {}, setMktPrice() {},
    setMktSellItem: (v) => log.push(v), setMktSubtype() {}, setMktTier() {}, setBuildingPanel: () => {},
  });
  const ranEffects = effects.slice(); ranEffects.forEach((fn) => fn());
  const btn = findButton(tree, mode === 'buy' ? /Place Buy Order/ : /List for Sale/);
  return { btn, tap: () => btn.props.onClick({}) };
}
const reset = () => { posts = []; answers = []; popups.length = 0; };

/* 2. double tap on List for Sale */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'sell', 0, log);
  check('2a the List for Sale button is found in the real panel', !!w.btn);
  if (w.btn) {
    w.tap(); w.tap(); await settle();
    check('2b ...a double tap posts ONCE (the second weapon is not escrowed under the first one\'s name)', posts.length === 1, { posts: posts.length });
    answer(0, { ok: true }); await settle();
  }
}
/* 3. double tap on Place Buy Order */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'buy', null, log);
  w.tap(); w.tap(); await settle();
  check('3 a double tap on Place Buy Order posts ONCE (the gold escrowed once)', posts.length === 1, { posts: posts.length });
  if (answers[0]) answer(0, { ok: true }); await settle();
}
/* 4. a refusal clears the pick, and releases */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'sell', 0, log); log.length = 0;
  w.tap(); await settle();
  answer(0, { ok: false, error: 'Price too low' }); await settle();
  check('4a a refusal clears the pick (no chip still lit over a changed bag)', log.includes(null), { log, popups });
  check('4b ...and says why, as before', popups.includes('Price too low'), popups);
  w.tap(); await settle();
  check('4c ...and the lock is released: the next tap posts', posts.length === 2, { posts: posts.length });
  if (answers[1]) answer(1, { ok: true }); await settle();
}
/* 5. "Server error!" */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'sell', 1, log); log.length = 0;
  w.tap(); await settle();
  answers[0].reject(new Error('net')); await settle();
  check('5a a "Server error!" clears the pick', log.includes(null) && popups.includes('Server error!'), { log, popups });
  w.tap(); await settle();
  check('5b ...and releases the lock', posts.length === 2, { posts: posts.length });
  if (answers[1]) answer(1, { ok: true }); await settle();
}
/* 6. ok */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'sell', 0, log); log.length = 0;
  w.tap(); await settle();
  answer(0, { ok: true }); await settle();
  check('6a an "ok" clears the pick (as before) and says Listed for sale!', log.includes(null) && popups.includes('Listed for sale!'), { log, popups });
  w.tap(); await settle();
  check('6b ...and the next tap posts', posts.length === 2, { posts: posts.length });
  if (answers[1]) answer(1, { ok: true }); await settle();
}
/* 7. open clears an old pick */
reset();
{
  const S = world(), log = [];
  open(S, 'sell', 1, log);
  check('7 opening the window clears an old pick', log.length === 1 && log[0] === null, log);
}
/* 8. close and reopen while the answer is out */
reset();
{
  const S = world(), log = [];
  const w1 = open(S, 'sell', 0, log);
  w1.tap(); await settle();
  const w2 = open(S, 'sell', 0, log);   /* closed, reopened, a chip picked again */
  w2.tap(); await settle();
  check('8 closing and reopening while the first answer is out does not post a second time', posts.length === 1, { posts: posts.length });
  if (answers[0]) answer(0, { ok: true }); await settle();
  if (answers[1]) answer(1, { ok: true }); await settle();
}
/* 9. a buy's answer leaves a sell pick alone */
reset();
{
  const S = world(), log = [];
  const w = open(S, 'buy', 1, log); log.length = 0;
  w.tap(); await settle();
  answer(0, { ok: false, error: 'no' }); await settle();
  check('9 a buy order\'s answer does not touch the sell pick', log.length === 0, log);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
