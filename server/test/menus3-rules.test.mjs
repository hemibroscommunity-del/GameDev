/* ═══ v2.3.6860: THE NEW MENUS' RULES (card MN step 1; src/game/menus3*.js) ═══
 *
 * The owner's menus (docs/design/menus3/), the shell's rules played on the
 * modules themselves.  This suite imports nothing from server/src: it tests
 * the page's own rules (as stick-zones.test does) and does not deploy.
 *
 *   1. THE PANEL'S SHAPE BY DEVICE: upright 48% of the screen, never under
 *      318 nor over 410; a phone on its side and a computer (a mouse) a
 *      right drawer 40% wide from the top to the dock; the controls hidden
 *      upright, left of the drawer otherwise; its CSS the same numbers;
 *   2. THE ROUTER: every entry always opens the same place -- the dock's
 *      three their first sections, the shortcuts theirs -- and asked twice,
 *      from any state, the same answer; until a section is built its road is
 *      today's, and every page road is a page today's band has (nothing a
 *      player could reach yesterday is lost); a built section opens the
 *      panel; the dock pressed again closes its menu;
 *   3. THE CLOSES: the X, a world tap (and not a drag), a header swipe down
 *      (and not sideways or up; right on the drawer), Esc, a hit outside a
 *      safe place (and never inside one, never twice for one hit, never
 *      with nothing open);
 *   4. THE KEYS: the owner's keys the game already gives the band open what
 *      the router says (deskKeys.js NAV_KEYS, MAP_KEY); a key the game gives
 *      something else (F, R in desktopControls.js) is marked taken, never
 *      claimed;
 *   5. THE SWITCH: on by default; `?menus3=0` off and remembered; `?menus3=1`
 *      back on; the harness pins the old scenarios to `menus3=0` in its one
 *      place; under the switch's off nothing starts (startMenus3 returns
 *      before any listener). */
import { readFileSync } from 'node:fs';
import { MENUS3_PANEL, menus3Shape, menus3Panel, panelCss } from '../../src/game/menus3Panel.js';
import { MENUS3, MENUS3_DOCK, MENUS3_ENTRIES, MENUS3_TODAY, MENUS3_KEYS, menus3Route, menus3DockPress, menus3MenuOf } from '../../src/game/menus3Router.js';
import { MENUS3_CLOSE, MENUS3_CLOSE_WAYS, menus3CloseWhy, menus3HitStep } from '../../src/game/menus3Close.js';
import { FRAME_PAGES } from '../../src/game/dashDests.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* ── 1. the panel's shape ── */
{
  check('1a an upright phone is upright', menus3Shape(390, 844, false) === 'upright');
  check('1b a phone on its side is the drawer', menus3Shape(844, 390, false) === 'drawer');
  check('1c a computer is the drawer, any shape', menus3Shape(1280, 800, true) === 'drawer' && menus3Shape(800, 1280, true) === 'drawer');
  check('1d an upright tablet is upright', menus3Shape(768, 1024, false) === 'upright');
  const p = menus3Panel(390, 844, false, 60);
  check('1e upright 48% of 844 is 405', p.h === 405 && p.shape === 'upright', p);
  check('1f upright never under 318', menus3Panel(360, 560, false, 60).h === 318);
  check('1g upright never over 410', menus3Panel(768, 1024, false, 60).h === 410 && menus3Panel(430, 932, false, 60).h === 410);
  check('1h upright full width, on the dock', p.w === 390 && p.bottom === 60);
  check('1i upright the controls hidden', p.controls === 'hidden');
  const d = menus3Panel(844, 390, false, 50);
  check('1j the drawer 40% wide', d.w === Math.round(844 * 0.4) && d.shape === 'drawer', d);
  check('1k the drawer from the top to the dock', d.h === 340 && d.bottom === 50, d);
  check('1l the drawer leaves the controls', d.controls === 'left' && d.worldShift === 0);
  const c = menus3Panel(1280, 800, true, 60);
  check('1m a computer: the drawer, 512 wide', c.w === 512 && c.controls === 'left', c);
  const up = panelCss('upright'), dr = panelCss('drawer');
  check('1n the CSS clamp carries the rule\'s numbers', up.height === 'clamp(318px, 48vh, 410px)', up);
  check('1o the CSS drawer 40% on the right', dr.width === '40%' && dr.right === 0 && dr.top === 0, dr);
  check('1p the numbers are the owner\'s', MENUS3_PANEL.MIN_H === 318 && MENUS3_PANEL.MAX_H === 410 && MENUS3_PANEL.UP_SHARE === 0.48 && MENUS3_PANEL.DRAWER_SHARE === 0.4);
  check('1q a nonsense size draws nothing wide', menus3Panel(NaN, -5, false, 'x').w === 0);
}

/* ── 2. the router ── */
{
  check('2a three menus of three', MENUS3_DOCK.length === 3 && MENUS3_DOCK.every((m) => MENUS3[m].length === 3));
  check('2b nine distinct sections', new Set([].concat(MENUS3.bro, MENUS3.world, MENUS3.people)).size === 9);
  const first = { 'dock.bro': 'bag', 'dock.world': 'quests', 'dock.people': 'roster' };
  for (const e of Object.keys(first)) {
    const r = menus3Route(e);
    check('2c ' + e + ' opens its first section', r && r.section === first[e] && r.section === MENUS3[r.menu][0], r);
  }
  /* v2.3.6864 (card MN step 10): + the party chip and the old player list's doors, both People · Roster */
  const want = { 'hud.face': ['bro', 'power'], 'hud.weaponBar': ['bro', 'power'], 'hud.minimap': [null, 'map'], 'hud.gear': [null, 'settings'], 'hud.questLine': ['world', 'quests'], 'hud.chatLines': ['people', 'chat'], 'hud.partyChip': ['people', 'roster'], 'game.players': ['people', 'roster'] };
  for (const e of Object.keys(want)) {
    const r = menus3Route(e, { held: 'ranged' });
    check('2d ' + e + ' opens ' + want[e].join('/'), r && r.menu === want[e][0] && r.section === want[e][1], r);
  }
  /* v2.3.6867 (card MN step 8): + the NEW MONSTER card's tap, World · Codex (menus3-codex.test 3b) */
  const r7 = menus3Route('card.newMonster');
  check('2d card.newMonster opens world/codex', r7 && r7.menu === 'world' && r7.section === 'codex', r7);
  check('2e every entry is named here', Object.keys(MENUS3_ENTRIES).length === 3 + 8 + 1);
  /* the same answer whatever was open before (rule 1, deterministic) */
  for (const e of Object.keys(MENUS3_ENTRIES)) {
    const a = JSON.stringify(menus3Route(e, { held: 'melee' }));
    menus3Route('dock.people'); menus3Route('hud.gear');
    check('2f ' + e + ' answers the same twice', a === JSON.stringify(menus3Route(e, { held: 'melee' })));
  }
  check('2g the weapon bar goes to the weapon in hand', menus3Route('hud.weaponBar', { held: 'staff' }).page === 'broStaff'
    && menus3Route('hud.weaponBar', { held: 'melee' }).page === 'broSword' && menus3Route('hud.weaponBar', { held: 'ranged' }).page === 'broBow');
  check('2h no weapon known: Power\'s page', menus3Route('hud.weaponBar', {}).page === 'hero' && menus3Route('hud.weaponBar', {}).road === 'page');
  check('2i the face opens Power', menus3Route('hud.face').page === 'hero');
  check('2j an unknown entry opens nothing', menus3Route('dock.clans') === null && menus3Route('__proto__') === null && menus3Route(null) === null);
  /* step 1: nothing built, so every road is today's, and every page road is a page the band has */
  const panels = src('src/ui/mobile/BottomDashboard.jsx');
  for (const s of Object.keys(MENUS3_TODAY)) {
    const t = MENUS3_TODAY[s];
    if (t.road !== 'page') continue;
    const inBand = !!FRAME_PAGES[t.page] || new RegExp('\\n  ' + t.page + ':\\s+\\{').test(panels);
    check('2k ' + s + '\'s road is a page today\'s band has (' + t.page + ')', inBand);
  }
  check('2l every section has today\'s road', [].concat(MENUS3.bro, MENUS3.world, MENUS3.people, ['map', 'settings']).every((s) => MENUS3_TODAY[s] && MENUS3_TODAY[s].road));
  check('2m nothing built: no entry opens the panel', Object.keys(MENUS3_ENTRIES).every((e) => menus3Route(e).road !== 'panel'));
  const b = menus3Route('dock.bro', { built: ['bag'] });
  check('2n a built section opens the panel', b.road === 'panel' && b.built === true && b.section === 'bag');
  check('2o built as a Set too', menus3Route('dock.world', { built: new Set(['quests']) }).road === 'panel');
  check('2p the dock opens, and closes its own menu', menus3DockPress('bro', null) === 'open' && menus3DockPress('bro', 'bro') === 'close' && menus3DockPress('bro', 'world') === 'open');
  check('2q no such dock button', menus3DockPress('clans', null) === null);
  check('2r a page knows its menu', menus3MenuOf('quests') === 'world' && menus3MenuOf('leaderboard') === 'people' && menus3MenuOf('gear') === 'bro' && menus3MenuOf('skills') === 'bro' && menus3MenuOf('nothing') === null);
}

/* ── 3. the closes ── */
{
  check('3a five ways', MENUS3_CLOSE_WAYS.join() === 'x,world,swipe,esc,hit');
  check('3b the X', menus3CloseWhy({ kind: 'x' }) === 'x');
  check('3c a world tap', menus3CloseWhy({ kind: 'world', dx: 3, dy: 4 }) === 'world');
  check('3d a world drag is no tap', menus3CloseWhy({ kind: 'world', dx: 8, dy: 8 }) === null && menus3CloseWhy({ kind: 'world', dx: MENUS3_CLOSE.TAP_MOVE, dy: 0 }) === null);
  check('3e a header swipe down', menus3CloseWhy({ kind: 'swipe', dx: 5, dy: 60, shape: 'upright' }) === 'swipe');
  check('3f a short or sideways or upward swipe does not', menus3CloseWhy({ kind: 'swipe', dx: 0, dy: 30 }) === null
    && menus3CloseWhy({ kind: 'swipe', dx: 80, dy: 40, shape: 'upright' }) === null && menus3CloseWhy({ kind: 'swipe', dx: 0, dy: -80 }) === null);
  check('3g the drawer swiped right closes; upright it does not', menus3CloseWhy({ kind: 'swipe', dx: 60, dy: 4, shape: 'drawer' }) === 'swipe'
    && menus3CloseWhy({ kind: 'swipe', dx: 60, dy: 4, shape: 'upright' }) === null);
  check('3h Esc', menus3CloseWhy({ kind: 'key', key: 'Escape' }) === 'esc' && menus3CloseWhy({ kind: 'key', key: 'i' }) === null);
  check('3i a hit outside a safe place', menus3CloseWhy({ kind: 'hit', safe: false }) === 'hit' && menus3CloseWhy({ kind: 'hit', safe: true }) === null);
  check('3j nonsense closes nothing', menus3CloseWhy(null) === null && menus3CloseWhy({ kind: 'wave' }) === null);
  let r = menus3HitStep(0, 1000, true, false);
  check('3k a new hit while open, unsafe: closes', r.close === true && r.seen === 1000);
  r = menus3HitStep(r.seen, 1000, true, false);
  check('3l the same hit read again does not', r.close === false && r.seen === 1000);
  check('3m a hit on safe ground does not', menus3HitStep(1000, 2000, true, true).close === false && menus3HitStep(1000, 2000, true, true).seen === 2000);
  check('3n a hit with nothing open only moves the stamp', menus3HitStep(1000, 3000, false, false).close === false && menus3HitStep(1000, 3000, false, false).seen === 3000);
  check('3o no stamp', menus3HitStep(0, 0, true, false).close === false && menus3HitStep(5, undefined, true, false).seen === 5);
}

/* ── 4. the keys ── */
{
  const dk = src('src/game/deskKeys.js');
  const m = /NAV_KEYS = Object\.freeze\(\{([^}]*)\}/.exec(dk);
  const nav = Object.create(null);
  if (m) for (const pair of m[1].split(',')) { const kv = /(\w+):\s*'(\w)'/.exec(pair); if (kv) nav[kv[1]] = kv[2]; }
  check('4a the band\'s keys read', Object.keys(nav).length >= 7, nav);
  for (const k of Object.keys(MENUS3_KEYS)) {
    const row = MENUS3_KEYS[k];
    if (row.taken || ['map', 'chat', 'emotes'].indexOf(row.section) >= 0) continue;
    check('4b ' + k + ' is today\'s key for ' + row.today, nav[row.today] === k, { k, nav: nav[row.today] });
  }
  check('4c M is the map\'s', /MAP_KEY = 'M'/.test(dk));
  const dc = src('src/game/desktopControls.js');
  check('4d C opens the chat box today', /e\.code === 'KeyC'[\s\S]{0,80}setChatOpen\(true\)/.test(dc));
  check('4e B the emotes', /e\.code === 'KeyB'/.test(dc));
  for (const k of ['F', 'R']) {
    check('4f ' + k + ' is the game\'s already: marked taken', !!MENUS3_KEYS[k].taken && new RegExp("e\\.code === 'Key" + k + "'").test(dc));
    check('4g ' + k + ' is no band key', !Object.values(nav).includes(k));
  }
  check('4h the owner\'s eleven', Object.keys(MENUS3_KEYS).join('') === 'IPLJMKFRUCB');
}

/* ── 5. the switch ── */
{
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  let n = 0;
  async function wanted(search) {
    globalThis.location = { search };
    const mod = await import('../../src/ui/menus3/menus3Switch.js?n=' + (++n));
    return mod.menus3Wanted();
  }
  check('5a on by default', (await wanted('')) === true);
  check('5b ?menus3=0 off', (await wanted('?menus3=0')) === false && store.get('bt_menus3') === '0');
  check('5c remembered', (await wanted('')) === false);
  check('5d ?menus3=1 back', (await wanted('?menus3=1')) === true && !store.has('bt_menus3') && (await wanted('')) === true);
  delete globalThis.location;
  const h = src('tools/qa/mp/harness.mjs');
  check('5e the harness pins the old scenarios to menus3=0', /const _oldMenus = [^;]*'menus3=0'/.test(h) && /_oldCombat, _oldMenus\]/.test(h));
  const w = src('src/ui/menus3/menus3Wire.js');
  const start = w.slice(w.indexOf('export function startMenus3'));
  check('5f off: startMenus3 returns before any listener or fold', start.indexOf('if (!_on) return;') > 0
    && start.indexOf('if (!_on) return;') < start.indexOf('addEventListener') && start.indexOf('if (!_on) return;') < start.indexOf('dashMinBus.set'));
  check('5g the fold is never written under the switch', /if \(!dashMinBus\.sideways && !dashMinBus\.quiet\)/.test(src('src/ui/mobile/dashMinBus.js')));
  check('5h the dock only under the switch', /if \(menus3On\(\)\) return wrap\(<Menus3Dock mark=\{mark\} tap=\{frameTap\} \/>\)/.test(src('src/ui/mobile/dash/DashHeader.jsx')));
  check('5i the chat lines\' road only under the switch', /if \(menus3On\(\)\) \{ menus3Go\('hud\.chatLines'\); return; \}\s*\n\s*toggle\(\);/.test(src('src/ui/mobile/WorldChatFeed.jsx')));
  check('5j the gear only under the switch', /menus3On\(\) \? <Menus3Gear/.test(src('src/ui/WorldMapOverlay.jsx')));
}

console.log(`menus3-rules: ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
