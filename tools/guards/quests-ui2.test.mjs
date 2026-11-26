/* ═══ v2.3.6691: QUESTS UNDER THE NEW DASHBOARD: WHAT THE PAGES SHOW (card UI2-quests) ═══
 *
 * The owner's master specification, 2026-11-25, part 6: active quests first
 * as rows; Daily and Completed secondary destinations; a quest's journey
 * first, its completed steps and the current objective dominant, Track and
 * Locate where supported; "do not reveal future steps, total step count, or
 * whole-quest completion percentage"; a neutral "the adventure continues";
 * completed quests their actual history; Story and Rewards separate
 * destinations.  Its acceptance task: "Identify the next objective in an
 * active quest, see previous steps, track it or locate it where available,
 * without seeing future steps."
 *
 * What this suite tests is what the rules DO (src/game/questPages.js
 * questLanding, journeyToNow, questActions, questOpens; the frame's own
 * transition src/game/dashNav.js) and what the pages DRAW
 * (src/ui/mobile/dash/questViews.jsx, run in node by tools/guards/lib/
 * jsxText.mjs: the page's own drawing, not a pattern of its text).
 *
 * THE DODGES, each planted as a one-line change to the real file (the rules
 * in questPages.js, the drawing in questViews.jsx) and seen red:
 *   R1 a step still to come kept (`.filter((x) => x.state !== 'current')`)
 *   R2 the hand-in shown on a quest in hand
 *   R3 a "Then: ..." line on a quest in hand
 *   R4 "2 of 5" in what to do now
 *   R5 Show on map offered where `where.map` is false
 *   R6 Track on a done quest or an offer
 *   R7 a Story door
 *   R8 Daily shown when the game hides it
 *   R9 the landing opening on a quest instead of rows
 *   R10 the tracked quest not first
 *   R11 a loading list read as empty
 *   R12 Rewards' Back landing on the landing (it replaced the quest's page)
 *   V1 the page drawing journeySteps(...).filter(s => s.state !== 'done') (the grey ones)
 *   V2 `{page.next.text}` drawn "for now"
 *   V3 a count of steps beside the title ("Step 2 of 5")
 *   V4 Show on map drawn `disabled` where the game has no road
 *   V5 a Story door drawn
 *   V6 the hand-in drawn under NOW on a quest in hand
 * The mutants of the rules' added lines (a scratch run over every line:
 * each comparison, boolean and guard turned round, 81 of them): every one
 * killed but three, listed with their why at the end of part 1.
 *
 * Run: node tools/guards/quests-ui2.test.mjs  (needs esbuild: npm install in
 * the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleViews, html, textOf, loadEsbuild } from './lib/jsxText.mjs';
import { dashNavInit, dashNavStep, dashNavView } from '../../src/game/dashNav.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RULES = 'src/game/questPages.js';
const VIEWS = 'src/ui/mobile/dash/questViews.jsx';
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 600))); }
}
const rulesText = fs.readFileSync(path.join(ROOT, RULES), 'utf8');
const viewsText = fs.readFileSync(path.join(ROOT, VIEWS), 'utf8');
/* the rules have no imports (server/test/quest-pages.test.mjs runs them in node): a planted text loads as itself */
const loadRules = (text) => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));

/* ── the fixtures: journal pages as questJournal.js journalPage gives them ── */
const WHO = (status, steps) => ({
  npc: 'Mayor Bro', talked: status === 'available' ? null : 'Talked to Mayor Bro ✓', todo: status === 'available' ? 'Talk to Mayor Bro to start it' : null,
  handIn: status === 'done' ? 'Handed in to Mayor Bro ✓' : status === 'ready' ? 'Hand it in to Mayor Bro' : null, steps: steps || [],
});
const REWARD = { gold: 25, xp: 0, ap: 5, items: [{ icon: '/b.png', label: 'Pine Bow' }], itemText: '', note: 'Paid when you hand it in' };
const LABEL = { active: 'In progress', ready: 'Ready to hand in', done: 'Done', available: 'Available' };
const page = (status, o = {}) => ({
  id: o.id || 'tut_1', title: 'Into the Blue', status, statusLabel: LABEL[status], npc: 'Mayor Bro',
  now: o.now !== undefined ? o.now : status === 'active' ? { text: 'Collect 4 Slime Remains', goal: '', count: { have: 0, n: 4, text: '0 of 4 Slime Remains' }, frac: 0 }
    : status === 'ready' ? { text: 'You have it all: hand it in to Mayor Bro.', goal: 'Tap Mayor Bro to talk.', count: { have: 4, n: 4, text: '4 of 4' }, frac: 1 }
      : status === 'available' ? { text: 'Talk to Mayor Bro to take this quest.', goal: '', count: null, frac: null }
        : { text: 'Done: handed in to Mayor Bro ✓', goal: '', count: null, frac: 1 },
  where: o.where !== undefined ? o.where : { text: 'Earth Forest, west of BroTown', map: status !== 'done' },
  who: WHO(status, o.steps),
  given: { note: 'A sword and a shield', items: [{ icon: '/s.png', label: 'Sword' }] },
  reward: o.reward !== undefined ? o.reward : REWARD,
  next: status === 'done' ? { text: 'Next: talk to Tom at the docks for “Box Traps”.', more: 0 } : { text: 'Then: talk to Tom at the docks for “Box Traps”.', more: 0 },
});
/* a quest of four steps, the second in hand: the third and fourth are the future */
const STEPS = [{ label: 'Find the old well', done: true }, { label: 'Fill the bucket', current: true }, { label: 'Bake the secret pie' }, { label: 'Feed the river troll' }];
const FUTURE = /secret pie|river troll/i;
const ACTIVE4 = page('active', { steps: STEPS, now: { text: 'Fill the bucket', goal: '', count: { have: 1, n: 3, text: '1 of 3 buckets' }, frac: 1 / 3 } });
const LIST = {
  active: [
    { id: 'a', title: 'Ready one', npc: 'Tom', ready: true },
    { id: 'b', title: 'Plain one', npc: 'Kim', ready: false },
    { id: 'c', title: 'Tracked one', npc: 'Mayor Bro', ready: false },
  ],
  available: [{ id: 'o1', title: 'An offer', npc: 'Rex', where: 'Rex, at the docks' }],
  done: [{ id: 'd1', title: 'Old one', ap: 5 }, { id: 'd2', title: 'Older one', ap: 5 }],
};
const NOFM = /\b\d+\s+of\s+\d+\b|\d\s*%|percent/i;

/* ── part 1: the rules ── */
function ruleChecks(M) {
  const out = [];
  const c = (id, name, ok, detail) => out.push({ id, name, ok: !!ok, detail });
  const words = (x) => JSON.stringify(x);
  /* the landing */
  const land = M.questLanding(LIST, { known: true, dailyOn: true, tracked: 'c', counts: { b: { have: 1, n: 4 }, a: { have: 4, n: 4 } } });
  c('L1', 'the rows: the tracked quest first, then the ready one, then the rest', land.rows.map((r) => r.id).join() === 'c,a,b' && land.rows[0].tracked && land.rows[1].ready, words(land.rows));
  c('L1b', 'a row\'s count where its quest counts, none where it does not', JSON.stringify(land.rows.find((r) => r.id === 'b').count) === '{"have":1,"n":4}' && land.rows.find((r) => r.id === 'c').count === null);
  c('L2', 'the doors: Daily (shown today), Completed (2), On offer (1)', land.doors.map((d) => d.id + ':' + d.page + ':' + d.n).join() === 'daily:questsDaily:null,done:questsDone:2,offers:questsOffers:1', words(land.doors));
  const hid = M.questLanding({ ...LIST, available: [] }, { known: true, dailyOn: false });
  c('L2b', 'no Daily when the game hides it; no On offer with nothing on offer; Completed always (its count)', hid.doors.map((d) => d.id).join() === 'done', words(hid.doors));
  c('L3', 'the landing is rows, never a quest opened for you', land.kind === 'rows' && !('open' in land) && !('focus' in land));
  const none = M.questLanding({ active: [], available: [], done: [] }, { known: true });
  c('L4', 'nothing in hand: the empty state, and the doors still there', none.kind === 'empty' && none.doors.length === 1 && none.doors[0].id === 'done');
  const wait = M.questLanding({ active: [], available: [], done: [] }, { known: false });
  c('L4b', 'the worker\'s answer not in: loading, never empty', wait.kind === 'loading' && M.questLanding(null, { known: true }).kind === 'loading');
  /* the journey of a quest in hand */
  const j = M.journeyToNow(ACTIVE4, 'Help the town');
  c('J1', 'in hand: the steps behind (the talk, the well), NOW the bucket; nothing to come, no hand-in',
    j.done.map((s) => s.kind + ':' + s.text).join('|') === 'talk:Talked to Mayor Bro ✓|step:Find the old well' && j.now && j.now.kind === 'step' && j.now.text === 'Fill the bucket'
    && !j.done.some((s) => s.state !== 'done' || s.kind === 'handin') && !FUTURE.test(words(j)) && !/Hand it in/.test(words(j)), words(j));
  const allDone = M.journeyToNow(page('active', { steps: STEPS.map((x) => ({ label: x.label, done: true })) }), '');
  c('J1c', 'in hand with every step marked done but not yet ready: never the hand-in as NOW', !(allDone.now && allDone.now.kind === 'handin') && !/Hand it in/.test(words(allDone)), words(allDone));
  c('J1b', 'NOW carries its count, its place and whether the map can show it', j.now && j.now.count && j.now.count.have === 1 && j.now.count.n === 3 && j.now.where === 'Earth Forest, west of BroTown' && j.now.map === true);
  c('J2', 'in hand: no "Then: ..." line; "the adventure continues"', j.next === null && j.continues === true && !/Then:/.test(words(j)));
  const one = M.journeyToNow(page('active'), 'Collect 4 Slime Remains in the Earth Forest');
  c('J3', 'no count of steps, no percent, in anything the journey gives', !NOFM.test(JSON.stringify({ ...one, now: { ...one.now, count: null } })) && !NOFM.test(JSON.stringify({ ...j, now: { ...j.now, count: null } }))
    && Object.keys(j).sort().join() === 'continues,done,history,next,now', Object.keys(j).join());
  const r = M.journeyToNow(page('ready', { steps: STEPS.map((s) => ({ label: s.label, done: true })) }), '');
  c('J4', 'ready: the hand-in IS the now, every step behind it', r.now && r.now.kind === 'handin' && /hand it in/i.test(r.now.text) && r.done.length === 1 + STEPS.length && r.continues, words(r));
  const d = M.journeyToNow(page('done'), 'Collect 4 Slime Remains');
  c('J5', 'done: its whole history (the hand-in too), its "Next: ..." line, no NOW, nothing continues',
    d.history && d.now === null && !d.continues && d.done.map((s) => s.kind).join() === 'talk,step,handin' && /^Next:/.test(d.next || ''), words(d));
  const o = M.journeyToNow(page('available'), 'Collect 4 Slime Remains');
  c('J6', 'an offer: NOW is the talk to its giver, nothing past it', o.now && o.now.kind === 'talk' && o.done.length === 0 && !o.continues && o.next === null && !/Slime Remains/.test(words(o)), words(o));
  /* the actions */
  const kinds = (a) => a.actions.map((x) => x.id).join() + '/' + a.doors.map((x) => x.id).join();
  c('A1', 'in hand and mapped: Track (pressed when tracked), Show on map, the Rewards door', kinds(M.questActions(page('active'), 'tut_1')) === 'track,map/rewards' && M.questActions(page('active'), 'tut_1').actions[0].pressed === true
    && M.questActions(page('active'), 'x').actions[0].pressed === false);
  c('A1b', 'the game cannot map it: no Show on map at all (never a disabled one)', kinds(M.questActions(page('active', { where: { text: 'Somewhere', map: false } }), null)) === 'track/rewards'
    && kinds(M.questActions(page('active', { where: null }), null)) === 'track/rewards');
  c('A2', 'Track only on a quest in hand: none on a done quest or an offer', kinds(M.questActions(page('done'), 'tut_1')) === '/rewards' && kinds(M.questActions(page('available'), null)) === 'map/rewards'
    && kinds(M.questActions(page('ready'), null)) === 'track,map/rewards');
  c('A3', 'no Story; no Rewards door for a quest that names no reward', !/story/i.test(JSON.stringify([M.questActions(page('active'), null), M.questActions(page('done'), null)]))
    && kinds(M.questActions(page('active', { reward: { gold: 0, xp: 0, ap: 0, items: [], itemText: '' } }), null)) === 'track,map/' && M.questActions(null, null).actions.length === 0);
  /* what a tap opens, and Back */
  c('O1', 'a row opens the quest\'s page with its id on the entry; a door its page; Rewards a push',
    words(M.questOpens({ kind: 'row', id: 'tut_1' })) === '{"type":"push","id":"questDetail","sel":"tut_1"}' && M.questOpens({ kind: 'door', door: 'done' }).id === 'questsDone'
    && M.questOpens({ kind: 'door', door: 'daily' }).id === 'questsDaily' && M.questOpens({ kind: 'door', door: 'offers' }).id === 'questsOffers'
    && M.questOpens({ kind: 'door', door: 'story' }) === null && M.questOpens({ kind: 'row', id: '' }) === null && M.questOpens(null) === null);
  let s = dashNavStep(dashNavInit(false), { type: 'arrive', id: 'quests' });
  s = dashNavStep(s, M.questOpens({ kind: 'row', id: 'tut_1' }));
  s = dashNavStep(s, M.questOpens({ kind: 'rewards', id: 'tut_1' }));
  const up = dashNavView(s).top;
  const b1 = dashNavStep(s, { type: 'back' });
  const b2 = dashNavStep(b1, { type: 'back' });
  c('N1', 'Rewards over the quest: Back returns to the quest (its id kept), Back again to the landing',
    up && up.id === 'questRewards' && up.sel === 'tut_1' && dashNavView(b1).top.id === 'questDetail' && dashNavView(b1).top.sel === 'tut_1' && dashNavView(b2).top.id === 'quests' && b2.shown,
    [up && up.id, dashNavView(b1).top && dashNavView(b1).top.id, dashNavView(b2).top && dashNavView(b2).top.id].join(' > '));
  /* the mutants the suite first let live (a scratch run over the added lines), each killed here */
  const stray = M.questLanding({ active: [null, { id: 'b', title: 'Plain one', npc: 'Kim' }, { id: 'e', title: 'Plain two', npc: 'Lou' }], available: [], done: [] }, { known: true, counts: { b: { have: 0, n: 0 } } });
  c('M1', 'a stray row is passed over; a plain group keeps its order; a row keeps its name and giver; a count of nothing is none',
    stray.rows.map((r) => r.id).join() === 'b,e' && stray.rows[0].title === 'Plain one' && stray.rows[0].npc === 'Kim' && stray.rows[0].count === null, words(stray.rows));
  const noWhere = M.journeyToNow(page('active', { where: null }), '');
  const unmapped = M.journeyToNow(page('active', { where: { text: 'Somewhere', map: false } }), '');
  c('M2', 'NOW with no place: no place, no map; a place the game cannot map: map false; its count\'s own words kept; in hand is no history',
    noWhere.now && noWhere.now.where === null && noWhere.now.map === false && unmapped.now.map === false && j.now.count.text === '1 of 3 buckets' && j.history === false, words([noWhere.now, unmapped.now]));
  const lastOne = M.journeyToNow({ ...page('done'), next: null }, '');
  c('M3', 'a done quest with no next line has none', lastOne.next === null && lastOne.history === true);
  c('M4', 'a tap of no kind opens nothing; Rewards needs the quest\'s id', M.questOpens({ kind: 'nope', id: 'q' }) === null && M.questOpens({ kind: 'rewards', id: 5 }) === null && M.questOpens({ kind: 'rewards', id: '' }) === null);
  /* the survivors, each with its why (equivalent for every input the game gives):
     - `typeof c.tracked === 'string' && c.tracked` -> `||`: trackedQuestId() gives a string or null, never another truthy thing;
     - journeyToNow's fallback `at < 0` -> `at <= 0`: a quest in hand's step 0 is always the talk, done, never current;
     - `now.count && typeof now.count.text === 'string'` -> `||`: with no count `c` is null and the text is never read. */
  return out;
}

/* ── part 2: what the pages draw ── */
const VIEW_ENTRY = "export * from './" + VIEWS + "'; export { createElement } from 'react';";
function viewChecks(V, M) {
  const out = [];
  const c = (id, name, ok, detail) => out.push({ id, name, ok: !!ok, detail });
  const h = (Comp, props) => html(V.createElement(Comp, props));
  const drawPage = (p, tracked) => h(V.QuestPageView, { page: p, j: M.journeyToNow(p, 'Collect 4 Slime Remains'), acts: M.questActions(p, tracked), face: null, pic: null, short: false });
  const act = drawPage(ACTIVE4, 'tut_1');
  const t = textOf(act);
  c('W1', 'a quest in hand: the steps behind, NOW with its count and bar, "The adventure continues", Track, Show on map, Rewards',
    /Talked to Mayor Bro/.test(t) && /Find the old well/.test(t) && /Fill the bucket/.test(t) && /1\/3/.test(t) && /class="u2-track/.test(act) && /The adventure continues/.test(t)
    && /Tracked/.test(t) && /Show on map/.test(t) && /Rewards/.test(t), t);
  c('W1b', '...and nothing of what is to come: no future step, no hand-in, no "Then:"', !FUTURE.test(t) && !/Hand it in/.test(t) && !/Then:/.test(t), t);
  const one = textOf(drawPage(page('active'), null));
  c('W2', 'no count of steps and no percent in the words a player reads (the thing\'s own "0/4" only)', !NOFM.test(t) && !NOFM.test(one) && /0\/4/.test(one), one);
  const nomapH = drawPage(page('active', { where: { text: 'Somewhere', map: false } }), null);
  const nomap = textOf(nomapH);
  c('W3', 'the game cannot map it: no Show on map drawn at all', !/Show on map/.test(nomap) && !/data-journal-map/.test(nomapH) && /Track/.test(nomap), nomap);
  const done = drawPage(page('done'), 'tut_1');
  const dt = textOf(done);
  c('W4', 'a done quest: its whole history, its "Next: ..." line, Rewards; no Track, no Show on map, nothing continues',
    /Handed in to Mayor Bro/.test(dt) && /Next: talk to Tom/.test(dt) && /Rewards/.test(dt) && !/Track/.test(dt) && !/Show on map/.test(dt) && !/adventure continues/.test(dt), dt);
  const off = textOf(drawPage(page('available'), null));
  c('W4b', 'an offer: the talk as NOW, Show on map; no Track', /Talk to Mayor Bro to take this quest/.test(off) && /Show on map/.test(off) && !/Track/.test(off), off);
  c('W5', 'no Story door anywhere', ![act, done, drawPage(page('available'), null)].some((x) => /\bStory\b/.test(textOf(x)) || /data-quest-door="story"/.test(x)));
  const land = M.questLanding(LIST, { known: true, dailyOn: false, tracked: 'c', counts: { b: { have: 1, n: 4 } } });
  const lh = h(V.QuestsLandingView, { land, short: false, faceOf: () => null, onRow() {}, onDoor() {} });
  const rows = [...lh.matchAll(/data-quest-row="([^"]+)"/g)].map((m) => m[1]);
  c('W6', 'the landing draws the rows (the tracked first) and its doors, and no quest\'s page', rows.join() === 'c,a,b' && /Completed \(2\)/.test(textOf(lh)) && /On offer \(1\)/.test(textOf(lh))
    && !/data-quest-door="daily"/.test(lh) && !/data-quest-ui2-page/.test(lh) && /data-quests-ui2="landing"/.test(lh), rows.join());
  const lw = h(V.QuestsLandingView, { land: M.questLanding(null, { known: false }), short: false, faceOf: () => null, onRow() {}, onDoor() {} });
  c('W6b', 'loading draws placeholders, never "No quest right now"', !/No quest right now/.test(textOf(lw)) && /data-quests-kind="loading"/.test(lw), textOf(lw));
  const rw = textOf(h(V.QuestRewardsView, { page: page('active') }));
  c('W7', 'Rewards: the completion rewards as tiles', /25 gold/i.test(rw) && /\+5 AP/.test(rw) && /Pine Bow/.test(rw), rw);
  return out;
}

const report = (list) => { for (const x of list) check(x.id + ' ' + x.name, x.ok, x.detail); };
const reds = (list) => list.filter((x) => !x.ok).map((x) => x.id);

const M = await loadRules(rulesText);
report(ruleChecks(M));
let V = null;
if (!loadEsbuild(ROOT)) check('0. esbuild loads (npm install in the root or server/)', false);
else {
  V = await bundleViews(ROOT, VIEW_ENTRY);
  report(viewChecks(V, M));
}

/* ── part 3: the dodges, planted ── */
const swap = (text, from, to) => (text.split(from).length === 2 ? text.replace(from, to) : null);
const R_PLANTS = [
  ['R1', 'J1', 'a step still to come kept', "  out.done = steps.slice(0, at).filter((x) => x.state === 'done');", "  out.done = steps.filter((x) => x.state !== 'current');"],
  ['R2', 'J1c', 'the hand-in shown on a quest in hand', "at = steps.findIndex((s) => s.state === 'todo' && s.kind !== 'handin');", "at = steps.findIndex((s) => s.state === 'todo');"],
  ['R3', 'J2', 'a "Then:" line on a quest in hand', '  out.continues = inHand;', '  out.continues = inHand;\n  out.next = page.next ? page.next.text : null;'],
  ['R4', 'J3', '"2 of 5" in what to do now', "    text: typeof now.text === 'string' && now.text ? now.text : (s.text || ''),", "    text: (typeof now.text === 'string' && now.text ? now.text : (s.text || '')) + ' (' + at + ' of ' + steps.length + ')',"],
  ['R5', 'A1b', 'Show on map where where.map is false', '  if (open && page.where && page.where.map === true) out.actions.push', '  if (open && page.where) out.actions.push'],
  ['R6', 'A2', 'Track on a done quest or an offer', "  if (inHand) out.actions.push({ id: 'track'", "  if (page.status !== 'locked') out.actions.push({ id: 'track'"],
  ['R7', 'A3', 'a Story door', "  if (rewardTiles(page.reward).length) out.doors.push({ id: 'rewards' });", "  if (rewardTiles(page.reward).length) out.doors.push({ id: 'rewards' });\n  out.doors.push({ id: 'story' });"],
  ['R8', 'L2b', 'Daily shown when the game hides it', '  if (c.dailyOn) doors.push(', '  if (c.dailyOn || true) doors.push('],
  ['R9', 'L3', 'the landing opening on a quest', "  return { kind: rows.length ? 'rows' : 'empty', rows: rows.map((x) => x.row), doors };", "  return { kind: rows.length ? 'quest' : 'empty', open: rows.length ? rows[0].row.id : null, rows: rows.map((x) => x.row), doors };"],
  ['R10', 'L1', 'the tracked quest not first', '  const rank = (r) => (r.tracked ? 0 : r.ready ? 1 : 2);', '  const rank = (r) => (r.ready ? 1 : 2);'],
  ['R11', 'L4b', 'a loading list read as empty', "  if (!c.known || !L) return { kind: 'loading', rows: [], doors: [] };", "  if (!L) return { kind: 'loading', rows: [], doors: [] };"],
  ['R12', 'N1', 'Rewards\' Back landing on the landing', "return { type: 'push', id: 'questRewards', sel: tap.id };", "return { type: 'push', id: 'questRewards', sel: tap.id, replace: true };"],
];
for (const [id, want, what, from, to] of R_PLANTS) {
  const text = swap(rulesText, from, to);
  if (text === null) { check(`${id} (${what}): its line is found once in questPages.js`, false, 'the plant\'s line moved: update the plant'); continue; }
  let red = [];
  try { red = reds(ruleChecks(await loadRules(text))); } catch (e) { red = [want + ' (threw: ' + e.message + ')']; }
  check(`${id} plant (${what}) turns ${want} red`, red.some((r) => r === want || r.startsWith(want + ' ')), 'red: ' + (red.join(', ') || 'nothing'));
}
const V_PLANTS = [
  ['V1', 'W1b', 'the page drawing journeySteps(...).filter(s => s.state !== \'done\') (the grey ones)', [
    ['{j.done.map((s, i) => <Step key={i} s={s} />)}', "{journeySteps(page, '').filter((s) => s.state !== 'done').map((s, i) => <Step key={i} s={s} />)}"],
    ["import { rewardTiles } from '@/game/questPages.js';", "import { rewardTiles, journeySteps } from '@/game/questPages.js';"]]],
  ['V2', 'W1b', '{page.next.text} drawn "for now"', [['      {more}\n      {actions}', "      {more}\n      {page.next ? <div className=\"u2-qp-more\">{page.next.text}</div> : null}\n      {actions}"]]],
  ['V3', 'W2', 'a count of steps beside the title', [['data-journal-title="">{page.title}</span>', "data-journal-title=\"\">{page.title}{' (Step ' + (j.done.length + 1) + ' of ' + (page.who.steps.length + 2) + ')'}</span>"]]],
  ['V4', 'W3', 'Show on map drawn disabled where the game has no road', [["{map ? <Ui2Action c=\"blue\" label={short ? say(SAY, 'questPages.showOnMapShort') : say(SAY, 'questPages.showOnMap')} aria-label={say(SAY, 'questPages.showOnMap')} data-journal-map={page.id} onClick={onMap} /> : null}",
    "<Ui2Action c=\"blue\" label={say(SAY, 'questPages.showOnMap')} disabled={!map} data-journal-map={page.id} onClick={onMap} />"]]],
  ['V6', 'W1b', 'the hand-in drawn under NOW on a quest in hand', [['      {steps}\n      {nowBox}\n', "      {steps}\n      {nowBox}\n      <div className=\"u2-qp-more\">{say(SAY, 'questPages.handIn', { npc: giver })}</div>\n"]]],
  ['V5', 'W5', 'a Story door drawn', [['        {rewards ? (', '        <button type="button" className="u2-raised u2-qp-door" data-quest-door="story">Story</button>\n        {rewards ? (']]],
];
if (V) {
  for (const [id, want, what, pairs] of V_PLANTS) {
    let text = viewsText;
    for (const [from, to] of pairs) text = text === null ? null : swap(text, from, to);
    if (text === null) { check(`${id} (${what}): its line is found once in questViews.jsx`, false, 'the plant\'s line moved: update the plant'); continue; }
    let red = [];
    try { red = reds(viewChecks(await bundleViews(ROOT, VIEW_ENTRY, { [VIEWS]: text }), M)); } catch (e) { red = [want + ' (threw: ' + e.message + ')']; }
    check(`${id} plant (${what}) turns ${want} red`, red.includes(want), 'red: ' + (red.join(', ') || 'nothing'));
  }
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
