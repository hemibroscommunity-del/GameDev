/* ═══ v2.3.6681: THE DASHBOARD'S WAY ROUND HOLDS (card UI2-frame, the build's step 2) ═══
 *
 * src/game/dashNav.js is the dashboard's one state and its one transition
 * (Gear and Menu, each its own remembered stack; Back by the real journey;
 * Close resets nothing; the Menu shortcut to the root).  Here, not in
 * server/test (a file there deploys the worker), this suite plays journeys
 * through it and checks what a player gets (part 1), the destinations' table
 * (part 2), and the old face's words (part 3).
 *
 * THE DODGES (the card's list, the ways a tired programmer writes them).
 * Each is PLANTED below as a wrapper round the real transition and the
 * journeys are played against it: each must turn its own check red, every
 * run (part 4).  A plant that stays green fails the suite.
 *   P1 Back goes to the category's parent, not the page you came from
 *   P2 Close empties a stack
 *   P3 opening Gear clears the Menu's stack
 *   P4 opening the Menu clears Gear's stack
 *   P5 a shortcut to the page already on top pushes it twice
 *   P6 the same page twice in one journey shares one scroll
 *   P7 resume lands on a page the worker no longer offers
 *   P8 Back at the Menu's root does nothing
 *   P9 the Menu shortcut resumes instead of going to the root
 *   P10 opening the Menu from play goes to the root instead of resuming
 *   P11 after the Menu shortcut, Back from the root walks into the pages
 *       that were open before it
 *   P12 a page's `from` or `who` is lost when another page is pushed over it
 *       and popped
 *   P13 a page reached from the world goes Back to a list you never saw
 *   P14 (v2.3.6682) folding by the band's handle empties a stack (the old
 *       "to the bar" then the fold: Gear's root, then closed)
 *   P15 (v2.3.6682) folding by the handle trims a stack to its first page
 *       (the old toBar's memory)
 *
 * v2.3.6682 (card UI2-frame PR 2): part 5, THE MOTION (src/game/dashGrow.js,
 * dash/DashGrowBox.jsx, dash/dashGrow.css) and the handle's road
 * (dash/BandGrip.jsx), each read off its syntax tree or its rules, with its
 * own plants, each seen red:
 *   M1 the motion's box measures the page (a getBoundingClientRect at the tap)
 *   M2 a timer takes the class off (setTimeout), not the animation's own end
 *   M3 the handle, under the frame, goes "to the bar" before it folds
 *   M4 a keyframe moves the page's layout (its height), not transform/opacity
 *   M5 Back grows from the centre, not into the place the page grew from
 *
 * Run: node tools/guards/dash-nav.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dashNavInit, dashNavStep, dashNavView, dashNavBackTo, dashNavOpen, dashNavKey, dashNavLegacy, isGearRoot,
} from '../../src/game/dashNav.js';
import { dashGrowOf, dashGrowOrigin, dashGrowTapFrom, DASH_GROW_MS } from '../../src/game/dashGrow.js';
import { parse } from './lib/writesOf.mjs';
import { MENU_DESTS, DASH_HUBS, FRAME_PAGES, MORE_ROADS, destOfPage, menuGridShape, frameMarks } from '../../src/game/dashDests.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}
const ids = (stack) => stack.map((e) => e.id).join(',');

/* ── part 1: the journeys, each a named check; played against `step` ── */
function journeys(step) {
  const out = [];
  const ok = (name, cond, detail) => out.push({ name, ok: !!cond, detail });
  const play = (s, ...acts) => acts.reduce((x, a) => step(x, a), s);
  const top = (s) => dashNavView(s).top;
  const closed = dashNavInit(false);
  const open = dashNavInit(true);

  /* 1a Back follows the journey: Bro, then a quest's page from inside Bro */
  {
    const s = play(open, { type: 'menu' }, { type: 'push', id: 'hero' }, { type: 'push', id: 'questDetail' }, { type: 'back' });
    ok('1a Back from a page lands on the page you came from (Bro), not its category (Quests)', s.ws === 'menu' && top(s) && top(s).id === 'hero', ids(s.menu));
  }
  /* 1b Close keeps both stacks; the Menu from play resumes its page */
  {
    let s = play(open, { type: 'push', id: 'weapons' }, { type: 'menu' }, { type: 'push', id: 'quests' }, { type: 'push', id: 'questDetail' }, { type: 'close' });
    ok('1b Close hides the dashboard', s.shown === false);
    ok('1c Close keeps the Menu\'s pages and Gear\'s', ids(s.menu) === 'quests,questDetail' && ids(s.gear) === 'weapons', ids(s.menu) + ' | ' + ids(s.gear));
    s = step(s, { type: 'menu' });
    ok('1d the Menu from play resumes its last page', s.shown && s.ws === 'menu' && top(s) && top(s).id === 'questDetail', ids(s.menu));
  }
  /* 1e Gear and the Menu keep their own */
  {
    let s = play(open, { type: 'push', id: 'weapons' }, { type: 'menu' }, { type: 'push', id: 'leaderboard' }, { type: 'gear' });
    ok('1e Gear resumes its own page, the Menu\'s kept', s.ws === 'gear' && top(s) && top(s).id === 'weapons' && ids(s.menu) === 'leaderboard', ids(s.gear) + ' | ' + ids(s.menu));
    s = step(s, { type: 'menu' });
    ok('1f ...and the Menu its own, Gear\'s kept', s.ws === 'menu' && top(s).id === 'leaderboard' && ids(s.gear) === 'weapons', ids(s.gear) + ' | ' + ids(s.menu));
  }
  /* 1g a shortcut to the page already on top is not pushed twice */
  {
    const s = play(open, { type: 'menu' }, { type: 'push', id: 'quests' }, { type: 'arrive', id: 'quests' }, { type: 'push', id: 'quests' });
    ok('1g a page already on top is not pushed again', ids(s.menu) === 'quests', ids(s.menu));
  }
  /* 1h the same page twice in one journey keeps two scrolls */
  {
    let s = play(open, { type: 'menu' }, { type: 'push', id: 'hero' });
    const k1 = top(s).key;
    s = play(s, { type: 'keep', key: k1, scroll: 120 }, { type: 'push', id: 'quests' }, { type: 'push', id: 'hero' });
    const k2 = top(s).key;
    s = play(s, { type: 'keep', key: k2, scroll: 40 }, { type: 'back' }, { type: 'back' });
    ok('1h the same page twice in one journey keeps its own scroll (120 under, 40 over)', k1 !== k2 && top(s).id === 'hero' && top(s).scroll === 120, `${k1} ${k2} ${top(s) && top(s).scroll}`);
  }
  /* 1i resume falls to the Menu's root when a page is no longer offered */
  {
    const s = play(open, { type: 'menu' }, { type: 'push', id: 'guild' }, { type: 'close' }, { type: 'menu', offers: (id) => id !== 'guild' });
    ok('1i resume of a page the worker no longer offers falls to the Menu\'s root', s.ws === 'menu' && s.shown && s.menu.length === 0, ids(s.menu));
    const s2 = play(open, { type: 'menu' }, { type: 'push', id: 'guild' }, { type: 'close' }, { type: 'menu', offers: () => true });
    ok('1j ...and one still offered is resumed', top(s2) && top(s2).id === 'guild', ids(s2.menu));
  }
  /* 1k Back at the Menu's root is Gear */
  {
    const s = play(open, { type: 'menu' }, { type: 'back' });
    ok('1k Back at the Menu\'s root goes to Gear', s.ws === 'gear' && s.shown, s.ws);
    const t = dashNavBackTo(play(open, { type: 'menu' }));
    ok('1l ...and its words say Gear', t && t.kind === 'ws' && t.ws === 'gear', JSON.stringify(t));
  }
  /* 1m the Menu shortcut on a deep page: the root, nothing under it */
  {
    let s = play(open, { type: 'menu' }, { type: 'push', id: 'hero' }, { type: 'push', id: 'skills' }, { type: 'menuRoot' });
    ok('1m the Menu shortcut lands on the directory\'s root', s.ws === 'menu' && s.menu.length === 0, ids(s.menu));
    s = step(s, { type: 'back' });
    ok('1n ...and Back from there goes to Gear, not into the pages before it', s.ws === 'gear' && dashNavView(s).top === null, s.ws + ' ' + ids(s.menu) + ' ' + ids(s.gear));
  }
  /* 1o the Menu from play resumes (not the root) */
  {
    const s = play(closed, { type: 'menu' }, { type: 'push', id: 'encyclopedia' }, { type: 'close' }, { type: 'menu' });
    ok('1o the Menu opened from play resumes its page, not the root', top(s) && top(s).id === 'encyclopedia', ids(s.menu));
  }
  /* 1p from and who survive a page pushed over and popped */
  {
    const s = play(open, { type: 'menu' }, { type: 'push', id: 'hero', who: 'p_7', from: { cell: [1, 0] } }, { type: 'push', id: 'skills' }, { type: 'back' });
    const t = top(s);
    ok('1p a page\'s `who` and `from` survive a page pushed over it and popped', t && t.who === 'p_7' && t.from && t.from.cell && t.from.cell[0] === 1, JSON.stringify(t));
  }
  /* 1q an arrival from the world goes Back to where you were */
  {
    let s = play(closed, { type: 'arrive', id: 'quests' }, { type: 'push', id: 'questDetail', replace: true });
    ok('1q the quest card\'s page alone, no list you never saw under it', ids(s.menu) === 'questDetail', ids(s.menu));
    const t = dashNavBackTo(s);
    ok('1r ...its Back says the world', t && t.kind === 'world', JSON.stringify(t));
    s = step(s, { type: 'back' });
    ok('1s ...and goes there: the dashboard closed again', s.shown === false && s.menu.length === 0, `${s.shown} ${ids(s.menu)}`);
    let g = play(open, { type: 'arrive', id: 'hero' }, { type: 'back' });
    ok('1t an arrival from Gear goes Back to Gear', g.shown && g.ws === 'gear', g.ws);
    g = play(open, { type: 'menu' }, { type: 'push', id: 'quests' }, { type: 'gear' }, { type: 'arrive', id: 'hero' }, { type: 'back' });
    ok('1u ...and leaves the Menu\'s own pages as they were', g.ws === 'gear' && ids(g.menu) === 'quests', ids(g.menu));
  }
  /* 1v a journey broken by Close forgets its way home: Back walks the Menu's own pages */
  {
    const s = play(open, { type: 'menu' }, { type: 'push', id: 'quests' }, { type: 'close' }, { type: 'arrive', id: 'hero' }, { type: 'close' }, { type: 'menu' }, { type: 'back' });
    ok('1v after Close, Back walks the Menu\'s own history', s.shown && s.ws === 'menu' && top(s) && top(s).id === 'quests', ids(s.menu));
  }
  /* 1w Gear's root: no Back; Back there (Esc) closes */
  {
    ok('1w Gear\'s root has no Back', dashNavBackTo(open) === null);
    const s = step(open, { type: 'back' });
    ok('1x a Back asked at Gear\'s root closes', s.shown === false);
  }
  /* 1y a page pushed while closed is an arrival */
  {
    const s = step(closed, { type: 'push', id: 'pets' });
    ok('1y a page asked while closed opens it, Back to the world', s.shown && s.ws === 'menu' && top(s).id === 'pets' && dashNavBackTo(s).kind === 'world', ids(s.menu));
  }
  /* 1z rest: Gear's root, the Menu kept */
  {
    const s = play(open, { type: 'push', id: 'weapons' }, { type: 'menu' }, { type: 'push', id: 'quests' }, { type: 'rest' });
    ok('1z the old "to the bar" is Gear\'s root, the Menu\'s pages kept', s.ws === 'gear' && s.gear.length === 0 && ids(s.menu) === 'quests', ids(s.gear) + ' | ' + ids(s.menu));
  }
  /* 1A (v2.3.6682) the band's handle hides and keeps BOTH workspaces, their scroll and selection */
  {
    let s = play(open, { type: 'push', id: 'weapons' });
    const wk = top(s).key;
    s = play(s, { type: 'keep', key: wk, scroll: 140 }, { type: 'menu' }, { type: 'push', id: 'quests' });
    const qk = top(s).key;
    s = play(s, { type: 'keep', key: qk, scroll: 60, sel: 'q_7' }, { type: 'push', id: 'questDetail' }, { type: 'gear' }, { type: 'fold' });
    const g = s.gear[0], q = s.menu[0];
    ok('1A folding by the handle hides the dashboard and keeps both workspaces\' pages, scroll and selection',
      s.shown === false && ids(s.gear) === 'weapons' && ids(s.menu) === 'quests,questDetail' && g.scroll === 140 && q.scroll === 60 && q.sel === 'q_7',
      `${s.shown} ${ids(s.gear)} | ${ids(s.menu)} ${g && g.scroll} ${q && q.scroll} ${q && q.sel}`);
    s = step(s, { type: 'fold' });
    ok('1B ...and the handle again opens Gear as it was left', s.shown && s.ws === 'gear' && top(s) && top(s).id === 'weapons' && top(s).scroll === 140, ids(s.gear));
    s = play(s, { type: 'menu' }, { type: 'fold' }, { type: 'menu' });
    ok('1C folded from the Menu, the Menu resumes its page', s.shown && s.ws === 'menu' && top(s) && top(s).id === 'questDetail', ids(s.menu));
  }
  return out;
}

const real = journeys(dashNavStep);
for (const r of real) check(r.name, r.ok, r.detail);

/* ── part 2: the destinations' table ── */
{
  check('2a the Menu has eight doors, each its id, word, picture and page or opening',
    MENU_DESTS.length === 8 && MENU_DESTS.every((d) => d.id && /^dashFrame\./.test(d.word) && /^\/icons\//.test(d.art) && (d.page || d.opens)),
    MENU_DESTS.map((d) => d.id).join(','));
  check('2b in the agreed order: Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings',
    MENU_DESTS.map((d) => d.word.split('.')[1]).join(',') === 'bro,quests,social,ranks,codex,homestead,map,settings');
  const pics = MENU_DESTS.map((d) => d.art).concat(...Object.values(DASH_HUBS).map((h) => h.map((d) => d.art))).filter(Boolean);
  const missing = pics.filter((p) => !fs.existsSync(path.join(ROOT, 'public', p)));
  check('2c every picture is a file the game has (no new art)', missing.length === 0, missing.join(', '));
  /* the words: each a key of the table */
  const sayFile = fs.readFileSync(path.join(ROOT, 'src/data/say/dashFrame.js'), 'utf8');
  const words = [...MENU_DESTS.map((d) => d.word), ...Object.values(DASH_HUBS).flatMap((h) => h.flatMap((d) => [d.word, d.wordClan].filter(Boolean))), ...Object.values(FRAME_PAGES)];
  const unsaid = words.filter((w) => !sayFile.includes(`'${w}'`));
  check('2d every word is a key of src/data/say/dashFrame.js', unsaid.length === 0, unsaid.join(', '));
  /* More's fifteen, each with its road */
  const more = fs.readFileSync(path.join(ROOT, 'src/ui/mobile/dash/MorePanel.jsx'), 'utf8');
  const tiles = [...more.matchAll(/^\s*\{\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
  const roadless = tiles.filter((t) => !MORE_ROADS[t]);
  check(`2e every one of More's ${tiles.length} pages has its new road`, tiles.length === 15 && roadless.length === 0, `${tiles.join(',')} | without: ${roadless.join(',')}`);
  const lost = Object.entries(MORE_ROADS).filter(([id, road]) => {
    if (road === 'bro') return !['skills', 'achievements', 'pets'].includes(id);
    if (road === 'bro:character') return id !== 'journey';   /* v2.3.6684 (card UI2-bro): Journey, the passport's door */
    if (road.startsWith('menu:')) return !MENU_DESTS.some((d) => d.id === road.slice(5));
    if (road.startsWith('hub:')) return !(DASH_HUBS[road.slice(4)] || []).some((d) => d.page === id);
    return true;
  });
  check('2f ...and each road is real (a Menu door, a hub\'s tile, or Bro\'s own door)', lost.length === 0, lost.map((x) => x.join('=')).join(', '));
  check('2g a hub is opened by its Menu door', Object.keys(DASH_HUBS).every((h) => MENU_DESTS.some((d) => d.page === h)));
  check('2h destOfPage finds a door by its page', destOfPage('quests').id === 'quests' && destOfPage('guild').id === 'guild' && destOfPage('nope') === null);
  const up = menuGridShape(8, false), side = menuGridShape(8, true);
  check('2i the grid: four across and two down upright, eight in a row sideways', up.cols === 4 && up.rows === 2 && side.cols === 8 && side.rows === 1, JSON.stringify([up, side]));
  const fm = frameMarks({ quests: true, encyclopedia: 2, social: 1, more: 3 }, 4, false);
  const quiet = frameMarks({}, 0, false);
  check('2k the marks: points glow on Bro and climb to the Menu as a count; the bell on Settings; nothing waiting, nothing marked',
    fm.doors.hero.count === 4 && fm.doors.hero.glow && fm.menu.count === 4 && fm.menu.glow && fm.doors.settings.count === 3 && fm.doors.quests.dot
    && !quiet.menu.count && !quiet.menu.dot && !quiet.menu.glow && frameMarks({ quests: true }, 0, false).menu.dot === true);
  const keys = MENU_DESTS.filter((d) => d.key).map((d) => d.key);
  check('2j a door\'s key is unique, and the letters of the pages they open today (P J U K M)', new Set(keys).size === keys.length && keys.join('') === 'PJUKM', keys.join(''));
}

/* ── part 3: the old face's words ── */
{
  const open = dashNavInit(true);
  check('3a open("dashboard"/"bag") is Gear\'s root; "more" the Menu\'s root; a page an arrival',
    dashNavOpen('dashboard').type === 'rest' && dashNavOpen('bag').type === 'rest' && dashNavOpen('more').type === 'menuRoot' && dashNavOpen('quests').type === 'arrive' && isGearRoot('inventory'));
  check('3b the old state at rest: the bar', JSON.stringify(dashNavLegacy(open)) === JSON.stringify({ stack: ['bag'], mode: 'bar' }));
  const m = dashNavStep(open, { type: 'arrive', id: 'quests' });
  check('3c a page: expanded, its id on top', dashNavLegacy(m).mode === 'expanded' && dashNavLegacy(m).stack.slice(-1)[0] === 'quests');
  check('3d the Menu\'s root reads as the page "menu"', dashNavLegacy(dashNavStep(open, { type: 'menuRoot' })).stack[0] === 'menu');
  check('3e closed reads as the bar', dashNavLegacy(dashNavStep(m, { type: 'close' })).mode === 'bar');
  check('3f a key: I is Gear (again closes), O the Menu (again closes), P its page (again closes)',
    dashNavKey(dashNavInit(false), 'dashboard').type === 'gear' && dashNavKey(open, 'dashboard').type === 'close'
    && dashNavKey(open, 'more').type === 'menu' && dashNavKey(dashNavStep(open, { type: 'menu' }), 'more').type === 'close'
    && dashNavKey(open, 'hero').type === 'arrive' && dashNavKey(dashNavStep(open, { type: 'arrive', id: 'hero' }), 'hero').type === 'close');
  {
    let q = dashNavStep(dashNavInit(false), { type: 'arrive', id: 'quests' });
    q = dashNavStep(q, { type: 'push', id: 'questDetail', replace: true });
    q = dashNavStep(q, dashNavOpen('quests', q));
    check('3h a page that hands over (the quest\'s page to the Quests tab) is replaced, its way home kept: Back leaves',
      ids(q.menu) === 'quests' && dashNavBackTo(q).kind === 'world' && dashNavStep(q, { type: 'back' }).shown === false, ids(q.menu));
  }
  const frozen = Object.isFrozen(open) && Object.isFrozen(m.menu) && Object.isFrozen(m.menu[0]);
  check('3g the state is frozen (one transition writes it)', frozen);
}

/* ── part 4: the dodges, planted; each must turn its own check red ── */
const PARENT = { questDetail: 'quests', skills: 'hero', achievements: 'hero', pets: 'hero' };
const wrap = (fn) => (s, a) => fn(s, a, dashNavStep);
const PLANTS = [
  ['P1 Back to the category\'s parent', '1a', wrap((s, a, st) => {
    if (a.type === 'back' && s.shown && s[s.ws].length) { const t = s[s.ws][s[s.ws].length - 1]; if (PARENT[t.id]) return st(st({ ...s, [s.ws]: Object.freeze([]) }, { type: 'push', id: PARENT[t.id] }), { type: 'keep', key: -1 }); }
    return st(s, a);
  })],
  ['P2 Close empties a stack', '1c', wrap((s, a, st) => (a.type === 'close' ? { ...st(s, a), menu: Object.freeze([]), gear: Object.freeze([]) } : st(s, a)))],
  ['P3 Gear clears the Menu', '1e', wrap((s, a, st) => (a.type === 'gear' ? { ...st(s, a), menu: Object.freeze([]) } : st(s, a)))],
  ['P4 the Menu clears Gear', '1f', wrap((s, a, st) => (a.type === 'menu' ? { ...st(s, a), gear: Object.freeze([]) } : st(s, a)))],
  ['P5 a shortcut pushes the top twice', '1g', wrap((s, a, st) => {
    if ((a.type === 'arrive' || a.type === 'push') && s.shown && s.ws === 'menu') { const seq = s.seq + 1; return { ...s, seq, menu: Object.freeze([...s.menu, Object.freeze({ id: a.id, key: seq, scroll: 0, sel: null, who: null, from: null, ret: null })]) }; }
    return st(s, a);
  })],
  ['P6 one scroll for the same page', '1h', wrap((s, a, st) => {
    const n = st(s, a);
    if (a.type !== 'push' && a.type !== 'arrive') return n;
    const fix = (stack) => Object.freeze(stack.map((e) => Object.freeze({ ...e, key: e.id })));
    return { ...n, menu: fix(n.menu), gear: fix(n.gear) };
  })],
  ['P7 resume ignores what the worker offers', '1i', wrap((s, a, st) => st(s, a.type === 'menu' ? { type: 'menu' } : a))],
  ['P8 Back at the Menu\'s root does nothing', '1k', wrap((s, a, st) => (a.type === 'back' && s.ws === 'menu' && !s.menu.length ? s : st(s, a)))],
  ['P9 the Menu shortcut resumes', '1m', wrap((s, a, st) => st(s, a.type === 'menuRoot' ? { type: 'menu' } : a))],
  ['P10 the Menu from play goes to the root', '1o', wrap((s, a, st) => st(s, a.type === 'menu' ? { type: 'menuRoot' } : a))],
  ['P11 Back from the root after the shortcut walks into the old pages', '1n', wrap((s, a, st) => {
    if (a.type === 'menuRoot') { const n = st(s, a); return { ...n, hid: s.menu }; }
    if (a.type === 'back' && s.hid && s.hid.length && s.ws === 'menu' && !s.menu.length) return { ...s, menu: s.hid, hid: null };
    return st(s, a);
  })],
  ['P12 who and from lost under a push', '1p', wrap((s, a, st) => {
    const n = st(s, a);
    if (a.type !== 'push') return n;
    const fix = (stack) => Object.freeze(stack.map((e, i) => (i < stack.length - 1 ? Object.freeze({ ...e, who: null, from: null }) : e)));
    return { ...n, menu: fix(n.menu) };
  })],
  ['P13 a world arrival goes Back to its list', '1s', wrap((s, a, st) => st(s, a.replace ? { ...a, replace: false } : a))],
  ['P14 the handle goes to the bar, then folds', '1A', wrap((s, a, st) => (a.type === 'fold' && s.shown ? st(st(s, { type: 'rest' }), { type: 'close' }) : st(s, a)))],
  ['P15 the handle keeps only each stack\'s first page', '1A', wrap((s, a, st) => {
    if (a.type !== 'fold' || !s.shown) return st(s, a);
    const n = st(s, a);
    return { ...n, gear: Object.freeze(n.gear.slice(0, 1)), menu: Object.freeze(n.menu.slice(0, 1)) };
  })],
];
for (const [name, want, step] of PLANTS) {
  let res;
  try { res = journeys(step); } catch (e) { res = [{ name: want + ' (threw)', ok: false }]; }
  const red = res.filter((r) => !r.ok).map((r) => r.name.split(' ')[0]);
  check(`4. plant ${name}: turns ${want} red`, red.includes(want) || red.some((r) => r.startsWith(want)), 'red: ' + (red.join(', ') || 'nothing'));
}

/* ── part 5 (v2.3.6682): the motion, and the handle's road ── */
{
  const open = dashNavInit(true);
  const cell = { cell: [2, 0], of: [4, 2] };
  const m0 = dashNavStep(open, { type: 'menu' });
  const m1 = dashNavStep(m0, { type: 'push', id: 'quests', from: cell });
  const g = dashGrowOf(m0, m1, { type: 'push', id: 'quests', from: cell });
  check('5a a page from a tile grows out of its cell', g && g.kind === 'grow' && g.origin === '62.5% 25%', JSON.stringify(g));
  const m2 = dashNavStep(m1, { type: 'push', id: 'questDetail' });
  const b = dashGrowOf(m2, dashNavStep(m2, { type: 'back' }), { type: 'back' });
  const b1 = dashGrowOf(m1, dashNavStep(m1, { type: 'back' }), { type: 'back' });
  check('5b Back shrinks into the place the page grew from (its own `from`), the centre when it had none',
    b1 && b1.kind === 'shrink' && b1.origin === '62.5% 25%' && b && b.kind === 'shrink' && b.origin === '50% 50%', JSON.stringify([b1, b]));
  const ws = dashGrowOf(m1, dashNavStep(m1, { type: 'gear' }), { type: 'gear' });
  const root = dashGrowOf(m2, dashNavStep(m2, { type: 'menuRoot' }), { type: 'menuRoot' });
  const play = dashGrowOf(dashNavInit(false), dashNavStep(dashNavInit(false), { type: 'arrive', id: 'quests', from: cell }), { type: 'arrive', id: 'quests', from: cell });
  check('5c a change of workspace, the Menu\'s root by its shortcut, and the dashboard opened from play grow from nothing',
    [ws, root, play].every((x) => x && x.kind === 'fresh' && x.origin === '50% 50%'), JSON.stringify([ws, root, play]));
  const c = dashGrowOf(m2, dashNavStep(m2, { type: 'close' }), { type: 'close' });
  const k = dashGrowOf(m1, dashNavStep(m1, { type: 'keep', key: m1.menu[0].key, scroll: 9 }), { type: 'keep' });
  const f = dashGrowOf(m2, dashNavStep(m2, { type: 'fold' }), { type: 'fold' });
  check('5d Close, the handle\'s fold and a kept scroll move nothing', c === null && k === null && f === null, JSON.stringify([c, k, f]));
  check('5e a tap\'s point is a `from` off the kept window (px from the band\'s centre line and its foot)',
    JSON.stringify(dashGrowTapFrom(300, 800, 390, 844)) === '{"pt":[105,44]}' && dashGrowOrigin({ pt: [105, 44] }) === 'calc(50% + 105px) calc(100% - 44px)'
    && dashGrowOrigin(null) === '50% 50%' && dashGrowOrigin({ cell: [9, 9], of: [0, 0] }) === '50% 50%' && dashGrowTapFrom(NaN, 1, 1, 1) === null);
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MOTION_FILES = ['src/game/dashGrow.js', 'src/ui/mobile/dash/DashGrowBox.jsx', 'src/ui/mobile/dash/dashGrowSwitch.js'];
/* NOTHING measured, no timer: the motion's files call no layout read and no clock-driven end (read off the tree) */
const MEASURES = new Set(['getBoundingClientRect', 'getClientRects', 'getComputedStyle', 'offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop',
  'clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight', 'innerWidth', 'innerHeight', 'elementFromPoint', 'requestAnimationFrame',
  'setTimeout', 'setInterval', 'requestIdleCallback']);
function measuresIn(code) {
  const hits = [];
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier' && MEASURES.has(n.name)) hits.push(n.name);
    if (n.type === 'StringLiteral' && MEASURES.has(n.value)) hits.push(n.value);
    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(parse(code).program);
  return hits;
}
function check5f(files) {
  const bad = [];
  for (const [rel, code] of files) for (const h of measuresIn(code)) bad.push(`${rel}: ${h}`);
  return bad;
}
/* the keyframes move only transform and opacity, at the band's 220 ms */
function check5g(css) {
  const bad = [];
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*\}/g)) {
    for (const d of m[2].matchAll(/([a-z-]+)\s*:/g)) if (d[1] !== 'transform' && d[1] !== 'opacity') bad.push(`${m[1]}: ${d[1]}`);
  }
  if (!/animation-duration:\s*220ms/.test(css)) bad.push('not 220 ms');
  if (!(css.match(/@keyframes/g) || []).length) bad.push('no keyframes');
  return bad;
}
/* the handle's road under the frame (BandGrip.jsx, off its tree): every press
   handler of the grip and of CLOSE calls foldTap; foldTap's first statement
   is `if (dashboardPanelBus.frameOn()) { dashboardPanelBus.go({ type: 'fold' }); return; }`;
   no toBar anywhere else in the file */
function check5h(code) {
  const bad = [];
  const ast = parse(code).program;
  let fold = null;
  const toBars = [];
  const handlers = [];
  const walk = (n, inFold) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id && n.id.name === 'foldTap') { fold = n; inFold = true; }
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === 'toBar' && !inFold) toBars.push(n.loc && n.loc.start.line);
    if (n.type === 'JSXAttribute' && n.name && /^on(PointerUp|Click)$/.test(n.name.name)) handlers.push(n);
    for (const key of Object.keys(n)) {
      if (key === 'loc' || /Comments$/.test(key)) continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach((x) => walk(x, inFold)); else if (v && typeof v === 'object') walk(v, inFold);
    }
  };
  walk(ast, false);
  if (!fold) return ['no foldTap'];
  const first = fold.body.body[0];
  const isFrameOn = first && first.type === 'IfStatement' && first.test.type === 'CallExpression' && first.test.callee.property && first.test.callee.property.name === 'frameOn';
  const cons = isFrameOn ? (first.consequent.body || [first.consequent]) : [];
  const goFold = cons[0] && cons[0].type === 'ExpressionStatement' && cons[0].expression.type === 'CallExpression'
    && cons[0].expression.callee.property && cons[0].expression.callee.property.name === 'go'
    && (cons[0].expression.arguments[0] && cons[0].expression.arguments[0].properties || []).some((p) => p.key.name === 'type' && p.value.value === 'fold');
  const returns = cons[1] && cons[1].type === 'ReturnStatement';
  if (!isFrameOn || !goFold || !returns) bad.push('foldTap does not open with: under the frame, go({ type: "fold" }) and return');
  if (toBars.length) bad.push('toBar called outside foldTap at line ' + toBars.join(', '));
  const src = (n) => code.slice(n.start, n.end);
  const strays = handlers.filter((h) => !/foldTap\(/.test(src(h)));
  if (handlers.length < 4) bad.push(`only ${handlers.length} press handlers found`);
  if (strays.length) bad.push('a press handler without foldTap: ' + strays.map((h) => h.loc.start.line).join(', '));
  return bad;
}
const motionFiles = MOTION_FILES.map((rel) => [rel, read(rel)]);
const cssCode = read('src/ui/mobile/dash/dashGrow.css');
const gripCode = read('src/ui/mobile/dash/BandGrip.jsx');
{
  const f = check5f(motionFiles);
  check('5f the motion measures nothing and keeps no timer (its files, off their tree)', f.length === 0, f.join(', '));
  const g = check5g(cssCode);
  check('5g its keyframes move only transform and opacity, at the band\'s 220 ms', g.length === 0 && DASH_GROW_MS === 220 && /220ms/.test(read('src/ui/mobile/sheet/motion.js')), g.join(', '));
  const h = check5h(gripCode);
  check('5h the handle, under the frame, is the fold (BandGrip.jsx off its tree); toBar only on ?ui2=0', h.length === 0, h.join('; '));
  check('5i the box takes the class off at the animation\'s own end', /onAnimationEnd=\{end\}/.test(read('src/ui/mobile/dash/DashGrowBox.jsx')));
  check('5j ?dashgrow is a switch row of the table', /name: '\?dashgrow'/.test(read('tools/guards/lib/switches.mjs')));
}
/* the motion's plants: each must turn its own check red */
{
  const box = motionFiles[1][1];
  const m1 = check5f([[MOTION_FILES[1], box.replace('const m = dashboardPanelBus.grow();', 'const m = dashboardPanelBus.grow(); const r = document.body.getBoundingClientRect();')]]);
  check('5. plant M1 a measure at the tap: turns 5f red', m1.length > 0 && box.includes('const m = dashboardPanelBus.grow();'));
  const m2 = check5f([[MOTION_FILES[1], box.replace('const end = (e) => {', 'setTimeout(() => setEnded(m && m.n), 220);\n  const end = (e) => {')]]);
  check('5. plant M2 a timer takes the class off: turns 5f red', m2.length > 0 && box.includes('const end = (e) => {'));
  const m3 = check5h(gripCode.replace("dashboardPanelBus.go({ type: 'fold' }); return;", 'dashboardPanelBus.toBar(); dashMinBus.set(true); return;'));
  check('5. plant M3 the handle goes to the bar first: turns 5h red', m3.length > 0 && gripCode.includes("dashboardPanelBus.go({ type: 'fold' }); return;"));
  const m4 = check5g(cssCode.replace('from { transform: scale(.3); opacity: 0; }', 'from { transform: scale(.3); opacity: 0; height: 0; }'));
  check('5. plant M4 a keyframe moves the layout: turns 5g red', m4.length > 0 && cssCode.includes('from { transform: scale(.3); opacity: 0; }'));
  const plantM5 = (p, n, a) => { const r = dashGrowOf(p, n, a); return r && r.kind === 'shrink' ? { ...r, origin: '50% 50%' } : r; };
  const o = dashNavStep(dashNavInit(true), { type: 'menu' });
  const o1 = dashNavStep(o, { type: 'push', id: 'quests', from: { cell: [2, 0], of: [4, 2] } });
  const r5 = plantM5(o1, dashNavStep(o1, { type: 'back' }), { type: 'back' });
  check('5. plant M5 Back from the centre: turns 5b red', !(r5 && r5.origin === '62.5% 25%'));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
