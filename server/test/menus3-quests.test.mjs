/* ═══ v2.3.6863: WORLD · QUESTS' RULES (card MN step 7; src/game/menus3Quests.js) ═══
 *
 * The owner's Quests in the new panel, its rules played on the module
 * itself.  This suite imports nothing from server/src: it tests the page's
 * own rules (as menus3-bag.test does) and does not deploy.
 *
 *   1. THE RAIL: Active, On offer, Done in the owner's order and NO Daily
 *      (the game's daily quests are off); a forged place is Active; the
 *      tracked quest first, then the ones ready to hand in, each marked;
 *      the offers with who and where; the worker's answer not in is
 *      'loading', never "no quest"; nothing in hand with offers opens on
 *      On offer;
 *   2. THE TODAY STRIP: only what exists -- the spin only once the worker
 *      answered with its cap on, lit while it waits; the streak with its
 *      freezes and the Den's spin in the window's states; the farm's three
 *      read from the board, "at Feed & Seed" before it is seen or once a new
 *      day is up; the Daily Rewards door ONLY while the daily quests or the
 *      season are on; one place's words open at a time;
 *   3. A QUEST'S LINKS: from its data -- the monsters whose remains it asks
 *      for (each in the Codex), the item (only when someone leaves it), the
 *      place only where the game maps it; an offer its place alone; a done
 *      quest none;
 *   4. THE ROAD: World opens the panel on Quests (built); the quest line is
 *      World · Quests; Codex still today's (v2.3.6868: Feats built);
 *   5. v2.3.6866, A LINK'S WAY BACK (the gatekeeper's sitting 75): played on
 *      the band's own state (src/game/dashNav.js) -- only the arrival's own
 *      Back brings the panel back; the band's Menu (its root wipes the
 *      stack) then X drops the ticket (it brought the panel back); a Close
 *      drops it; a page on top and Back to the arrival keeps it. */
import { MENUS3_QUEST_RAIL, MENUS3_QUEST_PAGES, questRailId, questRails, questRailStart, questLinks, todayStrip, denSpin, todayTap } from '../../src/game/menus3Quests.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';
import { navStart, navPush, navBack, navTop, awayStep } from '../../src/game/menus3Nav.js';
import { dashNavInit, dashNavStep } from '../../src/game/dashNav.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

/* ── 1. the rail ── */
{
  check('1a the rail: Active, On offer, Done, no Daily', MENUS3_QUEST_RAIL.join() === 'active,offers,done' && MENUS3_QUEST_RAIL.indexOf('daily') < 0);
  check('1b a forged place is Active', questRailId('daily') === 'active' && questRailId('__proto__') === 'active' && questRailId('done') === 'done');
  check('1c the pages a quest opens', MENUS3_QUEST_PAGES.join() === 'quest,rewards');
  const L = {
    active: [{ id: 'a', title: 'A', npc: 'X' }, { id: 'b', title: 'B', npc: 'Y', ready: true }, { id: 'c', title: 'C', npc: 'Z' }],
    available: [{ id: 'o', title: 'O', npc: 'W', where: 'BroTown' }],
    done: [{ id: 'd', title: 'D' }, { id: 'e', title: 'E' }],
  };
  const r = questRails(L, { known: true, tracked: 'c', counts: { a: { have: 2, n: 4 } } });
  check('1d the tracked first, then the ready, then the rest', r.active.map((x) => x.id).join() === 'c,b,a', r.active.map((x) => x.id));
  check('1e the ready marked, the tracked starred', r.active[1].ready === true && r.active[0].tracked === true && !r.active[2].ready);
  check('1f a count where it counts', r.active[2].count && r.active[2].count.have === 2 && r.active[2].count.n === 4);
  check('1g the offers say who and where', r.offers.length === 1 && r.offers[0].npc === 'W' && r.offers[0].where === 'BroTown');
  check('1h done, newest first as the journal lists it', r.done.map((x) => x.id).join() === 'd,e' && r.n.done === 2);
  const w = questRails(L, { known: false });
  check('1i the worker\'s answer not in: loading, never "no quest"', w.kind === 'loading' && !w.active.length);
  check('1j it opens on Active with a quest in hand', questRailStart(r) === 'active');
  check('1k ...and on On offer with none in hand and an offer', questRailStart(questRails({ active: [], available: L.available, done: [] }, { known: true })) === 'offers');
  check('1l nothing at all: Active (its empty line)', questRailStart(questRails({ active: [], available: [], done: [] }, { known: true })) === 'active');
  const h = navPush(navStart('quests', 'done'), 'quest', 'd', { rail: 'done', scroll: 40 });
  const b = navBack(navPush(h, 'rewards', 'd'));
  check('1m Rewards over the quest; Back to the quest, Back again to the rail as it was', navTop(b).page === 'quest' && navTop(navBack(b)).rail === 'done' && navTop(navBack(b)).scroll === 40);
}

/* ── 2. the Today strip ── */
{
  const none = todayStrip({});
  check('2a nothing known, nothing drawn', none.length === 0);
  const s1 = todayStrip({ login: { capOn: true, known: false, avail: true } });
  check('2b the spin waits for the worker\'s answer', s1.length === 0);
  const s2 = todayStrip({ login: { capOn: true, known: true, avail: true } });
  check('2c the spin, lit while it waits', s2.length === 1 && s2[0].id === 'spin' && s2[0].lit && s2[0].avail);
  check('2d a spin taken is not lit', todayStrip({ login: { capOn: true, known: true, avail: false } })[0].lit === false);
  check('2e its cap off: no spin', todayStrip({ login: { capOn: false, known: true, avail: true } }).length === 0);
  const st = { streak: { n: 5, fz: 1, fzMax: 2, saved: 1, every: 7 }, spin: { on: 1, ready: true, prizes: [{ c: 10 }, { c: 500 }] } };
  const s3 = todayStrip({ rewards: st, denOn: true });
  const sk = s3.find((c) => c.id === 'streak');
  check('2f the streak, its freezes, the save', sk && sk.days === 5 && sk.fz === 1 && sk.fzMax === 2 && sk.saved && sk.every === 7);
  check('2g the Den\'s spin as the window drew it', sk.den && sk.den.state === 'ready' && sk.den.jackpot === 500);
  check('2h the Den\'s cap off: no Den line', todayStrip({ rewards: st, denOn: false }).find((c) => c.id === 'streak').den === null);
  check('2i the Den\'s five states', denSpin({ on: 1, locked: true }).state === 'locked' && denSpin({ on: 1, open: true, pot: 40 }).state === 'open'
    && denSpin({ on: 1, extra: 2 }).state === 'bonus' && denSpin({ on: 1 }).state === 'done' && denSpin({ on: 0 }) === null && denSpin({ on: 1, locked: true, open: true }).state === 'open');
  const o0 = todayStrip({ ordersOn: true, orders: null, now: 10 }).find((c) => c.id === 'orders');
  check('2j the board not seen: "at Feed & Seed", nothing asked', o0 && o0.known === false && !o0.old);
  const board = { day: 1, resetsAt: 100, list: [{ id: 1, key: 'wheat', n: 3, gold: 20, xp: 5, done: true }, { id: 2, key: 'carrot', n: 2, gold: 10, xp: 4 }, { gone: true }] };
  const o1 = todayStrip({ ordersOn: true, orders: board, now: 50 }).find((c) => c.id === 'orders');
  check('2k the board read: one of three delivered', o1.known && o1.done === 1 && o1.all === 3 && o1.list[2].gone && o1.list[0].key === 'wheat');
  const o2 = todayStrip({ ordersOn: true, orders: board, now: 150 }).find((c) => c.id === 'orders');
  check('2l a new day up: yesterday\'s board is not shown', o2.known === false && o2.old === true);
  check('2m the board\'s cap off: no orders', !todayStrip({ ordersOn: false, orders: board }).some((c) => c.id === 'orders'));
  check('2n no Daily Rewards door while the daily quests and the season are off', !todayStrip({ rewards: st, dailyOn: false, seasonOn: false }).some((c) => c.id === 'daily'));
  check('2o ...and the door while either is on (the window draws them)', todayStrip({ seasonOn: true }).some((c) => c.id === 'daily') && todayStrip({ dailyOn: true }).some((c) => c.id === 'daily'));
  const order = todayStrip({ login: { capOn: true, known: true, avail: true }, rewards: st, ordersOn: true, dailyOn: true }).map((c) => c.id).join();
  check('2p the order: spin, streak, orders, the door', order === 'spin,streak,orders,daily', order);
  check('2q one place open at a time; its tap again shuts it', todayTap(null, 'spin') === 'spin' && todayTap('spin', 'streak') === 'streak' && todayTap('streak', 'streak') === null);
}

/* ── 3. a quest's links ── */
{
  const REM = { sparklet: 'slime-remnants', wisplet: 'slime-remnants', snowling: 'snowman' };
  const known = (k) => k !== 'wisplet';
  const q = { need: { key: 'slime-remnants', n: 4 } };
  const act = questLinks(q, { status: 'active', where: { text: 'Earth Forest', map: true } }, REM, known);
  check('3a the monsters whose remains it asks for, each in the Codex', act.filter((l) => l.kind === 'monster').map((l) => l.id).join() === 'sparklet', act);
  check('3b the item, with who leaves it', act.some((l) => l.kind === 'item' && l.key === 'slime-remnants' && l.from === 'sparklet'));
  check('3c the place where the game maps it', act[act.length - 1].kind === 'place');
  check('3d no map, no place link', !questLinks(q, { status: 'ready', where: { map: false } }, REM, known).some((l) => l.kind === 'place'));
  check('3e an item nobody leaves (ore): no item link', questLinks({ need: { key: 'ore_copper_ore', n: 2 } }, { status: 'active' }, REM, known).length === 0);
  check('3f an offer: its place alone', questLinks(q, { status: 'available', where: { map: true } }, REM, known).map((l) => l.kind).join() === 'place');
  check('3g a done quest: none', questLinks(q, { status: 'done', where: { map: true } }, REM, known).length === 0);
  check('3h a counted quest: no item', !questLinks({ need: { progress: true, n: 3 } }, { status: 'active' }, REM, known).length);
  check('3i no page, none', questLinks(q, null, REM, known).length === 0);
}

/* ── 4. the road ── */
{
  check('4a Quests is built', MENUS3_BUILT.includes('quests'));
  const r = menus3Route('dock.world', { built: MENUS3_BUILT });
  check('4b World opens the panel on Quests, always', r.road === 'panel' && r.menu === 'world' && r.section === 'quests');
  const q = menus3Route('hud.questLine', { built: MENUS3_BUILT, quest: 'tut_1' });
  check('4c the quest line: World · Quests in the panel', q.road === 'panel' && q.section === 'quests');
  check('4d Codex still today\'s (v2.3.6868: Feats is built, card MN step 9)', !MENUS3_BUILT.includes('codex'));
}

/* ── 5. a link's way back (v2.3.6866) ── */
{
  /* the ticket as menus3Away takes it: the arrival on top of the band's stack */
  const arrive = () => {
    const n = dashNavStep(dashNavInit(false), { type: 'arrive', id: 'codexMonster' });
    const st = n[n.ws];
    return { n, tk: { ws: n.ws, key: st[st.length - 1].key, top: true } };
  };
  /* every change of the band asks the ticket (onBandChange): the verdicts in order */
  const play = (acts) => {
    let { n, tk } = arrive();
    const said = [];
    for (const a of acts) {
      const m = dashNavStep(n, a);
      if (m === n) continue;
      n = m;
      const r = awayStep(tk, n);
      said.push(r.verdict);
      if (r.verdict !== 'keep') break;
      tk = r.tk;
    }
    return said.join(',');
  };
  check('5a the arrival\'s own Back: the panel comes back', play([{ type: 'back' }]) === 'back', play([{ type: 'back' }]));
  /* THE BUG (main 46740533): Menu wiped the stack, then X: the panel popped back */
  check('5b the band\'s Menu, then X: the ticket is dropped, never Back', play([{ type: 'menuRoot' }, { type: 'close' }]) === 'drop', play([{ type: 'menuRoot' }, { type: 'close' }]));
  check('5c ...then Back at the Menu\'s root and a Close: the same', play([{ type: 'menuRoot' }, { type: 'back' }, { type: 'close' }]) === 'drop');
  check('5d a Close (X, Esc, the world): dropped, the panel stays shut', play([{ type: 'close' }]) === 'drop');
  check('5e a page opened over the arrival, Back to it, then its Back: the panel comes back',
    play([{ type: 'push', id: 'itemPage' }, { type: 'back' }, { type: 'back' }]) === 'keep,keep,back',
    play([{ type: 'push', id: 'itemPage' }, { type: 'back' }, { type: 'back' }]));
  check('5f Gear\'s workspace, then a Close: dropped', play([{ type: 'gear' }, { type: 'close' }]) === 'keep,drop', play([{ type: 'gear' }, { type: 'close' }]));
  check('5g no ticket, or no band: dropped', awayStep(null, dashNavInit(false)).verdict === 'drop' && awayStep({ ws: 'menu', key: 1, top: true }, null).verdict === 'drop');
  check('5h a band shut with the arrival NOT on top when it last showed: dropped', awayStep({ ws: 'menu', key: 999, top: false }, dashNavInit(false)).verdict === 'drop');
}

console.log(`menus3-quests: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
